/**
 * WJTTC — Championship test suite for the FAFm Memory foundation.
 * "We break things so others never have to know they were broken."
 *
 * Layer 2 (expert). Tiers: BRAKE (data integrity / parity / no-loss),
 * ENGINE (full etch/recall API), AERO (edge cases). North star: behavior must
 * match the Python claude-fafm-sdk `Soul`. Deterministic — no network, no
 * absolute-time gates (Signal Integrity: every red means real).
 */
import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Soul, canonicalPriority } from '../src/fafm/faf-memory';

const tmpSoul = (): string => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wjttc-fafm-')), 'soul.fafm');

// ════════════════════════════════ TIER 1: BRAKE 🚨 (data integrity — failure = catastrophic) ════════════════════════════════
describe('BRAKE: parity ranking, dedup, no data loss', () => {
  test('B1 ranking: priority desc, then recency, then insertion-index (newest-etched wins ties)', () => {
    const s = new Soul('@t');
    s.etch({ text: 'eph', id: 'a', priority: 'ephemeral' });
    s.etch({ text: 'crit-1', id: 'b', priority: 'critical' });
    s.etch({ text: 'std', id: 'c', priority: 'standard' });
    s.etch({ text: 'crit-2', id: 'd', priority: 'critical' }); // same-second tie with b → insertion index wins
    expect(s.recall().map((f) => f.id)).toEqual(['d', 'b', 'c', 'a']);
  });

  test('B2 ranking exhaustive: critical > high > standard > ephemeral', () => {
    const s = new Soul('@t');
    s.etch({ text: 'e', id: 'e', priority: 'ephemeral' });
    s.etch({ text: 's', id: 's', priority: 'standard' });
    s.etch({ text: 'h', id: 'h', priority: 'high' });
    s.etch({ text: 'c', id: 'c', priority: 'critical' });
    expect(s.recall().map((f) => f.id)).toEqual(['c', 'h', 's', 'e']);
  });

  test('B3 dedup: re-etch by id updates in place — no duplicate, value replaced, position kept', () => {
    const s = new Soul('@t');
    s.etch({ text: 'first', id: 'x', priority: 'high' });
    s.etch({ text: 'mid', id: 'y' });
    s.etch({ text: 'SECOND', id: 'x', priority: 'critical' });
    expect(s.facts.length).toBe(2);
    expect(s.getFact('x')!.text).toBe('SECOND');
    expect(s.getFact('x')!.priority).toBe('critical');
    expect(s.facts[0].id).toBe('x'); // original position preserved
  });

  test('B3b re-etch REPLACES the whole fact (parity: dedup is replace, not merge)', () => {
    const s = new Soul('@t');
    s.etch({ text: 'orig', id: 'x', priority: 'high', tags: ['a', 'b'], type: 'project' });
    s.etch({ text: 'new', id: 'x' }); // no tags/type/priority → full replace, not a merge
    const f = s.getFact('x')!;
    expect(f.text).toBe('new');
    expect(f.tags).toEqual([]);           // tags REPLACED, not merged
    expect(f.priority).toBe('standard');  // priority reset to default
    expect(f.type).toBeUndefined();
    expect(s.facts.length).toBe(1);
  });

  test('B4 save/load fidelity: every field survives a round-trip', () => {
    const p = tmpSoul();
    const s = new Soul('@claude-code:proj', { profile: 'knowledge' });
    s.etch({ text: 'why X over Y', id: 'd', type: 'project', priority: 'high', tags: ['decision', 'win'], links: ['[[other]]'] });
    s.save(p);
    const l = Soul.load(p);
    const f = l.getFact('d')!;
    expect(f.text).toBe('why X over Y');
    expect(f.type).toBe('project');
    expect(f.priority).toBe('high');
    expect(f.tags).toEqual(['decision', 'win']);
    expect(f.links).toEqual(['[[other]]']);
    expect(f.timestamp).toBeTruthy();
    expect(l.namepoint).toBe('@claude-code:proj');
    fs.rmSync(path.dirname(p), { recursive: true, force: true });
  });

  test('B5 .fafm v1.1 shape on disk', () => {
    const p = tmpSoul();
    const s = new Soul('@t');
    s.etch({ text: 'hi', id: 'h' });
    s.save(p);
    const doc = require('yaml').parse(fs.readFileSync(p, 'utf-8'));
    expect(String(doc.version)).toBe('1.1');
    expect(doc.profile).toBe('knowledge');
    expect(doc.retention).toBe('forever');
    expect(Array.isArray(doc.memory.facts)).toBe(true);
    expect(doc.memory).toHaveProperty('sessions');
    expect(doc.memory).toHaveProperty('preferences');
    expect(doc.memory).toHaveProperty('custom');
    fs.rmSync(path.dirname(p), { recursive: true, force: true });
  });

  test('B6 no data loss across multiple etch→save→load cycles', () => {
    const p = tmpSoul();
    let s = new Soul('@t');
    for (let i = 0; i < 50; i++) s.etch({ text: `m${i}`, id: `id${i}`, priority: i % 2 ? 'high' : 'standard' });
    s.save(p);
    s = Soul.load(p);
    for (let i = 50; i < 100; i++) s.etch({ text: `m${i}`, id: `id${i}` });
    s.save(p);
    const l = Soul.load(p);
    expect(l.facts.length).toBe(100);
    expect(l.getFact('id0')!.text).toBe('m0');
    expect(l.getFact('id99')!.text).toBe('m99');
    fs.rmSync(path.dirname(p), { recursive: true, force: true });
  });

  test('B7 missing soul: open() returns a fresh empty soul (no throw)', () => {
    const p = path.join(os.tmpdir(), `nope-${Math.floor(performance.now())}.fafm`);
    const s = Soul.open(p, '@fresh');
    expect(s.facts.length).toBe(0);
    expect(s.namepoint).toBe('@fresh');
  });

  test('B8 malformed soul: load throws (does not silently corrupt)', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'wjttc-bad-'));
    const bad = path.join(dir, 'b.fafm'); fs.writeFileSync(bad, ': : not: valid: yaml: [');
    expect(() => Soul.load(bad)).toThrow();
    const list = path.join(dir, 'l.fafm'); fs.writeFileSync(list, '- a\n- b\n');
    expect(() => Soul.load(list)).toThrow(/not a YAML mapping/);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

// ════════════════════════════════ TIER 2: ENGINE ⚡ (core API) ════════════════════════════════
describe('ENGINE: etch / recall API + filters', () => {
  const seeded = (): Soul => {
    const s = new Soul('@t');
    s.etch({ text: 'use Vitest, Jest chokes on ESM', id: 'tr', type: 'project', priority: 'high', tags: ['decision'] });
    s.etch({ text: 'do not touch api/ — it breaks the build', id: 'g', type: 'project', priority: 'critical', tags: ['gotcha'] });
    s.etch({ text: 'aside note', id: 'n', type: 'reference', priority: 'ephemeral', tags: ['note'] });
    return s;
  };

  test('E1 etch returns the fact, canonical priority + timestamp set', () => {
    const s = new Soul('@t');
    const f = s.etch({ text: 'x', id: 'x' });
    expect(f.priority).toBe('standard');
    expect(f.timestamp).toMatch(/^\d{4}-\d\d-\d\dT/);
  });
  test('E2 recall() with no args returns all, ranked', () => {
    expect(seeded().recall().map((f) => f.id)).toEqual(['g', 'tr', 'n']);
  });
  test('E3 recall query — case-insensitive substring', () => {
    expect(seeded().recall({ query: 'VITEST' }).map((f) => f.id)).toEqual(['tr']);
  });
  test('E4 recall tags — intersection', () => {
    expect(seeded().recall({ tags: ['gotcha'] }).map((f) => f.id)).toEqual(['g']);
  });
  test('E5 recall type — equality', () => {
    expect(seeded().recall({ type: 'reference' }).map((f) => f.id)).toEqual(['n']);
  });
  test('E6 recall minPriority — floor filters below it', () => {
    expect(seeded().recall({ minPriority: 'high' }).map((f) => f.id)).toEqual(['g', 'tr']);
  });
  test('E7 recall limit', () => {
    expect(seeded().recall({ limit: 1 }).map((f) => f.id)).toEqual(['g']);
  });
  test('E8 recall combined filters', () => {
    expect(seeded().recall({ type: 'project', tags: ['gotcha'], minPriority: 'high' }).map((f) => f.id)).toEqual(['g']);
  });
  test('E9 recall empty / no-match → []', () => {
    expect(new Soul('@t').recall()).toEqual([]);
    expect(seeded().recall({ query: 'zzz-nope' })).toEqual([]);
  });
  test('E10 getFact + index', () => {
    const s = seeded();
    expect(s.getFact('g')!.text).toContain('api/');
    expect(s.getFact('missing')).toBeUndefined();
    const noId = new Soul('@t'); noId.etch({ text: 'anon' });
    s.etch({ text: 'anon-too' });
    expect(s.index().every((e) => e.id)).toBe(true); // index skips id-less
    expect(noId.index().length).toBe(0);
  });
});

// ════════════════════════════════ TIER 3: AERO 🏁 (edge cases / polish) ════════════════════════════════
describe('AERO: legacy priority, unicode, injection, scale', () => {
  test('A1 legacy priority maps on etch AND on load', () => {
    expect(canonicalPriority('low')).toBe('ephemeral');
    expect(canonicalPriority('medium')).toBe('standard');
    expect(canonicalPriority('GARBAGE')).toBe('standard');
    const s = new Soul('@t'); s.etch({ text: 'x', id: 'x', priority: 'low' });
    expect(s.getFact('x')!.priority).toBe('ephemeral');
    const f = Soul.fromObj({ text: 'y', priority: 'medium' });
    expect(f.priority).toBe('standard');
  });

  test('A2 unicode + emoji + zero-width survive round-trip', () => {
    const p = tmpSoul();
    const txt = 'café ☕ 🏎️ مرحبا ​́ ✪ 测试';
    const s = new Soul('@t'); s.etch({ text: txt, id: 'u' }); s.save(p);
    expect(Soul.load(p).getFact('u')!.text).toBe(txt);
    fs.rmSync(path.dirname(p), { recursive: true, force: true });
  });

  test('A3 injection-ish text (quotes, colons, newlines, brackets, yaml) survives', () => {
    const p = tmpSoul();
    const nasty = 'key: value\n- item\n"quoted" \'single\' {a:1} [b] # comment <xss> $(cmd)';
    const s = new Soul('@t'); s.etch({ text: nasty, id: 'n' }); s.save(p);
    expect(Soul.load(p).getFact('n')!.text).toBe(nasty);
    fs.rmSync(path.dirname(p), { recursive: true, force: true });
  });

  test('A4 empty tags/links omitted on disk but normalize to [] on load', () => {
    const p = tmpSoul();
    const s = new Soul('@t'); s.etch({ text: 'bare', id: 'b' }); s.save(p);
    const raw = fs.readFileSync(p, 'utf-8');
    expect(raw).not.toContain('tags:');
    expect(raw).not.toContain('links:');
    const f = Soul.load(p).getFact('b')!;
    expect(f.tags).toEqual([]); expect(f.links).toEqual([]);
    fs.rmSync(path.dirname(p), { recursive: true, force: true });
  });

  test('A5 scale: 500 facts — correct dedup, recall subset, round-trip count (functional, no time gate)', () => {
    const p = tmpSoul();
    const s = new Soul('@t');
    for (let i = 0; i < 500; i++) s.etch({ text: `fact ${i}`, id: `f${i}`, priority: i % 5 === 0 ? 'critical' : 'standard', tags: i % 3 === 0 ? ['triad'] : [] });
    // re-etch some ids → must update in place, not grow
    for (let i = 0; i < 50; i++) s.etch({ text: `updated ${i}`, id: `f${i}` });
    expect(s.facts.length).toBe(500);
    expect(s.getFact('f0')!.text).toBe('updated 0');
    // re-etch REPLACES the whole fact (parity-true with Python `add`) — the first 50
    // ids lose their tags, so the 17 triad members (i%3===0, i<50) drop off (167 → 150).
    const triad = s.recall({ tags: ['triad'] });
    const expected = Array.from({ length: 500 }, (_, i) => i).filter((i) => i % 3 === 0 && i >= 50).length;
    expect(triad.length).toBe(expected);
    s.save(p);
    expect(Soul.load(p).facts.length).toBe(500);
    fs.rmSync(path.dirname(p), { recursive: true, force: true });
  });

  test('A6 determinism: identical recall twice yields identical order (no flaky ordering)', () => {
    const s = new Soul('@t');
    for (let i = 0; i < 30; i++) s.etch({ text: `m${i}`, id: `i${i}`, priority: (['ephemeral', 'standard', 'high', 'critical'] as const)[i % 4] });
    expect(s.recall().map((f) => f.id)).toEqual(s.recall().map((f) => f.id));
  });
});
