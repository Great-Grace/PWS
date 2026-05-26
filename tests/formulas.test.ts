import * as assert from 'node:assert/strict';
import {
  computePerceptronFeel,
  computeEnvBase,
  computeFeedbackOffsets,
  computeOrdinalFeelFromUtci,
  computeUtciCelsius,
  computeWeatherFeatures,
  featuresToArray,
  getDefaultSlot,
  initWeights,
  resolveWeights,
  updateWeights,
} from '../shared/domain/formulas';

assert.equal(getDefaultSlot(5), 'evening');
assert.equal(getDefaultSlot(6), 'morning');
assert.equal(getDefaultSlot(9), 'morning');
assert.equal(getDefaultSlot(10), 'afternoon');
assert.equal(getDefaultSlot(17), 'afternoon');
assert.equal(getDefaultSlot(18), 'evening');
assert.equal(getDefaultSlot(22), 'evening');
assert.equal(getDefaultSlot(4), 'evening');

function predict(params: Parameters<typeof computeWeatherFeatures>[0]): number {
  return computePerceptronFeel(initWeights(), featuresToArray(computeWeatherFeatures(params)));
}

const coldWindy = predict({
  tempC: -5,
  humidity: 45,
  windMps: 7,
  tmrt: 0,
  hour: 8,
  dayOfYear: 20,
});
const mild = predict({
  tempC: 20,
  humidity: 45,
  windMps: 2,
  tmrt: 0,
  hour: 13,
  dayOfYear: 135,
});
const hotHumid = predict({
  tempC: 33,
  humidity: 85,
  windMps: 1,
  tmrt: 0,
  hour: 13,
  dayOfYear: 205,
});
assert.ok(coldWindy < mild, 'cold/windy prior should predict cooler feel than mild weather');
assert.ok(mild < hotHumid, 'hot/humid prior should predict warmer feel than mild weather');
assert.ok(hotHumid >= 6, 'hot/humid prior should start near a hot feel bucket');

const hotDry = predict({
  tempC: 33,
  humidity: 35,
  windMps: 1,
  tmrt: 0,
  hour: 13,
  dayOfYear: 205,
});
assert.ok(hotHumid > hotDry, 'humidity should lift hot-weather prediction through heat index');

const coldCalm = predict({
  tempC: 5,
  humidity: 50,
  windMps: 0,
  tmrt: 0,
  hour: 8,
  dayOfYear: 20,
});
const coldGusty = predict({
  tempC: 5,
  humidity: 50,
  windMps: 10,
  tmrt: 0,
  hour: 8,
  dayOfYear: 20,
});
assert.ok(coldGusty < coldCalm, 'wind chill should lower cold-weather prediction');

const dryMild = predict({
  tempC: 18,
  humidity: 55,
  windMps: 2,
  tmrt: 0,
  precipMmh: 0,
  hour: 13,
  dayOfYear: 135,
});
const rainyMild = predict({
  tempC: 18,
  humidity: 55,
  windMps: 2,
  tmrt: 0,
  precipMmh: 8,
  hour: 13,
  dayOfYear: 135,
});
assert.ok(rainyMild < dryMild, 'precipitation should lower the prior feel prediction');

const utciReference = computeUtciCelsius({
  airTempC: 25,
  relativeHumidity: 60,
  meanRadiantTempC: 30,
  windMps: 2,
});
assert.ok(
  Math.abs(utciReference - 25.6337) < 0.001,
  'UTCI polynomial should match the reference implementation output'
);

assert.ok(
  computeOrdinalFeelFromUtci(-5) < computeOrdinalFeelFromUtci(20),
  'ordered UTCI calibration should preserve cold-to-neutral ordering'
);
assert.ok(
  computeOrdinalFeelFromUtci(20) < computeOrdinalFeelFromUtci(35),
  'ordered UTCI calibration should preserve neutral-to-hot ordering'
);

const legacyNeutral = new Array(12).fill(0);
legacyNeutral[11] = 4;
assert.notDeepEqual(
  Array.from(resolveWeights(legacyNeutral)),
  legacyNeutral,
  'legacy always-neutral weights should upgrade to weather-aware priors'
);

const learningFeatures = featuresToArray(computeWeatherFeatures({
  tempC: 22,
  humidity: 50,
  windMps: 1,
  tmrt: 0,
  hour: 13,
  dayOfYear: 135,
}));
const learner = initWeights();
const before = computePerceptronFeel(learner, learningFeatures);
for (let i = 0; i < 40; i++) updateWeights(learner, learningFeatures, 2);
const after = computePerceptronFeel(learner, learningFeatures);
assert.ok(Math.abs(after - 2) < Math.abs(before - 2), 'SGD should move prediction toward repeated personal feedback');

const envBase = computeEnvBase({
  temp: 16,
  humidity: 58,
  windMps: 1.5,
  tmrt_corrected: null,
  precipMmh: 0,
  hour: 18,
  date: new Date('2026-05-18T18:00:00+09:00'),
});
assert.ok(envBase >= 1 && envBase <= 7, 'env_base should stay on the 1-7 prediction scale');

const offsets = computeFeedbackOffsets({
  feel_score: 4,
  clothing: 2,
  activity: 2,
  outdoor_hours: 0,
  bmi_offset: 0,
  korea_baseline: 0.3,
});
assert.ok(offsets.weighted_feel >= 3.5, 'low outdoor exposure should not collapse weighted feel below the rating scale');
assert.ok(offsets.weighted_feel <= 7, 'weighted feel should remain on the 1-7 prediction scale');

console.log('formulas test passed');
