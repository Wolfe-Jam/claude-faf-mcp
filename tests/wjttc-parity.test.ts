import { test, expect, describe } from 'bun:test';
import { createHash } from 'crypto';
import {
  computeParity, buildProjection, PARITY_SPEC, PARITY_ALGO, type ScoreFacts,
} from '../src/trust/parity.js';

// WJTTC — The Trust Edition · Pillar 3 (DETERMINISM PARITY HASH)
//
// The parity hash exists to be FALSIFIABLE: same input + same deterministic
// score => same hash, on ANY conformant engine; different score => different
// hash; producer identity must NOT change it. BRAKE = those guarantees,
// ENGINE = the receipt shape, AERO = the edge cases.

const facts = (over: Partial<ScoreFacts> = {}): ScoreFacts => ({
  score: 100, tier: 'Trophy', active: 9, populated: 9, empty: 0, ignored: 24, total: 33,
  slots: { who: 'populated', what: 'populated', database: 'slotignored' },
  ...over,
});

const RAW = 'project:\n  name: demo\nhuman_context:\n  who: devs\n';

describe('BRAKE — falsifiability guarantees', () => {
  test('B1 — same input + same facts => identical parityHash (reproducible)', () => {
    const a = computeParity(RAW, facts(), { producedBy: 'claude-faf-mcp@5.8.0' });
    const b = computeParity(RAW, facts(), { producedBy: 'claude-faf-mcp@5.8.0' });
    expect(a.parityHash).toBe(b.parityHash);
  });

  test('B2 — producer identity is METADATA, NOT in the hash (engine-agnostic)', () => {
    const fromClaude = computeParity(RAW, facts(), { producedBy: 'claude-faf-mcp@5.8.0' });
    const fromGrok = computeParity(RAW, facts(), { producedBy: 'grok-faf-mcp@1.6.0', scorer: 'faf-cli' });
    const fromCli = computeParity(RAW, facts(), { producedBy: 'faf-cli@6.8.0' });
    // Different wrappers, same file + same score => IDENTICAL parity hash:
    expect(fromGrok.parityHash).toBe(fromClaude.parityHash);
    expect(fromCli.parityHash).toBe(fromClaude.parityHash);
    // ...but the metadata still records who produced it:
    expect(fromGrok.producedBy).toBe('grok-faf-mcp@1.6.0');
  });

  test('B3 — a different score => a different hash (no false parity)', () => {
    const at100 = computeParity(RAW, facts({ score: 100 }), { producedBy: 'x' });
    const at99 = computeParity(RAW, facts({ score: 99 }), { producedBy: 'x' });
    expect(at99.parityHash).not.toBe(at100.parityHash);
  });

  test('B4 — a different input (.faf bytes) => a different hash', () => {
    const a = computeParity(RAW, facts(), { producedBy: 'x' });
    const b = computeParity(RAW + '\n# edit\n', facts(), { producedBy: 'x' });
    expect(b.sourceSha256).not.toBe(a.sourceSha256);
    expect(b.parityHash).not.toBe(a.parityHash);
  });

  test('B5 — third party can VERIFY: sha256(projection) === parityHash', () => {
    const r = computeParity(RAW, facts(), { producedBy: 'x' });
    const recomputed = createHash('sha256').update(r.projection, 'utf8').digest('hex');
    expect(recomputed).toBe(r.parityHash);
  });

  test('B6 — sourceSha256 is the real SHA-256 of the raw bytes', () => {
    const r = computeParity(RAW, facts(), { producedBy: 'x' });
    expect(r.sourceSha256).toBe(createHash('sha256').update(RAW, 'utf8').digest('hex'));
  });

  test('B7 — slot order does NOT affect the hash (canonical sort)', () => {
    const ordered = computeParity(RAW, facts({ slots: { a: 'populated', b: 'empty', c: 'slotignored' } }), { producedBy: 'x' });
    const shuffled = computeParity(RAW, facts({ slots: { c: 'slotignored', a: 'populated', b: 'empty' } }), { producedBy: 'x' });
    expect(shuffled.parityHash).toBe(ordered.parityHash);
  });
});

describe('ENGINE — receipt shape', () => {
  test('E1 — receipt carries spec + algo + the exact projection', () => {
    const r = computeParity(RAW, facts(), { producedBy: 'claude-faf-mcp@5.8.0' });
    expect(r.spec).toBe(PARITY_SPEC);
    expect(r.algo).toBe(PARITY_ALGO);
    expect(r.projection).toContain(`${PARITY_SPEC}\n`);
    expect(r.projection).toContain(`source=${r.sourceSha256}`);
    expect(r.projection).toContain('score=100');
    expect(r.scorer).toBe('faf-cli');
  });

  test('E2 — projection includes every slot=state line, sorted', () => {
    const proj = buildProjection(facts({ slots: { who: 'populated', database: 'slotignored', api: 'empty' } }), 'abc');
    const slotLines = proj.split('\n').filter(l => /^(api|database|who)=/.test(l));
    expect(slotLines).toEqual(['api=empty', 'database=slotignored', 'who=populated']);
  });

  test('E3 — score components are surfaced on the receipt for direct reads', () => {
    const r = computeParity(RAW, facts({ score: 85, tier: 'Bronze', populated: 18, active: 21, total: 33, empty: 3, ignored: 12 }), { producedBy: 'x' });
    expect(r).toMatchObject({ score: 85, tier: 'Bronze', populated: 18, active: 21, total: 33 });
  });
});

describe('AERO — edge cases', () => {
  test('A1 — empty slots map still produces a stable hash', () => {
    const a = computeParity(RAW, facts({ slots: {} }), { producedBy: 'x' });
    const b = computeParity(RAW, facts({ slots: {} }), { producedBy: 'x' });
    expect(a.parityHash).toBe(b.parityHash);
  });

  test('A2 — unicode + emoji in the raw .faf are hashed faithfully', () => {
    const r1 = computeParity('who: 🏎️ déjà', facts(), { producedBy: 'x' });
    const r2 = computeParity('who: 🏎️ déjà', facts(), { producedBy: 'x' });
    expect(r1.sourceSha256).toBe(r2.sourceSha256);
    expect(r1.parityHash).toBe(r2.parityHash);
  });

  test('A3 — a slot-state change (populated->empty) flips the hash even at same score', () => {
    // Pathological but guards the projection: identical counts, different states.
    const a = computeParity(RAW, facts({ slots: { who: 'populated', what: 'empty' } }), { producedBy: 'x' });
    const b = computeParity(RAW, facts({ slots: { who: 'empty', what: 'populated' } }), { producedBy: 'x' });
    expect(b.parityHash).not.toBe(a.parityHash);
  });

  test('A4 — hashes are lowercase 64-char hex', () => {
    const r = computeParity(RAW, facts(), { producedBy: 'x' });
    expect(r.parityHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.sourceSha256).toMatch(/^[0-9a-f]{64}$/);
  });
});
