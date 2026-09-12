/**
 * The Copilot export composes faf-cli (6.0.0, #33).
 *
 * .github/copilot-instructions.md is faf-cli's renderCopilotInstructions,
 * written by faf-cli's writeCopilotInstructions — the bytes `faf export
 * --copilot` writes. claude-faf-mcp's own Copilot renderer (5.14–5.23) is
 * gone: it printed a stack labelled by hand and its own framing, so faf_sync
 * and `faf export` kept swapping the block.
 */
import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { stringify } from 'yaml';
import { FafToolHandler } from '../src/handlers/tools.js';
import { FafEngineAdapter } from '../src/handlers/engine-adapter.js';
import { fafCli } from '../src/utils/faf-cli-bridge.js';

const FAF = {
  faf_version: '3.0',
  project: { name: 'demo-mcp', goal: 'Persistent project context for Claude', main_language: 'TypeScript' },
  stack: {
    backend: 'MCP SDK', runtime: 'Node.js', build: 'tsc',
    cicd: 'GitHub Actions', hosting: 'npm', database: 'None', frontend: 'slotignored',
  },
  human_context: { who: 'Claude Desktop + Code devs', why: 'define once, never re-explain' },
};

const START = '<!-- faf:start -->';
const END = '<!-- faf:end -->';
const blockOf = (text: string): string => text.slice(text.indexOf(START) + START.length, text.indexOf(END)).trim();

function project(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cfm-copilot-'));
  fs.writeFileSync(path.join(dir, 'project.faf'), stringify(FAF));
  return dir;
}

describe('Copilot export — faf-cli render and writer', () => {
  test('faf_sync { copilot: true } writes exactly faf-cli\'s renderCopilotInstructions in the block', async () => {
    const dir = project();
    const r = await new FafToolHandler(new FafEngineAdapter()).callTool('faf_sync', { path: dir, copilot: true });
    expect(r.isError).toBeFalsy();
    const out = fs.readFileSync(path.join(dir, '.github', 'copilot-instructions.md'), 'utf-8');
    const { renderCopilotInstructions, readFaf } = await fafCli;
    expect(blockOf(out)).toBe(renderCopilotInstructions(readFaf(path.join(dir, 'project.faf'))).trim());
    expect(out).not.toContain('slotignored');
    const written = ((r.structuredContent as any).filesWritten as string[]).map((f) => fs.realpathSync(f));
    expect(written).toContain(fs.realpathSync(path.join(dir, '.github', 'copilot-instructions.md')));
  });

  test('a copilot-instructions.md you wrote keeps every line outside faf\'s block', async () => {
    const dir = project();
    fs.mkdirSync(path.join(dir, '.github'));
    const mine = '# Our Copilot rules\n\nAlways write tests.\n';
    fs.writeFileSync(path.join(dir, '.github', 'copilot-instructions.md'), mine);
    const r = await new FafToolHandler(new FafEngineAdapter()).callTool('faf_sync', { path: dir, copilot: true });
    expect(r.isError).toBeFalsy();
    const out = fs.readFileSync(path.join(dir, '.github', 'copilot-instructions.md'), 'utf-8');
    expect(out.endsWith(mine)).toBe(true);
    expect(out.split(START).length - 1).toBe(1);
  });

  test('the local renderer is gone', async () => {
    const src = path.join(import.meta.dir, '..', 'src', 'faf-core', 'commands', 'copilot.ts');
    expect(fs.existsSync(src)).toBe(false);
  });
});
