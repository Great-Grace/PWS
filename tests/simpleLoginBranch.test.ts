import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const authStoreSource = readFileSync('src/stores/authStore.ts', 'utf8');
const settingsSource = readFileSync('src/screens/SettingsScreen.tsx', 'utf8');
const packageSource = readFileSync('package.json', 'utf8');

assert.match(
  authStoreSource,
  /if \(__DEV__ && devTesterMode\)/,
  'Tester branch dev login should resolve local sessions before reading Supabase password env'
);

assert.ok(
  authStoreSource.indexOf('if (__DEV__ && devTesterMode)') <
    authStoreSource.indexOf('const { password, allowAutoSignup } = resolveTesterAuthConfig'),
  'Simple-login dev branch must not require EXPO_PUBLIC_TEST_PASSWORD before local session creation'
);

assert.match(
  authStoreSource,
  /devTesterMode === 'onboarding-qa' \? null : createDevUser\(normalized\)/,
  'Only pws_onboard should remain onboarding QA; normal nicknames should enter the app immediately'
);

assert.match(
  authStoreSource,
  /const \{ password, allowAutoSignup \} = resolveTesterAuthConfig/,
  'Non-dev deployment path should still keep the managed Supabase tester auth branch reachable'
);

assert.match(
  settingsSource,
  /if \(localTesterMode\) \{[\s\S]*테스터 피드백이 로컬 테스트 환경에서 확인되었습니다/,
  'Local tester feedback should not call Supabase in Expo Go simple-login mode'
);

assert.match(
  settingsSource,
  /if \(localTesterMode\) \{[\s\S]*await signOut\(\);[\s\S]*return;[\s\S]*\}[\s\S]*supabase\.rpc\('delete_own_account'\)/,
  'Local tester account deletion should sign out locally before the Supabase RPC path'
);

assert.equal(
  packageSource.includes('tests/simpleLoginBranch.test.ts'),
  true,
  'npm test should run the simple-login branch policy test'
);

console.log('simpleLoginBranch test passed');
