// ============================================================
// PWS Persona Simulator
// 가상 유저 페르소나 기반 피드백 시뮬레이션
// - 콜드스타트 검증
// - 알고리즘 수렴 테스트
// - QA 자동화
// ============================================================

import {
  computeWeatherFeatures,
  computePerceptronFeel,
  updateWeights,
  initWeights,
  clampFeel,
  normalizedTemp,
  type WeatherFeatures,
} from './formulas';

import type { FeedbackSlot } from './types';

// ============================================================
// 페르소나 정의
// ============================================================

export interface PersonaSensitivity {
  /** 기온 민감도 바이어스 (음수=추위민감, 양수=더위민감) */
  tempBias: number;
  /** 습도 민감도 (양수=습도에 민감) */
  humidityBias: number;
  /** 바람 민감도 (양수=바람에 민감) */
  windBias: number;
  /** 비 민감도 (음수=비에 춥게 느낌) */
  rainBias: number;
  /** 더위 시작 임계값 (°C) */
  heatThreshold: number;
  /** 추위 시작 임계값 (°C) */
  coldThreshold: number;
}

export interface Persona {
  id: string;
  name: string;
  bmiBucket: 'underweight' | 'normal' | 'overweight' | 'obese';
  bmiOffset: number;
  sensitivity: PersonaSensitivity;
  /** 피드백 변동성 (0.3~0.8, 높을수록 반응이 다양) */
  noiseLevel: number;
  /** 주요 활동 시간대 */
  primarySlot: FeedbackSlot;
}

export const PERSONAS: readonly Persona[] = [
  {
    id: 'P01',
    name: '마른_추위민감',
    bmiBucket: 'underweight',
    bmiOffset: -0.4,
    sensitivity: {
      tempBias: -1.5,
      humidityBias: 0.2,
      windBias: -0.8,
      rainBias: -0.4,
      heatThreshold: 28,
      coldThreshold: 15,
    },
    noiseLevel: 0.4,
    primarySlot: 'morning',
  },
  {
    id: 'P02',
    name: '보통_중립',
    bmiBucket: 'normal',
    bmiOffset: 0,
    sensitivity: {
      tempBias: 0,
      humidityBias: 0.1,
      windBias: -0.2,
      rainBias: -0.2,
      heatThreshold: 27,
      coldThreshold: 8,
    },
    noiseLevel: 0.3,
    primarySlot: 'afternoon',
  },
  {
    id: 'P03',
    name: '체중_더위민감',
    bmiBucket: 'overweight',
    bmiOffset: 0.3,
    sensitivity: {
      tempBias: 1.5,
      humidityBias: 0.8,
      windBias: -0.3,
      rainBias: -0.1,
      heatThreshold: 22,
      coldThreshold: 5,
    },
    noiseLevel: 0.5,
    primarySlot: 'afternoon',
  },
  {
    id: 'P04',
    name: '마른_더위민감',
    bmiBucket: 'underweight',
    bmiOffset: -0.4,
    sensitivity: {
      tempBias: 0.8,
      humidityBias: 0.5,
      windBias: -0.1,
      rainBias: -0.3,
      heatThreshold: 24,
      coldThreshold: 10,
    },
    noiseLevel: 0.5,
    primarySlot: 'evening',
  },
  {
    id: 'P05',
    name: '체중_추위민감',
    bmiBucket: 'obese',
    bmiOffset: 0.5,
    sensitivity: {
      tempBias: -1.2,
      humidityBias: 0.1,
      windBias: -0.6,
      rainBias: -0.5,
      heatThreshold: 30,
      coldThreshold: 12,
    },
    noiseLevel: 0.4,
    primarySlot: 'evening',
  },
  {
    id: 'P06',
    name: '보통_습도민감',
    bmiBucket: 'normal',
    bmiOffset: 0,
    sensitivity: {
      tempBias: 0.3,
      humidityBias: 1.2,
      windBias: -0.1,
      rainBias: -0.3,
      heatThreshold: 26,
      coldThreshold: 7,
    },
    noiseLevel: 0.4,
    primarySlot: 'afternoon',
  },
  {
    id: 'P07',
    name: '마른_바람민감',
    bmiBucket: 'underweight',
    bmiOffset: -0.3,
    sensitivity: {
      tempBias: -0.8,
      humidityBias: 0.1,
      windBias: -1.2,
      rainBias: -0.4,
      heatThreshold: 29,
      coldThreshold: 12,
    },
    noiseLevel: 0.4,
    primarySlot: 'morning',
  },
  {
    id: 'P08',
    name: '체중_중립',
    bmiBucket: 'overweight',
    bmiOffset: 0.3,
    sensitivity: {
      tempBias: 0.2,
      humidityBias: 0.3,
      windBias: -0.2,
      rainBias: -0.2,
      heatThreshold: 26,
      coldThreshold: 6,
    },
    noiseLevel: 0.35,
    primarySlot: 'afternoon',
  },
] as const;

