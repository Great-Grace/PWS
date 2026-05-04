# Figma-First Frontend Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current frontend with a Figma-first React Native implementation while preserving app logic and data integrations.

**Architecture:** Rebuild app shell, onboarding, and tab screens around Figma-aligned tokens and small reusable primitives. Reuse existing Zustand stores and Supabase wiring, expanding only the interfaces required to support the migrated flow.

**Tech Stack:** Expo 54, React Native 0.81, TypeScript, React Navigation, Zustand, Supabase

---

### Task 1: Lock migration scaffolding

**Files:**
- Modify: `src/theme/index.ts`
- Create: `src/ui/` (shared primitives as needed)
- Test: `tests/`

- [ ] Align theme tokens to Figma neutrals, typography, borders, button states, and accent colors.
- [ ] Add reusable UI building blocks for bottom CTA bars, card rows, field shells, and segmented buttons.
- [ ] Keep the primitive set intentionally small; only introduce components reused by 2+ screens.

### Task 2: Rebuild auth entry + onboarding shell

**Files:**
- Modify: `App.tsx`
- Modify: `src/stores/authStore.ts`
- Modify: `src/screens/LoginScreen.tsx`
- Modify: `src/screens/OnboardingScreen.tsx`
- Create: onboarding helpers if needed under `src/utils/`
- Test: onboarding helper tests under `tests/`

- [ ] Make tester login feel like a product auth entry, not a separate debug-only screen.
- [ ] Split onboarding into explicit steps that mirror the design intent.
- [ ] Keep tester auth as the transport mechanism only; route the user through the same post-auth onboarding structure.
- [ ] Preserve profile persistence, `isOnboarded`, and navigation gating.

### Task 3: Replace Home + Feedback screens

**Files:**
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/FeedbackScreen.tsx`
- Modify shared UI files introduced in Task 1

- [ ] Rebuild Home against the Figma layout while preserving weather/frequency/prediction wiring.
- [ ] Rebuild Feedback against the Figma structure while preserving 3-slot feedback behavior and submission.
- [ ] Add loading/error/empty states in the same visual language when Figma does not define them.

### Task 4: Replace History + Settings screens

**Files:**
- Modify: `src/screens/HistoryScreen.tsx`
- Modify: `src/screens/SettingsScreen.tsx`
- Modify shared UI files introduced in Task 1

- [ ] Rebuild History calendar/detail presentation in the Figma tone while preserving fetch and slot detail behavior.
- [ ] Rebuild Settings/profile/preferences/account actions in the Figma tone while preserving update and sign-out flows.
- [ ] Keep destructive actions explicit and visually distinct.

### Task 5: Detail/polish pass

**Files:**
- Modify: `src/screens/WeatherDetailScreen.tsx`
- Modify: `src/components/OfflineBanner.tsx`
- Modify: `src/components/ErrorBoundary.tsx`
- Modify: any touched screens/components

- [ ] Bring supporting screens/components into the same design system.
- [ ] Remove obvious visual leftovers from the legacy FE.
- [ ] Verify safe-area, keyboard, and sticky CTA behavior on long screens.

### Task 6: Verification

**Files:**
- Modify: test files as needed

- [ ] Run `npx tsc --noEmit`
- [ ] Run available node/assert regression tests
- [ ] Run `git diff --check`
- [ ] If Expo native export remains available, run Android export smoke verification
- [ ] Document remaining visual gaps and platform-specific follow-ups
