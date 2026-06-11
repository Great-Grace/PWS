#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const envPath = path.join(ROOT, '.env');
const dotEnv = loadDotEnv(envPath);

function envValue(name, fallback = '') {
  return process.env[name] || dotEnv[name] || fallback;
}

const testerId = envValue('PWS_SMOKE_TESTER_ID', 'pws_dev');
const testerEmail = `${testerId.trim().toLowerCase()}@test.pws`;
const otherTesterId = envValue('PWS_SMOKE_OTHER_TESTER_ID').trim().toLowerCase();
const today = pwsDate(new Date());
const writeFeedback = envValue('PWS_SMOKE_WRITE_FEEDBACK') === '1';
const cleanupFeedback = envValue('PWS_SMOKE_CLEANUP_FEEDBACK', '1') !== '0';
const smokeSlot = envValue('PWS_SMOKE_FEEDBACK_SLOT', 'evening');
const smokeDate = envValue('PWS_SMOKE_FEEDBACK_DATE', today);
const deleteAccount = envValue('PWS_SMOKE_DELETE_ACCOUNT') === '1';
const deleteTesterId = envValue('PWS_SMOKE_DELETE_TESTER_ID').trim().toLowerCase();
const deleteConfirm = envValue('PWS_SMOKE_DELETE_CONFIRM').trim().toLowerCase();

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [line.slice(0, index), line.slice(index + 1)];
      }),
  );
}