// ============================================================
// 가상 날씨 데이터 생성
// ============================================================

export interface SyntheticWeather {
  tempC: number;
  humidity: number;
  windMps: number;
  tmrt: number;
  precipMmh: number;
  hour: number;
  dayOfYear: number;
}

/**
 * 계절+일(day) 기반 가상 서울 날씨 생성
 * 실제 서울 기후 패턴을 근사
 */
export function generateSyntheticWeather(
  dayOfYear: number,
  hour: number,
  seed: number = 0
): SyntheticWeather {
  // 계절별 기온 (서울 근사)
  // dayOfYear: 1(1월1일) ~ 365(12월31일)
  const seasonRad = (2 * Math.PI * dayOfYear) / 365;
  const baseTemp = 12 + 14 * Math.sin(seasonRad - Math.PI / 2);
  // -2°C (1월) ~ 26°C (8월)

  // 일교차 (아침 저녁 -5°C, 한낮 +5°C)
  const hourRad = (2 * Math.PI * (hour - 6)) / 24;
  const diurnal = 5 * Math.sin(hourRad);

  // 노이즈 (일별 변동)
  const dayNoise = pseudoRandom(seed + dayOfYear * 7) * 6 - 3; // ±3°C
  const hourNoise = pseudoRandom(seed + dayOfYear * 24 + hour) * 2 - 1; // ±1°C

  const tempC = baseTemp + diurnal + dayNoise + hourNoise;

  // 습도 (여름 높음, 겨울 낮음)
  const baseHumidity = 55 + 20 * Math.sin(seasonRad - Math.PI / 3);
  const humidity = clamp(baseHumidity + pseudoRandom(seed + dayOfYear * 3) * 20 - 10, 20, 95);

  // 풍속
  const windMps = 1.5 + pseudoRandom(seed + dayOfYear * 11) * 5;

  // 복사열 (기온 근사)
  const tmrt = tempC + pseudoRandom(seed + dayOfYear * 13) * 4 - 2;

  // 강수 (확률 기반)
  const rainChance = pseudoRandom(seed + dayOfYear * 17);
  const precipMmh = rainChance > 0.7 ? pseudoRandom(seed + dayOfYear * 19) * 8 : 0;

  return {
    tempC: round2(tempC),
    humidity: Math.round(humidity),
    windMps: round2(windMps),
    tmrt: round2(tmrt),
    precipMmh: round2(precipMmh),
    hour,
    dayOfYear,
  };
}

/**
 * 하루 3타임슬롯 날씨 생성
 */
export function generateDayWeather(
  dayOfYear: number,
  seed: number = 0
): SyntheticWeather[] {
  return [
    generateSyntheticWeather(dayOfYear, 8, seed),  // morning
    generateSyntheticWeather(dayOfYear, 14, seed),  // afternoon
    generateSyntheticWeather(dayOfYear, 20, seed),  // evening
  ];
}

// ============================================================
// 피드백 시뮬레이션
// ============================================================

export interface SimulatedFeedback {
  slot: FeedbackSlot;
  weather: SyntheticWeather;
  envBase: number;
  personaFeel: number;   // 페르소나의 실제 체감 (노이즈 포함)
  perceptronPredict: number; // 퍼셉트론 예측값
  error: number;          // |predict - personaFeel|
}

/**
 * 페르소나의 체감값 계산 (날씨 + 페르소나 성향 → 체감)
 */
export function computePersonaFeel(
  persona: Persona,
  weather: SyntheticWeather
): number {
  const { sensitivity, bmiOffset } = persona;
  const { tempC, humidity, windMps, precipMmh } = weather;

  // 기반값: 정규화된 기온 (1~5 스케일)
  let feel = normalizedTemp(tempC);

  // 기온 바이어스 (비선형)
  if (tempC > sensitivity.heatThreshold) {
    feel += sensitivity.tempBias * ((tempC - sensitivity.heatThreshold) / 10);
  }
  if (tempC < sensitivity.coldThreshold) {
    feel += sensitivity.tempBias * ((sensitivity.coldThreshold - tempC) / 10);
  }

  // 습도 바이어스 (고온에서만)
  if (tempC > 25) {
    feel += sensitivity.humidityBias * (humidity / 100);
  }

  // 바람 바이어스 (저온에서만)
  if (tempC < 15) {
    feel += sensitivity.windBias * (windMps / 15);
  }

  // 강수 바이어스
  if (precipMmh > 0) {
    feel += sensitivity.rainBias * Math.min(precipMmh / 10, 1);
  }

  // BMI 보정
  feel += bmiOffset * 0.3;

  // 노이즈 (정규분포 근사)
  feel += gaussianNoise(0, persona.noiseLevel);

  return clampFeel(feel);
}

