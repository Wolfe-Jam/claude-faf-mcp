/**
 * Composed Turbo-Cat (STAGED) — single-source format detection via faf-cli.
 *
 * Turbo-Cat's real engine (the 43 KB knowledge base) lives in faf-cli; CFM has
 * only carried a small hardcoded copy (`discoverFormatsInternal`). The plan is
 * to COMPOSE faf-cli's engine — exactly like `scoreFafYaml` — instead of forking
 * it. faf-cli just needs to export `turboCatScan` from its public API (see
 * PLANET-FAF/03-TECHNICAL/turbo-cat-export-spec-2026-06-12.md).
 *
 * This module is the consumer side, staged ahead of that export:
 *   - It FEATURE-DETECTS `turboCatScan` on the bridged faf-cli module.
 *   - Until faf-cli exposes it, `composedTurboCat` returns null and the caller
 *     falls back to the local copy — so this is fully non-breaking TODAY.
 *   - The moment faf-cli ships the export and CFM bumps the dep, the composed
 *     43 KB-knowledge path activates automatically, no further code change.
 *
 * Typed locally so it compiles before faf-cli's published types include the
 * symbol; the structural cast is satisfied by the real export once it lands.
 */
import { fafCli } from '../../utils/faf-cli-bridge.js';

/** Mirrors faf-cli's `TurboCatResult` (kept in sync with the export spec). */
export interface TurboCatResult {
  slotFills: Record<string, string>; // ContextSlots key → value (priority-wins)
  frameworks: string[];
  confirmedCount: number;
}

type TurboCatCapable = {
  turboCatScan?: (dir: string) => TurboCatResult;
};

/**
 * Prefer faf-cli's single-source Turbo-Cat when its public API exposes it;
 * return null until then. Never throws — detection must not break a tool.
 */
export async function composedTurboCat(dir: string): Promise<TurboCatResult | null> {
  try {
    const mod = (await fafCli) as unknown as TurboCatCapable;
    if (typeof mod.turboCatScan === 'function') {
      return mod.turboCatScan(dir);
    }
  } catch {
    /* bridge or scan unavailable — fall back to the local copy */
  }
  return null;
}

/**
 * Map faf-cli's slotFills keys onto CFM's slotFillRecommendations keys. faf-cli
 * uses `framework`/`buildTool`; CFM's local copy + display use `frontend`/`build`.
 * Unknown keys pass through unchanged (extra recommendations are harmless).
 */
const KEY_MAP: Record<string, string> = {
  main_language: 'mainLanguage',
  framework: 'frontend',
  build_tool: 'build',
  buildTool: 'build',
  pkg_manager: 'packageManager',
};

export function normalizeTurboCatKeys(slotFills: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(slotFills)) {
    if (!v) continue;
    out[KEY_MAP[k] ?? k] = v;
  }
  return out;
}
