import * as assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  main: string;
  scripts: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  expo?: unknown;
};

const forbiddenRootPackages = [
  'expo',
  'react',
  'react-native',
  '@react-navigation/native',
  '@react-navigation/bottom-tabs',
  '@react-navigation/native-stack',
  'expo-updates',
  'expo-secure-store',
];

assert.equal(existsSync('legacy/expo-rn'), false, 'Expo/RN legacy source must not remain in the release workspace');
assert.equal(existsSync('apps/ios-native/PWSNativePreview.xcodeproj'), true, 'iOS native Xcode project must exist');
assert.equal(existsSync('apps/android-native/gradlew'), true, 'Android native Gradle wrapper must exist');
assert.equal(packageJson.main, 'scripts/native-only-command.js', 'root entrypoint must be native-only guidance');
assert.equal(packageJson.expo, undefined, 'root package must not keep Expo config');

for (const packageName of forbiddenRootPackages) {
  assert.equal(
    packageJson.dependencies?.[packageName],
    undefined,
    `root dependencies must not include ${packageName}`
  );
  assert.equal(
    packageJson.devDependencies?.[packageName],
    undefined,
    `root devDependencies must not include ${packageName}`
  );
}

for (const scriptName of ['start', 'android', 'ios', 'web', 'android:release']) {
  assert.match(
    packageJson.scripts[scriptName] ?? '',
    /native-only-command\.js/,
    `${scriptName} must not invoke Expo/RN tooling`
  );
}

const iOSLogin = readFileSync('apps/ios-native/PWSNativePreview/Features/Login/LoginScreen.swift', 'utf8');
assert.match(iOSLogin, /이메일로 로그인/, 'iOS native login must expose the current email login copy');
assert.doesNotMatch(iOSLogin, /앱 시작하기/, 'iOS native login must not show the removed tester-id start flow');

console.log('nativeReleaseSurface test passed');
