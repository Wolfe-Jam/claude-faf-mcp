/**
 * Tool-Count Single-Source Gate
 * ------------------------------
 * The ONE truth for "how many tools does claude-faf-mcp expose" is the runtime
 * tool list the server actually serves — `quietToolList(listTools())`, nothing
 * else. This test reads that number and refuses if any human/AI-facing surface
 * advertises a different count.
 *
 * Why: tool-count claims hand-typed in N places drift silently (a stale
 * "32 MCP Tools" header lived next to four correct "35"s). Loose test bounds
 * (10–200) never catch it. This makes it mechanical — it can't be skimmed.
 * Same design as Doc Gate 101; first shipped on faf-mcp 2.2.1.
 *
 * If you intentionally change the tool set, this fails until every surface is
 * updated to the new runtime count. That failure is the gate working.
 */
import { test, expect } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { FafToolHandler } from '../src/handlers/tools';
import { quietToolList } from '../src/utils/sanitize-output';

const ROOT = join(import.meta.dir, '..');

/** Single source of truth: the exact list the server hands clients. */
async function runtimeToolCount(): Promise<number> {
  const mockAdapter = {
    getWorkingDirectory: () => process.cwd(),
    setWorkingDirectory: () => {},
    getEngine: () => ({}),
  } as unknown as ConstructorParameters<typeof FafToolHandler>[0];
  const handler = new FafToolHandler(mockAdapter);
  const exposed = quietToolList(await handler.listTools()); // exact server path (server.ts)
  return exposed.tools.length;
}

// Prose surfaces — scanned line by line.
const TEXT_SURFACES = ['README.md', 'CLAUDE.md', 'project.faf'];
// JSON surfaces — only the `description` field ships a count (npm + registry).
const JSON_SURFACES = ['package.json', 'server.json'];
// Lines naming a SIBLING package quote THAT package's count, not ours.
// Note: keep `claude-faf-mcp` (ours) — exclude the bare `faf-mcp` sibling only.
const SIBLING = /grok-faf-mcp|gemini-faf-mcp|faf-cli|(?<!claude-)\bfaf-mcp\b/i;
// "35 tools", "35 MCP tools", "32 Core MCP tools", "36 advanced tools" …
const COUNT_RE = /(\d+)(?:\s+[A-Za-z.\-]+){0,2}\s+(?:MCP\s+)?tools?\b/gi;

function scan(label: string, text: string, truth: number, drift: string[]): void {
  text.split('\n').forEach((line, i) => {
    if (SIBLING.test(line)) return; // sibling-package count, not ours
    for (const m of line.matchAll(COUNT_RE)) {
      const n = Number(m[1]);
      if (n !== truth) drift.push(`  ${label}:${i + 1} claims ${n} → "${line.trim()}"`);
    }
  });
}

test('tool-count: every surface matches runtime listTools()', async () => {
  const truth = await runtimeToolCount();
  expect(truth).toBeGreaterThan(0);

  const drift: string[] = [];
  for (const file of TEXT_SURFACES) {
    scan(file, readFileSync(join(ROOT, file), 'utf8'), truth, drift);
  }
  for (const file of JSON_SURFACES) {
    try {
      const desc = (JSON.parse(readFileSync(join(ROOT, file), 'utf8')).description as string) ?? '';
      scan(`${file}#description`, desc, truth, drift);
    } catch {
      /* surface absent — skip */
    }
  }

  if (drift.length) {
    throw new Error(
      `\nTool-count drift — runtime exposes ${truth}, but surfaces disagree:\n` +
        drift.join('\n') +
        `\n\nSingle source of truth is the runtime tool list. ` +
        `Set every count above to ${truth} (or change the tool set, then update the surfaces).\n`,
    );
  }
  expect(drift.length).toBe(0);
});
