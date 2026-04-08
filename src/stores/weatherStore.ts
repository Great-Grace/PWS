// ============================================================
// Weather Store — Zustand + OpenWeatherMap
// ============================================================
import { create } from 'zustand';
import type { WeatherData, CurrentWeather, HourlyForecast, DailyForecast } from '../types';
import { WEATHER_CACHE_TTL_MS } from '../utils/constants';
import { supabase } from '../config/supabase';

const OWM_API_KEY = process.env.EXPO_PUBLIC_OPENWEATHER_API_KEY;
const OWM_BASE_URL = 'https://api.openweathermap.org/data/3.0/onecall';

if (!OWM_API_KEY || OWM_API_KEY === 'YOUR_OPENWEATHER_API_KEY') {
  console.warn('[PWS] EXPO_PUBLIC_OPENWEATHER_API_KEY is not configured in .env');
}

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
      // Round coordinates to 2 decimal places for cache matching
      const roundedLat = Math.round(lat * 100) / 100;
      const roundedLng = Math.round(lng * 100) / 100;

      // 1. Check Supabase weather_cache first
      const { data: cached } = await supabase
        .from('weather_cache')
        .select('*')
        .eq('lat', roundedLat)
        .eq('lng', roundedLng)
        .gt('expires_at', new Date().toISOString())
        .order('fetched_at', { ascending: false })
        .limit(1)
        .single();

      if (cached && cached.hourly_json && cached.daily_json) {
        // Use cached data
        set({
          data: {
            current: {
              temp: cached.temp_c,
              feels_like: cached.feels_like_c,
              humidity: cached.humidity_pct,
              wind_speed: cached.wind_mps,
              weather_code: cached.weather_code,
              weather_desc: cached.weather_desc,
              uv_index: cached.uv_index,
              tmrt_api: cached.tmrt_api,
            },
            hourly: cached.hourly_json as HourlyForecast[],
            daily: cached.daily_json as DailyForecast[],
            fetchedAt: new Date(cached.fetched_at).getTime(),
          },
          isLoading: false,
          lastLat: lat,
          lastLng: lng,
        });
        return;
      }

      // 2. Fetch from OpenWeatherMap API
      const url = `${OWM_BASE_URL}?lat=${lat}&lon=${lng}&exclude=minutely,alerts&units=metric&lang=kr&appid=${OWM_API_KEY}`;
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Weather API error: ${response.status}`);
      }

      const raw = await response.json();

      // Parse response
      const weatherData: WeatherData = {
        current: {
          temp: raw.current.temp,
          feels_like: raw.current.feels_like,
          humidity: raw.current.humidity,
          wind_speed: raw.current.wind_speed,
          weather_code: raw.current.weather[0].id,
          weather_desc: raw.current.weather[0].description,
          uv_index: raw.current.uvi || 0,
        },
        hourly: raw.hourly.slice(0, 24).map((h: any) => ({
          dt: h.dt,
          temp: h.temp,
          feels_like: h.feels_like,
          humidity: h.humidity,
          wind_speed: h.wind_speed,
          weather_code: h.weather[0].id,
          weather_desc: h.weather[0].description,
          pop: h.pop || 0,
        })),
        daily: raw.daily.slice(0, 7).map((d: any) => ({
          dt: d.dt,
          temp_min: d.temp.min,
          temp_max: d.temp.max,
          humidity: d.humidity,
          wind_speed: d.wind_speed,
          weather_code: d.weather[0].id,
          weather_desc: d.weather[0].description,
          pop: d.pop || 0,
          uv_index: d.uvi || 0,
        })),
        fetchedAt: Date.now(),
      };

      set({
        data: weatherData,
        isLoading: false,
        lastLat: lat,
        lastLng: lng,
      });

      // 3. Cache to Supabase (UPSERT — fire and forget)
      supabase
        .from('weather_cache')
        .upsert({
          lat: roundedLat,
          lng: roundedLng,
          fetched_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + WEATHER_CACHE_TTL_MS).toISOString(),
          temp_c: weatherData.current.temp,
          feels_like_c: weatherData.current.feels_like,
          humidity_pct: weatherData.current.humidity,
          wind_mps: weatherData.current.wind_speed,
          weather_code: weatherData.current.weather_code,
          weather_desc: weatherData.current.weather_desc,
          uv_index: weatherData.current.uv_index,
          hourly_json: weatherData.hourly,
          daily_json: weatherData.daily,
        }, { onConflict: 'lat,lng' })
        .then(({ error }) => {
          if (error) console.warn('Weather cache upsert error:', error);
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
