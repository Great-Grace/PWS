// ============================================================
// PWS Type Definitions — Schema v1.3 기반
// ============================================================

// ---- Slot ----
export type FeedbackSlot = 'morning' | 'afternoon' | 'evening';

// ---- Clothing Items ----
// 피드백에서 선택 가능한 상의 아이템 ID
export type ClothingItemId =
  | 'sleeveless'    // 민소매
  | 'tshirt'        // 반팔 티셔츠
  | 'longsleeve'    // 긴팔 티셔츠
  | 'shirt'         // 셔츠/블라우스
  | 'knit_thin'     // 얇은 니트
  | 'sweatshirt'    // 맨투맨
  | 'hoodie'        // 후드티
  | 'hoodie_zip'    // 후드집업
  | 'knit_thick'    // 두꺼운 니트
  | 'fleece'        // 플리스
  | 'light_jacket'  // 바람막이/경량 자켓
  | 'cardigan'      // 가디건
  | 'blazer'        // 블레이저
  | 'light_padding' // 경량 패딩
  | 'padding'       // 패딩
  | 'heavy_coat'    // 두꺼운 코트
  | 'shorts'        // 반바지
  | 'pants'         // 긴바지
  | 'slacks'        // 슬랙스
  | 'jeans';        // 청바지

// 사용자 옷장: 아이템별 착용 횟수
export type Wardrobe = Partial<Record<ClothingItemId, number>>;

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
  // 온디바이스 퍼셉트론 가중치 벡터 (12 floats: 11 weights + 1 bias)
  weight_morning:    number[] | null;
  weight_afternoon:  number[] | null;
  weight_evening:    number[] | null;
  weight_updated_at: string | null;
  // 사용자 옷장 (피드백 기반 누적)
  wardrobe: Wardrobe;
  created_at: string;
  updated_at: string;
}

// ---- Feedback Entries ----
export interface FeedbackEntry {
  id: string;
  user_id: string;
  feedback_date: string;    // YYYY-MM-DD
  feedback_slot: FeedbackSlot;

  // Group A — Core feel (required) — 1-7 scale (v1.2)
  feel_score: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  humid_feel: 1 | 2 | 3 | 4 | 5;
  wind_feel: 0 | 1 | 2 | 3;

  // Group B — Behavioural correction (required)
  clothing: 1 | 2 | 3;           // CLO 합산 기반 자동 계산
  clothing_items: ClothingItemId[] | null;  // 원본 다중 선택 목록
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
  actual_precip: number | null;     // mm/h (v1.2)

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
  feel_score: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  humid_feel: 1 | 2 | 3 | 4 | 5;
  wind_feel: 0 | 1 | 2 | 3;
  clothing: 1 | 2 | 3;               // CLO 합산 기반 자동 계산
  clothing_items: ClothingItemId[];   // 사용자가 선택한 상의 목록
  activity: 1 | 2 | 3;
  sun_exposure?: 0 | 1 | 2;
  sleep?: 1 | 2 | 3;
  outdoor_hours?: 0 | 1 | 2 | 3;
  slot?: FeedbackSlot;               // 수동으로 슬롯 지정 시 사용
}

// ---- Weather ----
export interface CurrentWeather {
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  weather_code: number;
  weather_desc: string;
  uv_index: number;
  precipitation_1h?: number;
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
  pop: number; // Probability of precipitation (0–1)
  precipitation_1h?: number;
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

export type BMIBucket = 'underweight' | 'normal' | 'overweight' | 'obese';
