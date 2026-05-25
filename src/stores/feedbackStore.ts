// ============================================================
// Feedback Store — Zustand (v1.3)
// · 3-slot 구조 (morning / afternoon / evening)
// · 하루 리셋 05:00 기준 (getPwsDate)
// · 슬롯 항상 input.slot 기준 (UI에서 명시적 선택)
// · UTCI 기반 ordered prior + residual 학습용 피드백 저장
// ============================================================
import { create } from 'zustand';
import { supabase } from '../config/supabase';
import type { FeedbackEntry, FeedbackInput, HourlyForecast } from '../types';
import type { FeedbackSlot } from '../types';
import {
  getPwsDate,
  computeFeedbackOffsets,
  computeEnvBase,
} from '../utils/formulas';
import { resolvePredictionConfidence } from '../utils/prediction';
import { useWeatherStore } from './weatherStore';
import { useAuthStore } from './authStore';
import { logSafeError } from '../utils/safeLog';
import { isLocalTesterSessionId } from '../utils/testerAuth';

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
  { slot: 'morning'   as FeedbackSlot, targetHour: 8  },
  { slot: 'afternoon' as FeedbackSlot, targetHour: 13 },
  { slot: 'evening'   as FeedbackSlot, targetHour: 18 },
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
      if (isLocalTesterSessionId(userId)) {
        set({ todayFeedback: [] });
        return;
      }
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
      logSafeError('Fetch today feedback error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  // ---- UTCI 기반 3슬롯 baseline 예측 계산 ----
  fetchTodayPrediction: async () => {
    try {
      const user    = useAuthStore.getState().user;
      const weather = useWeatherStore.getState().data;
      if (!user) return;

      const now        = new Date();
      const result: Partial<LocalPrediction> = {};

      for (const { slot, targetHour } of SLOT_CONFIG) {
        // hourly 예보에서 슬롯 시각 데이터 찾기
        const hourlyEntry = weather ? findHourlyForSlot(weather.hourly, targetHour) : null;
        const confidence = resolvePredictionConfidence(
          get().feedbackCountBySlot[slot],
          hourlyEntry != null,
        );

        if (!hourlyEntry) {
          result[slot] = { feel: 4.0, confidence, temp: null, humidity: null };
          continue;
        }

        result[slot] = {
          feel:      computeEnvBase({
            temp:           hourlyEntry.temp,
            humidity:       hourlyEntry.humidity,
            windMps:        hourlyEntry.wind_speed,
            tmrt_corrected: null,
            precipMmh:      hourlyEntry.precipitation_1h ?? (hourlyEntry.pop > 0.3 ? hourlyEntry.pop * 5 : 0),
            hour:           targetHour,
            date:           now,
          }),
          confidence,
          temp:      hourlyEntry.temp,
          humidity:  hourlyEntry.humidity,
        };
      }

      set({ prediction: result as LocalPrediction });
    } catch (error) {
      logSafeError('Fetch prediction error:', error);
    }
  },

  // ---- 피드백 제출 ----
  submitFeedback: async (input: FeedbackInput) => {
    set({ isSaving: true });
    try {
      const authUser = useAuthStore.getState().session?.user;
      if (!authUser) throw new Error('Not authenticated');
      const isLocalDev = isLocalTesterSessionId(authUser.id);

      const today        = getPwsDate();
      const now          = new Date();
      // UI에서 항상 slot을 명시 — 없으면 안전 폴백
      const feedbackSlot: FeedbackSlot = input.slot ?? 'afternoon';
      const current = useWeatherStore.getState().getCurrent();

      // ---- DB 레코드 조립 ----
      const record: Record<string, unknown> & { tmrt_corrected?: number } = {
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
        record.actual_precip   = current.precipitation_1h ?? 0;
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
          humidity:       current.humidity,
          windMps:        current.wind_speed,
          tmrt_corrected: record.tmrt_corrected ?? null,
          precipMmh:      current.precipitation_1h ?? 0,
          hour:           now.getHours(),
          date:           now,
        });
      }

      // ---- Supabase INSERT ----
      const { error } = isLocalDev
        ? { error: null }
        : await supabase
          .from('feedback_entries')
          .insert(record);

      if (error) throw error;

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
      logSafeError('Submit feedback error:', error);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  // ---- 기간 내 피드백 히스토리 ----
  fetchHistory: async (startDate: string, endDate: string) => {
    const userId = useAuthStore.getState().session?.user.id;
    if (!userId) return [];
    if (isLocalTesterSessionId(userId)) {
      set({ recentEntries: [] });
      return [];
    }
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
      if (isLocalTesterSessionId(userId)) {
        set({
          feedbackCount: 0,
          feedbackCountBySlot: { morning: 0, afternoon: 0, evening: 0 },
        });
        return;
      }
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
      logSafeError('Fetch count error:', error);
    }
  },
}));
