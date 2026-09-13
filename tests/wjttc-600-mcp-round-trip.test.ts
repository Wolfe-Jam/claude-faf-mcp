/**
 * 🏁 WJTTC 6.0.0 — W4: the tools no test called, and both resources, over MCP
 *
 * Audit #91: faf, faf_trust, faf_recall, faf_context, faf_setup, faf_cursor,
 * faf_gemini and faf_tri_sync (and the retired faf_clear), plus the
 * claude-faf://context and claude-faf://status resources, had no test that
 * called them. Each one here goes through the real protocol — the SDK Client,
 * an in-memory transport, the server's own request handlers and its output
 * sanitiser — and checks what the tool did, not only that it answered:
 * the file it wrote, the bytes it kept, the error it returned.
 *
 * Every folder is a mkdtemp; CLAUDE_CONFIG_DIR is a temp folder, and the
 * suite runs under scripts/hermetic-test.mjs (a temp HOME).
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ClaudeFafMcpServer } from '../src/server.js';
import { fafCli } from '../src/utils/faf-cli-bridge.js';
import { HOOK_COMMAND } from '../src/faf-core/commands/setup-hook.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

type R = { isError?: boolean; content: Array<{ type: string; text?: string }>; structuredContent?: any };

const FAF_START = '<!-- faf:start -->';
const FAF_END = '<!-- faf:end -->';
const PROJECT = `faf_version: "3.0"
project:
  name: round-trip-app
  goal: Prove every tool over MCP
  main_language: TypeScript
stack:
  backend: Express
human_context:
  who: The test suite
  what: A fixture
`;

const tmpRoots: string[] = [];
const saved: Record<string, string | undefined> = {};
let client: Client;
let server: ClaudeFafMcpServer;

function tmp(prefix: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(d);
  return d;
}
/** A project one level below a fresh temp folder, so no .faf sits above it. */
function project(faf: string | null = PROJECT, extra: Record<string, string> = {}): string {
  const dir = path.join(tmp('cfm-rt-'), 'app');
  fs.mkdirSync(dir);
  if (faf !== null) {fs.writeFileSync(path.join(dir, 'project.faf'), faf);}
  for (const [f, body] of Object.entries(extra)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), body);
  }
  return dir;
}
const call = async (name: string, args: Record<string, unknown> = {}): Promise<R> =>
  (await client.callTool({ name, arguments: args })) as R;
const text = (r: R): string => r.content.map((c) => c.text ?? '').join('\n');
const read = (p: string): string => fs.readFileSync(p, 'utf-8');

beforeAll(async () => {
  for (const k of ['FAF_TOOLS', 'CLAUDE_CONFIG_DIR', 'FAF_WORKING_DIR']) {saved[k] = process.env[k];}
  process.env.FAF_TOOLS = 'all';
  process.env.CLAUDE_CONFIG_DIR = tmp('cfm-rt-claude-');
  process.env.FAF_WORKING_DIR = project();
  server = new ClaudeFafMcpServer({ transport: 'stdio' });
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await server.getServer().connect(serverT);
  client = new Client({ name: 'wjttc-round-trip', version: '1.0.0' }, { capabilities: {} });
  await client.connect(clientT);
});

afterAll(async () => {
  await client.close();
  await server.getServer().close();
  for (const d of tmpRoots) {fs.rmSync(d, { recursive: true, force: true });}
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) {delete process.env[k];} else {process.env[k] = v;}
  }
});

