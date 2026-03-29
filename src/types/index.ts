// ============================================================
// PWS Type Definitions — Schema v1.1 기반
// ============================================================

// ---- Users ----
export interface User {
  id: string;
  email: string;
  nickname: string;
  default_lat: number | null;
  default_lng: number | null;
  climate_zone: string | null;
  birth_year: number | null;
  gender: 'M' | 'F' | 'N' | null;
  age_bucket: string | null;
  bmi_bucket: 'underweight' | 'normal' | 'overweight' | 'obese' | null;
  bmi_offset: number;
  korea_baseline: number;
  notify_time: string;
  notify_enabled: boolean;
  notify_outfit: boolean;
  notify_rain: boolean;
  expo_push_token: string | null;
  is_active: boolean;
  onboarding_done: boolean;
  created_at: string;
  updated_at: string;
}

// ---- Feedback Entries ----
export interface FeedbackEntry {
  id: string;
  user_id: string;
  feedback_date: string; // YYYY-MM-DD

  // Group A — Core feel (required)
  feel_score: 1 | 2 | 3 | 4 | 5;
  humid_feel: 1 | 2 | 3 | 4 | 5;
  wind_feel: 0 | 1 | 2;

  // Group B — Behavioural correction (required)
  clothing: 1 | 2 | 3;
  activity: 1 | 2 | 3;

  // Group C — Condition correction (optional)
  sun_exposure: 0 | 1 | 2 | null;
  sleep: 1 | 2 | 3 | null;
  outdoor_hours: 0 | 1 | 2 | 3 | null;

  // API snapshot
  actual_temp: number | null;
  actual_humidity: number | null;
  actual_wind: number | null;
  actual_tmrt_api: number | null;
  tmrt_corrected: number | null;

  // Computed intermediates
  clothing_offset: number | null;
  activity_offset: number | null;
  sleep_offset: number | null;
  adjusted_feel: number | null;
  personal_feel: number | null;
  exposure_weight: number | null;
  weighted_feel: number | null;
  env_base: number | null;

  created_at: string;
  updated_at: string;
}

// Feedback input (user-facing, before computed values)
export interface FeedbackInput {
  feel_score: 1 | 2 | 3 | 4 | 5;
  humid_feel: 1 | 2 | 3 | 4 | 5;
  wind_feel: 0 | 1 | 2;
  clothing: 1 | 2 | 3;
  activity: 1 | 2 | 3;
  sun_exposure?: 0 | 1 | 2;
  sleep?: 1 | 2 | 3;
  outdoor_hours?: 0 | 1 | 2 | 3;
}

// ---- Predictions ----
export interface Prediction {
  id: string;
  user_id: string;
  prediction_date: string;
  predicted_feel: number;
  confidence: 'cold_start' | 'low' | 'medium' | 'high';
  feedback_count: number;
  personal_offset: number;
  group_offset: number;
  blend_weight: number;
  final_offset: number;
  forecast_temp: number | null;
  forecast_humidity: number | null;
  forecast_wind: number | null;
  forecast_tmrt: number | null;
  env_base_forecast: number | null;
  recommendation_msg: string | null;
  outfit_suggestion: OutfitSuggestion | null;
  items_suggestion: ItemsSuggestion | null;
  seasonal_corrected: boolean;
  created_at: string;
}

export interface OutfitSuggestion {
  top: string;
  bottom: string;
  outer: string;
}

export interface ItemsSuggestion {
  umbrella: boolean;
  sunscreen: boolean;
  mask: boolean;
}

// ---- Today Prediction View ----
export interface TodayPrediction {
  user_id: string;
  prediction_date: string;
  predicted_feel: number;
  confidence: 'cold_start' | 'low' | 'medium' | 'high';
  feedback_count: number;
  recommendation_msg: string | null;
  outfit_suggestion: OutfitSuggestion | null;
  items_suggestion: ItemsSuggestion | null;
  final_offset: number;
  blend_weight: number;
  feedback_done_today: boolean;
}

// ---- Weather ----
export interface CurrentWeather {
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  weather_code: number;
  weather_desc: string;
  weather_icon: string;
  uv_index: number;
  solar_rad?: number;
  tmrt_api?: number;
}

export interface HourlyForecast {
  dt: number; // Unix timestamp
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  weather_code: number;
  weather_desc: string;
  weather_icon: string;
  pop: number; // Probability of precipitation (0–1)
}

export interface DailyForecast {
  dt: number;
  temp_min: number;
  temp_max: number;
  humidity: number;
  wind_speed: number;
  weather_code: number;
  weather_desc: string;
  weather_icon: string;
  pop: number;
  uv_index: number;
}

export interface WeatherData {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  fetchedAt: number; // Unix ms
}

// ---- BMI Onboarding ----
export interface BMIInput {
  height_cm: number;
  weight_kg: number;
}

export type BMIBucket = 'underweight' | 'normal' | 'overweight' | 'obese';
