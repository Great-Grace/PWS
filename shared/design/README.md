# Shared Design Contract

## Canonical Source
- Read `DESIGN.md` before changing PWS UI.
- The strict-copy policy in `DESIGN.md` is the design contract for app screens.
- This directory is only an index for shared design references; it does not replace `DESIGN.md`.

## Visual Rules
- Preserve the PWS/Figma journey, information meaning, and data flow first.
- Prefer RN-native polish when strict pixel parity would make the app brittle.
- Use the single global action blue from `DESIGN.md`.
- Keep Korean copy concise and product-like.
- Avoid extra gradients, emoji-led navigation, heavy shadows, nested cards, and extra accent color families.

## Figma Strict-Copy Surface
- Figma file: `Temp_app_DesignSystem`.
- Strict-copy page: `PWS_STRICT_COPY_ANDROID_2026-05-03`.
- Page id: `94:2`.
- Handoff metadata namespace: `pws.strictCopy`.

## Strict Nodes
| Screen | Strict Node | Source Node | Policy |
| --- | --- | --- | --- |
| Home | `94:8` | `82:2` | Android runtime with tabs |
| Feedback | `94:174` | `84:2` | Source parity |
| History | `94:347` | `84:174` | Source parity |
| Settings | `94:625` | `84:451` | Source parity |
| WeatherDetail | `94:863` | `84:688` | Source parity |

## Deviation Rule
- Intentional deviations from strict-copy must improve runtime stability, native polish, clarity, or real-user behavior.
- Dev parity sessions should align static demo data and default selected states to strict-copy screens.
- Production behavior may remain contextual when it is better for real users.
