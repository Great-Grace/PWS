import * as assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const settingsSource = readFileSync('legacy/expo-rn/src/screens/SettingsScreen.tsx', 'utf8');

assert.match(
  settingsSource,
  /<InfoActionRow label="이용약관" value="" onPress=\{showTerms\}/,
  'Settings should expose the terms document row as an actionable item'
);

assert.match(
  settingsSource,
  /<InfoActionRow label="개인정보 처리방침" value="" onPress=\{showPrivacyPolicy\}/,
  'Settings should expose the privacy document row as an actionable item'
);

assert.match(
  settingsSource,
  /onPress=\{handleDeleteAccount\}/,
  'Settings should expose an account deletion entry point'
);

assert.match(
  settingsSource,
  /accessibilityLabel="계정 삭제"/,
  'Account deletion entry point should have an explicit accessibility label'
);

console.log('settingsActions test passed');
