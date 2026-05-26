import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const weatherDetailSource = readFileSync('legacy/expo-rn/src/screens/WeatherDetailScreen.tsx', 'utf8');
const settingsSource = readFileSync('legacy/expo-rn/src/screens/SettingsScreen.tsx', 'utf8');

for (const unsupportedCopy of [
  '체감도 보통',
  '날씨 API 키가 없습니다',
  'API 키 설정이 필요합니다',
]) {
  assert.equal(
    weatherDetailSource.includes(unsupportedCopy),
    false,
    `WeatherDetail should not expose fake analysis or implementation copy: ${unsupportedCopy}`
  );
}

assert.equal(
  settingsSource.includes("value={user?.climate_zone || '서울특별시'}"),
  false,
  'Settings should not present Seoul as a fake current-location fallback'
);

assert.equal(
  settingsSource.includes("value={user?.climate_zone || '위치 미설정'}"),
  true,
  'Settings should show an explicit unset location fallback'
);

console.log('releaseCopy test passed');
