// ============================================================
// Feedback Store — Zustand (v1.3)
// · 3-slot 구조 (morning / afternoon / evening)
// · 하루 리셋 05:00 기준 (getPwsDate)
// · 슬롯 항상 input.slot 기준 (UI에서 명시적 선택)
// · 온디바이스 퍼셉트론 SGD 업데이트
// ============================================================
import { create } from 'zustand';
import { supabase } from '../config/supabase';
import type { FeedbackEntry, FeedbackInput, HourlyForecast } from '../types';
import type { FeedbackSlot } from '../types';
import {
  getPwsDate,
  computeFeedbackOffsets,
  computeEnvBase,
  getSeason,
  computeWeatherFeatures,
  featuresToArray,
  updateWeights,
  computePerceptronFeel,
  getConfidenceFromCount,
  initWeights,
} from '../utils/formulas';
import { useWeatherStore } from './weatherStore';
import { useAuthStore } from './authStore';

// ---- 로컬 예측 타입 (온디바이스 계산 결과) ----
export interface SlotForecast {
  feel: number;                                         // 1.0-7.0
  confidence: 'cold_start' | 'low' | 'medium' | 'high';
  temp: number | null;
  humidity: number | null;
}

export interface LocalPrediction {
  morning:   SlotForecast;
  afternoon: SlotForecast;
  evening:   SlotForecast;
}

// ---- Store ----
interface FeedbackState {
  todayFeedback:       FeedbackEntry[];
  prediction:          LocalPrediction | null;
  recentEntries:       FeedbackEntry[];
  feedbackCount:       number;
  feedbackCountBySlot: Record<FeedbackSlot, number>;
  isLoading:           boolean;
  isSaving:            boolean;

  // Actions
  fetchTodayStatus:    () => Promise<void>;
  fetchTodayPrediction:() => Promise<void>;
  submitFeedback:      (input: FeedbackInput) => Promise<void>;
  fetchHistory:        (startDate: string, endDate: string) => Promise<FeedbackEntry[]>;
  fetchFeedbackCount:  () => Promise<void>;
}

// ---- 헬퍼: 연중 일수 계산 ----
function getDayOfYear(date: Date): number {
  return Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
}

// ---- 헬퍼: 목표 시각에 가장 가까운 hourly 데이터 찾기 ----
function findHourlyForSlot(
  hourly: HourlyForecast[],
  targetHour: number
): HourlyForecast | null {
  if (!hourly.length) return null;
  const today = new Date();
  today.setHours(targetHour, 0, 0, 0);
  const targetTs = today.getTime() / 1000;

  return hourly.reduce<HourlyForecast | null>((closest, h) => {
    if (!closest) return h;
    return Math.abs(h.dt - targetTs) < Math.abs(closest.dt - targetTs) ? h : closest;
  }, null);
}

