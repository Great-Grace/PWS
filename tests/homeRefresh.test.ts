import * as assert from 'node:assert/strict';
import { refreshHomeScreenData } from '../legacy/expo-rn/src/utils/homeRefresh';

async function main() {
  const calls: string[] = [];

  let resolveWeather!: () => void;
  let resolveCount!: () => void;

  const runPromise = refreshHomeScreenData(
    {
      fetchWeather: async () => {
        calls.push('weather:start');
        await new Promise<void>((resolve) => {
          resolveWeather = () => {
            calls.push('weather:done');
            resolve();
          };
        });
      },
      fetchTodayStatus: async () => {
        calls.push('status');
      },
      fetchFeedbackCount: async () => {
        calls.push('count:start');
        await new Promise<void>((resolve) => {
          resolveCount = () => {
            calls.push('count:done');
            resolve();
          };
        });
      },
      fetchTodayPrediction: async () => {
        calls.push('prediction');
      },
    },
    { lat: 37.5665, lng: 126.978, force: true }
  );

  await Promise.resolve();
  assert.deepEqual(
    calls,
    ['weather:start', 'status', 'count:start'],
    '예측 계산은 날씨/카운트 준비 전까지 시작되면 안 된다'
  );

  resolveCount();
  await Promise.resolve();
  assert.deepEqual(
    calls,
    ['weather:start', 'status', 'count:start', 'count:done'],
    '카운트만 끝나도 예측은 아직 기다려야 한다'
  );

  resolveWeather();
  await runPromise;
  assert.deepEqual(
    calls,
    ['weather:start', 'status', 'count:start', 'count:done', 'weather:done', 'prediction'],
    '예측 계산은 최신 날씨와 카운트 반영 뒤에 실행되어야 한다'
  );

  console.log('homeRefresh test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