describe('#91 — faf and faf_context', () => {
  test('faf names the project from project.faf, reports faf-cli\'s score and lists the steps; it writes nothing', async () => {
    const dir = project();
    const before = fs.readdirSync(dir).sort();
    const r = await call('faf', { path: dir });
    expect(r.isError).toBeFalsy();
    const t = text(r);
    expect(t).toContain('Project: round-trip-app');
    expect(t).toContain(`Folder: ${fs.realpathSync(dir)}`);
    const { scoreFafYaml, scoreText } = await fafCli;
    expect(t).toContain(`${scoreText(scoreFafYaml(PROJECT))} (faf-cli)`);
    for (const step of ['faf_auto', 'faf_score', 'faf_go', 'faf_trust', 'faf_sync and faf_tri_sync']) {expect(t).toContain(step);}
    expect(fs.readdirSync(dir).sort()).toEqual(before);
  });

  test('faf_context sets the active project, and detail: true returns the .faf text; a missing path leaves the project where it was', async () => {
    const dir = project();
    const set = await call('faf_context', { path: dir, detail: true });
    expect(set.isError).toBeFalsy();
    expect(set.structuredContent.active).toBe(fs.realpathSync(dir));
    expect(set.structuredContent.changed).toBe(true);
    expect(set.structuredContent.content).toBe(PROJECT);
    expect(text(set)).toContain(PROJECT.trim());

    const missing = await call('faf_context', { path: path.join(dir, 'no-such-folder') });
    expect(missing.isError).toBe(true);
    const shown = await call('faf_context', {});
    expect(shown.structuredContent.active).toBe(fs.realpathSync(dir));
    expect(shown.structuredContent.changed).toBe(false);
    expect(shown.structuredContent.content).toBeUndefined(); // no detail, no file text
  });
});

describe('#91 — faf_trust', () => {
  test('a valid .faf gets a receipt: faf-cli\'s score, the project as subject, and a parity hash anyone can recompute', async () => {
    const dir = project();
    const r = await call('faf_trust', { path: dir });
    expect(r.isError).toBeFalsy();
    const sc = r.structuredContent;
    const { scoreFafYaml } = await fafCli;
    expect(sc.valid).toBe(true);
    expect(sc.subject).toBe('round-trip-app');
    expect(sc.score).toBe(scoreFafYaml(PROJECT).score);
    const { createHash } = await import('crypto');
    expect(createHash('sha256').update(sc.parity.projection).digest('hex')).toBe(sc.parity.parityHash);
    expect(sc.sourceSha256).toBe(createHash('sha256').update(PROJECT).digest('hex'));
  });

  test('a .faf faf-cli rejects gets no receipt: isError, with what is missing', async () => {
    const r = await call('faf_trust', { path: project('project:\n  goal: no name and no faf_version\n') });
    expect(r.isError).toBe(true);
    expect(r.structuredContent.valid).toBe(false);
    expect(r.structuredContent.receipt).toBeUndefined();
    expect(text(r)).toContain('validateFaf rejects');
  });

  test('no .faf: isError, and nothing is written', async () => {
    const dir = project(null);
    const r = await call('faf_trust', { path: dir });
    expect(r.isError).toBe(true);
    expect(r.structuredContent.hasFaf).toBe(false);
    expect(fs.readdirSync(dir)).toEqual([]);
  });
});

describe('#91 — faf_etch and faf_recall', () => {
  test('what faf_etch writes, faf_recall reads back — filtered by query and tag; a soul with none of it matches nothing', async () => {
    const dir = project();
    expect((await call('faf_etch', { path: dir, text: 'Deploys go through the staging branch', tags: ['deploy'], priority: 'high' })).isError).toBeFalsy();
    expect((await call('faf_etch', { path: dir, text: 'Tests run with bun', tags: ['test'] })).isError).toBeFalsy();
    expect(fs.existsSync(path.join(dir, 'soul.fafm'))).toBe(true);

    const all = await call('faf_recall', { path: dir });
    expect(all.isError).toBeFalsy();
    expect(all.structuredContent.soulTotal).toBe(2);
    expect(all.structuredContent.memories.map((m: any) => m.text)).toContain('Deploys go through the staging branch');

    const byTag = await call('faf_recall', { path: dir, tags: ['test'] });
    expect(byTag.structuredContent.memories.map((m: any) => m.text)).toEqual(['Tests run with bun']);

    const none = await call('faf_recall', { path: dir, query: 'kubernetes' });
    expect(none.structuredContent.total).toBe(0);
    expect(text(none)).toContain('No memories matched (2 in the soul)');
  });

  test('faf_recall with no soul says so and writes nothing', async () => {
    const dir = project();
    const r = await call('faf_recall', { path: dir });
    expect(r.isError).toBeFalsy();
    expect(r.structuredContent.total).toBe(0);
    expect(fs.existsSync(path.join(dir, 'soul.fafm'))).toBe(false);
  });
});

