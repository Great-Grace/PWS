// ============================================================
// Weather Store — Zustand + Supabase Edge Function
// ============================================================
import { create } from 'zustand';
import type { WeatherData, CurrentWeather, HourlyForecast, DailyForecast } from '../types';
import { WEATHER_CACHE_TTL_MS } from '../utils/constants';
import { supabase } from '../config/supabase';

interface WeatherState {
  data: WeatherData | null;
  isLoading: boolean;
  error: string | null;
  lastLat: number | null;
  lastLng: number | null;

  fetchWeather: (lat: number, lng: number, force?: boolean) => Promise<void>;
  getCurrent: () => CurrentWeather | null;
  getHourly: () => HourlyForecast[];
  getDaily: () => DailyForecast[];
}

export const useWeatherStore = create<WeatherState>((set, get) => ({
  data: null,
  isLoading: false,
  error: null,
  lastLat: null,
  lastLng: null,

  fetchWeather: async (lat: number, lng: number, force = false) => {
    const state = get();

    // Check cache validity (30-min TTL)
    if (
      !force &&
      state.data &&
      state.lastLat === lat &&
      state.lastLng === lng &&
      Date.now() - state.data.fetchedAt < WEATHER_CACHE_TTL_MS
    ) {
      return; // Cache still valid
    }

    set({ isLoading: true, error: null });

    try {
      const { data, error } = await supabase.functions.invoke<WeatherData>('weather-onecall', {
        body: { lat, lng },
      });

      if (error) throw error;
      if (!data) throw new Error('날씨 정보를 가져오지 못했습니다');

      const weatherData: WeatherData = {
        ...data,
        daily: data.daily.map((entry) => ({
          ...entry,
          weather_icon: entry.weather_icon ?? '',
        })),
      };

      set({
        data: weatherData,
        isLoading: false,
        lastLat: lat,
        lastLng: lng,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.message || '날씨 정보를 가져오지 못했습니다',
      });
    }
  },

  getCurrent: () => get().data?.current ?? null,
  getHourly: () => get().data?.hourly ?? [],
  getDaily: () => get().data?.daily ?? [],
}));
