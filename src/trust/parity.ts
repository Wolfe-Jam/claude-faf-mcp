import { createHash } from 'crypto';

/**
 * Determinism parity hash — faf-parity/v1 (The Trust Edition · Pillar 3).
 *
 * What it is today: claude-faf-mcp's own spec. faf_score and faf_trust hash a
 * canonical projection of the scoring facts faf-cli's scoreFafYaml returns
 * (score, slot counts, tier, per-slot states), bound to the exact .faf bytes by
 * their SHA-256. The projection string travels with the receipt, so anyone can
 * check it without trusting this server: recompute sha256(projection) and
 * compare it with parityHash, and sha256 of the file with sourceSha256.
 *
 * What it is not (yet): a cross-engine standard. No other engine — faf-cli,
 * faf-mcp, grok-faf-mcp, the Rust FAFb binary — computes faf-parity/v1 today,
 * so nothing else produces this hash. The projection names no wrapper
 * (`producedBy` / `scorer` are metadata, outside the hash) so that another
 * engine could adopt the spec later; the plan is to move it into faf-cli.
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
  /** sha256(projection) — recompute it from `projection` to check the receipt. */
  parityHash: string;
}

function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Build the canonical projection string (no wrapper name in it). Slot lines are sorted
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
