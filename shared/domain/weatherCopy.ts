import type { DailyForecast } from './types';

export type GuideTone = 'morning' | 'day' | 'night';
export type ReadyTone = 'warm' | 'cool' | 'purple' | 'green';
export type PredictionConfidence = 'cold_start' | 'low' | 'medium' | 'high';

export type WeatherSlotPrediction = {
  feel: number | null;
  confidence: PredictionConfidence;
  temp?: number | null;
  humidity?: number | null;
};

export type WeatherCopyPrediction = {
  morning?: WeatherSlotPrediction | null;
  afternoon?: WeatherSlotPrediction | null;
  evening?: WeatherSlotPrediction | null;
} | null;

export type WeatherGuideRow = {
  label: string;
  message: string;
  tone: GuideTone;
};

export type WeatherReadyCard = {
  title: string;
  detail: string;
  tone: ReadyTone;
};

export type TimeOutfit = {
  morning: string[];
  day: string[];
  evening: string[];
};

export function getFeelGuideMessage(
  feel: number | null | undefined,
  confidence?: PredictionConfidence,
): string {
  if (feel == null || confidence === 'cold_start') {
    return '기록이 쌓이면 더 정확한 체감 예측을 보여드릴게요';
  }

  const rounded = Math.round(Math.max(1, Math.min(7, feel)));
  const suffix = confidence === 'low' ? '느껴질 수 있어요' : '느껴질 가능성이 높아요';

  if (rounded <= 2) return `많이 쌀쌀하게 ${suffix}`;
  if (rounded === 3) return `조금 쌀쌀하게 ${suffix}`;
  if (rounded === 4) return confidence === 'low' ? '대체로 무난하게 느껴질 수 있어요' : '대체로 쾌적하게 느껴질 가능성이 높아요';
  if (rounded === 5) return `조금 덥게 ${suffix}`;
  return `많이 덥게 ${suffix}`;
}

export function getWeatherGuideRows(prediction: WeatherCopyPrediction | undefined): WeatherGuideRow[] {
  return [
    {
      label: '아침 (06-10시)',
      message: getFeelGuideMessage(prediction?.morning?.feel, prediction?.morning?.confidence),
      tone: 'morning',
    },
    {
      label: '낮 (10-18시)',
      message: getFeelGuideMessage(prediction?.afternoon?.feel, prediction?.afternoon?.confidence),
      tone: 'day',
    },
    {
      label: '저녁 (18-22시)',
      message: getFeelGuideMessage(prediction?.evening?.feel, prediction?.evening?.confidence),
      tone: 'night',
    },
  ];
}

