#!/usr/bin/env node

const { existsSync, readFileSync } = require('node:fs');
const { execFileSync } = require('node:child_process');

const requiredCommands = [
  'npm audit --omit=dev',
  'npm run typecheck',
  'npm test',
  'npm run native:android:verify',
  'npm run native:ios:verify',
  'npm run release:sbom',
  'npm run supabase:smoke',
];

const requiredArtifacts = [
  'docs/migration/native-parity-readiness/first-release-plan.md',
  'docs/migration/native-parity-readiness/release-readiness-gate.md',
  'docs/migration/native-parity-readiness/smoke-checklist.md',
  'docs/migration/native-parity-readiness/security-review.md',
  'docs/migration/native-parity-readiness/accessibility-review.md',
  'docs/migration/native-parity-readiness/design-visual-qa.md',
  'docs/migration/native-parity-readiness/privacy-store-checklist.md',
  'docs/migration/native-parity-readiness/sbom-npm.json',
  'docs/migration/native-parity-readiness/native-readiness-free-account.json',
  'docs/migration/native-parity-readiness/release-evidence-manifest.json',
];

const requiredEvidenceCategories = [
  'live-supabase-rls',
  'account-deletion',
  'android-signed-runtime',
  'ios-runtime-screenshots',
  'visual-qa',
  'accessibility',
  'privacy-store',
  'sbom-license-clearance',
  'native-dependency-license-review',
  'signed-artifact',
];

const maxEvidenceAgeMs = 7 * 24 * 60 * 60 * 1000;

function read(path) {
  return readFileSync(path, 'utf8');
}

function fail(message) {
  console.error(`[release-readiness] ${message}`);
  process.exitCode = 1;
}

function currentGitCommit() {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch (error) {
    fail(`could not resolve current git commit: ${error.message}`);
    return null;
  }
}

function gitWorktreeIsClean() {
  try {
    return execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length === 0;
  } catch (error) {
    fail(`could not inspect git worktree status: ${error.message}`);
    return false;
  }
}

function validateFreshTimestamp(label, completedAt) {
  const timestamp = Date.parse(completedAt);
  if (!Number.isFinite(timestamp)) {
    fail(`${label} has invalid completedAt timestamp: ${completedAt}`);
    return;
  }
  const now = Date.now();
  if (timestamp > now + 5 * 60 * 1000) {
    fail(`${label} completedAt is in the future: ${completedAt}`);
  }
  if (now - timestamp > maxEvidenceAgeMs) {
    fail(`${label} completedAt is stale: ${completedAt}`);
  }
}

console.log('[release-readiness] first-release gate harness');

for (const artifact of requiredArtifacts) {
  if (!existsSync(artifact)) {
    fail(`missing artifact: ${artifact}`);
  }
}

const gateText = existsSync(requiredArtifacts[1]) ? read(requiredArtifacts[1]) : '';
for (const command of requiredCommands) {
  if (!gateText.includes(command)) {
    fail(`release gate document must mention: ${command}`);
  }
}

if (!/runtime smoke/i.test(gateText)) fail('release gate must require runtime smoke');
if (!/live Supabase/i.test(gateText)) fail('release gate must require live Supabase evidence');
if (!/signed artifact/i.test(gateText)) fail('release gate must require signed artifact evidence');
if (!/sanitized/i.test(gateText)) fail('release gate must require sanitized evidence');
if (!/privacy-store-checklist\.md/i.test(gateText)) fail('release gate must name the privacy/store checklist artifact');

const firstReleasePlan = existsSync(requiredArtifacts[0]) ? read(requiredArtifacts[0]) : '';
if (/Status:\s*not ready/i.test(firstReleasePlan)) {
  fail('first-release plan still declares not ready; close P0/P1 evidence before release signoff');
}

const sbomPath = 'docs/migration/native-parity-readiness/sbom-npm.json';
if (existsSync(sbomPath)) {
  try {
    const sbom = JSON.parse(read(sbomPath));
    if (sbom.status !== 'pass') fail(`npm SBOM status is not pass: ${sbom.status || '(blank)'}`);
  } catch (error) {
    fail(`npm SBOM must be valid JSON: ${error.message}`);
  }
}

const manifestPath = 'docs/migration/native-parity-readiness/release-evidence-manifest.json';
if (existsSync(manifestPath)) {
  let manifest = null;
  try {
    manifest = JSON.parse(read(manifestPath));
  } catch (error) {
    fail(`release evidence manifest must be valid JSON: ${error.message}`);
  }
  if (manifest) {
    const headCommit = currentGitCommit();
    if (manifest.status !== 'pass') fail('release evidence manifest status is not pass');
    if (manifest.status === 'pass' && !gitWorktreeIsClean()) {
      fail('release evidence manifest cannot pass with a dirty worktree');
    }
    if (!manifest.commit || manifest.commit === 'unknown') fail('release evidence manifest must bind evidence to a commit');
    if (headCommit && manifest.commit && manifest.commit !== 'unknown' && manifest.commit !== headCommit) {
      fail('release evidence manifest commit does not match HEAD');
    }
    const commandEvidence = Array.isArray(manifest.commands) ? manifest.commands : [];
    for (const command of requiredCommands) {
      const evidence = commandEvidence.find((entry) => entry.command === command);
      if (!evidence) {
        fail(`release evidence manifest missing command: ${command}`);
      } else if (evidence.status !== 'pass') {
        fail(`release evidence manifest command is not pass: ${command}`);
      } else if (!evidence.completedAt) {
        fail(`release evidence manifest command lacks completedAt: ${command}`);
      } else {
        validateFreshTimestamp(`release evidence manifest command ${command}`, evidence.completedAt);
      }
    }
    const artifacts = Array.isArray(manifest.artifacts) ? manifest.artifacts : [];
    const sanitizedArtifacts = new Set();
    for (const artifact of artifacts) {
      if (!artifact.path || !existsSync(artifact.path)) fail(`release evidence artifact missing on disk: ${artifact.path || '(blank)'}`);
      if (artifact.sanitized !== true) {
        fail(`release evidence artifact must be marked sanitized: ${artifact.path}`);
      } else if (artifact.path) {
        sanitizedArtifacts.add(artifact.path);
      }
    }
    const categoryEvidence = Array.isArray(manifest.evidenceCategories) ? manifest.evidenceCategories : [];
    for (const category of requiredEvidenceCategories) {
      const evidence = categoryEvidence.find((entry) => entry.category === category);
      if (!evidence) {
        fail(`release evidence manifest missing category: ${category}`);
      } else if (evidence.status !== 'pass') {
        fail(`release evidence manifest category is not pass: ${category}`);
      } else if (!evidence.artifact) {
        fail(`release evidence manifest category lacks artifact: ${category}`);
      } else if (!existsSync(evidence.artifact)) {
        fail(`release evidence manifest category artifact missing on disk: ${category}`);
      } else if (!sanitizedArtifacts.has(evidence.artifact)) {
        fail(`release evidence manifest category artifact is not listed as sanitized: ${category}`);
      }
    }
  }
}

console.log('[release-readiness] required command gate:');
for (const command of requiredCommands) {
  console.log(`- ${command}`);
}

if (process.exitCode) {
  console.error('[release-readiness] blocked');
} else {
  console.log('[release-readiness] pass');
}
