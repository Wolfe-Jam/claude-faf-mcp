/**
 * Composed Turbo-Cat — single-source format detection via faf-cli.
 *
 * Turbo-Cat's real engine (the knowledge base, ~200 formats) lives in faf-cli
 * and is public since v6.10.0 (`turboCatScan` / `turboCatSlots`), with the
 * manifest.json no-guess fix in v6.10.1. CFM now COMPOSES it — exactly like
 * `scoreFafYaml` — instead of carrying its own hardcoded copy. The old local
 * `discoverFormatsInternal` (a 25-entry map) is DELETED; this is the single
 * source.
 *
 * Requires faf-cli >= 6.10.1 (the dep range). The feature-detect + null-return
 * survive a mis-installed older faf-cli (degrade to "no formats") rather than
 * crash — detection must never break a tool.
 */
import { fafCli } from '../../utils/faf-cli-bridge.js';

export interface DiscoveredFormat {
  fileName: string;
  category: string;
  priority: number;
}

/** faf-cli's `TurboCatResult` (v6.10.0+ Option-B shape). */
export interface TurboCatResult {
  slotFills: Record<string, string>; // ContextSlots key → value (priority-wins)
  frameworks: string[];
  confirmedCount: number;
  discoveredFormats: DiscoveredFormat[];
  stackSignature: string;
}

/** faf-cli's `turboCatSlots` shape — a .faf-routed partial. */
export interface TurboCatSlots {
  project?: Record<string, string>;
  stack?: Record<string, string>;
}

type TurboCatCapable = {
  turboCatScan?: (dir: string) => TurboCatResult;
  turboCatSlots?: (dir: string) => TurboCatSlots;
};

/** Full scan result, or null if faf-cli doesn't expose it (mis-installed old dep). */
export async function composedTurboCat(dir: string): Promise<TurboCatResult | null> {
  try {
    const mod = (await fafCli) as unknown as TurboCatCapable;
    if (typeof mod.turboCatScan === 'function') return mod.turboCatScan(dir);
  } catch {
    /* unavailable — caller degrades to "no formats" */
  }
  return null;
}

/** `.faf`-routed slot fills ({project, stack}) for writing into a .faf, or null. */
export async function composedTurboCatSlots(dir: string): Promise<TurboCatSlots | null> {
  try {
    const mod = (await fafCli) as unknown as TurboCatCapable;
    if (typeof mod.turboCatSlots === 'function') return mod.turboCatSlots(dir);
  } catch {
    /* unavailable */
  }
  return null;
}

/**
 * Map faf-cli's slotFills keys onto CFM's slotFillRecommendations keys for the
 * faf_formats display. faf-cli uses `framework`/`buildTool`; CFM's display uses
 * `frontend`/`build`. Unknown keys pass through.
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

export interface TurboCatDisplay {
  discoveredFormats: DiscoveredFormat[];
  totalIntelligenceScore: number;
  stackSignature: string;
  slotFillRecommendations: Record<string, string>;
}

/**
 * Display-shaped result for faf_formats — what the old `discoverFormatsInternal`
 * returned, now sourced from faf-cli. Empty (not crashing) when unavailable.
 */
export async function turboCatDisplay(dir: string): Promise<TurboCatDisplay> {
  const r = await composedTurboCat(dir);
  if (!r) {
    return { discoveredFormats: [], totalIntelligenceScore: 0, stackSignature: 'unknown-stack', slotFillRecommendations: {} };
  }
  const discoveredFormats = r.discoveredFormats ?? [];
  return {
    discoveredFormats,
    totalIntelligenceScore: discoveredFormats.reduce((s, f) => s + (f.priority || 0), 0),
    stackSignature: r.stackSignature ?? 'unknown-stack',
    slotFillRecommendations: normalizeTurboCatKeys(r.slotFills),
  };
}
