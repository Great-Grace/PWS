#!/usr/bin/env node

const command = process.argv[2] || 'this command';

console.error(`[native-only] ${command} is disabled at the repository root.`);
console.error('[native-only] Build iOS from apps/ios-native/PWSNativePreview.xcodeproj.');
console.error('[native-only] Build Android from apps/android-native with npm run native:android:* scripts.');
console.error('[native-only] The old Expo/RN app is archived under legacy/expo-rn for reference only.');
process.exit(1);