/**
 * 피드백 슬롯 시뮬레이션
 */
export function simulateSlot(
  persona: Persona,
  weather: SyntheticWeather,
  weights: Float32Array
): SimulatedFeedback {
  const features = computeWeatherFeatures({
    tempC: weather.tempC,
    humidity: weather.humidity,
    windMps: weather.windMps,
    tmrt: weather.tmrt,
    precipMmh: weather.precipMmh,
    hour: weather.hour,
    dayOfYear: weather.dayOfYear,
  });

  const featureArray = featuresToArray(features);
  const perceptronPredict = computePerceptronFeel(weights, featureArray);
  const personaFeel = computePersonaFeel(persona, weather);

  return {
    slot: persona.primarySlot,
    weather,
    envBase: computeEnvBaseFromWeather(weather),
    personaFeel,
    perceptronPredict,
    error: Math.abs(perceptronPredict - personaFeel),
  };
}

// ============================================================
// 학습 시뮬레이션
// ============================================================

export interface SimulationResult {
  personaId: string;
  days: number;
  totalFeedbacks: number;
  finalWeights: Float32Array;
  /** 일별 평균 절대 오차 */
  dailyMAE: number[];
  /** 최종 MAE */
  finalMAE: number;
  /** 수렴 여부 (마음 7일 평균 MAE < 1.0) */
  converged: boolean;
  /** 가중치 변화량 (초기 대비) */
  weightDelta: number;
}

/**
 * N일간 학습 시뮬레이션 실행
 *
 * @param persona 시뮬레이션할 페르소나
 * @param days 시뮬레이션 일수
 * @param seed 랜덤 시드
 * @returns 시뮬레이션 결과
 */
export function runSimulation(
  persona: Persona,
  days: number = 90,
  seed: number = 0
): SimulationResult {
  const weights = initWeights();
  const initialWeights = new Float32Array(weights);
  const dailyMAE: number[] = [];

  for (let day = 1; day <= days; day++) {
    const weathers = generateDayWeather(day, seed);
    let dayErrorSum = 0;
    let dayCount = 0;

    for (const weather of weathers) {
      const feedback = simulateSlot(persona, weather, weights);

      // 가중치 업데이트
      updateWeights(weights, featuresToArray(computeWeatherFeatures({
        tempC: weather.tempC,
        humidity: weather.humidity,
        windMps: weather.windMps,
        tmrt: weather.tmrt,
        precipMmh: weather.precipMmh,
        hour: weather.hour,
        dayOfYear: weather.dayOfYear,
      })), feedback.personaFeel);

      dayErrorSum += feedback.error;
      dayCount++;
    }

    dailyMAE.push(dayCount > 0 ? dayErrorSum / dayCount : 0);
  }

  // 최근 7일 평균 MAE
  const recent7 = dailyMAE.slice(-7);
  const finalMAE = recent7.reduce((a, b) => a + b, 0) / Math.max(recent7.length, 1);
  const converged = finalMAE < 1.0;

  // 가중치 변화량
  let weightDelta = 0;
  for (let i = 0; i < weights.length; i++) {
    weightDelta += Math.abs(weights[i] - initialWeights[i]);
  }

  return {
    personaId: persona.id,
    days,
    totalFeedbacks: days * 3,
    finalWeights: weights,
    dailyMAE,
    finalMAE: round2(finalMAE),
    converged,
    weightDelta: round2(weightDelta),
  };
}

/**
 * 전체 페르소나 시뮬레이션
 */
export function runAllPersonas(
  days: number = 90,
  seed: number = 0
): SimulationResult[] {
  return PERSONAS.map(persona => runSimulation(persona, days, seed));
}

// ============================================================
// 유틸리티
// ============================================================

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** 의사 난수 (시드 기반, 반복 가능) */
function pseudoRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/** Box-Muller 정규분포 근사 */
function gaussianNoise(mean: number, stddev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + stddev * z;
}

function featuresToArray(f: WeatherFeatures): Float32Array {
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

function computeEnvBaseFromWeather(weather: SyntheticWeather): number {
  // 간소화된 env_base (정확한 UTCI 대신 정규화 기온 사용)
  return clampFeel(normalizedTemp(weather.tempC));
}
