// ============================================================
// PWS Formula Helpers — v1.2
// · SRS §8.2 기반 + 온디바이스 퍼셉트론 (11-dim feature vector)
// · 3-slot 구조 (morning / afternoon / evening)
// · 7-level feel label (humidity-aware)
// ============================================================

import type { BMIBucket, ClothingItemId, FeedbackSlot } from '../types';
import { CLOTHING_ITEM_DEFS, CLO_THIN_MAX, CLO_NORMAL_MAX } from '../theme';

// ============================================================
// 기존 유틸리티 함수 (유지)
// ============================================================

/**
 * normalized_temp — 기온 → 1~5 정규화 (퍼셉트론 피처 중 하나로 사용)
 * -10°C → 1.0, 35°C → 5.0
 */
export function normalizedTemp(tempC: number): number {
  return Math.max(1.0, Math.min(5.0, 1.0 + (tempC + 10.0) * (4.0 / 45.0)));
}

/** BMI 계산 */
export function computeBMI(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/** BMI → bucket */
export function computeBMIBucket(bmi: number): BMIBucket {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25.0) return 'normal';
  if (bmi < 30.0) return 'overweight';
  return 'obese';
}

/** BMI → offset (SRS §8.1) */
export function computeBMIOffset(bmi: number): number {
  if (bmi < 18.5) return -0.4;
  if (bmi < 25.0) return 0.0;
  if (bmi < 30.0) return 0.3;
  return 0.5;
}

/** 날짜 → 계절 (한국 기준) */
export function getSeason(date: Date): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = date.getMonth() + 1;
  if ([3, 4, 5].includes(month)) return 'spring';
  if ([6, 7, 8].includes(month)) return 'summer';
  if ([9, 10, 11].includes(month)) return 'autumn';
  return 'winter';
}

/** 기온 표시 포맷 */
export function formatTemp(temp: number): string {
  return `${Math.round(temp)}°`;
}

/** OpenWeatherMap 날씨 코드 → 이모지 */
export function getWeatherEmoji(code: number): string {
  if (code >= 200 && code < 300) return '⛈️';
  if (code >= 300 && code < 400) return '🌦️';
  if (code >= 500 && code < 600) return '🌧️';
  if (code >= 600 && code < 700) return '❄️';
  if (code >= 700 && code < 800) return '🌫️';
  if (code === 800)               return '☀️';
  if (code === 801)               return '🌤️';
  if (code === 802)               return '⛅';
  if (code >= 803)                return '☁️';
  return '🌡️';
}

/** 날짜 포맷 YYYY-MM-DD (로컬 타임존) */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * PWS 기준 날짜 반환 — 하루 리셋 기준: 05:00
 * 00:00~04:59는 전날로 취급
 */
export function getPwsDate(date: Date = new Date()): string {
  const d = new Date(date);
  if (d.getHours() < 5) {
    d.setDate(d.getDate() - 1);
  }
  return formatDate(d);
}

/** Unix timestamp → 시간 표시 */
export function formatHour(unixTimestamp: number): string {
  const date = new Date(unixTimestamp * 1000);
  const hours = date.getHours();
  return hours === 0 ? '자정' : hours === 12 ? '정오' : `${hours}시`;
}

/** Unix timestamp → 요일 */
export function formatDay(unixTimestamp: number): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  return days[new Date(unixTimestamp * 1000).getDay()];
}

// ============================================================
// 옷차림 아이템 → CLO 합산 → clothing 척도 1-3 변환
// ============================================================

/**
 * 선택된 아이템 목록의 CLO 합산값 계산
 */
export function computeTotalClo(items: ClothingItemId[]): number {
  return items.reduce((sum, id) => {
    const def = CLOTHING_ITEM_DEFS.find(d => d.id === id);
    return sum + (def ? def.clo : 0);
  }, 0);
}

/**
 * CLO 합산 → clothing 척도 1(얇게) / 2(보통) / 3(두껍게)
 * 임계값: thin < 0.18, normal 0.18-0.40, thick ≥ 0.40
 */
export function cloToClothingScale(totalClo: number): 1 | 2 | 3 {
  if (totalClo < CLO_THIN_MAX)   return 1;
  if (totalClo < CLO_NORMAL_MAX) return 2;
  return 3;
}

/**
 * 선택된 아이템 목록 → clothing 척도 (1-3) 자동 계산
 */
export function computeClothingFromItems(items: ClothingItemId[]): 1 | 2 | 3 {
  if (!items.length) return 2; // 기본값: 보통
  return cloToClothingScale(computeTotalClo(items));
}

// ============================================================
// 슬롯 유틸리티
// ============================================================

