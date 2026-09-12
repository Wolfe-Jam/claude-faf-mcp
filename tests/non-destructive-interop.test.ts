/**
 * Non-destructive interop — regression guard for the file-wipe bug.
 * The exports must KEEP an existing AGENTS.md / GEMINI.md / .cursorrules
 * (and CLAUDE.md via faf_sync) and add faf's block, never replace them.
 * Since 6.0.0 the exports are faf-cli's writers (the local renderers are gone).
 */
import { describe, test, expect } from 'bun:test';
import { mkdtempSync, promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { stringify } from 'yaml';
import { agentsExportCommand } from '../src/faf-core/commands/agents';
import { geminiExportCommand } from '../src/faf-core/commands/gemini';
import { cursorExportCommand } from '../src/faf-core/commands/cursor';
import { fafCli } from '../src/utils/faf-cli-bridge.js';

// The block writer is faf-cli's own injector (the local port was retired in 5.23).
const { injectFafBlock, legacyStampNoteAt } = await fafCli;

const DATA: any = {
  project: { name: 'Demo', goal: 'a small api', main_language: 'TypeScript' },
  human_context: { who: 'devs' },
  stack: { backend: 'Express' },
};
const MARK = '## HAND-WRITTEN — MUST SURVIVE';
const blocks = (s: string) => (s.match(/faf:start/g) || []).length;
function tmp(): string { return mkdtempSync(join(tmpdir(), 'nd-interop-')); }

describe('injectFafBlock — non-destructive', () => {
  test('prefix preserves user content; markers update in place; idempotent', async () => {
    const p = join(tmp(), 'F.md');
    await fs.writeFile(p, `# Mine\n${MARK}\n`);
    await injectFafBlock(p, 'block-v1');
    expect(await fs.readFile(p, 'utf-8')).toContain(MARK);
    await injectFafBlock(p, 'block-v2');
    const out = await fs.readFile(p, 'utf-8');
    expect(out).toContain('block-v2');
    expect(out).not.toContain('block-v1'); // updated, not duplicated
    expect(out).toContain(MARK);
    expect(blocks(out)).toBe(1);
  });

  // faf-cli 7.13: a file with no marker lines is never reclaimed, whatever it
  // starts with — faf cannot prove it wrote an old metastamp-led file, so the
  // block goes on top and every original byte stays below it.
  test('legacy faf file (metastamp, no markers) is prefixed — every original byte kept, one block', async () => {
    const p = join(tmp(), 'F.md');
    const original = '<!-- faf: demo | TS | lib | x -->\n\n# Old\nOLD FAF BODY\n';
    await fs.writeFile(p, original);
    expect(legacyStampNoteAt(p, 'F.md')).not.toBeNull(); // the one-line hint faf prints for it
    await injectFafBlock(p, 'fresh');
    let out = await fs.readFile(p, 'utf-8');
    expect(out.startsWith('<!-- faf:start -->')).toBe(true);
    expect(out).toContain('fresh');
    expect(out.endsWith(original)).toBe(true); // byte-for-byte, below the block
    expect(blocks(out)).toBe(1);
    await injectFafBlock(p, 'fresh-2'); // the next run updates the block in place
    out = await fs.readFile(p, 'utf-8');
    expect(out).toContain('fresh-2');
    expect(out).not.toContain('fresh\n');
    expect(out.endsWith(original)).toBe(true);
    expect(blocks(out)).toBe(1);
  });
});

describe('exports (faf-cli writers) — keep what is there, never replace', () => {
  for (const [file, exporter] of [
    ['AGENTS.md', agentsExportCommand],
    ['GEMINI.md', geminiExportCommand],
    ['.cursorrules', cursorExportCommand],
  ] as const) {
    test(`${file} preserves an existing file + idempotent`, async () => {
      const dir = tmp();
      await fs.writeFile(join(dir, 'project.faf'), stringify({ faf_version: '3.0', ...DATA }));
      const p = join(dir, file);
      await fs.writeFile(p, `# Mine\n${MARK}\nnotes\n`);
      expect((await exporter(dir)).success).toBe(true);
      let out = await fs.readFile(p, 'utf-8');
      expect(out).toContain(MARK);   // user content preserved
      expect(blocks(out)).toBe(1);   // exactly one faf block
      await exporter(dir);
      await exporter(dir);
      out = await fs.readFile(p, 'utf-8');
      expect(out).toContain(MARK);
      expect(blocks(out)).toBe(1);   // still one after repeats
    });
  }
});
