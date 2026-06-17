/**
 * Core tier — the Glama-facing default tool surface.
 * Glama runs the server in a sandbox and scores `tools/list`, so the DEFAULT
 * surface must be exactly the 12 Core tools (gemini's proven count); Extended is
 * opt-in via FAF_TOOLS=all. This test guards the one non-negotiable: Extended
 * defaults OFF. See PLANET-FAF/strategy/claude-faf-mcp-core-tier-glama-a-2026-06-17.md.
 */
import { describe, test, expect, beforeEach } from 'bun:test';
import { FafToolHandler } from '../src/handlers/tools.js';

const CORE = [
  'faf_init', 'faf_auto', 'faf_go', 'faf_enhance', 'faf_score', 'faf_doctor',
  'faf_sync', 'faf_context', 'faf_trust', 'faf_about', 'faf_etch', 'faf_recall',
];

// listTools() never touches the engine adapter — a stub is enough.
const handler = () => new FafToolHandler({} as any);

describe('Core tier — Glama-facing default surface', () => {
  beforeEach(() => {
    delete process.env.FAF_TOOLS;
    delete process.env.FAF_EXTENDED;
  });

  test('default tools/list advertises EXACTLY the 12 Core tools', async () => {
    const { tools } = await handler().listTools();
    expect(tools.map((t: any) => t.name).sort()).toEqual([...CORE].sort());
  });

  test('the marketing `faf` tool is NOT on the default surface (the 1.5/5 that capped Glama)', async () => {
    const { tools } = await handler().listTools();
    expect(tools.map((t: any) => t.name)).not.toContain('faf');
  });

  test('every Core tool has a substantive description (≥40 chars, no marketing "!")', async () => {
    const { tools } = await handler().listTools();
    for (const t of tools as any[]) {
      expect((t.description ?? '').length).toBeGreaterThanOrEqual(40);
      expect((t.description ?? '').trim().endsWith('!')).toBe(false);
    }
  });

  test('FAF_TOOLS=all exposes the full set (>30 tools, Core ⊂ all)', async () => {
    process.env.FAF_TOOLS = 'all';
    const { tools } = await handler().listTools();
    expect(tools.length).toBeGreaterThan(30);
    const names = tools.map((t: any) => t.name);
    for (const c of CORE) expect(names).toContain(c);
  });
});