// ---- 슬롯 설정 ----
const SLOT_CONFIG = [
  { slot: 'morning'   as FeedbackSlot, targetHour: 8,  weightKey: 'weight_morning'   as const },
  { slot: 'afternoon' as FeedbackSlot, targetHour: 13, weightKey: 'weight_afternoon' as const },
  { slot: 'evening'   as FeedbackSlot, targetHour: 18, weightKey: 'weight_evening'   as const },
];

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  todayFeedback:       [],
  prediction:          null,
  recentEntries:       [],
  feedbackCount:       0,
  feedbackCountBySlot: { morning: 0, afternoon: 0, evening: 0 },
  isLoading:           false,
  isSaving:            false,

  // ---- 오늘 피드백 (3슬롯 전체) 조회 ----
  fetchTodayStatus: async () => {
    set({ isLoading: true });
    try {
      const userId = useAuthStore.getState().session?.user.id;
      if (!userId) return;
      const today = getPwsDate();
      const { data, error } = await supabase
        .from('feedback_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('feedback_date', today)
        .order('feedback_slot');

      if (error) throw error;
      set({ todayFeedback: (data ?? []) as FeedbackEntry[] });
    } catch (error) {
      console.error('Fetch today feedback error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // ---- 온디바이스 퍼셉트론으로 3슬롯 예측 계산 ----
  fetchTodayPrediction: async () => {
    try {
      const user    = useAuthStore.getState().user;
      const weather = useWeatherStore.getState().data;
      if (!user) return;

      const now        = new Date();
      const dayOfYear  = getDayOfYear(now);
      const result: Partial<LocalPrediction> = {};

      for (const { slot, targetHour, weightKey } of SLOT_CONFIG) {
        const slotCount = get().feedbackCountBySlot[slot];
        const confidence = getConfidenceFromCount(slotCount);

        // 가중치 벡터 (없으면 초기값)
        const rawW   = user[weightKey] as number[] | null;
        const weights = rawW ? new Float32Array(rawW) : initWeights();

        // hourly 예보에서 슬롯 시각 데이터 찾기
        const hourlyEntry = weather ? findHourlyForSlot(weather.hourly, targetHour) : null;

        if (!hourlyEntry) {
          result[slot] = { feel: 4.0, confidence, temp: null, humidity: null };
          continue;
        }

        const features = featuresToArray(computeWeatherFeatures({
          tempC:     hourlyEntry.temp,
          humidity:  hourlyEntry.humidity,
          windMps:   hourlyEntry.wind_speed,
          tmrt:      0,   // 예보에는 tmrt 없음 → 0으로 처리
          precipMmh: hourlyEntry.pop > 0.3 ? hourlyEntry.pop * 5 : 0, // pop → mm/h 근사
          hour:      targetHour,
          dayOfYear,
        }));

        result[slot] = {
          feel:      computePerceptronFeel(weights, features),
          confidence,
          temp:      hourlyEntry.temp,
          humidity:  hourlyEntry.humidity,
        };
      }

      set({ prediction: result as LocalPrediction });
    } catch (error) {
      console.error('Fetch prediction error:', error);
    }
  },

  // ---- 피드백 제출 + SGD 업데이트 ----
  submitFeedback: async (input: FeedbackInput) => {
    set({ isSaving: true });
    try {
      const authUser = useAuthStore.getState().session?.user;
      if (!authUser) throw new Error('Not authenticated');

      const today        = getPwsDate();
      const now          = new Date();
      // UI에서 항상 slot을 명시 — 없으면 안전 폴백
      const feedbackSlot: FeedbackSlot = input.slot ?? 'afternoon';
      const current = useWeatherStore.getState().getCurrent();

      // ---- DB 레코드 조립 ----
      const record: Record<string, any> = {
        user_id:        authUser.id,
        feedback_date:  today,
        feel_score:     input.feel_score,
        humid_feel:     input.humid_feel,
        wind_feel:      input.wind_feel,
        clothing:       input.clothing,
        clothing_items: input.clothing_items?.length ? input.clothing_items : null,
        activity:       input.activity,
        feedback_slot:  feedbackSlot,
      };

      if (input.sun_exposure  !== undefined) record.sun_exposure  = input.sun_exposure;
      if (input.sleep         !== undefined) record.sleep         = input.sleep;
      if (input.outdoor_hours !== undefined) record.outdoor_hours = input.outdoor_hours;

      // 날씨 스냅샷
      if (current) {
        record.actual_temp     = current.temp;
        record.actual_humidity = current.humidity;
        record.actual_wind     = current.wind_speed;
        record.actual_precip   = 0; // TODO: OpenWeatherMap rain.1h 연결 시 교체
        if (current.tmrt_api !== undefined) {
          record.actual_tmrt_api = current.tmrt_api;
          record.tmrt_corrected  = current.tmrt_api + (input.sun_exposure ?? 0) * 8.0;
        }
      }

      // 오프셋 계산 (Step 2-4)
      const userProfile = useAuthStore.getState().user;
      const offsets = computeFeedbackOffsets({
        feel_score:     input.feel_score,
        clothing:       input.clothing,
        activity:       input.activity,
        sleep:          input.sleep,
        outdoor_hours:  input.outdoor_hours,
        bmi_offset:     userProfile?.bmi_offset     ?? 0,
        korea_baseline: userProfile?.korea_baseline ?? 0.3,
      });
      Object.assign(record, offsets);

      // env_base (Step 1)
      if (current) {
        record.env_base = computeEnvBase({
          temp:           current.temp,
          humid_feel:     input.humid_feel,
          wind_feel:      input.wind_feel,
          tmrt_corrected: record.tmrt_corrected ?? null,
          season:         getSeason(now),
        });
      }

      // ---- Supabase INSERT ----
      const { error } = await supabase
        .from('feedback_entries')
        .insert(record);

      if (error) throw error;

      // ---- 온디바이스 SGD 업데이트 ----
      if (current && userProfile) {
        const dayOfYear  = getDayOfYear(now);
        const weightKey  = `weight_${feedbackSlot}` as typeof SLOT_CONFIG[number]['weightKey'];
        const rawW       = userProfile[weightKey] as number[] | null;
        const weights    = rawW ? new Float32Array(rawW) : initWeights();

        const features = featuresToArray(computeWeatherFeatures({
          tempC:     current.temp,
          humidity:  current.humidity,
          windMps:   current.wind_speed,
          tmrt:      record.tmrt_corrected ?? 0,
          precipMmh: record.actual_precip  ?? 0,
          hour:      now.getHours(),
          dayOfYear,
        }));

        updateWeights(weights, features, input.feel_score);
        const updatedW = Array.from(weights);

        // Supabase 백그라운드 sync (await 하지 않음)
        supabase.from('users').update({
          [weightKey]:       updatedW,
          weight_updated_at: now.toISOString(),
        }).eq('id', userProfile.id).then();

        // authStore 로컬 즉시 반영
        useAuthStore.setState(state => ({
          user: state.user ? { ...state.user, [weightKey]: updatedW } : null,
        }));
      }

      // ---- 옷장 로컬 즉시 반영 ----
      if (input.clothing_items?.length && userProfile) {
        const newWardrobe = { ...userProfile.wardrobe };
        for (const item of input.clothing_items) {
          newWardrobe[item] = (newWardrobe[item] ?? 0) + 1;
        }
        useAuthStore.setState(state => ({
          user: state.user ? { ...state.user, wardrobe: newWardrobe } : null,
        }));
        // DB 백그라운드 sync는 Supabase 트리거(update_user_wardrobe)가 처리
      }

      // ---- 상태 갱신 (병렬) ----
      await Promise.all([
        get().fetchTodayStatus(),
        get().fetchTodayPrediction(),
        get().fetchFeedbackCount(),
      ]);
    } catch (error) {
      console.error('Submit feedback error:', error);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  // ---- 기간 내 피드백 히스토리 ----
  fetchHistory: async (startDate: string, endDate: string) => {
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) return [];
    const { data, error } = await supabase
      .from('feedback_entries')
      .select('*')
      .eq('user_id', userId)
      .gte('feedback_date', startDate)
      .lte('feedback_date', endDate)
      .order('feedback_date', { ascending: false })
      .order('feedback_slot',  { ascending: true });

    if (error) throw error;
    const entries = (data || []) as FeedbackEntry[];
    set({ recentEntries: entries });
    return entries;
  },

  // ---- 슬롯별 피드백 카운트 ----
  fetchFeedbackCount: async () => {
    try {
      const userId = useAuthStore.getState().session?.user.id;
      if (!userId) return;
      const { data, error } = await supabase
        .from('feedback_entries')
        .select('feedback_slot')
        .eq('user_id', userId);

      if (error || !data) return;

      const bySlot: Record<FeedbackSlot, number> = { morning: 0, afternoon: 0, evening: 0 };
      data.forEach(e => {
        const s = e.feedback_slot as FeedbackSlot;
        if (s in bySlot) bySlot[s]++;
      });

      set({
        feedbackCount:       data.length,
        feedbackCountBySlot: bySlot,
      });
    } catch (error) {
      console.error('Fetch count error:', error);
    }
  },
}));
