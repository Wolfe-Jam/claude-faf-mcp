import { test, expect, describe } from 'bun:test';
import { createHash } from 'crypto';
import { buildReceipt, renderReceipt, sealForScore, SEAL_TROPHY } from '../src/trust/receipt.js';
import { computeParity, type ScoreFacts } from '../src/trust/parity.js';

// WJTTC — The Trust Edition · Pillar 4 (✪ RECEIPT)
//
// The receipt is a TRUST artifact: its seal must be render-identical (one code
// point, no emoji), and it must remain self-verifying (carries the parity
// projection so a third party recomputes rather than trusts).

const facts = (score = 100): ScoreFacts => ({
  score, tier: score >= 100 ? 'Trophy' : 'Bronze', active: 9, populated: 9,
  empty: 0, ignored: 24, total: 33, slots: { who: 'populated', database: 'slotignored' },
});
const RAW = 'project:\n  name: demo\n';
const parityFor = (score = 100) => computeParity(RAW, facts(score), { producedBy: 'claude-faf-mcp@5.8.0' });

describe('BRAKE — seal integrity + verifiability', () => {
  test('B1 — the Trophy seal is exactly ✪ (U+272A), one code point, NOT 🏆', () => {
    expect(SEAL_TROPHY).toBe('✪');
    expect([...SEAL_TROPHY].length).toBe(1);
    expect(SEAL_TROPHY.codePointAt(0)).toBe(0x272a);
    expect(renderReceipt(buildReceipt({ subject: 'x@1', score: 100, tier: 'Trophy', parity: parityFor(100) })))
      .not.toContain('\u{1F3C6}'); // no rich trophy emoji ever
  });

  test('B2 — the rendered receipt carries NO emoji at all (render-identical)', () => {
    const txt = renderReceipt(buildReceipt({
      subject: 'claude-faf-mcp@5.8.0', score: 100, tier: 'Trophy',
      tests: { passed: 520, total: 520, suite: 'WJTTC' }, parity: parityFor(100),
    }));
    expect(txt).not.toMatch(/[\u{1F000}-\u{1FAFF}]/u);
    expect(txt).not.toMatch(/[☀-☄☇-♠♢-✩✫-➿]/u); // emoji zone minus seals
  });

  test('B3 — receipt is self-verifying: sha256(projection) === embedded parityHash', () => {
    const r = buildReceipt({ subject: 'x@1', score: 100, tier: 'Trophy', parity: parityFor(100) });
    const recomputed = createHash('sha256').update(r.parity.projection, 'utf8').digest('hex');
    expect(recomputed).toBe(r.parity.parityHash);
  });

  test('B4 — the seal in the receipt matches the score (no mislabelled trust)', () => {
    expect(buildReceipt({ subject: 'x', score: 100, tier: 'Trophy', parity: parityFor(100) }).seal).toBe('✪');
    expect(buildReceipt({ subject: 'x', score: 85, tier: 'Bronze', parity: parityFor(85) }).seal).toBe('◇');
  });
});

describe('ENGINE — ladder + shape', () => {
  test('E1 — sealForScore walks the quiet ladder ♡ ○ ● ◇ ◆ ★ ✪', () => {
    expect(sealForScore(100)).toBe('✪');
    expect(sealForScore(99)).toBe('★');
    expect(sealForScore(95)).toBe('◆');
    expect(sealForScore(85)).toBe('◇');
    expect(sealForScore(70)).toBe('●');
    expect(sealForScore(55)).toBe('●');
    expect(sealForScore(20)).toBe('○');
    expect(sealForScore(0)).toBe('♡');
  });

  test('E2 — tests line appears only when an attestation is supplied', () => {
    const withTests = renderReceipt(buildReceipt({ subject: 'x@1', score: 100, tier: 'Trophy', tests: { passed: 5, total: 5 }, parity: parityFor(100) }));
    const without = renderReceipt(buildReceipt({ subject: 'x@1', score: 100, tier: 'Trophy', parity: parityFor(100) }));
    expect(withTests).toContain('5/5 passing');
    expect(without).not.toContain('passing');
  });

  test('E3 — issued timestamp is caller-supplied (pure; no implicit clock)', () => {
    const r = buildReceipt({ subject: 'x@1', score: 100, tier: 'Trophy', parity: parityFor(100) });
    expect(r.issued).toBeNull();
    const stamped = buildReceipt({ subject: 'x@1', score: 100, tier: 'Trophy', parity: parityFor(100), issued: '2026-06-11T00:00:00Z' });
    expect(renderReceipt(stamped)).toContain('2026-06-11T00:00:00Z');
  });

  test('E4 — spec id is stamped', () => {
    expect(buildReceipt({ subject: 'x@1', score: 100, tier: 'Trophy', parity: parityFor(100) }).spec).toBe('faf-trust-receipt/v1');
  });
});

describe('AERO — determinism', () => {
  test('A1 — identical inputs render byte-identical receipts', () => {
    const a = renderReceipt(buildReceipt({ subject: 'x@1', score: 100, tier: 'Trophy', tests: { passed: 520, total: 520, suite: 'WJTTC' }, parity: parityFor(100), issued: '2026-06-11T00:00:00Z' }));
    const b = renderReceipt(buildReceipt({ subject: 'x@1', score: 100, tier: 'Trophy', tests: { passed: 520, total: 520, suite: 'WJTTC' }, parity: parityFor(100), issued: '2026-06-11T00:00:00Z' }));
    expect(a).toBe(b);
  });

  test('A2 — boundary scores land on the right seal', () => {
    expect(sealForScore(94)).toBe('◇'); // just under Silver
    expect(sealForScore(54)).toBe('○'); // just under Solid
    expect(sealForScore(1)).toBe('○');
  });
});
