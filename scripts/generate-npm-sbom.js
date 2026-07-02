#!/usr/bin/env node

const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { dirname, join } = require('node:path');

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const packageLock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
const outputPath = 'docs/migration/native-parity-readiness/sbom-npm.json';

const rootDependencies = new Map([
  ...Object.keys(packageJson.dependencies || {}).map((name) => [name, 'runtime']),
  ...Object.keys(packageJson.devDependencies || {}).map((name) => [name, 'development']),
]);

function normalizeLicense(metadata) {
  if (!metadata) return 'UNKNOWN';
  if (typeof metadata.license === 'string' && metadata.license.trim()) {
    return metadata.license.trim();
  }
  if (Array.isArray(metadata.licenses) && metadata.licenses.length > 0) {
    return metadata.licenses
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item.type === 'string') return item.type.trim();
        return '';
      })
      .filter(Boolean)
      .join(' OR ') || 'UNKNOWN';
  }
  if (typeof metadata.licenses === 'string' && metadata.licenses.trim()) {
    return metadata.licenses.trim();
  }
  return 'UNKNOWN';
}

function installedPackageMetadata(lockPath) {
  const packagePath = join(lockPath, 'package.json');
  if (!existsSync(packagePath)) return null;
  try {
    return JSON.parse(readFileSync(packagePath, 'utf8'));
  } catch {
    return null;
  }
}

function packageNameFromLockPath(lockPath) {
  const parts = lockPath.split('/');
  const nodeModulesIndex = parts.lastIndexOf('node_modules');
  if (nodeModulesIndex < 0) return null;
  const first = parts[nodeModulesIndex + 1];
  if (!first) return null;
  if (first.startsWith('@')) {
    const second = parts[nodeModulesIndex + 2];
    return second ? `${first}/${second}` : null;
  }
  return first;
}

const packagesById = new Map();
for (const [lockPath, metadata] of Object.entries(packageLock.packages || {})) {
  if (!lockPath || !metadata || !metadata.version) continue;
  const name = packageNameFromLockPath(lockPath);
  if (!name) continue;
  const id = `${name}@${metadata.version}`;
  const existing = packagesById.get(id);
  const license = normalizeLicense(metadata) === 'UNKNOWN'
    ? normalizeLicense(installedPackageMetadata(lockPath))
    : normalizeLicense(metadata);
  const entry = existing || {
    name,
    version: metadata.version,
    license,
    relationship: rootDependencies.get(name) || 'transitive',
    paths: [],
  };
  entry.paths.push(lockPath);
  packagesById.set(id, entry);
}

const packages = Array.from(packagesById.values()).sort((a, b) => {
  const nameCompare = a.name.localeCompare(b.name);
  return nameCompare || a.version.localeCompare(b.version);
});

const licenseSummary = packages.reduce((summary, item) => {
  summary[item.license] = (summary[item.license] || 0) + 1;
  return summary;
}, {});

const unknownLicenseCount = licenseSummary.UNKNOWN || 0;
const generatedAt = new Date().toISOString();
const sbom = {
  schema: 'pws-npm-sbom-v1',
  generatedAt,
  source: {
    packageJson: 'package.json',
    packageLock: 'package-lock.json',
    lockfileVersion: packageLock.lockfileVersion,
  },
  status: unknownLicenseCount > 0 ? 'review-required' : 'pass',
  packageCount: packages.length,
  unknownLicenseCount,
  licenseSummary,
  packages,
};

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(sbom, null, 2)}\n`);

console.log(`[sbom] wrote ${outputPath}`);
console.log(`[sbom] packages=${packages.length} unknownLicenses=${unknownLicenseCount}`);
