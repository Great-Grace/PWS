# TestFlight QA Accounts

## Goal

Use a small, fixed account pool for first TestFlight QA so login, session restore, profile sync, feedback, history, settings, and account deletion can be tested without reusing ambiguous legacy users.

## Account Set

Main tester accounts:

| Tester | Email | Purpose |
| --- | --- | --- |
| Tester 1 | `pws_tf_01@test.pws` | Daily smoke, login, home, weather, feedback |
| Tester 2 | `pws_tf_02@test.pws` | Settings, relaunch restore, history accumulation |
| Tester 3 | `pws_tf_03@test.pws` | Cross-device / repeated build verification |

Disposable deletion accounts:

| Tester | Email | Purpose |
| --- | --- | --- |
| Delete 1 | `pws_delete_01@test.pws` | Account deletion smoke |
| Delete 2 | `pws_delete_02@test.pws` | Account deletion retry/regression |
| Delete 3 | `pws_delete_03@test.pws` | Spare disposable account |

Do not run account deletion on the `pws_tf_*` accounts.

## Setup Command

Dry-run:

```bash
npm run testflight:accounts
```

Apply to Supabase:

```bash
PWS_TESTFLIGHT_PASSWORD='<shared-qa-password>' \
SUPABASE_SERVICE_ROLE_KEY='<service-role-key>' \
npm run testflight:accounts -- --apply
```

Requirements:

- `EXPO_PUBLIC_SUPABASE_URL` must be present in `.env` or the shell.
- `SUPABASE_SERVICE_ROLE_KEY` must be provided only in the local shell or secret manager. Never commit it.
- `PWS_TESTFLIGHT_PASSWORD` must be at least 12 characters. Deliver it to testers outside Git.

The script is idempotent:

- Existing Auth users are updated with the current QA password and metadata.
- Missing Auth users are created with confirmed email.
- `public.users` profile rows are upserted with `onboarding_done = true`, Seoul defaults, notifications off, and neutral personalization defaults.

## Tester Instructions

1. Install the TestFlight build.
2. Choose email/password login.
3. Use the assigned `pws_tf_*` account.
4. If login appears stuck, use the app's session reset/sign-out flow, then retry.
5. Record build number, platform, account email, action, result, and screenshot for every bug.

## Build Source

TestFlight builds must come from the native iOS project:

```bash
open apps/ios-native/PWSNativePreview.xcodeproj
```

Archive the `PWSNativePreview` target. Do not use old cross-platform build commands for TestFlight. If the login button says `앱 시작하기`, the uploaded build is stale or came from an old commit.

## QA Matrix

| Flow | Account |
| --- | --- |
| Fresh login | `pws_tf_01@test.pws` |
| Force-close and relaunch session restore | `pws_tf_01@test.pws` |
| Weather fetch | `pws_tf_01@test.pws` |
| Feedback submit | `pws_tf_02@test.pws` |
| History after feedback | `pws_tf_02@test.pws` |
| Settings update/sign-out/re-login | `pws_tf_03@test.pws` |
| Account deletion | `pws_delete_01@test.pws` |

## Reset Rules

- If one tester is blocked, reset only that account's password/profile with the setup script.
- If account deletion succeeds, recreate disposable accounts with the setup script before the next QA cycle.
- Keep legacy accounts available for reference, but do not use them for first TestFlight QA.

## References

- Supabase Auth Admin methods require a trusted server-side client with a secret/service role key.
- `createUser` can set `email_confirm` so QA accounts do not depend on email confirmation or redirect links.
- `updateUserById` can refresh password, metadata, and email confirmation for existing users.
