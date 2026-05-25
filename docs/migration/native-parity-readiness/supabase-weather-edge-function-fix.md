# Supabase Weather Edge Function Fix

Status: deployed v3; local latency hardening verified pending production deploy
Evidence status: partial-pass
Last checked: 2026-05-24 KST

## Closed Blocker

`npm run supabase:smoke` previously authenticated the configured smoke testers, then stopped at:

```json
{"error":"server_not_configured"}
```

The failing endpoint is the deployed Supabase Edge Function:

```text
https://lmnytisjnyyuxiuespjf.supabase.co/functions/v1/weather-onecall
```

The deployed function was missing the local runtime config fallback code and had no private OpenWeather provider key configured.

## Local Code Fix

The function at `supabase/functions/weather-onecall/index.ts` now supports both Supabase Edge Function key formats:

- Legacy hosted public/privileged key defaults
- New hosted JSON public/privileged key defaults

It also has a free-account fallback: when the private OpenWeather provider secret is not present, it uses the Open-Meteo Forecast API for current/hourly/daily weather fields while preserving Supabase JWT verification, auth checks, and cache writes.

2026-05-24 local latency/load hardening adds:

- 3.5s timeout around outbound weather-provider fetches.
- Fresh-cache fast return when `weather_cache.expires_at` is still valid.
- Stale-cache fallback for up to 6h when provider fetch fails.
- Stable `weather_provider_error` 502 only when no usable fresh/stale cache exists.

Optional private weather provider secret:

```text
OPENWEATHER_API_KEY
```

## Deployment

Supabase MCP deployed `weather-onecall` to project `lmnytisjnyyuxiuespjf`:

- Version 2: deployed hosted Supabase key fallback.
- Version 3: deployed Open-Meteo fallback for free-account/weather-keyless runtime.
- JWT verification remains enabled.

The 2026-05-24 timeout/stale-cache hardening is verified locally but not yet deployed to the live project. Deploy it only after explicit production-deploy approval.

## CLI Equivalent For Future Deployments

Requires a Supabase access token in the local CLI profile or `SUPABASE_ACCESS_TOKEN`.

```bash
npx supabase functions deploy weather-onecall --project-ref lmnytisjnyyuxiuespjf
npm run supabase:smoke
```

## Verification Already Run

```bash
npx deno check --config supabase/functions/weather-onecall/deno.json supabase/functions/weather-onecall/index.ts
```

Result: pass on 2026-05-18 KST.

Additional result after Open-Meteo fallback:

```bash
npx deno check --config supabase/functions/weather-onecall/deno.json supabase/functions/weather-onecall/index.ts
npm run supabase:smoke
PWS_SMOKE_WRITE_FEEDBACK=1 npm run supabase:smoke
```

Result: pass on 2026-05-18 KST. The sanitized live smoke proved Auth, profile read, weather current data, invalid/unauthenticated weather denial as HTTP 401, cross-user profile/feedback read denial, feedback insert, and feedback cleanup.

Additional 2026-05-24 verification:

```bash
npx deno check --config supabase/functions/weather-onecall/deno.json supabase/functions/weather-onecall/index.ts
npm run supabase:smoke
```

Result: pass. The live smoke was read-only for feedback/account-deletion write paths in this run.

## Re-run Notes

`smoke_delete_01@test.pws` was intentionally deleted during account-deletion proof. Before rerunning deletion smoke, create a new disposable account such as:

```text
smoke_delete_02@test.pws
```

Then update:

```env
PWS_SMOKE_DELETE_TESTER_ID=smoke_delete_02
PWS_SMOKE_DELETE_CONFIRM=delete-smoke_delete_02
```
