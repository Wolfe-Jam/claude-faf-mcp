import type { ParityReceipt } from './parity.js';

/**
 * The `✪` trust receipt (The Trust Edition · Pillar 4).
 *
 * A falsifiable, render-IDENTICAL artifact that bundles what a FAF release
 * attests: the score (sealed with the quiet trophy `✪` at Trophy), the
 * determinism parity hash from Pillar 3, and — optionally — a test pass count.
 * Its value is OUTSIDE the terminal: WJTTC/TAF reports, CI artifacts, logs.
 *
 * Why `✪` and not 🏆: emoji shapeshift per platform; a seal that renders
 * differently isn't a seal. `✪` (U+272A) is one stable code point everywhere,
 * so a receipt copied from a terminal into a PR into a log stays byte-identical.
 *
 * The receipt is self-verifying: it carries the parity `projection`, so anyone
 * can recompute sha256(projection) and confirm it equals parityHash — the
 * receipt asserts nothing it doesn't also let you check.
 */

// The quiet tier ladder — geometric, render-identical, NOT emoji.
// Mirrors ~/FAF/cli/src/core/tiers.ts thresholds.
export const SEAL_TROPHY = '✪'; // 100 — Trophy
const SEAL_GOLD = '★';          // 99+ — Gold
const SEAL_SILVER = '◆';        // 95+ — Silver
const SEAL_BRONZE = '◇';        // 85+ — Bronze
const SEAL_SOLID = '●';         // 55+ — Green / Yellow
const SEAL_RED = '○';           // 1+  — Red
const SEAL_EMPTY = '♡';         // 0   — White

/** The render-identical seal for a score, on the quiet ladder ♡ ○ ● ◇ ◆ ★ ✪. */
export function sealForScore(score: number): string {
  if (score >= 100) return SEAL_TROPHY;
  if (score >= 99) return SEAL_GOLD;
  if (score >= 95) return SEAL_SILVER;
  if (score >= 85) return SEAL_BRONZE;
  if (score >= 55) return SEAL_SOLID;
  if (score >= 1) return SEAL_RED;
  return SEAL_EMPTY;
}

export interface TestAttestation {
  passed: number;
  total: number;
  suite?: string; // e.g. 'WJTTC'
}

export interface TrustReceipt {
  spec: 'faf-trust-receipt/v1';
  seal: string;          // the quiet-ladder glyph for this score
  subject: string;       // e.g. 'claude-faf-mcp@5.8.0'
  score: number;
  tier: string;
  tests: TestAttestation | null;
  parity: ParityReceipt; // the determinism proof this receipt attests
  issued: string | null; // ISO timestamp, caller-supplied (kept pure)
}

export interface BuildReceiptInput {
  subject: string;
  score: number;
  tier: string;
  parity: ParityReceipt;
  tests?: TestAttestation | null;
  /** ISO timestamp — passed in so this stays pure/deterministic. */
  issued?: string | null;
}

export function buildReceipt(input: BuildReceiptInput): TrustReceipt {
  return {
    spec: 'faf-trust-receipt/v1',
    seal: sealForScore(input.score),
    subject: input.subject,
    score: input.score,
    tier: input.tier,
    tests: input.tests ?? null,
    parity: input.parity,
    issued: input.issued ?? null,
  };
}

/**
 * Render the receipt as render-identical text. No emoji — only the quiet seal
 * and ASCII. Byte-stable for a given receipt (modulo the caller's timestamp).
 */
export function renderReceipt(r: TrustReceipt): string {
  const lines = [
    `${r.seal} FAF TRUST RECEIPT — ${r.subject}`,
    `${'─'.repeat(44)}`,
    `score:   ${r.score}/100  ${r.seal} ${r.tier}`,
  ];
  if (r.tests) {
    const suite = r.tests.suite ? `${r.tests.suite} ` : '';
    lines.push(`tests:   ${suite}${r.tests.passed}/${r.tests.total} passing`);
  }
  lines.push(
    `parity:  ${r.parity.spec}  ${r.parity.parityHash}`,
    `source:  sha256 ${r.parity.sourceSha256}`,
    `scorer:  ${r.parity.scorer}  (single deterministic source)`,
    `verify:  sha256(projection) === parityHash`,
  );
  if (r.issued) lines.push(`issued:  ${r.issued}`);
  return lines.join('\n');
}
