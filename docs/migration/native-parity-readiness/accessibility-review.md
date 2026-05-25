# Accessibility Review: iOS Native Parity Slice

Date: 2026-05-06

Status: implemented-with-runtime-audit-blockers
Evidence status: `blocked`

## Summary

The SwiftUI parity slice now includes explicit accessibility labels/hints for primary controls, semantic headers for major screen titles, minimum 44pt interactive targets, single-blue contrast discipline, and Dynamic Type-friendly system typography.

2026-05-17 KST update: XcodeBuildMCP captured an iOS login-shell accessibility hierarchy on iPhone 17 iOS 26.4. The visible hierarchy includes app label `PWS Native`, heading `날씨 체감 기록`, tester-id text field `테스터 아이디` with help text, disabled `테스터로 시작하기` button with help text, privacy copy, and footer `PWS Native Preview`. This is partial login-shell evidence only; authenticated flow VoiceOver/Dynamic Type/safe-area evidence remains blocked.

## Per-screen Status

| Screen | Dynamic Type | VoiceOver Semantics | Touch Targets | Contrast | Keyboard/Focus | Safe Area/Small Screen |
| --- | --- | --- | --- | --- | --- | --- |
| Login | Uses system fonts and scaling; hero text has minimum scale | Tester field and CTA labeled with hints | Text field/CTA >= 44pt | Blue CTA and dark text on parchment/white | Focus state shown on tester field | Needs simulator screenshot confirmation |
| Home | System fonts, wrapping cards | Header and cards combine related values | Weather detail link >= 44pt | Single blue for action/status | No text input | Needs simulator screenshot confirmation |
| Feedback | System fonts, adaptive chip grid | Slot, clothing, and scale buttons expose selection state | Chips and scale buttons >= 44pt | Selected blue/white, unselected pearl/ink | No keyboard path | Needs simulator screenshot confirmation |
| History | System fonts and multiline empty copy | Entries combine date/slot/feel/outfit | Segment buttons >= 44pt | Dark text and blue metadata | No keyboard path | Needs simulator screenshot confirmation |
| Settings | System fonts and native toggles | Toggles, feedback, sign-out controls labeled | Rows/toggles/buttons >= 44pt | Native controls tinted single blue | Feedback sheet TextEditor labeled | Needs simulator screenshot confirmation |
| Weather Detail | System fonts, forecast rows wrap | Region field and forecast rows labeled/combined | Segments and rows >= 44pt | User-safe warning/info banners | Region TextField labeled | Needs simulator screenshot confirmation |

## Blockers

- VoiceOver reading order was designed in code but not audited on-device.
- Dynamic Type at accessibility sizes was considered through system fonts, wrapping, and minimum scale, but not visually captured.
- Keyboard/safe-area behavior for login and weather detail text fields requires simulator/device evidence.
- Full simulator accessibility evidence is still blocked by the Xcode/runtime mismatch and invalid tester credentials. Login-shell hierarchy evidence exists, but authenticated flow VoiceOver, Dynamic Type, keyboard, and safe-area confirmation remain open.

## Severity

No known high-severity accessibility issue in code. Remaining items are evidence blockers tied to unavailable simulator/device capture.