const env = {
  supabaseURL: envValue('EXPO_PUBLIC_SUPABASE_URL'),
  anonKey: envValue('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  testPassword: envValue('EXPO_PUBLIC_TEST_PASSWORD'),
};

async function main() {
  assertRequired(env.supabaseURL, 'EXPO_PUBLIC_SUPABASE_URL');
  assertRequired(env.anonKey, 'EXPO_PUBLIC_SUPABASE_ANON_KEY');
  assertRequired(env.testPassword, 'EXPO_PUBLIC_TEST_PASSWORD');

  const primaryAuth = await signInTester(testerEmail);
  const accessToken = primaryAuth.accessToken;
  const userId = primaryAuth.userId;

  const profile = await requestJSON(restURL('users', [
    ['id', `eq.${userId}`],
    ['select', 'id,email,nickname,onboarding_done'],
  ]), { headers: authHeaders(accessToken) });

  const weatherURL = `${trimSlash(env.supabaseURL)}/functions/v1/weather-onecall`;
  const invalidWeatherStatus = await expectHTTPFailure(weatherURL, {
    method: 'POST',
    headers: authHeaders('invalid-smoke-token'),
    body: JSON.stringify({ lat: 37.5665, lng: 126.978 }),
  }, [401, 403]);
  const weather = await requestJSON(weatherURL, {
    method: 'POST',
    headers: authHeaders(accessToken),
    body: JSON.stringify({ lat: 37.5665, lng: 126.978 }),
  });
  const unauthWeatherStatus = await expectHTTPFailure(weatherURL, {
    method: 'POST',
    headers: baseHeaders(false),
    body: JSON.stringify({ lat: 37.5665, lng: 126.978 }),
  }, [401, 403]);

  const todayFeedback = await requestJSON(restURL('feedback_entries', [
    ['user_id', `eq.${userId}`],
    ['feedback_date', `eq.${today}`],
    ['select', 'id,feedback_date,feedback_slot'],
    ['order', 'feedback_slot.asc'],
  ]), { headers: authHeaders(accessToken) });

  const history = await requestJSON(restURL('feedback_entries', [
    ['user_id', `eq.${userId}`],
    ['feedback_date', `gte.${pwsDate(addDays(new Date(), -30))}`],
    ['feedback_date', `lte.${today}`],
    ['select', 'id,feedback_date,feedback_slot'],
    ['order', 'feedback_date.desc,feedback_slot.asc'],
  ]), { headers: authHeaders(accessToken) });

  const countRows = await requestJSON(restURL('feedback_entries', [
    ['user_id', `eq.${userId}`],
    ['select', 'feedback_slot'],
  ]), { headers: authHeaders(accessToken) });
  const writeSmoke = writeFeedback
    ? await runFeedbackWriteSmoke(accessToken, userId)
    : { enabled: false };
  const crossUserSmoke = otherTesterId && otherTesterId !== testerId.trim().toLowerCase()
    ? await runCrossUserReadSmoke(otherTesterId, userId)
    : { enabled: false };
  const accountDeletionSmoke = deleteAccount
    ? await runAccountDeletionSmoke(testerId.trim().toLowerCase())
    : { enabled: false };

  const result = {
    status: 'pass',
    project: new URL(env.supabaseURL).host,
    testerEmail,
    userId: redactId(userId),
    profileRows: Array.isArray(profile) ? profile.length : 0,
    weatherCurrent: Boolean(weather?.current),
    invalidWeatherStatus,
    unauthWeatherStatus,
    todayFeedbackRows: Array.isArray(todayFeedback) ? todayFeedback.length : 0,
    historyRows: Array.isArray(history) ? history.length : 0,
    countRows: Array.isArray(countRows) ? countRows.length : 0,
    writeSmoke,
    crossUserSmoke,
    accountDeletionSmoke,
  };
  console.log(JSON.stringify(result, null, 2));
}

async function signInTester(email) {
  const auth = await requestJSON(`${trimSlash(env.supabaseURL)}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: baseHeaders(false),
    body: JSON.stringify({ email, password: env.testPassword }),
  });
  const accessToken = String(auth.access_token || '');
  const userId = String(auth.user?.id || '');
  assertRequired(accessToken, 'auth access_token');
  assertRequired(userId, 'auth user.id');
  return { accessToken, userId };
}

async function runCrossUserReadSmoke(otherId, primaryUserId) {
  const otherAuth = await signInTester(`${otherId}@test.pws`);
  const otherProfileView = await requestJSON(restURL('users', [
    ['id', `eq.${primaryUserId}`],
    ['select', 'id'],
  ]), { headers: authHeaders(otherAuth.accessToken) });
  const otherFeedbackView = await requestJSON(restURL('feedback_entries', [
    ['user_id', `eq.${primaryUserId}`],
    ['select', 'id'],
    ['limit', '1'],
  ]), { headers: authHeaders(otherAuth.accessToken) });
  const pass = Array.isArray(otherProfileView) && otherProfileView.length === 0
    && Array.isArray(otherFeedbackView) && otherFeedbackView.length === 0;
  if (!pass) {
    throw new Error('Cross-user RLS read smoke failed');
  }
  return {
    enabled: true,
    otherUserId: redactId(otherAuth.userId),
    blockedProfileRows: Array.isArray(otherProfileView) ? otherProfileView.length : 0,
    blockedFeedbackRows: Array.isArray(otherFeedbackView) ? otherFeedbackView.length : 0,
    pass,
  };
}

async function runFeedbackWriteSmoke(accessToken, userId) {
  const payload = {
    user_id: userId,
    feedback_date: smokeDate,
    feedback_slot: smokeSlot,
    feel_score: 4,
    humid_feel: 3,
    wind_feel: 1,
    clothing: 2,
    clothing_items: null,
    activity: 2,
    sun_exposure: 1,
    sleep: 2,
    outdoor_hours: 1,
  };
  const inserted = await requestJSON(restURL('feedback_entries', [
    ['select', 'id,feedback_date,feedback_slot'],
  ]), {
    method: 'POST',
    headers: {
      ...authHeaders(accessToken),
      Prefer: 'return=representation',
    },
    body: JSON.stringify(payload),
  });
  const insertedRow = Array.isArray(inserted) ? inserted[0] : null;
  assertRequired(insertedRow?.id, 'feedback write id');

  let cleanup = 'skipped';
  if (cleanupFeedback) {
    await requestJSON(restURL('feedback_entries', [
      ['id', `eq.${insertedRow.id}`],
    ]), {
      method: 'DELETE',
      headers: {
        ...authHeaders(accessToken),
        Prefer: 'return=minimal',
      },
    });
    cleanup = 'deleted';
  }

  return {
    enabled: true,
    cleanup,
    feedbackDate: insertedRow.feedback_date,
    feedbackSlot: insertedRow.feedback_slot,
    insertedId: redactId(String(insertedRow.id)),
  };
}

async function runAccountDeletionSmoke(primaryTesterId) {
  if (!deleteTesterId) {
    throw new Error('PWS_SMOKE_DELETE_TESTER_ID is required when PWS_SMOKE_DELETE_ACCOUNT=1');
  }
  if (deleteTesterId === primaryTesterId) {
    throw new Error('Refusing to run account deletion smoke against the primary smoke tester');
  }
  if (deleteConfirm !== `delete-${deleteTesterId}`) {
    throw new Error('PWS_SMOKE_DELETE_CONFIRM must equal delete-<PWS_SMOKE_DELETE_TESTER_ID>');
  }

  const deleteEmail = `${deleteTesterId}@test.pws`;
  const deleteAuth = await signInTester(deleteEmail);
  await requestJSON(`${trimSlash(env.supabaseURL)}/rest/v1/rpc/delete_own_account`, {
    method: 'POST',
    headers: authHeaders(deleteAuth.accessToken),
    body: '{}',
  });

  const signInAfterDeleteStatus = await expectSignInFailure(deleteEmail);
  return {
    enabled: true,
    deletedTesterEmail: deleteEmail,
    deletedUserId: redactId(deleteAuth.userId),
    signInAfterDeleteStatus,
    pass: true,
  };
}

async function expectSignInFailure(email) {
  const response = await fetch(`${trimSlash(env.supabaseURL)}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: baseHeaders(false),
    body: JSON.stringify({ email, password: env.testPassword }),
  });
  const text = await response.text();
  if (response.ok) {
    throw new Error(`Expected deleted tester sign-in to fail for ${email}`);
  }
  if (/(access_token|refresh_token)/i.test(text)) {
    throw new Error('Deleted tester sign-in failure response included session material');
  }
  return response.status;
}

