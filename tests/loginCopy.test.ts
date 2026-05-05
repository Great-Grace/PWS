import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const loginSource = readFileSync('src/screens/LoginScreen.tsx', 'utf8');

for (const unsupportedProvider of [
  '카카오로 시작하기',
  'Google로 시작하기',
  '네이버로 시작하기',
  'Apple로 시작하기',
  '소셜 로그인으로 가입 시',
  '정식 소셜 로그인은 배포 버전에서 제공됩니다',
]) {
  assert.equal(
    loginSource.includes(unsupportedProvider),
    false,
    `Login should not advertise unsupported OAuth provider flow: ${unsupportedProvider}`
  );
}

assert.equal(
  loginSource.includes('테스터로 시작하기'),
  true,
  'Login should present the current tester access flow explicitly'
);

assert.equal(
  loginSource.includes('소셜 로그인은 현재 빌드에서 제공하지 않습니다'),
  true,
  'Login should disclose unsupported social login without promising a future release'
);

assert.equal(
  loginSource.includes('onPress={(event) => event.stopPropagation()}'),
  false,
  'Tester login sheet should not rely on nested Pressable propagation because iOS can swallow the start button tap'
);

assert.ok(
  /<KeyboardAvoidingView[\s\S]*pointerEvents="box-none"[\s\S]*<View style=\{styles\.modalCard\}/.test(loginSource),
  'Tester login sheet card should sit above the backdrop without wrapping the start button in another Pressable'
);

console.log('loginCopy test passed');
