import * as assert from 'node:assert/strict';
import {
  getFeelGuideMessage,
  getOutfitGuideByTemp,
  getWeatherGuideRows,
  getWeatherReadyCards,
} from '../src/utils/weatherCopy';

assert.equal(
  getFeelGuideMessage(null),
  '기록이 쌓이면 더 정확한 체감 예측을 보여드릴게요',
  'missing prediction should not pretend to know the user feel'
);

assert.equal(
  getFeelGuideMessage(2, 'high'),
  '많이 쌀쌀하게 느껴질 가능성이 높아요',
  'high-confidence cold predictions should be direct but still probabilistic'
);

assert.equal(
  getFeelGuideMessage(5, 'low'),
  '조금 덥게 느껴질 수 있어요',
  'low-confidence predictions should soften certainty'
);

const guideRows = getWeatherGuideRows({
  morning: { feel: 2, confidence: 'high', temp: 5, humidity: 50 },
  afternoon: { feel: 4, confidence: 'medium', temp: 20, humidity: 45 },
  evening: { feel: null as unknown as number, confidence: 'cold_start', temp: null, humidity: null },
});
assert.deepEqual(
  guideRows.map((row) => row.label),
  ['아침 (06-10시)', '낮 (10-18시)', '저녁 (18-22시)'],
  'guide rows should keep the three daily slots'
);
assert.equal(
  guideRows[2].message,
  '기록이 쌓이면 더 정확한 체감 예측을 보여드릴게요',
  'cold-start slots should be transparent about prediction limits'
);

const unknownCards = getWeatherReadyCards({});
assert.equal(
  unknownCards.some((card) => card.title.includes('비') || card.title.includes('우산') || card.title.includes('선크림')),
  false,
  'missing weather inputs should not create concrete rain or UV advice'
);
assert.equal(
  unknownCards.every((card) => card.detail.includes('확정') || card.detail.includes('단정')),
  true,
  'missing weather inputs should explain why advice is not definitive'
);

const rainyCards = getWeatherReadyCards({ precipitationProbability: 70 });
assert.equal(
  rainyCards.find((card) => card.tone === 'purple')?.title,
  '우산을 챙기는 게 좋아요',
  'high precipitation probability should advise an umbrella'
);

assert.deepEqual(
  getOutfitGuideByTemp(29, { pop: 0.7, wind_speed: 8, humidity: 85 }).day,
  ['통풍 좋은 반팔', '가벼운 하의', '방수 자켓', '바람막이', '통풍 좋은 소재'],
  'hot rainy windy humid days should add weather-specific outfit layers'
);

console.log('weatherCopy test passed');