function restURL(table, queryItems) {
  const url = new URL(`${trimSlash(env.supabaseURL)}/rest/v1/${table}`);
  queryItems.forEach(([key, value]) => url.searchParams.append(key, value));
  return url.toString();
}

function baseHeaders(withAuth, accessToken = '') {
  const headers = {
    apikey: env.anonKey,
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-client-info': 'pws-release-smoke',
  };
  if (withAuth) headers.Authorization = `Bearer ${accessToken}`;
  return headers;
}

function authHeaders(accessToken) {
  return baseHeaders(true, accessToken);
}

async function requestJSON(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} from ${safeURL(url)}: ${sanitize(text)}`);
  }
  return text ? JSON.parse(text) : null;
}

async function expectHTTPFailure(url, options, expectedStatuses) {
  const response = await fetch(url, options);
  const text = await response.text();
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`Expected ${expectedStatuses.join('/')} from ${safeURL(url)}, got HTTP ${response.status}: ${sanitize(text)}`);
  }
  return response.status;
}

function assertRequired(value, name) {
  if (!String(value || '').trim()) throw new Error(`Missing required ${name}`);
}

function pwsDate(date) {
  const shifted = new Date(date.getTime() - 5 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function trimSlash(value) {
  return value.trim().replace(/\/+$/, '');
}

function redactId(value) {
  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function safeURL(value) {
  const url = new URL(value);
  url.search = url.search ? '?...' : '';
  return url.toString();
}

function sanitize(value) {
  return String(value)
    .replaceAll(env.anonKey, '[redacted-anon-key]')
    .replaceAll(env.testPassword, '[redacted-password]')
    .replace(/"access_token"\s*:\s*"[^"]+"/g, '"access_token":"[redacted-token]"')
    .slice(0, 500);
}

main().catch((error) => {
  console.error(JSON.stringify({ status: 'fail', error: sanitize(error.message) }, null, 2));
  process.exit(1);
});