/**
 * 현재 시각 → 가장 가까운 피드백 슬롯
 * 05-10시 → morning, 11-15시 → afternoon, 16-04시(+1일) → evening
 * 항상 슬롯을 반환 (null 없음)
 */
export function getDefaultSlot(hour: number): FeedbackSlot {
  if (hour >= 5  && hour < 11) return 'morning';
  if (hour >= 11 && hour < 16) return 'afternoon';
  return 'evening'; // 16시 이후 및 00-04시(전날 evening 시간대)
}

/** 슬롯 → 기준 시각 레이블 */
export function getSlotLabel(slot: FeedbackSlot): string {
  switch (slot) {
    case 'morning':   return '아침';
    case 'afternoon': return '낮';
    case 'evening':   return '저녁';
  }
}

// ============================================================
// 11-dim Weather Feature Vector
// ============================================================

export interface WeatherFeatures {
  // 기본 정규화 (0-1 스케일)
  norm_temp:            number;  // normalizedTemp → 1-5 → /5 정규화
  humidity_norm:        number;  // 0%→0.0, 100%→1.0
  wind_norm:            number;  // 0→0.0, 15m/s→1.0 (cap)
  tmrt_norm:            number;  // tmrt_corrected 정규화 (-5~15 → 0~1)

  // 물리 기반 상호작용 항
  heat_index_bonus:     number;  // 고온+고습 조합 (27°C+, 40%+ 에서만 양수)
  wind_chill_penalty:   number;  // 저온+강풍 조합 (10°C- 에서만 양수)

  // 강수
  precip_norm:          number;  // 0→없음, 1→강한 비/눈 (cap 10mm/h)

  // 시간 순환 인코딩 (circular, 연속성 보존)
  hour_sin:             number;  // sin(2π × hour / 24)
  hour_cos:             number;  // cos(2π × hour / 24)

  // 계절 순환 인코딩
  season_sin:           number;  // sin(2π × dayOfYear / 365)
  season_cos:           number;  // cos(2π × dayOfYear / 365)
}

/**
 * 날씨 원시값 → 11차원 피처 벡터 계산
 *
 * @param tempC       기온 (°C)
 * @param humidity    상대습도 (0-100)
 * @param windMps     풍속 (m/s)
 * @param tmrt        복사열 보정값 (tmrt_corrected)
 * @param precipMmh   강수량 (mm/h), 없으면 0
 * @param hour        시(0-23)
 * @param dayOfYear   연중 일수 (1-365)
 */
export function computeWeatherFeatures(params: {
  tempC: number;
  humidity: number;
  windMps: number;
  tmrt: number;
  precipMmh?: number;
  hour: number;
  dayOfYear: number;
}): WeatherFeatures {
  const { tempC, humidity, windMps, tmrt, precipMmh = 0, hour, dayOfYear } = params;

  // 기본 정규화
  const norm_temp     = normalizedTemp(tempC) / 5.0;          // 1-5 → 0.2-1.0
  const humidity_norm = Math.max(0, Math.min(1, humidity / 100));
  const wind_norm     = Math.max(0, Math.min(1, windMps / 15));
  const tmrt_norm     = Math.max(0, Math.min(1, (tmrt + 5) / 20)); // -5~15 → 0~1

  // 상호작용 항 — 물리적 의미 있는 비선형성
  // 더위+습도: 27°C 이상 & 습도 40% 이상에서만 작동
  const heat_index_bonus = Math.max(0,
    ((tempC - 27) / 8) * ((humidity - 40) / 60)
  );

  // 추위+바람: 10°C 이하에서만 작동 (더울 땐 바람이 시원함 → 패널티 없음)
  const wind_chill_penalty = Math.max(0,
    ((10 - tempC) / 20) * wind_norm
  );

  // 강수 (cap 10mm/h)
  const precip_norm = Math.max(0, Math.min(1, precipMmh / 10));

  // 시간 순환 인코딩
  const hour_sin = Math.sin(2 * Math.PI * hour / 24);
  const hour_cos = Math.cos(2 * Math.PI * hour / 24);

  // 계절 순환 인코딩
  const season_sin = Math.sin(2 * Math.PI * dayOfYear / 365);
  const season_cos = Math.cos(2 * Math.PI * dayOfYear / 365);

  return {
    norm_temp,
    humidity_norm,
    wind_norm,
    tmrt_norm,
    heat_index_bonus,
    wind_chill_penalty,
    precip_norm,
    hour_sin,
    hour_cos,
    season_sin,
    season_cos,
  };
}

/** WeatherFeatures → Float32Array (퍼셉트론 연산용) */
export function featuresToArray(f: WeatherFeatures): Float32Array {
  return new Float32Array([
    f.norm_temp,
    f.humidity_norm,
    f.wind_norm,
    f.tmrt_norm,
    f.heat_index_bonus,
    f.wind_chill_penalty,
    f.precip_norm,
    f.hour_sin,
    f.hour_cos,
    f.season_sin,
    f.season_cos,
  ]);
}