export function getWeatherReadyCards(params: {
  uvIndex?: number | null;
  humidity?: number | null;
  precipitationProbability?: number | null;
  windSpeed?: number | null;
}): WeatherReadyCard[] {
  const { uvIndex, humidity, precipitationProbability, windSpeed } = params;
  const uvLevel = uvIndex == null ? null : uvIndex >= 8 ? '매우 높음' : uvIndex >= 6 ? '높음' : uvIndex >= 3 ? '보통' : '낮음';
  const humidityLevel = humidity == null ? null : humidity >= 75 ? '높음' : humidity <= 35 ? '낮음' : '쾌적';
  const windLevel = windSpeed == null ? null : windSpeed >= 7 ? '강함' : windSpeed >= 4 ? '약간 강함' : '약함';

  return [
    {
      title: uvIndex == null
        ? '자외선 정보가 갱신되면 알려드릴게요'
        : uvIndex >= 6
          ? '선크림을 바르는 것이 좋아요'
          : '자외선 부담은 크지 않아요',
      detail: uvIndex == null ? '아직 확정 안내를 하지 않아요' : `자외선 지수 ${Math.round(uvIndex)} · ${uvLevel}`,
      tone: 'warm',
    },
    {
      title: humidity == null
        ? '습도 정보가 갱신되면 알려드릴게요'
        : humidity >= 75
          ? '습도가 높아 끈적할 수 있어요'
          : humidity <= 35
            ? '건조할 수 있어 보습을 챙기세요'
            : '습도 부담은 크지 않아요',
      detail: humidity == null ? '아직 확정 안내를 하지 않아요' : `현재 습도 ${Math.round(humidity)}% · ${humidityLevel}`,
      tone: 'cool',
    },
    {
      title: precipitationProbability == null
        ? '강수 정보가 갱신되면 알려드릴게요'
        : precipitationProbability >= 60
          ? '우산을 챙기는 게 좋아요'
          : precipitationProbability >= 30
            ? '접이식 우산을 고려해보세요'
            : '비 걱정은 크지 않아 보여요',
      detail: precipitationProbability == null ? '아직 비 예보를 단정하지 않아요' : `강수 확률 ${precipitationProbability}%`,
      tone: 'purple',
    },
    {
      title: windSpeed == null
        ? '바람 정보가 갱신되면 알려드릴게요'
        : windSpeed >= 7
          ? '바람이 강해 겉옷을 고정하세요'
          : windSpeed >= 4
            ? '가벼운 바람막이가 유용해요'
            : '바람 부담은 크지 않아요',
      detail: windSpeed == null ? '아직 확정 안내를 하지 않아요' : `풍속 ${windSpeed.toFixed(1)}m/s · ${windLevel}`,
      tone: 'green',
    },
  ];
}

export function getOutfitGuideByTemp(temp: number, forecast?: Pick<DailyForecast, 'pop' | 'wind_speed' | 'humidity'>): TimeOutfit {
  const rainLayer = forecast && forecast.pop >= 0.6 ? ['방수 자켓'] : [];
  const windLayer = forecast && forecast.wind_speed >= 7 ? ['바람막이'] : [];
  const humidLayer = forecast && forecast.humidity >= 80 && temp >= 23 ? ['통풍 좋은 소재'] : [];
  const addOns = [...rainLayer, ...windLayer, ...humidLayer];

  if (temp <= 0) {
    return {
      morning: ['두꺼운 니트', '롱패딩', '기모 바지', ...addOns],
      day: ['니트', '패딩', '긴바지', ...addOns],
      evening: ['두꺼운 니트', '롱패딩', '장갑', ...addOns],
    };
  }
  if (temp <= 5) {
    return {
      morning: ['니트', '코트', '기모 바지', ...addOns],
      day: ['긴팔티', '코트', '슬랙스', ...addOns],
      evening: ['니트', '코트', '긴바지', ...addOns],
    };
  }
  if (temp <= 10) {
    return {
      morning: ['니트', '코트', '슬랙스', ...addOns],
      day: ['긴팔티', '자켓', '긴바지', ...addOns],
      evening: ['니트', '가디건', '긴바지', ...addOns],
    };
  }
  if (temp <= 16) {
    return {
      morning: ['긴팔티', '자켓', '긴바지', ...addOns],
      day: ['셔츠', '가디건', '슬랙스', ...addOns],
      evening: ['긴팔티', '가디건', '긴바지', ...addOns],
    };
  }
  if (temp <= 22) {
    return {
      morning: ['긴팔티', '얇은 가디건', '긴바지', ...addOns],
      day: ['얇은 셔츠', '면바지', ...addOns],
      evening: ['긴팔티', '가디건', '긴바지', ...addOns],
    };
  }
  if (temp <= 27) {
    return {
      morning: ['반팔티', '얇은 가디건', '긴바지', ...addOns],
      day: ['반팔티', '슬랙스', ...addOns],
      evening: ['반팔티', '가디건', '긴바지', ...addOns],
    };
  }
  return {
    morning: ['반팔티', '얇은 셔츠', ...addOns],
    day: ['통풍 좋은 반팔', '가벼운 하의', ...addOns],
    evening: ['반팔티', '얇은 가디건', ...addOns],
  };
}