describe('#91 — faf_setup', () => {
  test('preview writes nothing; confirm installs only faf\'s hook and keeps every other key; remove takes out only that hook', async () => {
    const dir = project(PROJECT, {
      '.claude/settings.json': `${JSON.stringify({ permissions: { allow: ['Bash(ls)'] }, hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'echo mine' }] }] } }, null, 2)}\n`,
    });
    const settings = path.join(dir, '.claude', 'settings.json');
    const original = read(settings);

    const preview = await call('faf_setup', { path: dir });
    expect(preview.isError).toBeFalsy();
    expect(preview.structuredContent.action).toBe('preview');
    expect(read(settings)).toBe(original);
    expect(text(preview)).toContain('project settings');

    const installed = await call('faf_setup', { path: dir, confirm: true });
    expect(installed.structuredContent.action).toBe('installed');
    const after = JSON.parse(read(settings));
    expect(after.permissions).toEqual({ allow: ['Bash(ls)'] });
    const commands = JSON.stringify(after.hooks.SessionStart);
    expect(commands).toContain('echo mine');
    expect(commands).toContain(HOOK_COMMAND);

    const removed = await call('faf_setup', { path: dir, remove: true, confirm: true });
    expect(removed.structuredContent.action).toBe('removed');
    const back = JSON.parse(read(settings));
    expect(JSON.stringify(back.hooks.SessionStart)).not.toContain(HOOK_COMMAND);
    expect(JSON.stringify(back.hooks.SessionStart)).toContain('echo mine');
    expect(back.permissions).toEqual({ allow: ['Bash(ls)'] });
  });
});

describe('#91 — faf_cursor and faf_gemini', () => {
  // .cursorrules is plain text, so faf-cli marks its block with `# faf:start`.
  for (const [tool, file, start] of [['faf_cursor', '.cursorrules', '# faf:start'], ['faf_gemini', 'GEMINI.md', FAF_START]] as const) {
    test(`${tool} writes faf's block into ${file} and keeps every byte of a file you wrote; a second run changes nothing`, async () => {
      const mine = `# My own ${file}\n\n- rule one\n- rule two\n`;
      const dir = project(PROJECT, { [file]: mine });
      const r = await call(tool, { path: dir, action: 'export' });
      expect(r.isError).toBeFalsy();
      const out = read(path.join(dir, file));
      expect(out.startsWith(start)).toBe(true);
      expect(out.split(start).length - 1).toBe(1);
      expect(out.endsWith(mine)).toBe(true);
      expect(out).toContain('round-trip-app');
      await call(tool, { path: dir, action: 'export' });
      expect(read(path.join(dir, file))).toBe(out);
    });
  }

  test('an action outside the schema is refused and writes nothing', async () => {
    const dir = project();
    const r = await call('faf_gemini', { path: dir, action: 'bogus' });
    expect(r.isError).toBe(true);
    expect(fs.existsSync(path.join(dir, 'GEMINI.md'))).toBe(false);
  });
});

