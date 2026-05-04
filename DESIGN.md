# PWS DESIGN.md

## 1. Visual Theme & Atmosphere

PWS is a React Native weather-feel diary. The UI should feel calm, precise, and native: Figma defines the product journey and screen structure, while the Apple-inspired reference provides restraint, whitespace, typography hierarchy, and a single-action-color discipline.

This is not an Apple clone. PWS keeps its own Korean weather, clothing, and body-feel language. Use Apple as a refinement layer: fewer decorations, more breathing room, quieter surfaces, and clearer primary actions.

Priority order:

1. Preserve the PWS/Figma journey, information meaning, and data flows.
2. Prefer RN-native polish over Figma pixel parity when the two conflict.
3. Use visual refinement only when it improves clarity, confidence, or perceived quality.
4. Keep decorative gradients, emoji, heavy shadows, and nested cards rare.

## 2. Color Palette & Roles

Use a light-dominant, parchment-neutral app surface.

| Token | Hex | Role |
| --- | --- | --- |
| `background` | `#F5F5F7` | App canvas, scroll backgrounds, quiet section bands |
| `surface` | `#FFFFFF` | Primary cards, inputs, sheets |
| `surfaceSecondary` | `#FAFAFC` | Pearl surface for secondary fills |
| `textPrimary` | `#1D1D1F` | Near-black ink for titles and body |
| `textSecondary` | `#515154` | Supporting copy |
| `textTertiary` | `#86868B` | Placeholder, metadata, disabled labels |
| `accent` | `#0066CC` | The only global action blue |
| `accentLight` | `#0071E3` | Press/focus variant |
| `border` | `#E5E5EA` | Hairline borders |
| `divider` | `#D2D2D7` | Stronger separators |

Rules:

- All navigation, confirmation, and link actions use `accent`.
- Do not introduce a second dominant accent color.
- Weather-feel colors may remain domain-specific, but they should appear as data visualization, not decoration.
- Prefer surface alternation and spacing over colorful containers.

## 3. Typography Rules

Use system typography and PWS's Korean font support. On iOS this should read close to SF Pro; on Android it should remain clean and native.

| Role | Size | Weight | Line Height | Use |
| --- | ---: | ---: | ---: | --- |
| Display | 40 | 600 | 44-48 | Home hero and major screen titles |
| Title | 30 | 600 | 36 | Screen titles |
| Section | 20-21 | 600 | 26-28 | Section headers |
| Body | 17 | 400 | 24-25 | Main copy and form labels |
| Body Strong | 17 | 600 | 22-24 | Row titles and selected values |
| Caption | 13-14 | 400 | 18-20 | Metadata, helper text |
| Legal | 11-12 | 400 | 16 | Terms and fine print |

Rules:

- Prefer 600 over 700 for polished titles.
- Keep body copy at 17px where layout allows.
- Avoid negative letter spacing in RN unless a specific screen has been visually verified.
- Korean copy should be short, direct, and product-like.

## 4. Component Styling

### Buttons

- Primary buttons are full pill controls: blue fill, white text, min height 44px.
- Secondary buttons are white or pearl pills with a 1px hairline and blue or ink text.
- Pressed state should be subtle: opacity or scale, not a new color system.
- Avoid decorative gradient buttons except when a Figma frame explicitly depends on them.

### Cards And Sections

- Use fewer cards. A screen should read as grouped sections, not a stack of boxes.
- Cards use white fill, 18px radius, 1px hairline, and no decorative shadow.
- Use the single soft shadow only for hero-like “object resting on surface” moments.
- Do not nest cards inside cards.

### Inputs And Forms

- Inputs use white fill, pill or 18px radius, 1px hairline, and 17px text.
- Validation copy is calm and specific.
- Forms should prioritize vertical rhythm and easy one-handed scanning.

### Icons

- Prefer simple text labels or restrained symbols.
- Emoji should not carry core UI structure.
- Social login marks may remain as temporary placeholders until real provider assets are introduced.

## 5. Layout Principles

Spacing scale:

- `4`, `8`, `12`, `17`, `24`, `32`, `48`
- Screen horizontal padding: `24`
- Minimum touch target: `44`
- Section gap: `32`

Screen rules:

- Login and onboarding should feel centered, calm, and low-density.
- Home should present one dominant weather insight, two to three supporting insights, then lower-priority actions.
- Feedback should make recording fast: clear slot, clear scale, clear submit.
- History and Settings should read as native app utility screens with predictable rows.
- Sticky CTAs are allowed when they reduce decision cost, but they should be simple and quiet.

## 6. Depth & Elevation

Depth comes from:

1. Surface color changes.
2. Hairline borders.
3. Spacing.
4. A single soft product-like shadow when a hero surface needs weight.

Avoid:

- Large card shadows.
- Gradient backgrounds used only for atmosphere.
- Orbs, glow blobs, or decorative abstract shapes.
- Heavy elevation differences between adjacent utility rows.

## 7. Figma To RN Policy

The canonical handoff surface is now:

- Figma file: `Temp_app_DesignSystem`
- Strict-copy page: `PWS_STRICT_COPY_ANDROID_2026-05-03`
- Page id: `94:2`
- Handoff metadata namespace: `pws.strictCopy`

Strict-copy screen nodes:

| Screen | Strict Node | Source Node | Policy |
| --- | --- | --- | --- |
| Home | `94:8` | `82:2` | Android runtime with tabs |
| Feedback | `94:174` | `84:2` | Source parity |
| History | `94:347` | `84:174` | Source parity |
| Settings | `94:625` | `84:451` | Source parity |
| WeatherDetail | `94:863` | `84:688` | Source parity |

Figma strict-copy remains the source of truth for:

- Flow order.
- Screen intent.
- Component hierarchy.
- Copy meaning.
- Required interaction states.

RN-native refinement may override Figma when:

- Exact pixel parity creates brittle layout.
- A Figma effect does not translate well to Android/iOS.
- Typography baseline differences make the screen feel less polished.
- A simpler native primitive makes the workflow clearer.

Every intentional deviation should improve the product, not merely simplify implementation.

Strict-copy rule:

- Treat the strict-copy page as the first reference, not the older loose Figma frames.
- Preserve screen hierarchy, visible copy, selected/default states, spacing rhythm, and section order unless there is a platform stability reason.
- In dev parity mode (`dev-*` local tester sessions), align static demo data and default selected states to the strict-copy screen.
- Production behavior may remain contextual, for example time-based defaults, when that is better for real users.

## 8. Do's And Don'ts

Do:

- Use the single action blue consistently.
- Let whitespace carry premium feeling.
- Prefer fewer, stronger information groups.
- Make primary actions unmistakable.
- Keep Korean copy human and concise.

Don't:

- Chase pixel parity at the expense of RN stability.
- Add extra gradients because a screen feels empty.
- Use multiple accent families in the same screen.
- Depend on emoji for production navigation.
- Add shadows to make hierarchy when spacing or typography can do it.

## 9. Agent Prompt Guide

When changing UI, follow this sequence:

1. Read this file first.
2. Identify the Figma intent for the screen.
3. Preserve data, navigation, and store behavior.
4. Apply Apple-inspired refinement as a restraint layer.
5. Verify with typecheck, tests, and runtime screenshots when possible.

Ready prompt:

> Refine this PWS React Native screen using `DESIGN.md`: preserve the Figma product flow and existing data behavior, but make the UI calmer, more spacious, and more native. Use the single action blue, white/parchment surfaces, 17px body rhythm, 18px utility cards, pill CTAs, and minimal shadows.
