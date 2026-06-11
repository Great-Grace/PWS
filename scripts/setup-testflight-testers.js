#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@supabase/supabase-js');

const ROOT = path.resolve(__dirname, '..');
const dotenv = loadDotEnv(path.join(ROOT, '.env'));
const args = new Set(process.argv.slice(2));
const apply = args.has('--apply');
const json = args.has('--json');

if (args.has('--help')) {
  printHelp();
  process.exit(0);
}

const config = {
  supabaseURL: envValue('EXPO_PUBLIC_SUPABASE_URL'),
  serviceRoleKey: envValue('SUPABASE_SERVICE_ROLE_KEY') || envValue('SUPABASE_SECRET_KEY'),
  password: envValue('PWS_TESTFLIGHT_PASSWORD'),
  domain: envValue('PWS_TESTFLIGHT_DOMAIN', 'test.pws'),
  group: envValue('PWS_TESTFLIGHT_GROUP', defaultGroupName()),
  testerCount: positiveInt(envValue('PWS_TESTFLIGHT_COUNT'), 3),
  deleteCount: positiveInt(envValue('PWS_TESTFLIGHT_DELETE_COUNT'), 3),
};

const accounts = buildAccounts(config);

main().catch((error) => {
  console.error(`TestFlight tester setup failed: ${error.message}`);
  process.exit(1);
});

async function main() {
  if (!apply) {
    printResult({
      status: 'dry-run',
      apply: false,
      envReady: {
        supabaseURL: Boolean(config.supabaseURL),
        serviceRoleKey: Boolean(config.serviceRoleKey),
        password: Boolean(config.password),
      },
      group: config.group,
      accounts: accounts.map(publicAccount),
      nextCommand: 'PWS_TESTFLIGHT_PASSWORD=<password> SUPABASE_SERVICE_ROLE_KEY=<service-role> npm run testflight:accounts -- --apply',
    });
    return;
  }

  assertRequired(config.supabaseURL, 'EXPO_PUBLIC_SUPABASE_URL');
  assertRequired(config.serviceRoleKey, 'SUPABASE_SERVICE_ROLE_KEY');
  assertRequired(config.password, 'PWS_TESTFLIGHT_PASSWORD');
  assertStrongEnough(config.password);

  const supabase = createClient(config.supabaseURL, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const existingUsersByEmail = await listAuthUsersByEmail(supabase);
  const results = [];

  for (const account of accounts) {
    const authUser = await upsertAuthUser(supabase, existingUsersByEmail, account);
    await upsertProfile(supabase, authUser.id, account);
    results.push({
      email: account.email,
      role: account.role,
      disposable: account.disposable,
      authUserId: redactId(authUser.id),
      action: existingUsersByEmail.has(account.email) ? 'updated' : 'created',
      profile: 'upserted',
    });
  }

  printResult({
    status: 'ok',
    apply: true,
    group: config.group,
    accounts: results,
  });
}

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs.readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const index = line.indexOf('=');
        return [
          line.slice(0, index).trim(),
          line.slice(index + 1).trim().replace(/^['"]|['"]$/g, ''),
        ];
      }),
  );
}

function envValue(name, fallback = '') {
  return process.env[name] || dotenv[name] || fallback;
}

