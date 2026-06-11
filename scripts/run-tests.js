#!/usr/bin/env node

const { existsSync, readdirSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');

const testsDir = 'tests';
const outDir = '.tmp-tests';
const testFiles = readdirSync(testsDir)
  .filter((file) => file.endsWith('.test.ts'))
  .sort()
  .map((file) => join(testsDir, file));

if (testFiles.length === 0) {
  console.error('[tests] no test files found');
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });

const tscPath = require.resolve('typescript/bin/tsc');
const compile = spawnSync(process.execPath, [
  tscPath,
  '--module',
  'commonjs',
  '--target',
  'es2022',
  '--moduleResolution',
  'node',
  '--types',
  'node',
  '--outDir',
  outDir,
  ...testFiles,
], { stdio: 'inherit' });

if (compile.status !== 0) process.exit(compile.status ?? 1);

for (const sourcePath of testFiles) {
  const compiledPath = join(outDir, sourcePath.replace(/\.ts$/, '.js'));
  if (!existsSync(compiledPath)) {
    console.error(`[tests] compiled file missing: ${compiledPath}`);
    process.exit(1);
  }
  const result = spawnSync(process.execPath, [compiledPath], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
