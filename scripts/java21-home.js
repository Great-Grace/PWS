#!/usr/bin/env node
const { existsSync } = require('node:fs');
const { spawnSync } = require('node:child_process');

const candidates = [
  process.env.JAVA21_HOME,
  '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
  '/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
  '/Library/Java/JavaVirtualMachines/temurin-21.jdk/Contents/Home',
  '/Library/Java/JavaVirtualMachines/openjdk-21.jdk/Contents/Home',
].filter(Boolean);

for (const home of candidates) {
  const java = `${home}/bin/java`;
  if (!existsSync(java)) continue;
  const result = spawnSync(java, ['-version'], { encoding: 'utf8' });
  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.status === 0 && /version "21\./.test(output)) {
    console.log(home);
    process.exit(0);
  }
}

console.error('Java 21 not found. Set JAVA21_HOME to a JDK 21 home, e.g. /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home');
process.exit(1);
