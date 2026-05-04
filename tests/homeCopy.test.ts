import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const homeSource = readFileSync('src/screens/HomeScreen.tsx', 'utf8');

assert.equal(
  homeSource.includes('PM2.5'),
  false,
  'Home should not display hardcoded PM2.5 values without air-quality data'
);

assert.equal(
  homeSource.includes('미세먼지 높음'),
  false,
  'Home should not claim fine-dust status without air-quality data'
);

assert.equal(
  homeSource.includes('미세먼지 농도가 낮아집니다'),
  false,
  'Home should not imply fine-dust trends without air-quality data'
);

console.log('homeCopy test passed');
