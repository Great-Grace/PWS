import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const buildGradle = readFileSync('android/app/build.gradle', 'utf8');
const gradleProperties = readFileSync('android/gradle.properties', 'utf8');
const androidManifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
const appJson = readFileSync('app.json', 'utf8');
const appInfo = readFileSync('src/config/appInfo.ts', 'utf8');

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

console.log('releaseConfig test passed');
