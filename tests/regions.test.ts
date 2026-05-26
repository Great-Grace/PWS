import * as assert from 'node:assert/strict';
import { DISTRICT_COORDS, KOREA_REGIONS, resolveDistrictCoords } from '../legacy/expo-rn/src/utils/regions';

for (const region of KOREA_REGIONS) {
  for (const district of region.districts) {
    const address = `${region.province} ${district}`;
    assert.ok(
      DISTRICT_COORDS[address],
      `KOREA_REGIONS entry must have representative coordinates: ${address}`
    );
  }
}

assert.deepEqual(
  resolveDistrictCoords('서울특별시 강남구'),
  DISTRICT_COORDS['서울특별시 강남구'],
  'known district should resolve to its representative coordinates'
);

assert.throws(
  () => resolveDistrictCoords('없는시 없는구'),
  /Unknown district coordinates: 없는시 없는구/,
  'unknown district should fail explicitly instead of falling back to Seoul'
);

console.log('regions test passed');
