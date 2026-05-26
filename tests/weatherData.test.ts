import * as assert from 'node:assert/strict';
import {
  DEFAULT_WEATHER_CODE,
  DEFAULT_WEATHER_DESC,
  DEFAULT_WEATHER_ICON,
  buildWeatherDataFromOneCall,
} from '../legacy/expo-rn/src/utils/weatherData';

const raw = {
  current: {
    temp: 21,
    feels_like: 20,
    humidity: 50,
    wind_speed: 2,
    uvi: 6,
    weather: [{ id: 801, description: '구름 조금', icon: '02d' }],
    rain: { '1h': 0.2 },
  },
  hourly: Array.from({ length: 25 }, (_, index) => ({
    dt: 1000 + index,
    temp: 20 + index,
    feels_like: 19 + index,
    humidity: 50,
    wind_speed: 2,
    pop: 0.1,
    weather: [{ id: 800, description: '맑음', icon: '01d' }],
  })),
  daily: Array.from({ length: 8 }, (_, index) => ({
    dt: 2000 + index,
    temp: { min: 12 + index, max: 23 + index },
    humidity: 55,
    wind_speed: 2.5,
    pop: 0.2,
    uvi: 7,
    weather: [{ id: 500, description: '비', icon: '10d' }],
  })),
};

const parsed = buildWeatherDataFromOneCall(raw);

assert.equal(parsed.current.weather_code, 801, 'current weather condition should be parsed');
assert.equal(parsed.current.precipitation_1h, 0.2, 'current rain should map to precipitation_1h');
assert.equal(parsed.hourly.length, 24, 'hourly forecast should be capped to 24 entries');
assert.equal(parsed.daily.length, 7, 'daily forecast should be capped to 7 entries');
assert.equal(parsed.daily[0].weather_icon, '10d', 'daily forecast should preserve weather_icon');

const parsedWithoutCondition = buildWeatherDataFromOneCall({
  current: { temp: 1, feels_like: 1, humidity: 1, wind_speed: 1 },
  hourly: [{ dt: 1, temp: 1, feels_like: 1, humidity: 1, wind_speed: 1 }],
  daily: [{ dt: 1, temp: { min: 1, max: 2 }, humidity: 1, wind_speed: 1 }],
});

assert.equal(parsedWithoutCondition.current.weather_code, DEFAULT_WEATHER_CODE);
assert.equal(parsedWithoutCondition.current.weather_desc, DEFAULT_WEATHER_DESC);
assert.equal(parsedWithoutCondition.daily[0].weather_icon, DEFAULT_WEATHER_ICON);

const parsedWithoutForecastArrays = buildWeatherDataFromOneCall({
  current: { temp: 1, feels_like: 1, humidity: 1, wind_speed: 1 },
});

assert.deepEqual(
  parsedWithoutForecastArrays.hourly,
  [],
  'missing hourly array should produce an empty hourly forecast instead of crashing'
);

assert.deepEqual(
  parsedWithoutForecastArrays.daily,
  [],
  'missing daily array should produce an empty daily forecast instead of crashing'
);

console.log('weatherData test passed');
