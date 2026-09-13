#!/usr/bin/env node
// check-engines.mjs — the Node engine floor must match what CI actually runs.
//
// Family rule (faf-mcp 3.0.2 pattern): `engines.node` == the LOWEST Node in the
// CI matrix, never aspirational. You can't raise the floor without dropping
// that Node from CI (a visible, deliberate act), and you can't claim support
// for a Node the gate never runs. claude-faf-mcp receipt: the floor said >=18
// while CI ran 18/20 and the production tree needed 20 (six EBADENGINE
// warnings on every Node-18 install).
//
// Checks, each a hard failure:
//   1. package.json engines.node has a parseable floor.
//   2. Every `node: [ ... ]` matrix in .github/workflows/ci.yml starts at it.
//   3. manifest.json compatibility.runtimes.node (the .mcpb) says the same.
//
// Runs in CI (Code Quality) and in prepublishOnly.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = process.env.CHECK_ENGINES_ROOT || join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const fail = (msg) => {
  console.error(`✗ ${msg}`);
  process.exit(1);
};

const enginesRaw = JSON.parse(read('package.json')).engines?.node ?? '';
const floorMatch = enginesRaw.match(/(\d+)/);
if (!floorMatch) fail(`package.json engines.node missing or unparseable: ${JSON.stringify(enginesRaw)}`);
const floor = Number(floorMatch[1]);

// Every CI node matrix — this repo writes them as `node: [22.x, 24.x]`.
const ci = read('.github/workflows/ci.yml');
const matrices = [...ci.matchAll(/^\s*node:\s*\[([^\]]+)\]/gm)].map((m) =>
  m[1]
    .split(',')
    .map((s) => Number(s.replace(/['"\s]/g, '').replace(/\.x$/, '')))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b),
);
if (matrices.length === 0) fail('.github/workflows/ci.yml — could not find a `node: [ ... ]` matrix');
for (const matrix of matrices) {
  if (matrix.length === 0) fail('a CI node matrix parsed empty');
  if (matrix[0] !== floor) {
    fail(
      `engine floor drift — package.json engines.node = ">=${floor}", a CI node matrix starts at ${matrix[0]} (matrix: ${matrix.join(', ')}).\n` +
        `  Make them equal: set the floor to ${matrix[0]}, or drop Node ${matrix[0]} from ci.yml on purpose.`,
    );
  }
}

// The .mcpb declares the runtime a Desktop host must provide.
const runtime = JSON.parse(read('manifest.json')).compatibility?.runtimes?.node ?? '';
if (runtime !== enginesRaw) {
  fail(`manifest.json compatibility.runtimes.node = ${JSON.stringify(runtime)}, package.json engines.node = ${JSON.stringify(enginesRaw)} — they must be the same.`);
}

console.log(`✓ engine floor ${floor} == every CI node matrix low (${matrices.map((m) => `[${m.join(', ')}]`).join(' ')}) == manifest runtimes.node`);
