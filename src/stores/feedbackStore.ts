// ============================================================
// Feedback Store — Zustand
// ============================================================
import { create } from 'zustand';
import { supabase } from '../config/supabase';
import type { FeedbackEntry, FeedbackInput, TodayPrediction } from '../types';
import { formatDate, computeFeedbackOffsets, computeEnvBase, getSeason } from '../utils/formulas';
import { useWeatherStore } from './weatherStore';
import { useAuthStore } from './authStore';

interface FeedbackState {
  todayFeedback: FeedbackEntry | null;
  prediction: TodayPrediction | null;
  recentEntries: FeedbackEntry[];
  feedbackCount: number;
  isLoading: boolean;
  isSaving: boolean;

  // Actions
  fetchTodayStatus: () => Promise<void>;
  fetchTodayPrediction: () => Promise<void>;
  submitFeedback: (input: FeedbackInput) => Promise<void>;
  updateTodayFeedback: (input: Partial<FeedbackInput>) => Promise<void>;
  fetchHistory: (startDate: string, endDate: string) => Promise<FeedbackEntry[]>;
  fetchFeedbackCount: () => Promise<void>;
}

export const useFeedbackStore = create<FeedbackState>((set, get) => ({
  todayFeedback: null,
  prediction: null,
  recentEntries: [],
  feedbackCount: 0,
  isLoading: false,
  isSaving: false,

  fetchTodayStatus: async () => {
    set({ isLoading: true });
    try {
      const today = formatDate(new Date());
      const { data, error } = await supabase
        .from('feedback_entries')
        .select('*')
        .eq('feedback_date', today)
        .maybeSingle();

      if (error) throw error;
      set({ todayFeedback: data as FeedbackEntry | null });
    } catch (error) {
      console.error('Fetch today feedback error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTodayPrediction: async () => {
    try {
      const { data, error } = await supabase
        .from('v_today_prediction')
        .select('*')
        .maybeSingle();

      if (error) throw error;
      set({ prediction: data as TodayPrediction | null });
    } catch (error) {
      console.error('Fetch prediction error:', error);
    }
  },

  submitFeedback: async (input: FeedbackInput) => {
    set({ isSaving: true });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');


      const today = formatDate(new Date());

      const record: Record<string, any> = {
        user_id: user.id,
        feedback_date: today,
        feel_score: input.feel_score,
        humid_feel: input.humid_feel,
        wind_feel: input.wind_feel,
        clothing: input.clothing,
        activity: input.activity,
      };

      // Optional fields
      if (input.sun_exposure !== undefined) record.sun_exposure = input.sun_exposure;
      if (input.sleep !== undefined) record.sleep = input.sleep;
      if (input.outdoor_hours !== undefined) record.outdoor_hours = input.outdoor_hours;

      // Weather snapshot
      const current = useWeatherStore.getState().getCurrent();
      if (current) {
        record.actual_temp = current.temp;
        record.actual_humidity = current.humidity;
        record.actual_wind = current.wind_speed;
        if (current.tmrt_api !== undefined) {
          record.actual_tmrt_api = current.tmrt_api;
          record.tmrt_corrected = current.tmrt_api + (input.sun_exposure ?? 0) * 8.0;
        }
      }

      // Compute intermediate values (extracted pure functions)
      const userProfile = useAuthStore.getState().user;
      const offsets = computeFeedbackOffsets({
        feel_score: input.feel_score,
        clothing: input.clothing,
        activity: input.activity,
        sleep: input.sleep,
        outdoor_hours: input.outdoor_hours,
        bmi_offset: userProfile?.bmi_offset ?? 0,
        korea_baseline: userProfile?.korea_baseline ?? 0.3,
      });
      Object.assign(record, offsets);

      // env_base (Step 1)
      if (current) {
        record.env_base = computeEnvBase({
          temp: current.temp,
          humid_feel: input.humid_feel,
          wind_feel: input.wind_feel,
          tmrt_corrected: record.tmrt_corrected ?? null,
          season: getSeason(new Date()),
        });
      }

      const { error } = await supabase
        .from('feedback_entries')
        .insert(record);

      if (error) throw error;

      // Refresh state (병렬)
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

  updateTodayFeedback: async (input) => {
    const todayFeedback = get().todayFeedback;
    if (!todayFeedback) throw new Error('No feedback to update');

    set({ isSaving: true });
    try {
      const { error } = await supabase
        .from('feedback_entries')
        .update(input)
        .eq('id', todayFeedback.id);

      if (error) throw error;
      await get().fetchTodayStatus();
    } catch (error) {
      console.error('Update feedback error:', error);
      throw error;
    } finally {
      set({ isSaving: false });
    }
  },

  fetchHistory: async (startDate: string, endDate: string) => {
    const { data, error } = await supabase
      .from('feedback_entries')
      .select('*')
      .gte('feedback_date', startDate)
      .lte('feedback_date', endDate)
      .order('feedback_date', { ascending: false });

    if (error) throw error;
    const entries = (data || []) as FeedbackEntry[];
    set({ recentEntries: entries });
    return entries;
  },

  fetchFeedbackCount: async () => {
    try {
      const { count, error } = await supabase
        .from('feedback_entries')
        .select('*', { count: 'exact', head: true });
        
      if (!error) {
        set({ feedbackCount: count ?? 0 });
      }
    } catch (error) {
      console.error('Fetch count error:', error);
    }
  },

}));
