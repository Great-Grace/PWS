# Figma-First Frontend Migration Design

**Date:** 2026-04-13  
**Design source of truth:** Figma `Temp_app_DesignSystem` (`ILrTGTBxCs8IxI5Pll8v8y`)  
**Status:** approved for execution

## Goal

Replace the current React Native frontend with a Figma-first implementation that treats the existing app UI as legacy. Reuse data, auth, weather, and feedback logic where possible, but rebuild screen structure, layout, and UI states to match the designer's work as closely as React Native/Expo allows.

## Product decisions locked

1. **Figma is the source of truth** for layout, step order, CTA structure, copy hierarchy, and component styling.
2. **Legacy UI is not a design baseline.** Existing screens are only reference material for:
   - store wiring
   - API/Supabase integration
   - navigation/data dependencies
3. **Onboarding flow must be fully migrated**, even during Expo Go development.
4. **Tester login is only an auth transport substitute.** After auth, the flow should match the intended product onboarding.
5. **Visual target is near-perfect sync**. Small platform/text rendering differences are acceptable for now; structural and interaction fidelity are not.
6. **Figma-missing states** (loading, empty, error, offline) should be added in the same tone, then reviewed later with design feedback.

## Scope

### In scope
- App shell / navigation polish
- Login/auth entry redesign
- Full onboarding step flow redesign
- Main tab UI replacement:
  - Home
  - Feedback
  - History
  - Settings
- Supporting detail screens that are part of those journeys
- Shared design tokens and reusable UI primitives needed for fidelity

### Out of scope for this pass
- Production social auth callback implementation
- Android-native/Java-only polish work
- Backend schema changes unless required to avoid blocking the frontend migration

## Architecture

### UI architecture
- Introduce a **Figma-aligned visual token layer** in `src/theme/index.ts`
- Rebuild screens around **screen-local composition** plus a small reusable UI primitive set
- Keep navigation routes stable where possible to reduce downstream logic churn

### State/data architecture
- Preserve Zustand stores:
  - `src/stores/authStore.ts`
  - `src/stores/weatherStore.ts`
  - `src/stores/feedbackStore.ts`
- Expand store contracts only where needed to support the migrated flow
- Avoid introducing new dependencies unless absolutely necessary

### Onboarding architecture
- Decouple:
  - **auth method**
  - **onboarding step progression**
  - **profile persistence**
- Expo Go mode continues using tester login
- Post-auth flow should feel like the real product:
  - agreement step
  - document viewer(s)
  - profile step(s)
  - any required setup step such as location

## Screen migration strategy

### Phase 1 — app shell + onboarding foundation
- Align theme and shared primitives to Figma
- Rebuild login entry
- Rebuild onboarding into explicit steps instead of one long legacy form

### Phase 2 — main tab replacement
- Replace each tab UI with Figma-first layout
- Preserve store/data behavior
- Add design-matched loading/error/empty states

### Phase 3 — edge-case polish
- Verify navigation transitions, safe-area behavior, keyboard handling, and CTA states
- Tune any remaining mismatches that are feasible inside React Native/Expo

## Acceptance criteria

1. App routes follow the Figma journey rather than the legacy FE journey.
2. Tester login is visually integrated as an auth substitute, not a separate product concept.
3. Onboarding is multi-step and no longer a single generic form.
4. Main tab screens are visually rebuilt against the Figma design language.
5. Existing data flows (weather fetch, feedback submission, profile persistence, sign-out, history fetch) still work.
6. Typecheck and static verification pass after the migration.

## Risks

### Missing exact Figma coverage for some screens
- Mitigation: implement Figma-first structure now, then tighten any remaining screen-specific gaps as more frame context is extracted.

### Backend schema not yet aligned to richer onboarding metadata
- Mitigation: preserve visual flow immediately; persist only supported fields until backend/schema changes land.

### Expo Go interaction limitations
- Mitigation: keep the step order and visuals aligned now; defer platform-specific auth/callback mechanics to the production auth phase.

## Implementation notes

- Do **not** treat the current screen code as sacred.
- Prefer replacing large screen bodies over layering more conditional legacy styling.
- Preserve verification discipline after each major slice.