// ============================================================
// 온디바이스 퍼셉트론
// ============================================================

export const FEATURE_DIM = 11;
export const WEIGHT_DIM  = 12; // 11 weights + 1 bias

/**
 * 가중치 벡터 초기화 (콜드 스타트)
 * bias = 4.0 (1-7 범위의 중간), 나머지 0
 */
export function initWeights(): Float32Array {
  const w = new Float32Array(WEIGHT_DIM);
  w[WEIGHT_DIM - 1] = 4.0; // bias
  return w;
}

/**
 * 퍼셉트론 추론: dot(w, x) + bias → clamp(1.0, 7.0)
 *
 * @param weights  Float32Array[12] (11 weights + 1 bias)
 * @param features Float32Array[11]
 */
export function computePerceptronFeel(
  weights: Float32Array,
  features: Float32Array
): number {
  let sum = weights[WEIGHT_DIM - 1]; // bias
  for (let i = 0; i < FEATURE_DIM; i++) {
    sum += weights[i] * features[i];
  }
  return Math.max(1.0, Math.min(7.0, sum));
}

/**
 * 온디바이스 SGD 가중치 업데이트 (1 스텝)
 *
 * @param weights    현재 가중치 벡터 (in-place 수정)
 * @param features   피처 벡터
 * @param actualFeel 실제 체감 (1-7)
 * @param lr         학습률 (default 0.01)
 * @param lambda     L2 정규화 계수 (default 0.001)
 */
export function updateWeights(
  weights: Float32Array,
  features: Float32Array,
  actualFeel: number,
  lr = 0.01,
  lambda = 0.001
): void {
  const predicted = computePerceptronFeel(weights, features);
  const error = predicted - actualFeel;

  for (let i = 0; i < FEATURE_DIM; i++) {
    weights[i] -= lr * (error * features[i] + lambda * weights[i]);
  }
  // bias: L2 정규화 제외
  weights[WEIGHT_DIM - 1] -= lr * error;
}

/**
 * 피드백 수 → confidence 레벨
 * (슬롯별로 독립 판정)
 */
export function getConfidenceFromCount(
  count: number
): 'cold_start' | 'low' | 'medium' | 'high' {
  if (count < 7)  return 'cold_start';
  if (count < 15) return 'low';
  if (count < 30) return 'medium';
  return 'high';
}

// ============================================================
// 기존 Step 2-4 오프셋 계산 (유지 — 피드백 저장 시 사용)
// ============================================================

export interface FeedbackOffsets {
  clothing_offset: number;
  activity_offset: number;
  sleep_offset:    number | null;
  adjusted_feel:   number;
  personal_feel:   number;
  exposure_weight: number;
  weighted_feel:   number;
}

export function computeFeedbackOffsets(params: {
  feel_score:    number;
  clothing:      number;
  activity:      number;
  sleep?:        number;
  outdoor_hours?: number;
  bmi_offset:    number;
  korea_baseline: number;
}): FeedbackOffsets {
  const clothing_offset = (params.clothing - 2) * -0.7;
  const activity_offset = (params.activity - 2) * 0.5;
  const sleep_offset    = params.sleep !== undefined
    ? (params.sleep - 2) * -0.2
    : null;

  const adjusted_feel = params.feel_score
    + clothing_offset
    + activity_offset
    + (sleep_offset ?? 0);

  const personal_feel  = adjusted_feel + params.bmi_offset + params.korea_baseline;
  const outdoorHours   = params.outdoor_hours ?? 0;
  const exposure_weight = 0.4 + outdoorHours * 0.2;
  const weighted_feel  = personal_feel * exposure_weight;

  return {
    clothing_offset,
    activity_offset,
    sleep_offset,
    adjusted_feel,
    personal_feel,
    exposure_weight,
    weighted_feel,
  };
}

/**
 * env_base 계산 (Step 1) — 날씨 스냅샷 + 계절 기반
 * 기존 서버 배치용 로직 유지 (레거시 호환)
 */
export function computeEnvBase(params: {
  temp:            number;
  humid_feel:      number;
  wind_feel:       number;
  tmrt_corrected:  number | null;
  season:          ReturnType<typeof getSeason>;
}): number {
  const humidWeight = (params.season === 'summer' && params.temp > 33) ? 1.4 : 0.8;
  return normalizedTemp(params.temp)
    + params.humid_feel * humidWeight
    + params.wind_feel  * 1.0
    + (params.tmrt_corrected ?? 0) * 0.6;
}
