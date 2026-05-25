#!/usr/bin/env node

const { spawnSync } = require('node:child_process');
const { mkdirSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const artifactPath = path.join(
  'docs',
  'migration',
  'native-parity-readiness',
  'native-readiness-free-account.json'
);

const gates = [
  {
    id: 'typecheck',
    commandText: 'npm run typecheck',
    command: ['npm', ['run', 'typecheck']],
    category: 'shared-build',
    platform: 'shared',
  },
  {
    id: 'web-and-shared-tests',
    commandText: 'npm test',
    command: ['npm', ['test']],
    category: 'shared-tests',
    platform: 'shared',
  },
  {
    id: 'android-native-build-test',
    commandText: 'npm run native:android:verify',
    command: ['npm', ['run', 'native:android:verify']],
    category: 'native-build-test',
    platform: 'android',
  },
  {
    id: 'ios-native-build-test',
    commandText: 'npm run native:ios:verify',
    command: ['npm', ['run', 'native:ios:verify']],
    category: 'native-build-test',
    platform: 'ios',
  },
];

const runtimeCategories = [
  'live-supabase-rls',
  'account-deletion',
  'android-signed-runtime',
  'ios-runtime-screenshots',
  'visual-qa',
  'accessibility',
  'privacy-store',
  'signed-artifact',
];

function runGate(gate) {
  const startedAt = new Date().toISOString();
  const [command, args] = gate.command;
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const completedAt = new Date().toISOString();
  const stdoutTail = tail(result.stdout);
  const stderrTail = tail(result.stderr);
  if (stdoutTail) process.stdout.write(stdoutTail);
  if (stderrTail) process.stderr.write(stderrTail);

  return {
    id: gate.id,
    platform: gate.platform,
    category: gate.category,
    command: gate.commandText,
    status: result.status === 0 ? 'pass' : 'fail',
    exitCode: result.status,
    startedAt,
    completedAt,
    stdoutTail,
    stderrTail,
  };
}

function tail(value) {
  if (!value) return '';
  const lines = value.trimEnd().split(/\r?\n/);
  return `${lines.slice(-80).join('\n')}\n`;
}

function writeReport(report) {
  mkdirSync(path.dirname(artifactPath), { recursive: true });
  writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
}

writeReport({
  schema: 'pws-native-readiness-free-account-v1',
  status: 'blocked',
  generatedAt: new Date().toISOString(),
  scope: 'free-account simulator build/test readiness',
  releaseReadiness: 'not-a-release-signoff',
  gates: gates.map((gate) => ({
    id: gate.id,
    platform: gate.platform,
    category: gate.category,
    command: gate.commandText,
    status: 'pending',
  })),
  skippedGates: gates.map((gate) => gate.id),
  blockedRuntimeCategories: runtimeCategories,
  notes: [
    'Preflight artifact written before command execution so nested tests can validate the schema.',
    'This artifact proves only free-account Android/iOS build and test gates after all gates pass.',
  ],
});

const gateResults = [];
for (const gate of gates) {
  const result = runGate(gate);
  gateResults.push(result);
  if (result.status !== 'pass') break;
}

const failedGate = gateResults.find((gate) => gate.status !== 'pass');
const missingGateIds = gates
  .filter((gate) => !gateResults.some((result) => result.id === gate.id))
  .map((gate) => gate.id);

const report = {
  schema: 'pws-native-readiness-free-account-v1',
  status: failedGate ? 'blocked' : 'pass',
  generatedAt: new Date().toISOString(),
  scope: 'free-account simulator build/test readiness',
  releaseReadiness: 'not-a-release-signoff',
  gates: gateResults,
  skippedGates: missingGateIds,
  blockedRuntimeCategories: runtimeCategories,
  notes: [
    'This artifact proves only free-account Android/iOS build and test gates.',
    'It does not replace live Supabase, signed runtime, screenshot, accessibility, privacy, or signed artifact evidence.',
  ],
};

writeReport(report);
console.log(`[native-readiness] wrote ${artifactPath}`);
console.log(`[native-readiness] status=${report.status}`);

process.exit(failedGate ? 1 : 0);
