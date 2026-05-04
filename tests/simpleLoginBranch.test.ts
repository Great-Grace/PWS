import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const authStoreSource = readFileSync('src/stores/authStore.ts', 'utf8');
const settingsSource = readFileSync('src/screens/SettingsScreen.tsx', 'utf8');
const packageSource = readFileSync('package.json', 'utf8');

assert.match(
  authStoreSource,
  /resolveOptionalTesterAuthConfig\(process\.env\.EXPO_PUBLIC_TEST_PASSWORD\)/,
  'Tester branch should read the shared tester password as an optional DB-first login setting'
);

assert.ok(
  authStoreSource.indexOf('const config = resolveOptionalTesterAuthConfig') <
    authStoreSource.indexOf("if (__DEV__ && devTesterMode === 'simple-login')"),
  'Existing registered testers should get a Supabase login attempt before local simple-login fallback'
);

assert.match(
  authStoreSource,
  /if \(__DEV__ && devTesterMode && devTesterMode !== 'simple-login'\)/,
  'Dedicated QA IDs should still bypass DB auth before the generic tester flow'
);

assert.match(
  authStoreSource,
  /devTesterMode === 'onboarding-qa' \? null : createDevUser\(normalized\)/,
  'Only pws_onboard should remain onboarding QA; normal nicknames should enter the app immediately'
);

assert.match(
  authStoreSource,
  /if \(!signInError\) \{[\s\S]*set\(\{ testerId: normalized \}\);[\s\S]*return;[\s\S]*\}/,
  'Successful Supabase login should keep the real DB-backed tester session and accumulated data'
);

assert.match(
  authStoreSource,
  /if \(!__DEV__ \|\| !signInError\.message\.includes\('Invalid login credentials'\)\)/,
  'Published tester builds should not silently fall back to local data when DB credentials are invalid'
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