function positiveInt(raw, fallback) {
  const value = Number.parseInt(raw || '', 10);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function defaultGroupName() {
  const now = new Date();
  return `testflight_${now.getUTCFullYear()}_${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
}

function buildAccounts({ domain, group, testerCount, deleteCount }) {
  const main = Array.from({ length: testerCount }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    return {
      email: `pws_tf_${number}@${domain}`,
      nickname: `TF ${number}`,
      role: 'testflight',
      disposable: false,
      group,
    };
  });
  const deletion = Array.from({ length: deleteCount }, (_, index) => {
    const number = String(index + 1).padStart(2, '0');
    return {
      email: `pws_delete_${number}@${domain}`,
      nickname: `Delete ${number}`,
      role: 'account-deletion',
      disposable: true,
      group,
    };
  });
  return [...main, ...deletion];
}

function publicAccount(account) {
  return {
    email: account.email,
    nickname: account.nickname,
    role: account.role,
    disposable: account.disposable,
    group: account.group,
  };
}

async function listAuthUsersByEmail(supabase) {
  const users = new Map();
  const perPage = 1000;
  for (let page = 1; ; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const user of data?.users ?? []) {
      if (user.email) users.set(user.email.toLowerCase(), user);
    }
    if (!data?.users || data.users.length < perPage) break;
  }
  return users;
}

async function upsertAuthUser(supabase, existingUsersByEmail, account) {
  const attributes = {
    email: account.email,
    password: config.password,
    email_confirm: true,
    user_metadata: {
      nickname: account.nickname,
      qa_group: account.group,
    },
    app_metadata: {
      qa_role: account.role,
      qa_group: account.group,
      qa_disposable: account.disposable,
    },
  };

  const existing = existingUsersByEmail.get(account.email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, attributes);
    if (error) throw error;
    return data.user;
  }

  const { data, error } = await supabase.auth.admin.createUser(attributes);
  if (error) throw error;
  existingUsersByEmail.set(account.email, data.user);
  return data.user;
}

async function upsertProfile(supabase, userId, account) {
  const profile = {
    id: userId,
    email: account.email,
    nickname: account.nickname,
    default_lat: 37.5665,
    default_lng: 126.978,
    climate_zone: '서울특별시',
    birth_year: null,
    gender: null,
    age_bucket: null,
    bmi_bucket: null,
    bmi_offset: 0,
    korea_baseline: 0.3,
    notify_time: '08:00',
    notify_enabled: false,
    notify_outfit: false,
    notify_rain: false,
    expo_push_token: null,
    is_active: true,
    onboarding_done: true,
    weight_morning: null,
    weight_afternoon: null,
    weight_evening: null,
    weight_updated_at: null,
    wardrobe: {},
  };

  const { error } = await supabase
    .from('users')
    .upsert(profile, { onConflict: 'id' });
  if (error) throw error;
}

function assertRequired(value, name) {
  if (!value) throw new Error(`${name} is required`);
}

function assertStrongEnough(password) {
  if (password.length < 12) {
    throw new Error('PWS_TESTFLIGHT_PASSWORD must be at least 12 characters');
  }
}

function redactId(id) {
  return id ? `${id.slice(0, 8)}...${id.slice(-4)}` : null;
}

function printResult(result) {
  if (json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`status: ${result.status}`);
  console.log(`group: ${result.group}`);
  console.log(`apply: ${result.apply}`);
  if (result.envReady) {
    console.log('envReady:');
    for (const [key, ready] of Object.entries(result.envReady)) {
      console.log(`- ${key}: ${ready ? 'yes' : 'no'}`);
    }
  }
  console.log('accounts:');
  for (const account of result.accounts) {
    const disposable = account.disposable ? ' disposable' : '';
    const action = account.action ? ` ${account.action}` : '';
    console.log(`- ${account.email} [${account.role}${disposable}]${action}`);
  }
  if (result.nextCommand) {
    console.log('next:');
    console.log(result.nextCommand);
  }
}

function printHelp() {
  console.log(`
Usage:
  npm run testflight:accounts
  npm run testflight:accounts -- --apply

Environment:
  EXPO_PUBLIC_SUPABASE_URL      Supabase project URL
  SUPABASE_SERVICE_ROLE_KEY     Server-only key for Auth Admin and profile upsert
  PWS_TESTFLIGHT_PASSWORD       Shared QA password, at least 12 characters

Optional:
  PWS_TESTFLIGHT_DOMAIN         Default: test.pws
  PWS_TESTFLIGHT_GROUP          Default: testflight_<yyyy>_<mm>
  PWS_TESTFLIGHT_COUNT          Default: 3
  PWS_TESTFLIGHT_DELETE_COUNT   Default: 3
`);
}
