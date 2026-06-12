import { test, expect, describe } from 'bun:test';
import { composedTurboCat, normalizeTurboCatKeys } from '../src/faf-core/extract/turbocat-bridge.js';

// WJTTC — STAGED composed Turbo-Cat consumer.
//
// This is wired ahead of faf-cli exporting `turboCatScan`. Until that export
// ships, the adapter must be a non-breaking no-op (returns null → caller falls
// back to the local copy). The key-mapping is what makes faf-cli's slotFills
// line up with CFM's slotFillRecommendations once the engine is live.

describe('BRAKE — non-breaking until the export lands', () => {
  test('B1 — composedTurboCat returns null today (faf-cli does not yet export turboCatScan)', async () => {
    const r = await composedTurboCat(process.cwd());
    expect(r).toBeNull(); // fallback to local discoverFormatsInternal — no behavior change
  });

  test('B2 — composedTurboCat never throws, even on a bogus path', async () => {
    let threw = false;
    try { await composedTurboCat('/no/such/dir/xyz'); } catch { threw = true; }
    expect(threw).toBe(false);
  });
});

describe('ENGINE — key mapping (faf-cli keys → CFM slotFillRecommendations keys)', () => {
  test('E1 — maps the keys that differ between the two', () => {
    const out = normalizeTurboCatKeys({
      main_language: 'TypeScript',
      framework: 'SvelteKit',
      buildTool: 'Vite',
      pkg_manager: 'bun',
    });
    expect(out).toEqual({
      mainLanguage: 'TypeScript',
      frontend: 'SvelteKit',
      build: 'Vite',
      packageManager: 'bun',
    });
  });

  test('E2 — passes through keys that already match, drops empties', () => {
    const out = normalizeTurboCatKeys({ backend: 'Express', hosting: 'Vercel', testing: '' });
    expect(out).toEqual({ backend: 'Express', hosting: 'Vercel' });
  });

  test('E3 — unknown keys pass through unchanged (extra recommendations are harmless)', () => {
    expect(normalizeTurboCatKeys({ database: 'Postgres' })).toEqual({ database: 'Postgres' });
  });

  test('E4 — deterministic', () => {
    const fills = { framework: 'React', backend: 'Fastify' };
    expect(normalizeTurboCatKeys(fills)).toEqual(normalizeTurboCatKeys(fills));
  });
});
