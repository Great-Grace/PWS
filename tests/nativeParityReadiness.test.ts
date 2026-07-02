import * as assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const manifestPath = 'shared/contracts/parity-fixtures/native-parity-manifest.json';
const packageJsonPath = 'package.json';
const nativeReadinessScript = 'scripts/native-readiness-report.js';
const nativeReadinessArtifact = 'docs/migration/native-parity-readiness/native-readiness-free-account.json';
const readinessDocs = [
  'docs/migration/native-parity-readiness/parity-fixtures.md',
  'docs/migration/native-parity-readiness/smoke-checklist.md',
  'docs/migration/native-parity-readiness/design-visual-qa.md',
  'docs/migration/native-parity-readiness/security-review.md',
  'docs/migration/native-parity-readiness/accessibility-review.md',
  'docs/migration/native-parity-readiness/final-readiness.md',
];
const evidenceStatuses = ['pass', 'fail', 'blocked', 'prior-evidence', 'deferred'] as const;
const evidenceStatusPattern = new RegExp(`Evidence status:\\s*\`?(?:${evidenceStatuses.join('|')})\`?`, 'i');

const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8')) as {
  scripts: Record<string, string>;
};

const requiredNativeScripts = [
  'native:android:test',
  'native:android:debug',
  'native:android:release',
  'native:android:verify',
  'native:ios:build',
  'native:ios:build-for-testing',
  'native:ios:verify',
  'native:readiness',
];

for (const scriptName of requiredNativeScripts) {
  assert.ok(packageJson.scripts[scriptName], `package.json must define ${scriptName}`);
}

assert.match(
  packageJson.scripts['native:android:verify'],
  /apps\/android-native.*:app:testDebugUnitTest.*:app:assembleDebug.*:app:assembleRelease/,
  'native Android readiness must run unit, debug, and release gates'
);

assert.match(
  packageJson.scripts['native:ios:build'],
  /generic\/platform=iOS Simulator/,
  'native iOS build gate must target a generic iOS Simulator destination without requiring a bootable device'
);

assert.match(
  packageJson.scripts['native:ios:build-for-testing'],
  /generic\/platform=iOS Simulator/,
  'native iOS build-for-testing gate must target a generic iOS Simulator destination without requiring a bootable device'
);

assert.match(
  packageJson.scripts['native:readiness'],
  /node scripts\/native-readiness-report\.js/,
  'native readiness must run the structured free-account readiness reporter'
);

assert.doesNotMatch(
  packageJson.scripts['native:readiness'],
  /eas|submit|TestFlight|App Store|Play Store|platform=iOS,id=|platform=iOS,name=/i,
  'native readiness must not require external distribution, paid accounts, or physical-device destinations'
);

assert.equal(existsSync(manifestPath), true, 'native parity manifest must exist at the spec-defined path');
assert.equal(existsSync(nativeReadinessScript), true, 'native readiness reporter must exist');
assert.equal(existsSync(nativeReadinessArtifact), true, 'native readiness reporter artifact must exist');

const nativeReadinessRunner = readFileSync(nativeReadinessScript, 'utf8');
for (const command of ['npm run typecheck', 'npm test', 'npm run native:android:verify', 'npm run native:ios:verify']) {
  assert.match(
    nativeReadinessRunner,
    new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `native readiness reporter must execute ${command}`
  );
}
assert.match(
  nativeReadinessRunner,
  /not-a-release-signoff/,
  'native readiness reporter must distinguish build/test readiness from release signoff'
);

const nativeReadinessReport = JSON.parse(readFileSync(nativeReadinessArtifact, 'utf8')) as {
  schema: string;
  status: string;
  scope: string;
  releaseReadiness: string;
  gates: Array<{ id: string; platform: string; category: string; command: string; status: string }>;
  blockedRuntimeCategories: string[];
};

assert.equal(
  nativeReadinessReport.schema,
  'pws-native-readiness-free-account-v1',
  'native readiness artifact must use the local readiness schema'
);
assert.match(nativeReadinessReport.scope, /free-account simulator build\/test readiness/i);
assert.equal(
  nativeReadinessReport.releaseReadiness,
  'not-a-release-signoff',
  'native readiness artifact must not be treated as production release signoff'
);
for (const gateId of ['typecheck', 'web-and-shared-tests', 'android-native-build-test', 'ios-native-build-test']) {
  assert.ok(
    nativeReadinessReport.gates.some((gate) => gate.id === gateId),
    `native readiness artifact must include ${gateId}`
  );
}
for (const category of ['live-supabase-rls', 'android-signed-runtime', 'ios-runtime-screenshots', 'signed-artifact']) {
  assert.ok(
    nativeReadinessReport.blockedRuntimeCategories.includes(category),
    `native readiness artifact must keep ${category} outside build/test readiness`
  );
}

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
  fixtures: Array<{
    id: string;
    domain: string;
    sourceReference: string;
    given: unknown;
    expected: unknown;
    platformCoverage: Record<string, string>;
    notes: string;
  }>;
};

const requiredDomains = [
  'pws-date-boundary',
  'weather-onecall-cache-request',
  'prediction-feedback-formula',
  'feedback-history-counts',
  'tester-auth-fallback',
  'session-clearing',
  'runtime-reducer-transition',
];

for (const domain of requiredDomains) {
  const fixture = manifest.fixtures.find((entry) => entry.domain === domain);
  assert.ok(fixture, `manifest must include ${domain}`);
  assert.ok(fixture.id, `${domain} fixture must include id`);
  assert.ok(fixture.sourceReference, `${domain} fixture must cite a source reference`);
  assert.ok(fixture.given, `${domain} fixture must include given data`);
  assert.ok(fixture.expected, `${domain} fixture must include expected data`);
  assert.ok(fixture.platformCoverage.android, `${domain} fixture must document Android coverage`);
  assert.ok(fixture.platformCoverage.ios, `${domain} fixture must document iOS coverage or gap`);
  assert.ok(fixture.notes, `${domain} fixture must include QA notes`);
}

for (const docPath of readinessDocs) {
  assert.equal(existsSync(docPath), true, `${docPath} must exist`);
  const text = readFileSync(docPath, 'utf8');
  assert.match(text, /Status:/, `${docPath} must declare Status`);
  assert.match(text, evidenceStatusPattern, `${docPath} must declare an allowed Evidence status`);
  assert.doesNotMatch(text, /(?:access[_-]?token|refresh[_-]?token|service[_-]?role|Bearer\s+[A-Za-z0-9._-]+)/i, `${docPath} must not contain token-bearing strings`);
}

const finalReadiness = readFileSync('docs/migration/native-parity-readiness/final-readiness.md', 'utf8');

assert.match(
  finalReadiness,
  /free-account simulator/i,
  'final readiness must state the current free-account simulator scope'
);

assert.doesNotMatch(
  finalReadiness,
  /free-account device install evidence|physical[- ]device install evidence|TestFlight|App Store|Play Store/i,
  'final readiness current gate must not require unavailable distribution paths'
);

console.log('nativeParityReadiness test passed');
