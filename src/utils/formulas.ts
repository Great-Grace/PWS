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
 * 06-09시 → morning, 10-17시 → afternoon, 18-05시 → evening
 * 항상 슬롯을 반환 (null 없음)
 */
export function getDefaultSlot(hour: number): FeedbackSlot {
  if (hour >= 6  && hour < 10) return 'morning';
  if (hour >= 10 && hour < 18) return 'afternoon';
  return 'evening';
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

export function clampFeel(value: number): number {
  return Math.max(1.0, Math.min(7.0, value));
}

// ============================================================
// Literature anchored thermal baseline
// UTCI: Brode et al. (2012), UTCI Version a 0.002 polynomial.
// Saturation vapor pressure: Hardy ITS-90 formulation.
// 1-7 mapping: UTCI thermal-stress thresholds used as ordered-logit cutpoints.
// ============================================================

const HARDY_VAPOR_PRESSURE_COEFFICIENTS = Object.freeze([
  -2.8365744e3,
  -6.028076559e3,
  1.954263612e1,
  -2.737830188e-2,
  1.6261698e-5,
  7.0229056e-10,
  -1.8680009e-13,
  2.7150305,
] as const);

export const UTCI_ORDINAL_THRESHOLDS_C = Object.freeze([
  -13, 0, 9, 26, 32, 38,
] as const);

export const UTCI_ORDINAL_SOFTNESS_C = 2.5;

const UTCI_TERMS: ReadonlyArray<readonly [number, number, number, number, number]> = Object.freeze([
  [6.07562052e-01, 0, 0, 0, 0],
  [-2.27712343e-02, 1, 0, 0, 0],
  [8.06470249e-04, 2, 0, 0, 0],
  [-1.54271372e-04, 3, 0, 0, 0],
  [-3.24651735e-06, 4, 0, 0, 0],
  [7.32602852e-08, 5, 0, 0, 0],
  [1.35959073e-09, 6, 0, 0, 0],
  [-2.25836520e+00, 0, 1, 0, 0],
  [8.80326035e-02, 1, 1, 0, 0],
  [2.16844454e-03, 2, 1, 0, 0],
  [-1.53347087e-05, 3, 1, 0, 0],
  [-5.72983704e-07, 4, 1, 0, 0],
  [-2.55090145e-09, 5, 1, 0, 0],
  [-7.51269505e-01, 0, 2, 0, 0],
  [-4.08350271e-03, 1, 2, 0, 0],
  [-5.21670675e-05, 2, 2, 0, 0],
  [1.94544667e-06, 3, 2, 0, 0],
  [1.14099531e-08, 4, 2, 0, 0],
  [1.58137256e-01, 0, 3, 0, 0],
  [-6.57263143e-05, 1, 3, 0, 0],
  [2.22697524e-07, 2, 3, 0, 0],
  [-4.16117031e-08, 3, 3, 0, 0],
  [-1.27762753e-02, 0, 4, 0, 0],
  [9.66891875e-06, 1, 4, 0, 0],
  [2.52785852e-09, 2, 4, 0, 0],
  [4.56306672e-04, 0, 5, 0, 0],
  [-1.74202546e-07, 1, 5, 0, 0],
  [-5.91491269e-06, 0, 6, 0, 0],
  [3.98374029e-01, 0, 0, 1, 0],
  [1.83945314e-04, 1, 0, 1, 0],
  [-1.73754510e-04, 2, 0, 1, 0],
  [-7.60781159e-07, 3, 0, 1, 0],
  [3.77830287e-08, 4, 0, 1, 0],
  [5.43079673e-10, 5, 0, 1, 0],
  [-2.00518269e-02, 0, 1, 1, 0],
  [8.92859837e-04, 1, 1, 1, 0],
  [3.45433048e-06, 2, 1, 1, 0],
  [-3.77925774e-07, 3, 1, 1, 0],
  [-1.69699377e-09, 4, 1, 1, 0],
  [1.69992415e-04, 0, 2, 1, 0],
  [-4.99204314e-05, 1, 2, 1, 0],
  [2.47417178e-07, 2, 2, 1, 0],
  [1.07596466e-08, 3, 2, 1, 0],
  [8.49242932e-05, 0, 3, 1, 0],
  [1.35191328e-06, 1, 3, 1, 0],
  [-6.21531254e-09, 2, 3, 1, 0],
  [-4.99410301e-06, 0, 4, 1, 0],
  [-1.89489258e-08, 1, 4, 1, 0],
  [8.15300114e-08, 0, 5, 1, 0],
  [7.55043090e-04, 0, 0, 2, 0],
  [-5.65095215e-05, 1, 0, 2, 0],
  [-4.52166564e-07, 2, 0, 2, 0],
  [2.46688878e-08, 3, 0, 2, 0],
  [2.42674348e-10, 4, 0, 2, 0],
  [1.54547250e-04, 0, 1, 2, 0],
  [5.24110970e-06, 1, 1, 2, 0],
  [-8.75874982e-08, 2, 1, 2, 0],
  [-1.50743064e-09, 3, 1, 2, 0],
  [-1.56236307e-05, 0, 2, 2, 0],
  [-1.33895614e-07, 1, 2, 2, 0],
  [2.49709824e-09, 2, 2, 2, 0],
  [6.51711721e-07, 0, 3, 2, 0],
  [1.94960053e-09, 1, 3, 2, 0],
  [-1.00361113e-08, 0, 4, 2, 0],
  [-1.21206673e-05, 0, 0, 3, 0],
  [-2.18203660e-07, 1, 0, 3, 0],
  [7.51269482e-09, 2, 0, 3, 0],
  [9.79063848e-11, 3, 0, 3, 0],
  [1.25006734e-06, 0, 1, 3, 0],
  [-1.81584736e-09, 1, 1, 3, 0],
  [-3.52197671e-10, 2, 1, 3, 0],
  [-3.36514630e-08, 0, 2, 3, 0],
  [1.35908359e-10, 1, 2, 3, 0],
  [4.17032620e-10, 0, 3, 3, 0],
  [-1.30369025e-09, 0, 0, 4, 0],
  [4.13908461e-10, 1, 0, 4, 0],
  [9.22652254e-12, 2, 0, 4, 0],
  [-5.08220384e-09, 0, 1, 4, 0],
  [-2.24730961e-11, 1, 1, 4, 0],
  [1.17139133e-10, 0, 2, 4, 0],
  [6.62154879e-10, 0, 0, 5, 0],
  [4.03863260e-13, 1, 0, 5, 0],
  [1.95087203e-12, 0, 1, 5, 0],
  [-4.73602469e-12, 0, 0, 6, 0],
  [5.12733497e+00, 0, 0, 0, 1],
  [-3.12788561e-01, 1, 0, 0, 1],
  [-1.96701861e-02, 2, 0, 0, 1],
  [9.99690870e-04, 3, 0, 0, 1],
  [9.51738512e-06, 4, 0, 0, 1],
  [-4.66426341e-07, 5, 0, 0, 1],
  [5.48050612e-01, 0, 1, 0, 1],
  [-3.30552823e-03, 1, 1, 0, 1],
  [-1.64119440e-03, 2, 1, 0, 1],
  [-5.16670694e-06, 3, 1, 0, 1],
  [9.52692432e-07, 4, 1, 0, 1],
  [-4.29223622e-02, 0, 2, 0, 1],
  [5.00845667e-03, 1, 2, 0, 1],
  [1.00601257e-06, 2, 2, 0, 1],
  [-1.81748644e-06, 3, 2, 0, 1],
  [-1.25813502e-03, 0, 3, 0, 1],
  [-1.79330391e-04, 1, 3, 0, 1],
  [2.34994441e-06, 2, 3, 0, 1],
  [1.29735808e-04, 0, 4, 0, 1],
  [1.29064870e-06, 1, 4, 0, 1],
  [-2.28558686e-06, 0, 5, 0, 1],
  [-3.69476348e-02, 0, 0, 1, 1],
  [1.62325322e-03, 1, 0, 1, 1],
  [-3.14279680e-05, 2, 0, 1, 1],
  [2.59835559e-06, 3, 0, 1, 1],
  [-4.77136523e-08, 4, 0, 1, 1],
  [8.64203390e-03, 0, 1, 1, 1],
  [-6.87405181e-04, 1, 1, 1, 1],
  [-9.13863872e-06, 2, 1, 1, 1],
  [5.15916806e-07, 3, 1, 1, 1],
  [-3.59217476e-05, 0, 2, 1, 1],
  [3.28696511e-05, 1, 2, 1, 1],
  [-7.10542454e-07, 2, 2, 1, 1],
  [-1.24382300e-05, 0, 3, 1, 1],
  [-7.38584400e-09, 1, 3, 1, 1],
  [2.20609296e-07, 0, 4, 1, 1],
  [-7.32469180e-04, 0, 0, 2, 1],
  [-1.87381964e-05, 1, 0, 2, 1],
  [4.80925239e-06, 2, 0, 2, 1],
  [-8.75492040e-08, 3, 0, 2, 1],
  [2.77862930e-05, 0, 1, 2, 1],
  [-5.06004592e-06, 1, 1, 2, 1],
  [1.14325367e-07, 2, 1, 2, 1],
  [2.53016723e-06, 0, 2, 2, 1],
  [-1.72857035e-08, 1, 2, 2, 1],
  [-3.95079398e-08, 0, 3, 2, 1],
  [-3.59413173e-07, 0, 0, 3, 1],
  [7.04388046e-07, 1, 0, 3, 1],
  [-1.89309167e-08, 2, 0, 3, 1],
  [-4.79768731e-07, 0, 1, 3, 1],
  [7.96079978e-09, 1, 1, 3, 1],
  [1.62897058e-09, 0, 2, 3, 1],
  [3.94367674e-08, 0, 0, 4, 1],
  [-1.18566247e-09, 1, 0, 4, 1],
  [3.34678041e-10, 0, 1, 4, 1],
  [-1.15606447e-10, 0, 0, 5, 1],
  [-2.80626406e+00, 0, 0, 0, 2],
  [5.48712484e-01, 1, 0, 0, 2],
  [-3.99428410e-03, 2, 0, 0, 2],
  [-9.54009191e-04, 3, 0, 0, 2],
  [1.93090978e-05, 4, 0, 0, 2],
  [-3.08806365e-01, 0, 1, 0, 2],
  [1.16952364e-02, 1, 1, 0, 2],
  [4.95271903e-04, 2, 1, 0, 2],
  [-1.90710882e-05, 3, 1, 0, 2],
  [2.10787756e-03, 0, 2, 0, 2],
  [-6.98445738e-04, 1, 2, 0, 2],
  [2.30109073e-05, 2, 2, 0, 2],
  [4.17856590e-04, 0, 3, 0, 2],
  [-1.27043871e-05, 1, 3, 0, 2],
  [-3.04620472e-06, 0, 4, 0, 2],
  [5.14507424e-02, 0, 0, 1, 2],
  [-4.32510997e-03, 1, 0, 1, 2],
  [8.99281156e-05, 2, 0, 1, 2],
  [-7.14663943e-07, 3, 0, 1, 2],
  [-2.66016305e-04, 0, 1, 1, 2],
  [2.63789586e-04, 1, 1, 1, 2],
  [-7.01199003e-06, 2, 1, 1, 2],
  [-1.06823306e-04, 0, 2, 1, 2],
  [3.61341136e-06, 1, 2, 1, 2],
  [2.29748967e-07, 0, 3, 1, 2],
  [3.04788893e-04, 0, 0, 2, 2],
  [-6.42070836e-05, 1, 0, 2, 2],
  [1.16257971e-06, 2, 0, 2, 2],
  [7.68023384e-06, 0, 1, 2, 2],
  [-5.47446896e-07, 1, 1, 2, 2],
  [-3.59937910e-08, 0, 2, 2, 2],
  [-4.36497725e-06, 0, 0, 3, 2],
  [1.68737969e-07, 1, 0, 3, 2],
  [2.67489271e-08, 0, 1, 3, 2],
  [3.23926897e-09, 0, 0, 4, 2],
  [-3.53874123e-02, 0, 0, 0, 3],
  [-2.21201190e-01, 1, 0, 0, 3],
  [1.55126038e-02, 2, 0, 0, 3],
  [-2.63917279e-04, 3, 0, 0, 3],
  [4.53433455e-02, 0, 1, 0, 3],
  [-4.32943862e-03, 1, 1, 0, 3],
  [1.45389826e-04, 2, 1, 0, 3],
  [2.17508610e-04, 0, 2, 0, 3],
  [-6.66724702e-05, 1, 2, 0, 3],
  [3.33217140e-05, 0, 3, 0, 3],
  [-2.26921615e-03, 0, 0, 1, 3],
  [3.80261982e-04, 1, 0, 1, 3],
  [-5.45314314e-09, 2, 0, 1, 3],
  [-7.96355448e-04, 0, 1, 1, 3],
  [2.53458034e-05, 1, 1, 1, 3],
  [-6.31223658e-06, 0, 2, 1, 3],
  [3.02122035e-04, 0, 0, 2, 3],
  [-4.77403547e-06, 1, 0, 2, 3],
  [1.73825715e-06, 0, 1, 2, 3],
  [-4.09087898e-07, 0, 0, 3, 3],
  [6.14155345e-01, 0, 0, 0, 4],
  [-6.16755931e-02, 1, 0, 0, 4],
  [1.33374846e-03, 2, 0, 0, 4],
  [3.55375387e-03, 0, 1, 0, 4],
  [-5.13027851e-04, 1, 1, 0, 4],
  [1.02449757e-04, 0, 2, 0, 4],
  [-1.48526421e-03, 0, 0, 1, 4],
  [-4.11469183e-05, 1, 0, 1, 4],
  [-6.80434415e-06, 0, 1, 1, 4],
  [-9.77675906e-06, 0, 0, 2, 4],
  [8.82773108e-02, 0, 0, 0, 5],
  [-3.01859306e-03, 1, 0, 0, 5],
  [1.04452989e-03, 0, 1, 0, 5],
  [2.47090539e-04, 0, 0, 1, 5],
  [1.48348065e-03, 0, 0, 0, 6],
]);

function clamp(value: number, minValue: number, maxValue: number): number {
  return Math.max(minValue, Math.min(maxValue, value));
}

function stableSigmoid(value: number): number {
  if (value >= 0) {
    const z = Math.exp(-value);
    return 1 / (1 + z);
  }
  const z = Math.exp(value);
  return z / (1 + z);
}

const MAX_UTCI_POLY_EXPONENT = 6;

function precomputePowers(value: number): number[] {
  const powers = new Array<number>(MAX_UTCI_POLY_EXPONENT + 1);
  powers[0] = 1;
  for (let i = 1; i <= MAX_UTCI_POLY_EXPONENT; i++) {
    powers[i] = powers[i - 1] * value;
  }
  return powers;
}

export function computeSaturationVaporPressureHpa(tempC: number): number {
  const tk = tempC + 273.15;
  let value = HARDY_VAPOR_PRESSURE_COEFFICIENTS[7] * Math.log(tk);
  for (let i = 0; i < 7; i++) {
    value += HARDY_VAPOR_PRESSURE_COEFFICIENTS[i] * Math.pow(tk, i - 2);
  }
  return Math.exp(value) * 0.01;
}

export function relativeHumidityToVaporPressureHpa(tempC: number, relativeHumidity: number): number {
  return computeSaturationVaporPressureHpa(tempC) * clamp(relativeHumidity, 0, 100) / 100;
}

export function computeUtciCelsius(params: {
  airTempC: number;
  relativeHumidity: number;
  windMps: number;
  meanRadiantTempC?: number | null;
}): number {
  const ta = clamp(params.airTempC, -50, 50);
  const tmrt = clamp(params.meanRadiantTempC ?? ta, ta - 30, ta + 70);
  const va = clamp(params.windMps, 0.5, 17);
  const vaporPressureHpa = clamp(
    relativeHumidityToVaporPressureHpa(ta, params.relativeHumidity),
    0,
    50
  );
  const dTmrt = tmrt - ta;
  const pa = vaporPressureHpa / 10;
  const taPowers = precomputePowers(ta);
  const vaPowers = precomputePowers(va);
  const dTmrtPowers = precomputePowers(dTmrt);
  const paPowers = precomputePowers(pa);

  let utci = ta;
  for (const [coefficient, taExp, vaExp, dTmrtExp, paExp] of UTCI_TERMS) {
    utci += coefficient
      * taPowers[taExp]
      * vaPowers[vaExp]
      * dTmrtPowers[dTmrtExp]
      * paPowers[paExp];
  }
  return utci;
}

export function computeOrdinalFeelFromUtci(
  utciC: number,
  softnessC = UTCI_ORDINAL_SOFTNESS_C
): number {
  const softness = Math.max(0.25, softnessC);
  let previousCumulative = 0;
  let expected = 0;

  for (let i = 0; i < UTCI_ORDINAL_THRESHOLDS_C.length; i++) {
    const cumulative = stableSigmoid((UTCI_ORDINAL_THRESHOLDS_C[i] - utciC) / softness);
    const probability = clamp(cumulative - previousCumulative, 0, 1);
    expected += (i + 1) * probability;
    previousCumulative = cumulative;
  }

  expected += 7 * clamp(1 - previousCumulative, 0, 1);
  return clampFeel(expected);
}

// ============================================================
// 온디바이스 퍼셉트론
// ============================================================

export const FEATURE_DIM = 11;
export const WEIGHT_DIM  = 12; // 11 weights + 1 bias
export const DEFAULT_PRIOR_WEIGHTS = Object.freeze([
  4.9,   // norm_temp: cold/hot is the strongest first-order signal
  0.25,  // humidity_norm: muggy air tends to feel warmer
  -0.15, // wind_norm: light cooling outside cold-wind interaction
  0.45,  // tmrt_norm: radiant heat/sun exposure correction
  1.15,  // heat_index_bonus: nonlinear hot+humid lift
  -1.6,  // wind_chill_penalty: nonlinear cold+wind drop
  -0.35, // precip_norm: rain/snow usually lowers comfort warmth
  0.0,
  0.0,
  0.0,
  0.0,
  0.75,  // bias calibrated so mild spring weather starts near neutral
] as const);

/**
 * 가중치 벡터 초기화 (콜드 스타트)
 * 날씨 피처에 반응하는 물리 기반 prior로 시작한 뒤 개인 피드백으로 보정한다.
 */
export function initWeights(): Float32Array {
  return new Float32Array(DEFAULT_PRIOR_WEIGHTS);
}

function isLegacyNeutralWeights(weights: Float32Array): boolean {
  if (weights.length !== WEIGHT_DIM) return false;
  for (let i = 0; i < FEATURE_DIM; i++) {
    if (Math.abs(weights[i]) > 1e-6) return false;
  }
  return Math.abs(weights[WEIGHT_DIM - 1] - 4.0) <= 1e-6;
}

/**
 * 저장된 weight 벡터를 검증하고, 예전 "항상 4.0" 콜드스타트 벡터는 새 prior로 승격한다.
 */
export function resolveWeights(raw: ArrayLike<number> | null | undefined): Float32Array {
  if (!raw || raw.length !== WEIGHT_DIM) return initWeights();
  const weights = new Float32Array(raw);
  for (const value of weights) {
    if (!Number.isFinite(value)) return initWeights();
  }
  return isLegacyNeutralWeights(weights) ? initWeights() : weights;
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
  return clampFeel(sum);
}

/**
 * 온디바이스 SGD 가중치 업데이트 (1 스텝)
 *
 * @param weights    현재 가중치 벡터 (in-place 수정)
 * @param features   피처 벡터
 * @param actualFeel 실제 체감 (1-7)
 * @param lr         학습률 (default 0.02)
 * @param lambda     L2 정규화 계수 (default 0.001)
 */
export function updateWeights(
  weights: Float32Array,
  features: Float32Array,
  actualFeel: number,
  lr = 0.02,
  lambda = 0.001
): void {
  const predicted = computePerceptronFeel(weights, features);
  const target = Math.max(1.0, Math.min(7.0, actualFeel));
  const error = predicted - target;

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
  const weighted_feel  = clampFeel(4 + (personal_feel - 4) * exposure_weight);

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
 * env_base 계산 (Step 1) — UTCI 기반 ordered calibration prior
 */
export function computeEnvBase(params: {
  temp:            number;
  humidity:        number;
  windMps:         number;
  tmrt_corrected:  number | null;
  precipMmh?:      number;
  hour?:           number;
  date?:           Date;
}): number {
  const utci = computeUtciCelsius({
    airTempC: params.temp,
    relativeHumidity: params.humidity,
    windMps: params.windMps,
    meanRadiantTempC: params.tmrt_corrected ?? params.temp,
  });
  const precipCooling = clamp((params.precipMmh ?? 0) / 10, 0, 1) * 0.25;
  return clampFeel(computeOrdinalFeelFromUtci(utci) - precipCooling);
}

export function getDayOfYear(date: Date): number {
  return Math.floor(
    (date.getTime() - new Date(date.getFullYear(), 0, 0).getTime()) / 86400000
  );
}
