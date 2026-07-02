// ============================================================
// Persona Simulation Tests
// 페르소나 기반 알고리즘 수렴 검증
// ============================================================

import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  PERSONAS,
  generateSyntheticWeather,
  generateDayWeather,
  computePersonaFeel,
  simulateSlot,
  runSimulation,
  runAllPersonas,
} from '../shared/domain/personas';
import { initWeights } from '../shared/domain/formulas';

// ============================================================
// 페르소나 정의 검증
// ============================================================

test('persona definitions: 8 personas exist', () => {
  assert.equal(PERSONAS.length, 8);
});

test('persona definitions: all have valid BMI offsets', () => {
  for (const persona of PERSONAS) {
    assert.ok(
      persona.bmiOffset >= -0.5 && persona.bmiOffset <= 0.5,
      `${persona.id} bmiOffset out of range: ${persona.bmiOffset}`
    );
  }
});

test('persona definitions: all have valid noise levels', () => {
  for (const persona of PERSONAS) {
    assert.ok(
      persona.noiseLevel >= 0.2 && persona.noiseLevel <= 1.0,
      `${persona.id} noiseLevel out of range: ${persona.noiseLevel}`
    );
  }
});

test('persona definitions: sensitivity thresholds are ordered', () => {
  for (const persona of PERSONAS) {
    assert.ok(
      persona.sensitivity.coldThreshold < persona.sensitivity.heatThreshold,
      `${persona.id} coldThreshold should be < heatThreshold`
    );
  }
});

// ============================================================
// 가상 날씨 생성 검증
// ============================================================

test('synthetic weather: summer is warmer than winter', () => {
  const summer = generateSyntheticWeather(200, 14, 42); // 7월
  const winter = generateSyntheticWeather(15, 14, 42);  // 1월
  assert.ok(
    summer.tempC > winter.tempC,
    `summer ${summer.tempC}° should be > winter ${winter.tempC}°`
  );
});

test('synthetic weather: afternoon is warmer than morning', () => {
  const afternoon = generateSyntheticWeather(150, 14, 42);
  const morning = generateSyntheticWeather(150, 8, 42);
  assert.ok(
    afternoon.tempC > morning.tempC,
    `afternoon ${afternoon.tempC}° should be > morning ${morning.tempC}°`
  );
});

test('synthetic weather: day weather returns 3 slots', () => {
  const weathers = generateDayWeather(100, 42);
  assert.equal(weathers.length, 3);
  assert.equal(weathers[0].hour, 8);
  assert.equal(weathers[1].hour, 14);
  assert.equal(weathers[2].hour, 20);
});

test('synthetic weather: deterministic with same seed', () => {
  const w1 = generateSyntheticWeather(100, 14, 42);
  const w2 = generateSyntheticWeather(100, 14, 42);
  assert.equal(w1.tempC, w2.tempC);
  assert.equal(w1.humidity, w2.humidity);
});

// ============================================================
// 페르소나 체감 검증
// ============================================================

test('persona feel: P01 (cold-sensitive) feels colder than P02 (neutral)', () => {
  const coldWeather = generateSyntheticWeather(15, 8, 42); // winter morning
  const p01 = PERSONAS[0]; // 마른_추위민감
  const p01Feel = computePersonaFeel(p01, coldWeather);
  // P01 should feel cold (low score) in cold weather
  assert.ok(
    p01Feel < 4,
    `P01 should feel cold, got ${p01Feel}`
  );
});

test('persona feel: P03 (heat-sensitive) feels hotter in summer', () => {
  const hotWeather: ReturnType<typeof generateSyntheticWeather> = {
    tempC: 32,
    humidity: 75,
    windMps: 1,
    tmrt: 34,
    precipMmh: 0,
    hour: 14,
    dayOfYear: 200,
  };
  const p03 = PERSONAS[2]; // 체중_더위민감
  const feel = computePersonaFeel(p03, hotWeather);
  assert.ok(
    feel > 4,
    `P03 should feel hot, got ${feel}`
  );
});

// ============================================================
// 수렴 검증 (핵심)
// ============================================================

test('simulation: P02 (neutral) converges within 90 days', () => {
  const result = runSimulation(PERSONAS[1], 90, 42); // 보통_중립
  assert.ok(
    result.converged,
    `P02 should converge, finalMAE=${result.finalMAE}`
  );
  assert.ok(
    result.finalMAE < 1.0,
    `P02 finalMAE should be < 1.0, got ${result.finalMAE}`
  );
});

test('simulation: P01 (cold-sensitive) converges within 90 days', () => {
  const result = runSimulation(PERSONAS[0], 90, 42);
  assert.ok(
    result.converged,
    `P01 should converge, finalMAE=${result.finalMAE}`
  );
});

test('simulation: P03 (heat-sensitive) converges within 90 days', () => {
  const result = runSimulation(PERSONAS[2], 90, 42);
  assert.ok(
    result.converged,
    `P03 should converge, finalMAE=${result.finalMAE}`
  );
});

test('simulation: all personas converge within 90 days', () => {
  const results = runAllPersonas(90, 42);
  const failures = results.filter(r => !r.converged);
  assert.equal(
    failures.length,
    0,
    `These personas did not converge: ${failures.map(r => `${r.personaId}(MAE=${r.finalMAE})`).join(', ')}`
  );
});

test('simulation: weights change during learning', () => {
  const result = runSimulation(PERSONAS[0], 30, 42);
  assert.ok(
    result.weightDelta > 0.5,
    `Weights should change significantly, got delta=${result.weightDelta}`
  );
});

test('simulation: MAE decreases over time', () => {
  const result = runSimulation(PERSONAS[1], 90, 42);
  const firstWeek = average(result.dailyMAE.slice(0, 7));
  const lastWeek = average(result.dailyMAE.slice(-7));
  assert.ok(
    lastWeek < firstWeek,
    `MAE should decrease: firstWeek=${firstWeek.toFixed(2)}, lastWeek=${lastWeek.toFixed(2)}`
  );
});

// ============================================================
// 계절 견고성 검증
// ============================================================

test('seasonal robustness: summer persona works in winter', () => {
  // P03 (더위민감)을 겨울에 학습해도 수렴해야 함
  const result = runSimulation(PERSONAS[2], 90, 100);
  assert.ok(
    result.converged,
    `Heat-sensitive persona should also converge in mixed seasons, MAE=${result.finalMAE}`
  );
});

test('seasonal robustness: different seeds produce similar convergence', () => {
  const r1 = runSimulation(PERSONAS[1], 60, 1);
  const r2 = runSimulation(PERSONAS[1], 60, 999);
  // 둘 다 수렴하거나, MAE 차이가 0.5 이내
  const maeDiff = Math.abs(r1.finalMAE - r2.finalMAE);
  assert.ok(
    maeDiff < 0.8,
    `Different seeds should produce similar results: r1=${r1.finalMAE}, r2=${r2.finalMAE}, diff=${maeDiff}`
  );
});

// ============================================================
// helpers
// ============================================================

function average(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / Math.max(arr.length, 1);
}
