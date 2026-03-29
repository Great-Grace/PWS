// ============================================================
// PWS Formula Helpers — SRS §8.2 Five-Step Formula
// ============================================================

import type { BMIBucket } from '../types';

/**
 * Step 1: normalized_temp — 기온 → 1~5 정규화
 * -10°C → 1.0, 35°C → 5.0
 */
export function normalizedTemp(tempC: number): number {
  return Math.max(1.0, Math.min(5.0, 1.0 + (tempC + 10.0) * (4.0 / 45.0)));
}

/**
 * Compute BMI from height/weight
 */
export function computeBMI(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

/**
 * BMI → bucket classification
 */
export function computeBMIBucket(bmi: number): BMIBucket {
  if (bmi < 18.5) return 'underweight';
  if (bmi < 25.0) return 'normal';
  if (bmi < 30.0) return 'overweight';
  return 'obese';
}

/**
 * BMI → offset (SRS §8.1 BMI offset table)
 */
export function computeBMIOffset(bmi: number): number {
  if (bmi < 18.5) return -0.4;
  if (bmi < 25.0) return 0.0;
  if (bmi < 30.0) return 0.3;
  return 0.5;
}

/**
 * Date → season (Korean weather patterns)
 */
export function getSeason(date: Date): 'spring' | 'summer' | 'autumn' | 'winter' {
  const month = date.getMonth() + 1; // 0-indexed
  if ([3, 4, 5].includes(month)) return 'spring';
  if ([6, 7, 8].includes(month)) return 'summer';
  if ([9, 10, 11].includes(month)) return 'autumn';
  return 'winter';
}

/**
 * Get feel label & color for a predicted_feel value (1.0–5.0)
 */
export function getFeelInfo(feel: number): { label: string; emoji: string } {
  if (feel <= 1.5) return { label: '매우 추울 거예요', emoji: '🥶' };
  if (feel <= 2.5) return { label: '쌀쌀할 거예요', emoji: '😬' };
  if (feel <= 3.5) return { label: '적당할 거예요', emoji: '😊' };
  if (feel <= 4.5) return { label: '더울 거예요', emoji: '😰' };
  return { label: '매우 더울 거예요', emoji: '🥵' };
}

/**
 * Get confidence label (Korean)
 */
export function getConfidenceLabel(
  confidence: 'cold_start' | 'low' | 'medium' | 'high'
): string {
  switch (confidence) {
    case 'cold_start': return '데이터 수집 중';
    case 'low': return '예측 시작';
    case 'medium': return '보통';
    case 'high': return '높음';
  }
}

/**
 * Format temperature display
 */
export function formatTemp(temp: number): string {
  return `${Math.round(temp)}°`;
}

/**
 * Weather code → icon name mapping (OpenWeatherMap codes)
 */
export function getWeatherEmoji(code: number): string {
  if (code >= 200 && code < 300) return '⛈️';  // Thunderstorm
  if (code >= 300 && code < 400) return '🌦️';  // Drizzle
  if (code >= 500 && code < 600) return '🌧️';  // Rain
  if (code >= 600 && code < 700) return '❄️';   // Snow
  if (code >= 700 && code < 800) return '🌫️';  // Atmosphere
  if (code === 800) return '☀️';                // Clear
  if (code === 801) return '🌤️';               // Few clouds
  if (code === 802) return '⛅';                // Scattered
  if (code >= 803) return '☁️';                 // Broken/Overcast
  return '🌡️';
}

/**
 * Format date as YYYY-MM-DD (로컬 타임존 기준)
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Format hour from unix timestamp
 */
export function formatHour(unixTimestamp: number): string {
  const date = new Date(unixTimestamp * 1000);
  const hours = date.getHours();
  return hours === 0 ? '자정' : hours === 12 ? '정오' : `${hours}시`;
}

/**
 * Format day name from unix timestamp
 */
export function formatDay(unixTimestamp: number): string {
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const date = new Date(unixTimestamp * 1000);
  return `${days[date.getDay()]}`;
}

// ============================================================
// Feedback Offset Calculations (SRS 8.2 Step 2-4)
// 순수 함수로 추출 — 유닛 테스트 용이성 확보
// ============================================================

export interface FeedbackOffsets {
  clothing_offset: number;
  activity_offset: number;
  sleep_offset: number | null;
  adjusted_feel: number;
  personal_feel: number;
  exposure_weight: number;
  weighted_feel: number;
}

/**
 * Compute all intermediate offset values from raw feedback inputs.
 */
export function computeFeedbackOffsets(params: {
  feel_score: number;
  clothing: number;
  activity: number;
  sleep?: number;
  outdoor_hours?: number;
  bmi_offset: number;
  korea_baseline: number;
}): FeedbackOffsets {
  const clothing_offset = (params.clothing - 2) * -0.7;
  const activity_offset = (params.activity - 2) * 0.5;
  const sleep_offset = params.sleep !== undefined
    ? (params.sleep - 2) * -0.2
    : null;

  const adjusted_feel = params.feel_score
    + clothing_offset
    + activity_offset
    + (sleep_offset ?? 0);

  const personal_feel = adjusted_feel + params.bmi_offset + params.korea_baseline;

  const outdoorHours = params.outdoor_hours ?? 0;
  const exposure_weight = 0.4 + outdoorHours * 0.2;
  const weighted_feel = personal_feel * exposure_weight;

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
 * Compute env_base (Step 1) from weather snapshot + user inputs.
 */
export function computeEnvBase(params: {
  temp: number;
  humid_feel: number;
  wind_feel: number;
  tmrt_corrected: number | null;
  season: ReturnType<typeof getSeason>;
}): number {
  const humidWeight = (params.season === 'summer' && params.temp > 33) ? 1.4 : 0.8;
  return normalizedTemp(params.temp)
    + params.humid_feel * humidWeight
    + params.wind_feel * 1.0
    + (params.tmrt_corrected ?? 0) * 0.6;
}
