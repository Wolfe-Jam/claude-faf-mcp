#!/usr/bin/env node
/**
 * check-coverage.mjs — the coverage floor, on the suite's totals.
 *
 * Reads coverage/lcov.info (a run with `--coverage --coverage-reporter=lcov`,
 * as CI's test job does), adds up the lines and functions of every file under
 * src/, and fails when either total is below the floor. The floor only rises:
 * when tests add coverage, raise FLOOR to the new totals (rounded down).
 *
 * bun's own bunfig `coverageThreshold` applies to each file on its own, so a
 * one-line module with an untested callback would fail the whole run; the
 * totals are the ratchet this project keeps.
 *
 *   node scripts/check-coverage.mjs [path/to/lcov.info]
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

/** 6.0.0 measured 94.32% of lines and 79.10% of functions over src/ (lcov
 *  totals; bun's text table averages the files instead). */
export const FLOOR = { lines: 93, functions: 78 };

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2] || path.join(root, 'coverage', 'lcov.info');
if (!fs.existsSync(file)) {
  console.error(`check-coverage: no ${path.relative(root, file) || file} — run the tests with --coverage --coverage-reporter=lcov first`);
  process.exit(1);
}

let current = null;
const totals = { LF: 0, LH: 0, FNF: 0, FNH: 0 };
for (const line of fs.readFileSync(file, 'utf-8').split('\n')) {
  if (line.startsWith('SF:')) {
    const src = line.slice(3).split(path.sep).join('/');
    current = /(^|\/)src\//.test(src) && !/(^|\/)tests\//.test(src) ? src : null;
    continue;
  }
  if (!current) continue;
  const m = /^(LF|LH|FNF|FNH):(\d+)$/.exec(line.trim());
  if (m) totals[m[1]] += Number(m[2]);
}
const pct = (hit, found) => (found === 0 ? 100 : (100 * hit) / found);
const lines = pct(totals.LH, totals.LF);
const functions = pct(totals.FNH, totals.FNF);
const report = `lines ${lines.toFixed(2)}% (floor ${FLOOR.lines}%), functions ${functions.toFixed(2)}% (floor ${FLOOR.functions}%)`;
if (lines < FLOOR.lines || functions < FLOOR.functions) {
  console.error(`✗ coverage below the floor — ${report}`);
  process.exit(1);
}
console.log(`✓ coverage — ${report}`);
