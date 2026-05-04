import * as assert from 'node:assert/strict';
import {
  TESTER_AUTH_CONFIG_ERROR,
  normalizeTesterId,
  resolveDevTesterMode,
  resolveTesterAuthConfig,
} from '../src/utils/testerAuth';

assert.deepEqual(
  resolveTesterAuthConfig('  managed-secret  '),
  {
    password: 'managed-secret',
    allowAutoSignup: false,
  },
  '테스터 인증 설정은 공백 제거 후 자동 회원가입을 비활성화해야 한다'
);

assert.throws(
  () => resolveTesterAuthConfig(undefined),
  (error) => {
    assert.equal(error instanceof Error, true);
    assert.equal((error as Error).message, TESTER_AUTH_CONFIG_ERROR);
    return true;
  },
  '테스터 비밀번호 설정이 없으면 즉시 차단해야 한다'
);

assert.equal(
  normalizeTesterId('  PWS_DEV  '),
  'pws_dev',
  '테스터 ID는 비교 전에 공백 제거와 소문자 정규화를 해야 한다'
);

assert.equal(
  resolveDevTesterMode('pws_dev'),
  'strict-parity',
  'pws_dev는 Figma strict parity 검수용 홈 진입 계정이어야 한다'
);

assert.equal(
  resolveDevTesterMode('pws_onboard'),
  'onboarding-qa',
  'pws_onboard는 Android 온보딩 QA를 위해 미온보딩 상태로 진입해야 한다'
);

assert.equal(
  resolveDevTesterMode('unknown'),
  null,
  '그 외 ID는 dev bypass를 타지 않아야 한다'
);

console.log('testerAuth test passed');
