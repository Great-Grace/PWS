import * as assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8')) as {
  scripts: Record<string, string>;
};

const releaseGateScript = 'scripts/release-readiness.js';
const releaseGateDoc = 'docs/migration/native-parity-readiness/release-readiness-gate.md';
const releaseEvidenceManifest = 'docs/migration/native-parity-readiness/release-evidence-manifest.json';
const releaseSbom = 'docs/migration/native-parity-readiness/sbom-npm.json';
const nativeReadinessArtifact = 'docs/migration/native-parity-readiness/native-readiness-free-account.json';
const privacyStoreChecklist = 'docs/migration/native-parity-readiness/privacy-store-checklist.md';
const smokeChecklist = 'docs/migration/native-parity-readiness/smoke-checklist.md';

assert.ok(packageJson.scripts['release:readiness'], 'package.json must define release:readiness');
assert.match(
  packageJson.scripts['release:readiness'],
  /node scripts\/release-readiness\.js/,
  'release:readiness must run the release-readiness harness'
);
assert.notEqual(
  packageJson.scripts['release:readiness'],
  packageJson.scripts['native:readiness'],
  'first-release readiness must be separate from native build readiness'
);
assert.match(
  packageJson.scripts['release:sbom'],
  /node scripts\/generate-npm-sbom\.js/,
  'release:sbom must regenerate the npm SBOM artifact'
);

assert.equal(existsSync(releaseGateScript), true, 'release-readiness harness must exist');
assert.equal(existsSync(releaseGateDoc), true, 'release-readiness gate document must exist');
assert.equal(existsSync(releaseEvidenceManifest), true, 'release evidence manifest must exist');
assert.equal(existsSync(releaseSbom), true, 'npm SBOM artifact must exist');
assert.equal(existsSync(nativeReadinessArtifact), true, 'native free-account readiness artifact must exist');
assert.equal(existsSync(privacyStoreChecklist), true, 'privacy/store checklist artifact must exist');

const gateDoc = readFileSync(releaseGateDoc, 'utf8');
assert.match(gateDoc, /No-Ship/i, 'release gate must declare no-ship criteria');
assert.match(gateDoc, /runtime smoke/i, 'release gate must require runtime smoke');
assert.match(gateDoc, /live Supabase/i, 'release gate must require live Supabase evidence');
assert.match(gateDoc, /signed artifact/i, 'release gate must require signed artifact evidence');
assert.match(gateDoc, /sanitized/i, 'release gate must require sanitized evidence');
assert.match(gateDoc, /privacy-store-checklist\.md/, 'release gate must name the privacy/store checklist artifact');

