import * as assert from 'node:assert/strict';
import { shouldHoldBootScreen } from '../src/utils/bootState';

assert.equal(
  shouldHoldBootScreen({ isLoading: true, fontsLoaded: false, fontError: null }),
  true,
  'auth/session loading 중이면 부트 화면을 유지해야 한다'
);

assert.equal(
  shouldHoldBootScreen({ isLoading: false, fontsLoaded: false, fontError: null }),
  true,
  '폰트 로딩이 아직 안 끝났고 에러도 없으면 부트 화면을 유지해야 한다'
);

assert.equal(
  shouldHoldBootScreen({ isLoading: false, fontsLoaded: false, fontError: new Error('font failed') }),
  false,
  '폰트 로드 에러가 나면 무한 대기하지 말고 앱을 진행해야 한다'
);

assert.equal(
  shouldHoldBootScreen({ isLoading: false, fontsLoaded: true, fontError: null }),
  false,
  '로딩이 끝났고 폰트가 준비되면 앱을 진행해야 한다'
);

assert.equal(
  shouldHoldBootScreen({ isLoading: false, fontsLoaded: false, fontError: null, bootTimedOut: true }),
  false,
  '폰트 OTA asset 로딩이 오래 걸리면 무한 흰 화면 대신 fallback font로 앱을 진행해야 한다'
);

assert.equal(
  shouldHoldBootScreen({ isLoading: true, fontsLoaded: false, fontError: null, bootTimedOut: true }),
  false,
  '인증 초기화가 멈춰도 테스터 앱은 무한 부팅 화면 대신 로그인 화면으로 진행해야 한다'
);

console.log('bootState test passed');
