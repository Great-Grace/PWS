# PWS Native iOS Preview

SwiftUI-first native iOS migration target for PWS. This preview app runs beside the Expo/RN app until parity is approved.

Preview bundle id: `com.wxxtae.pws.nativepreview.ios`
Final bundle id placeholder: `com.wxxtae.pws`

## Build

From `app/`:

```bash
xcodegen generate --spec apps/ios-native/project.yml
xcodebuild -list -project apps/ios-native/PWSNativePreview.xcodeproj
xcodebuild build -project apps/ios-native/PWSNativePreview.xcodeproj -scheme PWSNativePreview -destination 'generic/platform=iOS Simulator' -derivedDataPath apps/ios-native/.build/DerivedData CODE_SIGNING_ALLOWED=NO
xcodebuild build-for-testing -project apps/ios-native/PWSNativePreview.xcodeproj -scheme PWSNativePreview -destination 'generic/platform=iOS Simulator' -derivedDataPath apps/ios-native/.build/DerivedData CODE_SIGNING_ALLOWED=NO
```

Simulator unit tests require at least one installed iOS simulator runtime and device:

```bash
xcrun simctl list runtimes
xcrun simctl list devices available
xcodebuild test -project apps/ios-native/PWSNativePreview.xcodeproj -scheme PWSNativePreview -destination 'platform=iOS Simulator,name=<device name>' -derivedDataPath apps/ios-native/.build/DerivedData CODE_SIGNING_ALLOWED=NO
```

As of the initial scaffold, Xcode and the iOS Simulator SDK are installed, but no simulator runtime/device is listed yet. Install an iOS simulator runtime before running device-backed tests.

## Physical Device

Xcode currently sees the paired iPhone `태우’s iPhone` with Developer Mode enabled. A paid Apple Developer Program account is not required for local development installs, but Xcode still needs a signed-in Apple ID/Personal Team so it can create a development provisioning profile.

From Xcode, open `PWSNativePreview.xcodeproj`, then use `Xcode > Settings > Accounts` to add the Apple ID and select the Personal Team under `Signing & Capabilities` for the `PWSNativePreview` target. If automatic signing rejects the current bundle id, change `com.wxxtae.pws.nativepreview.ios` to a unique id tied to the account.

```bash
xcrun devicectl list devices
xcodebuild -showdestinations -project apps/ios-native/PWSNativePreview.xcodeproj -scheme PWSNativePreview
xcodebuild build -project apps/ios-native/PWSNativePreview.xcodeproj -scheme PWSNativePreview -destination 'platform=iOS,id=<device id>' -derivedDataPath apps/ios-native/.build/DerivedData
```

## Scope

- SwiftUI native preview.
- No React Native runtime, Expo runtime, Metro, or JS bundle.
- Preserve `DESIGN.md` and strict-copy nodes before iOS-native refinement.
- Reuse RN/Supabase contracts for auth, users, weather, feedback, history, and local tester behavior.
