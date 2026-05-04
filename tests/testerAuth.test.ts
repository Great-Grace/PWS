import * as assert from 'node:assert/strict';
import {
  TESTER_AUTH_CONFIG_ERROR,
  isFigmaParitySessionId,
  isLocalTesterSessionId,
  normalizeTesterId,
  resolveDevTesterMode,
  resolveOptionalTesterAuthConfig,
  resolveTesterAuthConfig,
  testerSessionId,
} from '../src/utils/testerAuth';

assert.deepEqual(
  resolveTesterAuthConfig('  managed-secret  '),
  {
    password: 'managed-secret',
    allowAutoSignup: false,
  },
  '테스터 인증 설정은 공백 제거 후 자동 회원가입을 비활성화해야 한다'
);

assert.deepEqual(
  resolveOptionalTesterAuthConfig('  managed-secret  '),
  {
    password: 'managed-secret',
    allowAutoSignup: false,
  },
  '선택적 테스터 인증 설정도 공백 제거 후 DB 우선 로그인에 사용할 수 있어야 한다'
);

assert.equal(
  resolveOptionalTesterAuthConfig(undefined),
  null,
  '선택적 테스터 인증 설정은 비어 있어도 로컬 fallback 판단을 위해 null을 반환해야 한다'
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
  'figma-parity',
  'pws_dev는 Figma strict parity 검수용 홈 진입 계정이어야 한다'
);

assert.equal(
  resolveDevTesterMode('pws_onboard'),
  'onboarding-qa',
  'pws_onboard는 Android 온보딩 QA를 위해 미온보딩 상태로 진입해야 한다'
);

assert.equal(
  resolveDevTesterMode('unknown'),
  'simple-login',
  '테스터 브랜치에서는 임의의 유효 닉네임도 로컬 simple-login 세션으로 진입해야 한다'
);

assert.equal(
  testerSessionId('  WeatherFan  '),
  'dev-weatherfan',
  '로컬 테스터 세션 ID는 정규화된 닉네임에 dev prefix를 붙여야 한다'
);

assert.equal(
  isLocalTesterSessionId('dev-weatherfan', true),
  true,
  'dev 런타임의 로컬 테스터 세션은 Supabase 없이 앱을 사용할 수 있어야 한다'
);

assert.equal(
  isLocalTesterSessionId('dev-weatherfan', false),
  false,
  '배포 런타임에서는 로컬 테스터 세션 판정을 하지 않아야 한다'
);

assert.equal(
  isFigmaParitySessionId('dev-pws_dev', true),
  true,
  'pws_dev만 Figma parity 고정 데이터를 사용해야 한다'
);

assert.equal(
  isFigmaParitySessionId('dev-weatherfan', true),
  false,
  '일반 simple-login 닉네임은 Figma parity 고정 데이터를 사용하면 안 된다'
);

console.log('testerAuth test passed');
