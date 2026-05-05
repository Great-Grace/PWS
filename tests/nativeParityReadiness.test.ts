import * as assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const manifestPath = 'shared/contracts/parity-fixtures/native-parity-manifest.json';
const readinessDocs = [
  'docs/migration/native-parity-readiness/parity-fixtures.md',
  'docs/migration/native-parity-readiness/smoke-checklist.md',
  'docs/migration/native-parity-readiness/design-visual-qa.md',
  'docs/migration/native-parity-readiness/security-review.md',
  'docs/migration/native-parity-readiness/accessibility-review.md',
  'docs/migration/native-parity-readiness/final-readiness.md',
];

assert.equal(existsSync(manifestPath), true, 'native parity manifest must exist at the spec-defined path');

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
  assert.doesNotMatch(text, /(?:access[_-]?token|refresh[_-]?token|service[_-]?role|Bearer\s+[A-Za-z0-9._-]+)/i, `${docPath} must not contain token-bearing strings`);
}

console.log('nativeParityReadiness test passed');