const harness = readFileSync(releaseGateScript, 'utf8');
const supabaseSmokeHarness = readFileSync('scripts/live-supabase-smoke.js', 'utf8');
assert.match(harness, /release-evidence-manifest\.json/, 'harness must require structured release evidence');
assert.match(harness, /native-readiness-free-account\.json/, 'harness must require structured native readiness evidence');
assert.match(harness, /manifest\.status !== 'pass'/, 'harness must block when manifest is not pass');
assert.match(harness, /completedAt/, 'harness must require command completion timestamps');
assert.match(harness, /git', \['rev-parse', 'HEAD'\]/, 'harness must bind manifest commit to current HEAD');
assert.match(harness, /git', \['status', '--porcelain'\]/, 'harness must inspect worktree cleanliness before release pass');
assert.match(harness, /dirty worktree/, 'harness must reject pass manifests on dirty worktrees');
assert.match(harness, /maxEvidenceAgeMs/, 'harness must enforce timestamp freshness');
assert.match(harness, /requiredEvidenceCategories/, 'harness must require structured release evidence categories');
assert.match(harness, /sanitizedArtifacts\.has/, 'harness must bind category artifacts to sanitized artifact entries');
assert.match(harness, /sbom\.status !== 'pass'/, 'harness must block while SBOM license clearance is incomplete');
assert.match(supabaseSmokeHarness, /PWS_SMOKE_DELETE_ACCOUNT/, 'Supabase smoke harness must expose guarded account deletion smoke');
assert.match(supabaseSmokeHarness, /PWS_SMOKE_DELETE_TESTER_ID/, 'account deletion smoke must require a disposable tester id');
assert.match(supabaseSmokeHarness, /PWS_SMOKE_DELETE_CONFIRM/, 'account deletion smoke must require explicit confirmation');
assert.match(supabaseSmokeHarness, /delete_own_account/, 'account deletion smoke must call the backend account deletion RPC');
assert.match(supabaseSmokeHarness, /Refusing to run account deletion smoke against the primary smoke tester/, 'account deletion smoke must not delete the primary smoke tester');
for (const requiredCommand of [
  'npm audit --omit=dev',
  'npx expo-doctor',
  'npx expo install --check',
  'npm run typecheck',
  'npm test',
  'npm run native:android:verify',
  'npm run native:ios:verify',
  'npm run release:sbom',
  'npm run supabase:smoke',
]) {
  assert.match(harness, new RegExp(requiredCommand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `harness must mention ${requiredCommand}`);
}

const smokeText = readFileSync(smokeChecklist, 'utf8');
assert.match(smokeText, /release:readiness/, 'smoke checklist must reference the first-release gate');

const manifest = JSON.parse(readFileSync(releaseEvidenceManifest, 'utf8')) as {
  status: string;
  commands: Array<{ command: string; status: string }>;
  evidenceCategories: Array<{ category: string; status: string }>;
};
assert.equal(manifest.status, 'blocked', 'current first-release evidence manifest must stay blocked until P0/P1 evidence is fresh');
assert.ok(
  manifest.commands.some((entry) => entry.command === 'npm run supabase:smoke'),
  'manifest must record live Supabase smoke evidence'
);
assert.ok(
  manifest.commands.some((entry) => entry.status === 'blocked') ||
    manifest.evidenceCategories.some((entry) => entry.status === 'blocked'),
  'manifest must keep at least one explicit blocker while first-release evidence is incomplete'
);
for (const category of [
  'live-supabase-rls',
  'account-deletion',
  'android-signed-runtime',
  'ios-runtime-screenshots',
  'privacy-store',
  'sbom-license-clearance',
  'native-dependency-license-review',
  'signed-artifact',
]) {
  assert.ok(
    manifest.evidenceCategories.some((entry) => entry.category === category),
    `manifest must record ${category} evidence category`
  );
}

const sbom = JSON.parse(readFileSync(releaseSbom, 'utf8')) as {
  schema: string;
  status: string;
  packageCount: number;
  packages: Array<{ name: string; version: string; license: string }>;
};
assert.equal(sbom.schema, 'pws-npm-sbom-v1', 'SBOM must use the local npm SBOM schema');
assert.equal(sbom.status, 'pass', 'current npm SBOM must have no unknown license entries');
assert.ok(sbom.packageCount > 0, 'SBOM must include dependency entries');
assert.ok(
  sbom.packages.some((entry) => entry.name === 'expo' && entry.version),
  'SBOM must include direct Expo dependency evidence'
);

const nativeReadiness = JSON.parse(readFileSync(nativeReadinessArtifact, 'utf8')) as {
  schema: string;
  releaseReadiness: string;
  gates: Array<{ id: string; status: string }>;
  blockedRuntimeCategories: string[];
};
assert.equal(
  nativeReadiness.schema,
  'pws-native-readiness-free-account-v1',
  'native readiness artifact must use the local schema'
);
assert.equal(
  nativeReadiness.releaseReadiness,
  'not-a-release-signoff',
  'native readiness artifact must not be treated as release signoff'
);
assert.ok(
  nativeReadiness.gates.some((entry) => entry.id === 'ios-native-build-test'),
  'native readiness artifact must include iOS build/test gate status'
);
assert.ok(
  nativeReadiness.blockedRuntimeCategories.includes('signed-artifact'),
  'native readiness artifact must keep signed artifact evidence outside build/test readiness'
);

console.log('firstReleaseReadiness test passed');