describe('#91 — faf_tri_sync: MEMORY.md, faf\'s block only', () => {
  const NOTES = '# Claude\'s notes\n- keep me 1\n- keep me 2\n';
  async function memoryPathFor(dir: string): Promise<string> {
    const { resolveClaudeMemoryPath } = await fafCli;
    return resolveClaudeMemoryPath(fs.realpathSync(dir));
  }

  test('export writes the block at the path Claude Code reads (under CLAUDE_CONFIG_DIR); status reads it back', async () => {
    const dir = project();
    const mem = await memoryPathFor(dir);
    const config = process.env.CLAUDE_CONFIG_DIR as string;
    expect(mem.startsWith(config) || mem.startsWith(fs.realpathSync(config))).toBe(true);
    const r = await call('faf_tri_sync', { path: dir });
    expect(r.isError).toBeFalsy();
    const out = read(mem);
    expect(out).toContain(FAF_START);
    expect(out).toContain('round-trip-app');
    const status = await call('faf_tri_sync', { path: dir, action: 'status' });
    expect(text(status)).toContain(`Path: ${mem}`);
    expect(text(status)).toMatch(/faf block: Yes/);
  });

  // The marker cases a MEMORY.md can be in. Whatever faf does with its block,
  // every byte of Claude's own text stays in the file, and a second export
  // changes nothing.
  const cases: Array<[string, string]> = [
    ['notes only (no markers)', NOTES],
    ['a faf block, then notes', `${FAF_START}\nold block\n${FAF_END}\n\n${NOTES}`],
    ['a start marker with no end marker', `${FAF_START}\nhalf a block\n${NOTES}`],
    ['an end marker before the start marker', `${NOTES}${FAF_END}\nmiddle\n${FAF_START}\n`],
  ];
  for (const [label, body] of cases) {
    test(`export on ${label}: Claude's notes are kept byte for byte, and a second export changes nothing`, async () => {
      const dir = project();
      const mem = await memoryPathFor(dir);
      fs.mkdirSync(path.dirname(mem), { recursive: true });
      fs.writeFileSync(mem, body);
      const r = await call('faf_tri_sync', { path: dir });
      expect(r.isError).toBeFalsy();
      const out = read(mem);
      expect(out).toContain(NOTES);
      expect(out).toContain('round-trip-app');
      expect(out).not.toContain('old block');
      await call('faf_tri_sync', { path: dir });
      expect(read(mem)).toBe(out);
    });
  }

  test('a MEMORY.md that is a folder (not ENOENT): isError, nothing written', async () => {
    const dir = project();
    const mem = await memoryPathFor(dir);
    fs.mkdirSync(mem, { recursive: true });
    const r = await call('faf_tri_sync', { path: dir });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain('not written');
    expect(fs.statSync(mem).isDirectory()).toBe(true);
    expect(fs.readdirSync(mem)).toEqual([]);
  });

  test('no project.faf: isError, and no MEMORY.md is written', async () => {
    const dir = project(null);
    const mem = await memoryPathFor(dir);
    const r = await call('faf_tri_sync', { path: dir });
    expect(r.isError).toBe(true);
    expect(fs.existsSync(mem)).toBe(false);
  });
});

describe('#91 — the retired faf_clear', () => {
  test('is not listed, and a call by name returns isError with one line naming what changed', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name)).not.toContain('faf_clear');
    const r = await call('faf_clear');
    expect(r.isError).toBe(true);
    expect(text(r)).toContain('faf_clear was retired in 6.0.0');
  });
});

describe('#91 — the two resources', () => {
  test('claude-faf://context is the active project\'s .faf as JSON, with faf_score\'s score', async () => {
    const dir = project();
    await call('faf_context', { path: dir });
    const res = await client.readResource({ uri: 'claude-faf://context' });
    expect(res.contents[0].mimeType).toBe('application/json');
    const body = JSON.parse(res.contents[0].text as string);
    expect(body.path).toBe(path.join(fs.realpathSync(dir), 'project.faf'));
    expect(body.data.project.name).toBe('round-trip-app');
    const score = await call('faf_score', { path: dir });
    expect(body.score).toBe(score.structuredContent.score);
  });

  test('claude-faf://status is one line with the path and the score; with no .faf it says so', async () => {
    const dir = project();
    await call('faf_context', { path: dir });
    const status = await client.readResource({ uri: 'claude-faf://status' });
    const { scoreFafYaml } = await fafCli;
    expect(status.contents[0].text).toContain(`FAF SCORE: ${scoreFafYaml(PROJECT).score}/100`);

    const empty = project(null);
    await call('faf_context', { path: empty });
    const none = await client.readResource({ uri: 'claude-faf://status' });
    expect(none.contents[0].text).toContain('No .faf in');
    const ctx = JSON.parse((await client.readResource({ uri: 'claude-faf://context' })).contents[0].text as string);
    expect(ctx.error).toContain('No .faf in');
  });
});
