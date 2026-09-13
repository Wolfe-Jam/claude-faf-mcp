/**
 * Performance — observability, not a gate.
 *
 * Every wall-clock limit in the suite lives here: `npm test` leaves this file
 * out (--path-ignore-patterns), and CI runs it as `npm run test:performance`
 * in a job whose failure does not fail the build. Timing on shared runners is
 * noise; a real regression shows up here as a trend.
 *
 * 6.0.0 (audit #92): the tool timings that used to sit in the gating suites
 * (wjttc-mcp TIER 6, desktop-native, wjttc-v340, interop-v450) moved here, and
 * every file is written in a mkdtemp folder, never the checkout.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { performance } from 'perf_hooks';
import { FafToolHandler } from '../src/handlers/tools';
import { FafEngineAdapter } from '../src/handlers/engine-adapter';
import { fafCli } from '../src/utils/faf-cli-bridge.js';

// Targets (milliseconds)
const TARGETS = {
  fileRead: 50,
  fileWrite: 100,
  listDirectory: 30,
  toolList: 50,
  toolCall: 100,
  concurrent: 500,
  formats: 100,
  go: 200,
  auto: 5000,
  gitUrls: 50,
};

const measureTime = async (fn: () => Promise<unknown> | unknown): Promise<number> => {
  const start = performance.now();
  await fn();
  return performance.now() - start;
};

let dir: string;
let handler: FafToolHandler;

beforeAll(() => {
  process.env.FAF_TOOLS = 'all';
  dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cfm-perf-')));
  fs.writeFileSync(path.join(dir, 'perf.txt'), 'Performance test content');
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'perf-test', version: '1.0.0', dependencies: { typescript: '^5.0.0' } }));
  fs.writeFileSync(path.join(dir, 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: perf-test\n  goal: Measure\n');
  const engine = new FafEngineAdapter();
  engine.setWorkingDirectory(dir);
  handler = new FafToolHandler(engine);
});

afterAll(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

describe('File operations', () => {
  test('read a 1KB file', async () => {
    const f = path.join(dir, 'one-k.txt');
    fs.writeFileSync(f, 'x'.repeat(1024));
    const time = await measureTime(() => fs.promises.readFile(f, 'utf-8'));
    console.log(`File read: ${time.toFixed(2)}ms (target: ${TARGETS.fileRead}ms)`);
    expect(time).toBeLessThan(TARGETS.fileRead);
  });

  test('write a file', async () => {
    const time = await measureTime(() => fs.promises.writeFile(path.join(dir, 'copy.txt'), 'test content'));
    console.log(`File write: ${time.toFixed(2)}ms (target: ${TARGETS.fileWrite}ms)`);
    expect(time).toBeLessThan(TARGETS.fileWrite);
  });

  test('list a folder, 100 times', async () => {
    const times: number[] = [];
    for (let i = 0; i < 100; i++) {times.push(await measureTime(() => fs.promises.readdir(dir)));}
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`Directory list: avg ${avg.toFixed(2)}ms, max ${Math.max(...times).toFixed(2)}ms`);
    expect(avg).toBeLessThan(TARGETS.listDirectory);
  });
});

describe('Tool latency', () => {
  test('tools/list', async () => {
    const time = await measureTime(() => handler.listTools());
    console.log(`Tool list: ${time.toFixed(2)}ms (target: ${TARGETS.toolList}ms)`);
    expect(time).toBeLessThan(TARGETS.toolList);
  });

  test('faf_debug, faf_read and faf_score', async () => {
    for (const [name, args] of [['faf_debug', {}], ['faf_read', { path: path.join(dir, 'perf.txt') }], ['faf_score', { path: dir }]] as const) {
      const time = await measureTime(() => handler.callTool(name, args as Record<string, unknown>));
      console.log(`${name}: ${time.toFixed(2)}ms (target: ${TARGETS.toolCall}ms)`);
      expect(time).toBeLessThan(TARGETS.toolCall);
    }
  });

  test('10 concurrent faf_debug calls; 50 in a row keep their latency', async () => {
    const concurrent = await measureTime(() => Promise.all(Array.from({ length: 10 }, () => handler.callTool('faf_debug', {}))));
    console.log(`10 concurrent: ${concurrent.toFixed(2)}ms (target: ${TARGETS.concurrent}ms)`);
    expect(concurrent).toBeLessThan(TARGETS.concurrent);
    const times: number[] = [];
    for (let i = 0; i < 50; i++) {times.push(await measureTime(() => handler.callTool('faf_debug', {})));}
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`50 ops — avg ${avg.toFixed(2)}ms, max ${Math.max(...times).toFixed(2)}ms`);
    expect(avg).toBeLessThan(TARGETS.toolCall);
  });

  test('faf_formats, faf_go and faf_auto', async () => {
    const formats = await measureTime(() => handler.callTool('faf_formats', { path: dir }));
    const go = await measureTime(() => handler.callTool('faf_go', { path: dir }));
    const autoDir = fs.mkdtempSync(path.join(dir, 'auto-'));
    fs.writeFileSync(path.join(autoDir, 'package.json'), JSON.stringify({ name: 'auto-perf', version: '1.0.0' }));
    const auto = await measureTime(() => handler.callTool('faf_auto', { path: autoDir }));
    console.log(`faf_formats ${formats.toFixed(0)}ms · faf_go ${go.toFixed(0)}ms · faf_auto ${auto.toFixed(0)}ms`);
    expect(formats).toBeLessThan(TARGETS.formats);
    expect(go).toBeLessThan(TARGETS.go);
    expect(auto).toBeLessThan(TARGETS.auto);
  });

  test('faf-cli normalizeGitUrl: 100 URLs', async () => {
    const { normalizeGitUrl } = await fafCli;
    const time = await measureTime(() => { for (let i = 0; i < 100; i++) {normalizeGitUrl(`https://github.com/owner-${i}/repo-${i}`);} });
    console.log(`normalizeGitUrl ×100: ${time.toFixed(2)}ms (target: ${TARGETS.gitUrls}ms)`);
    expect(time).toBeLessThan(TARGETS.gitUrls);
  });
});

describe('Memory', () => {
  test('100 light tool calls do not grow the heap by 50MB', async () => {
    const before = process.memoryUsage().heapUsed;
    for (let i = 0; i < 100; i++) {await handler.callTool('faf_debug', {});}
    const growth = process.memoryUsage().heapUsed - before;
    console.log(`Memory growth: ${(growth / 1024 / 1024).toFixed(2)}MB`);
    expect(growth).toBeLessThan(50 * 1024 * 1024);
  });
});
