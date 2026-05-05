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
  authStoreSource.indexOf('resolveOptionalTesterAuthConfig(process.env.EXPO_PUBLIC_TEST_PASSWORD)') <
    authStoreSource.indexOf("if (devTesterMode === 'simple-login')"),
  'Existing registered testers should get a Supabase login attempt before local simple-login fallback'
);

assert.match(
  authStoreSource,
  /if \(devTesterMode && devTesterMode !== 'simple-login'\)/,
  'Dedicated QA IDs should still bypass DB auth before the generic tester flow'
);

assert.match(
  authStoreSource,
  /devTesterMode === 'onboarding-qa' \? null : createDevUser\(normalized\)/,
  'Only pws_onboard should remain onboarding QA; normal nicknames should enter the app immediately'
);

assert.match(
  authStoreSource,
  /if \(!signInError\) \{[\s\S]*user: session \? createTesterFallbackUser\(normalized, session\.user\.id, email\) : null,[\s\S]*isOnboarded: true,[\s\S]*void get\(\)\.fetchUserProfile\(\);[\s\S]*return;[\s\S]*\}/,
  'Successful Supabase login should enter immediately and refresh accumulated DB data asynchronously'
);

assert.match(
  authStoreSource,
  /if \(!signInError\.message\.includes\('Invalid login credentials'\)\)/,
  'Network and non-credential auth errors should still surface instead of local fallback'
);

assert.match(
  authStoreSource,
  /if \(devTesterMode === 'simple-login'\) \{[\s\S]*session: createDevSession\(normalized\)/,
  'Expo Go published tester bundles should fallback locally when no registered DB credentials match'
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
