import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const buildGradle = readFileSync('legacy/expo-rn/android/app/build.gradle', 'utf8');
const gradleProperties = readFileSync('legacy/expo-rn/android/gradle.properties', 'utf8');
const androidManifest = readFileSync('legacy/expo-rn/android/app/src/main/AndroidManifest.xml', 'utf8');
const appJson = readFileSync('legacy/expo-rn/app.json', 'utf8');
const appInfo = readFileSync('legacy/expo-rn/src/config/appInfo.ts', 'utf8');
const supabaseConfig = readFileSync('legacy/expo-rn/src/config/supabase.ts', 'utf8');

const releaseBlockMatch = buildGradle.match(/release \{[\s\S]*?\n        \}/);
assert.ok(releaseBlockMatch, 'Android release build block should exist');
assert.equal(
  releaseBlockMatch![0].includes('signingConfig signingConfigs.debug'),
  false,
  'Release builds must not be signed with the debug keystore'
);

assert.ok(
  buildGradle.includes('PWS_UPLOAD_STORE_FILE'),
  'Release signing should be wired to explicit upload-keystore environment variables'
);

assert.equal(
  gradleProperties.includes('EX_DEV_CLIENT_NETWORK_INSPECTOR=true'),
  false,
  'Network inspector should not be enabled by default for release preparation'
);

for (const permission of [
  'android.permission.READ_EXTERNAL_STORAGE',
  'android.permission.WRITE_EXTERNAL_STORAGE',
  'android.permission.SYSTEM_ALERT_WINDOW',
]) {
  assert.equal(
    androidManifest.includes(permission),
    false,
    `${permission} should not be requested for the release app`
  );
}

assert.ok(
  appJson.includes('"version": "1.0.0"'),
  'Tester release should be labeled as Expo app version 1.0.0'
);

assert.ok(
  buildGradle.includes('versionCode 1') && buildGradle.includes('versionName "1.0.0"'),
  'Android tester release should use versionCode 1 and versionName 1.0.0'
);

assert.ok(
  appInfo.includes("APP_VERSION = '1.0.0'"),
  'In-app tester release version should display 1.0.0'
);

assert.equal(
  /const supabaseUrl = resolveRequiredPublicEnv\(process\.env[\s\S]*export function createSupabaseClient/.test(supabaseConfig),
  false,
  'Supabase env validation must not run before lazy client creation because EAS Update without env should not white-screen before ErrorBoundary'
);

assert.ok(
  supabaseConfig.includes('function getSupabaseClient') || supabaseConfig.includes('getSupabaseClient()'),
  'Supabase client creation should remain lazy so missing OTA env fails inside handled app flows, not at import time'
);

console.log('releaseConfig test passed');
