import * as assert from 'node:assert/strict';
import { resolvePredictionConfidence } from '../shared/domain/prediction';

assert.equal(
  resolvePredictionConfidence(100, false),
  'cold_start',
  '예보 데이터가 없으면 피드백이 많아도 확신도 높은 예측처럼 표시하면 안 된다'
);

assert.equal(
  resolvePredictionConfidence(6, true),
  'cold_start',
  '예보 데이터가 있어도 피드백이 부족하면 cold_start 여야 한다'
);

assert.equal(
  resolvePredictionConfidence(15, true),
  'medium',
  '예보 데이터가 있고 슬롯 피드백이 충분하면 기존 confidence 기준을 따른다'
);

console.log('prediction test passed');
