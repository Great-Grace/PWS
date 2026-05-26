import type { WeatherData } from '../types';

export const DEFAULT_WEATHER_CODE = 800;
export const DEFAULT_WEATHER_DESC = '-';
export const DEFAULT_WEATHER_ICON = '';

type WeatherCondition = {
  id?: number;
  description?: string;
  icon?: string;
};

type OneCallCurrent = {
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  weather?: WeatherCondition[];
  uvi?: number;
  rain?: { '1h'?: number };
  snow?: { '1h'?: number };
};

type OneCallHourly = OneCallCurrent & {
  dt: number;
  pop?: number;
};

type OneCallDaily = {
  dt: number;
  temp: { min: number; max: number };
  humidity: number;
  wind_speed: number;
  weather?: WeatherCondition[];
  pop?: number;
  uvi?: number;
};

type OpenWeatherOneCall = {
  current: OneCallCurrent;
  hourly?: OneCallHourly[];
  daily?: OneCallDaily[];
};

function firstCondition(entry: { weather?: WeatherCondition[] }): WeatherCondition {
  return entry.weather?.[0] ?? {};
}

function precipitation1h(entry: { rain?: { '1h'?: number }; snow?: { '1h'?: number } }): number {
  return entry.rain?.['1h'] ?? entry.snow?.['1h'] ?? 0;
}

export function buildWeatherDataFromOneCall(raw: OpenWeatherOneCall): WeatherData {
  const currentCondition = firstCondition(raw.current);

  return {
    current: {
      temp: raw.current.temp,
      feels_like: raw.current.feels_like,
      humidity: raw.current.humidity,
      wind_speed: raw.current.wind_speed,
      weather_code: currentCondition.id ?? DEFAULT_WEATHER_CODE,
      weather_desc: currentCondition.description ?? DEFAULT_WEATHER_DESC,
      uv_index: raw.current.uvi ?? 0,
      precipitation_1h: precipitation1h(raw.current),
    },
    hourly: (raw.hourly ?? []).slice(0, 24).map((entry) => {
      const condition = firstCondition(entry);
      return {
        dt: entry.dt,
        temp: entry.temp,
        feels_like: entry.feels_like,
        humidity: entry.humidity,
        wind_speed: entry.wind_speed,
        weather_code: condition.id ?? DEFAULT_WEATHER_CODE,
        weather_desc: condition.description ?? DEFAULT_WEATHER_DESC,
        pop: entry.pop ?? 0,
        precipitation_1h: precipitation1h(entry),
      };
    }),
    daily: (raw.daily ?? []).slice(0, 7).map((entry) => {
      const condition = firstCondition(entry);
      return {
        dt: entry.dt,
        temp_min: entry.temp.min,
        temp_max: entry.temp.max,
        humidity: entry.humidity,
        wind_speed: entry.wind_speed,
        weather_code: condition.id ?? DEFAULT_WEATHER_CODE,
        weather_desc: condition.description ?? DEFAULT_WEATHER_DESC,
        weather_icon: condition.icon ?? DEFAULT_WEATHER_ICON,
        pop: entry.pop ?? 0,
        uv_index: entry.uvi ?? 0,
      };
    }),
    fetchedAt: Date.now(),
  };
}
