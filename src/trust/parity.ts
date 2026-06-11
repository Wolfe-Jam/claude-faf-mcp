import { createHash } from 'crypto';

/**
 * Determinism parity hash (The Trust Edition · Pillar 3).
 *
 * FAF's claim is that a .faf score is a single deterministic source: the same
 * file scored by faf-cli, the Rust kernel, or any conformant engine yields the
 * SAME number. This module turns that claim into a falsifiable artifact.
 *
 * The parity hash is computed over an ENGINE-AGNOSTIC canonical projection of
 * the deterministic scoring facts (score, slot counts, tier, per-slot states)
 * bound to the input via its SHA-256. It deliberately contains NOTHING about
 * which wrapper produced it — so faf-cli, claude-faf-mcp, grok-faf-mcp and the
 * kernel all produce the IDENTICAL hash for the same file. A third party
 * verifies by recomputing, not by trusting: the exact `projection` string that
 * was hashed travels in the receipt, so anyone can rebuild and compare.
 *
 * `producedBy` / `scorer` are metadata (who emitted, what scored) and are NOT
 * part of the hash — putting them in would break portability, which is the
 * whole point.
 */

export const PARITY_SPEC = 'faf-parity/v1';
export const PARITY_ALGO = 'sha256';

/** The deterministic facts a conformant scorer produces for a .faf. */
export interface ScoreFacts {
  score: number;
  tier: string;
  active: number;
  populated: number;
  empty: number;
  ignored: number;
  total: number;
  /** slot name -> state (e.g. 'populated' | 'empty' | 'slotignored') */
  slots: Record<string, string>;
}

export interface ParityReceipt {
  spec: typeof PARITY_SPEC;
  algo: typeof PARITY_ALGO;
  /** The single deterministic source the score comes from (metadata). */
  scorer: string;
  /** Who emitted this receipt (metadata — NOT in the hash). */
  producedBy: string;
  /** SHA-256 of the raw .faf bytes — binds the claim to an exact input. */
  sourceSha256: string;
  score: number;
  tier: string;
  active: number;
  populated: number;
  empty: number;
  ignored: number;
  total: number;
  /** The exact string that was hashed — makes the hash third-party verifiable. */
  projection: string;
  /** sha256(projection) — identical across any conformant engine. */
  parityHash: string;
}

function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Build the canonical, engine-agnostic projection string. Slot lines are sorted
 * by slot name so the projection is byte-stable regardless of object key order.
 */
export function buildProjection(facts: ScoreFacts, sourceSha256: string): string {
  const lines = [
    PARITY_SPEC,
    `source=${sourceSha256}`,
    `score=${facts.score}`,
    `active=${facts.active}`,
    `populated=${facts.populated}`,
    `empty=${facts.empty}`,
    `ignored=${facts.ignored}`,
    `total=${facts.total}`,
    `tier=${facts.tier}`,
  ];
  for (const slot of Object.keys(facts.slots).sort()) {
    lines.push(`${slot}=${facts.slots[slot]}`);
  }
  return lines.join('\n');
}

/**
 * Compute a parity receipt from the raw .faf source and the deterministic
 * scoring facts. `producedBy` names the wrapper (e.g. `claude-faf-mcp@5.8.0`);
 * `scorer` names the single source (default `faf-cli`).
 */
export function computeParity(
  raw: string,
  facts: ScoreFacts,
  opts: { producedBy: string; scorer?: string },
): ParityReceipt {
  const sourceSha256 = sha256(raw);
  const projection = buildProjection(facts, sourceSha256);
  return {
    spec: PARITY_SPEC,
    algo: PARITY_ALGO,
    scorer: opts.scorer ?? 'faf-cli',
    producedBy: opts.producedBy,
    sourceSha256,
    score: facts.score,
    tier: facts.tier,
    active: facts.active,
    populated: facts.populated,
    empty: facts.empty,
    ignored: facts.ignored,
    total: facts.total,
    projection,
    parityHash: sha256(projection),
  };
}
