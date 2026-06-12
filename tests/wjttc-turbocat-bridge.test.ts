import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  composedTurboCat, composedTurboCatSlots, turboCatDisplay, normalizeTurboCatKeys,
} from '../src/faf-core/extract/turbocat-bridge.js';

// WJTTC — composed Turbo-Cat consumer (single source via faf-cli >= 6.10.1).
//
// CFM's local detection is DELETED; this composes faf-cli's engine. The
// trust-critical guarantee (BRAKE) is that composing the FIXED engine detects
// real stacks correctly — including the no-guess manifest.json case that the
// 6.10.1 fix resolved (the bug that blocked this whole swap).

describe('BRAKE — composes faf-cli, detects correctly (no-guess)', () => {
  let dir: string;
  beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tcat-')); });
  afterEach(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ } });

  test('B1 — composedTurboCat returns a populated result on a real project (not null)', async () => {
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 't', devDependencies: { typescript: '^5' } }));
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
    fs.writeFileSync(path.join(dir, 'index.ts'), 'export const x = 1\n');
    const r = await composedTurboCat(dir);
    expect(r).not.toBeNull();
    expect(r!.discoveredFormats.length).toBeGreaterThan(0);
    expect(r!.slotFills.mainLanguage).toBe('TypeScript');
  });

  test('B2 — THE no-guess proof: a TS project + an mcpb manifest.json stays TypeScript, NOT Chrome Extension', async () => {
    // This is the exact case the 6.10.1 fix resolved — and the reason CFM (with
    // its own mcpb manifest.json) can finally compose without regressing.
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 't', devDependencies: { typescript: '^5' } }));
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
    fs.writeFileSync(path.join(dir, 'index.ts'), 'export const x = 1\n');
    fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify({ manifest_version: '0.3', name: 'x', display_name: 'X' }));
    const r = await composedTurboCat(dir);
    expect(r!.slotFills.mainLanguage).toBe('TypeScript');
    expect(r!.slotFills.framework).not.toBe('Chrome Extension');
    expect(r!.stackSignature).not.toContain('chrome');
  });

  test('B3 — never throws on a bogus path', async () => {
    let threw = false;
    try { await composedTurboCat('/no/such/dir/xyz'); await turboCatDisplay('/no/such/dir/xyz'); } catch { threw = true; }
    expect(threw).toBe(false);
  });
});

describe('ENGINE — the display + fill shapes consumers need', () => {
  let dir: string;
  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'tcat-'));
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 't', devDependencies: { typescript: '^5' } }));
    fs.writeFileSync(path.join(dir, 'tsconfig.json'), '{}');
    fs.writeFileSync(path.join(dir, 'index.ts'), 'export const x = 1\n');
  });
  afterEach(() => { try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ } });

  test('E1 — turboCatDisplay returns the faf_formats shape, populated', async () => {
    const d = await turboCatDisplay(dir);
    expect(Array.isArray(d.discoveredFormats)).toBe(true);
    expect(d.discoveredFormats.length).toBeGreaterThan(0);
    expect(typeof d.totalIntelligenceScore).toBe('number');
    expect(d.totalIntelligenceScore).toBeGreaterThan(0);
    expect(typeof d.stackSignature).toBe('string');
    expect(d.slotFillRecommendations.mainLanguage).toBe('TypeScript');
  });

  test('E2 — composedTurboCatSlots routes into {project, stack} (main_language → project)', async () => {
    const s = await composedTurboCatSlots(dir);
    expect(s).not.toBeNull();
    expect(s!.project?.main_language).toBe('TypeScript');
    // stack section carries no project-level keys
    expect(s!.stack?.main_language).toBeUndefined();
  });

  test('E3 — totalIntelligenceScore is the sum of discovered-format priorities', async () => {
    const r = await composedTurboCat(dir);
    const d = await turboCatDisplay(dir);
    const expected = r!.discoveredFormats.reduce((acc, f) => acc + f.priority, 0);
    expect(d.totalIntelligenceScore).toBe(expected);
  });
});

describe('ENGINE — key mapping (faf-cli keys → CFM display keys)', () => {
  test('E4 — maps the keys that differ; passes through the rest; drops empties', () => {
    expect(normalizeTurboCatKeys({ main_language: 'TypeScript', framework: 'SvelteKit', buildTool: 'Vite', backend: 'Express', testing: '' }))
      .toEqual({ mainLanguage: 'TypeScript', frontend: 'SvelteKit', build: 'Vite', backend: 'Express' });
  });
});
