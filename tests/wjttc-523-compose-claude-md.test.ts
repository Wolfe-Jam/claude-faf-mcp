/**
 * WJTTC 5.23 — CLAUDE.md is faf-cli's own bytes.
 *
 * Every CLAUDE.md writer in this server (faf_sync, faf_auto, the SessionStart
 * hook, the engine's 'claude' command and its pre-5.23 'bi-sync' / 'bisync'
 * aliases) composes faf-cli: renderClaudeMd for the content, writeClaudeMd /
 * injectFafBlock for the write. The reference for every assertion is faf-cli
 * itself, run on a copy of the same fixture — so these tests pin "no local
 * port", not a template.
 *
 * Isolation: every case uses a mkdtemp sandbox under os.tmpdir() and passes
 * it explicitly; the repo's own CLAUDE.md / project.faf must never change.
 * No network.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ClaudeFafMcpServer } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { FafEngineAdapter } from '../src/handlers/engine-adapter.js';
import { sessionRefresh } from '../src/faf-core/commands/session-refresh.js';
import { fafCli } from '../src/utils/faf-cli-bridge.js';

const { readFaf, renderClaudeMd, writeClaudeMd, findFafBlock, FAF_START, FAF_END } = await fafCli;

const ROOT = path.resolve(import.meta.dir, '..');
const REPO_GUARDED = ['CLAUDE.md', 'project.faf'].map((f) => path.join(ROOT, f));

const FIXTURE = [
  'project:',
  '  name: compose-fixture',
  '  goal: Prove CLAUDE.md is faf-cli bytes',
  '  main_language: TypeScript',
  '  type: mcp-server',
  'stack:',
  '  backend: MCP SDK (TS)',
  '  runtime: Node.js',
  '  frontend: slotignored',
  'human_context:',
  '  who: Claude devs',
  '  what: A context server',
  '  why: Define once, never re-explain',
  '',
].join('\n');

/** renderClaudeMd stamps an ISO time in the footer — mask it so bytes compare. */
const mask = (s: string): string => s.replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, '<ISO>');
const read = (p: string): string => fs.readFileSync(p, 'utf-8');

const sandboxes: string[] = [];
function sandbox(tag: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `cfm-523-${tag}-`));
  sandboxes.push(d);
  return d;
}

/** What faf-cli itself writes for the same inputs, in a separate sandbox. */
function fafCliBytes(fafText: string, existingClaudeMd?: string): string {
  const d = sandbox('ref');
  fs.writeFileSync(path.join(d, 'project.faf'), fafText);
  if (existingClaudeMd !== undefined) {fs.writeFileSync(path.join(d, 'CLAUDE.md'), existingClaudeMd);}
  writeClaudeMd(d, renderClaudeMd(readFaf(path.join(d, 'project.faf'))));
  return read(path.join(d, 'CLAUDE.md'));
}

/** CFM ≤5.22.1 faf_auto's CLAUDE.md, exactly as it wrote it (no faf markers, no metastamp). */
function legacyFafAutoTemplate(name: string, mission: string, arch: string): string {
  return [
    '# \u{1F3CE}\u{FE0F} CLAUDE.md - AI Telemetry Link',
    '',
    `## Project: ${name}`,
    '**Championship-Grade Project DNA Foundation**',
    '',
    '### \u{1F3AF} Project Mission',
    mission,
    '',
    '### \u{1F3D7}\u{FE0F} Architecture Overview',
    arch,
    '',
    '---',
    '',
    '**STATUS: BI-SYNC ACTIVE \u{1F517}**',
    '*Last Sync: 2026-08-19T14:52:20.989Z*',
    '*Sync Engine: FAF Auto*',
    '',
  ].join('\n');
}

function toolText(result: { content?: unknown }): string {
  const block = (result.content as Array<{ type?: string; text?: string }> | undefined)?.[0];
  return block?.text ?? '';
}

/** Every file under `dir`, recursively (relative paths). */
function filesUnder(dir: string, rel = ''): string[] {
  const out: string[] = [];
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = path.join(rel, e.name);
    if (e.isDirectory()) {out.push(...filesUnder(dir, r));}
    else {out.push(r);}
  }
  return out;
}

describe('WJTTC 5.23 — CLAUDE.md composes faf-cli', () => {
  let server: ClaudeFafMcpServer;
  let client: Client;
  const repoBefore = new Map<string, string>();

  beforeAll(async () => {
    for (const p of REPO_GUARDED) {if (fs.existsSync(p)) {repoBefore.set(p, read(p));}}
    server = new ClaudeFafMcpServer({ transport: 'stdio', fafEnginePath: 'native' });
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    await server.getServer().connect(serverT);
    client = new Client({ name: 'wjttc-523', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientT);
  });

  afterAll(async () => {
    try { await client.close(); } catch { /* best-effort teardown */ }
    try { await server.getServer().close(); } catch { /* best-effort teardown */ }
    for (const d of sandboxes) {fs.rmSync(d, { recursive: true, force: true });}
    for (const [p, before] of repoBefore) {
      if (read(p) !== before) {
        fs.writeFileSync(p, before, 'utf-8');
        throw new Error(`ISOLATION BREACH: ${path.basename(p)} in the repo root was changed — restored`);
      }
    }
  });

  test('faf_sync writes CLAUDE.md byte-identical to faf-cli writeClaudeMd(renderClaudeMd(readFaf))', async () => {
    const dir = sandbox('sync');
    fs.writeFileSync(path.join(dir, 'project.faf'), FIXTURE);

    const r = await client.callTool({ name: 'faf_sync', arguments: { path: dir } });
    expect(r.isError).toBeFalsy();
    expect(toolText(r)).toContain('CLAUDE.md written from project.faf.');

    expect(mask(read(path.join(dir, 'CLAUDE.md')))).toBe(mask(fafCliBytes(FIXTURE)));
  });

  test('hand-written content outside the block survives byte-for-byte (fenced marker example too); faf_sync twice → one block', async () => {
    const dir = sandbox('hand');
    fs.writeFileSync(path.join(dir, 'project.faf'), FIXTURE);
    // A user documented the markers in a code fence ABOVE the real block — the
    // shape a substring-matching injector cuts in half.
    const TOP = [
      '# House rules (hand-written)',
      '',
      'faf owns only the block between its markers, which look like this:',
      '',
      '```md',
      FAF_START,
      '(faf writes here)',
      FAF_END,
      '```',
      '',
      '',
    ].join('\n');
    const STALE = `${FAF_START}\nstale block from an older run\n${FAF_END}`;
    const BOTTOM = '\n\n## My own instructions\n\n- Never touch this.\n';
    const before = TOP + STALE + BOTTOM;
    const mdPath = path.join(dir, 'CLAUDE.md');
    fs.writeFileSync(mdPath, before);

    for (let run = 0; run < 2; run++) {
      const r = await client.callTool({ name: 'faf_sync', arguments: { path: dir } });
      expect(r.isError).toBeFalsy();
      expect(toolText(r)).toContain('CLAUDE.md refreshed from project.faf.');
    }

    const out = read(mdPath);
    expect(out.startsWith(TOP)).toBe(true); // fenced example untouched, byte-for-byte
    expect(out.endsWith(BOTTOM)).toBe(true);
    const middle = out.slice(TOP.length, out.length - BOTTOM.length);
    expect(middle.startsWith(`${FAF_START}\n`)).toBe(true);
    expect(middle.endsWith(FAF_END)).toBe(true);
    expect(middle.split(FAF_START).length - 1).toBe(1); // exactly one managed block
    expect(middle).not.toContain('stale block');
    expect(mask(out)).toBe(mask(fafCliBytes(FIXTURE, before)));
  });

  test('footer reads STATUS: SYNC ACTIVE and no written file contains BI-SYNC', async () => {
    const dir = sandbox('footer');
    fs.writeFileSync(path.join(dir, 'project.faf'), FIXTURE);

    const r = await client.callTool({ name: 'faf_sync', arguments: { path: dir, all: true } });
    expect(r.isError).toBeFalsy();
    expect(toolText(r)).not.toMatch(/Bi-sync|BI-SYNC|Perfect harmony/);

    expect(read(path.join(dir, 'CLAUDE.md'))).toMatch(/^\*STATUS: SYNC ACTIVE — [^*]+\*$/m);
    const written = filesUnder(dir).filter((f) => f !== 'project.faf');
    expect(written).toContain('CLAUDE.md');
    expect(written.length).toBeGreaterThan(1); // the `all` formats landed too
    for (const f of written) {
      expect(read(path.join(dir, f))).not.toContain('BI-SYNC');
    }
  });

  test('faf_auto on a fresh dir: CLAUDE.md is faf-cli bytes for the project.faf it wrote', async () => {
    const dir = sandbox('auto-fresh');
    const r = await client.callTool({ name: 'faf_auto', arguments: { path: dir } });
    expect(r.isError).toBeFalsy();
    expect(toolText(r)).toContain('Created CLAUDE.md');

    const faf = read(path.join(dir, 'project.faf'));
    const md = read(path.join(dir, 'CLAUDE.md'));
    expect(mask(md)).toBe(mask(fafCliBytes(faf)));
    expect(md).not.toContain('BI-SYNC');
  });

  test('faf_auto on a dir with a hand-written CLAUDE.md: only the faf block changes', async () => {
    const dir = sandbox('auto-hand');
    const HAND = '# My CLAUDE.md\n\nHand-written rules. Keep every byte.\n\n```\nnot a marker\n```\n';
    const mdPath = path.join(dir, 'CLAUDE.md');
    fs.writeFileSync(mdPath, HAND);

    const r = await client.callTool({ name: 'faf_auto', arguments: { path: dir } });
    expect(r.isError).toBeFalsy();
    expect(toolText(r)).toContain('Updated CLAUDE.md (faf-managed block)');

    const out = read(mdPath);
    const found = findFafBlock(out);
    expect(found).not.toBeNull();
    // Outside the managed block: the hand-written file, byte-for-byte.
    expect(out.slice(found!.end).endsWith(HAND)).toBe(true);
    expect((out.slice(0, found!.start) + out.slice(found!.end)).trim()).toBe(HAND.trim());
    expect(out.split(FAF_START).length - 1).toBe(1);
    expect(mask(out)).toBe(mask(fafCliBytes(read(path.join(dir, 'project.faf')), HAND)));
  });

  test('session refresh writes faf-cli bytes and still honours its freshness gate', async () => {
    const dir = sandbox('hook');
    const fafPath = path.join(dir, 'project.faf');
    const mdPath = path.join(dir, 'CLAUDE.md');
    fs.writeFileSync(fafPath, FIXTURE);

    const created = await sessionRefresh(dir);
    expect(created.action).toBe('created');
    const first = read(mdPath);
    expect(mask(first)).toBe(mask(fafCliBytes(FIXTURE)));

    // Gate: faf block present + CLAUDE.md at least as new as project.faf → no write.
    const mtime = fs.statSync(mdPath).mtimeMs;
    const fresh = await sessionRefresh(dir);
    expect(fresh.action).toBe('fresh');
    expect(read(mdPath)).toBe(first);
    expect(fs.statSync(mdPath).mtimeMs).toBe(mtime);

    // project.faf newer → refreshed, again faf-cli's bytes for the new .faf.
    const v2 = FIXTURE.replace('compose-fixture', 'compose-fixture-v2');
    fs.writeFileSync(fafPath, v2);
    const future = new Date(Date.now() + 5000);
    fs.utimesSync(fafPath, future, future);
    const refreshed = await sessionRefresh(dir);
    expect(refreshed.action).toBe('refreshed');
    expect(mask(read(mdPath))).toBe(mask(fafCliBytes(v2, first)));
  });

  test('manifest.json tool names == runtime tools/list names (FAF_TOOLS=all)', async () => {
    const prev = process.env.FAF_TOOLS;
    process.env.FAF_TOOLS = 'all';
    let runtime: string[];
    try {
      runtime = (await client.listTools()).tools.map((t) => t.name).sort();
    } finally {
      if (prev === undefined) {delete process.env.FAF_TOOLS;} else {process.env.FAF_TOOLS = prev;}
    }
    const manifest = (JSON.parse(read(path.join(ROOT, 'manifest.json'))).tools as Array<{ name: string }>)
      .map((t) => t.name)
      .sort();
    expect(manifest).toEqual(runtime);
    expect(manifest).not.toContain('faf_bi_sync');
  });

  test("the engine's 'bi-sync' / 'bisync' aliases route to the same write as 'claude'", async () => {
    const engine = new FafEngineAdapter('native');
    const reference = mask(fafCliBytes(FIXTURE));
    // Aliases first: on a build without the 'claude' command they fail here,
    // before an unknown command could reach the CLI fallback.
    for (const command of ['bi-sync', 'bisync', 'claude']) {
      const dir = sandbox(`engine-${command}`);
      fs.writeFileSync(path.join(dir, 'project.faf'), FIXTURE);
      const r = await engine.callEngine(command, [dir]);
      expect(r.success).toBe(true);
      expect(r.data?.direction).toBe('faf-to-claude');
      expect(mask(read(path.join(dir, 'CLAUDE.md')))).toBe(reference);
    }
  });

  // ── 5.23 round 2: regressions the first pass introduced, and the upgrade path ──

  test('faf_sync with a path that does not exist fails and leaves the session project untouched', async () => {
    const a = sandbox('sess-a');
    fs.writeFileSync(path.join(a, 'project.faf'), FIXTURE);
    fs.writeFileSync(path.join(a, 'CLAUDE.md'), '# A — hand-written\n');
    const first = await client.callTool({ name: 'faf_sync', arguments: { path: a } }); // a is now the session project
    expect(first.isError).toBeFalsy();
    const before = read(path.join(a, 'CLAUDE.md'));

    const missing = path.join(a, 'nope-does-not-exist');
    const r = await client.callTool({ name: 'faf_sync', arguments: { path: missing } });
    expect(r.isError).toBe(true);
    expect(toolText(r)).toBe(`faf_sync: path not found: ${missing}`);
    expect(read(path.join(a, 'CLAUDE.md'))).toBe(before); // byte-identical — no write into the previous project
    expect(fs.existsSync(missing)).toBe(false);
  });

  test('faf_sync reports the message and the files written — failures say why, never "undefined"', async () => {
    const dir = sandbox('sync-out');
    fs.writeFileSync(path.join(dir, 'project.faf'), FIXTURE);
    const ok = await client.callTool({ name: 'faf_sync', arguments: { path: dir, agents: true } });
    expect(ok.isError).toBeFalsy();
    const text = toolText(ok);
    expect(text).toContain('CLAUDE.md written from project.faf. FAF Score:');
    expect(text).toContain('Files written:\n• CLAUDE.md\n• AGENTS.md');
    expect(text).not.toContain('"filesChanged"'); // not the raw result object
    expect(text).not.toContain('"direction"');

    const empty = sandbox('sync-nofaf'); // exists, has no project.faf
    const bad = await client.callTool({ name: 'faf_sync', arguments: { path: empty } });
    expect(bad.isError).toBe(true);
    expect(toolText(bad)).toContain('No project.faf file found');
    expect(toolText(bad)).not.toContain('undefined');
    expect(fs.existsSync(path.join(empty, 'CLAUDE.md'))).toBe(false);
  });

  test('session refresh: a block without the current footer is stale — rewritten once, then the gate holds', async () => {
    const dir = sandbox('hook-old-block');
    const fafPath = path.join(dir, 'project.faf');
    const mdPath = path.join(dir, 'CLAUDE.md');
    fs.writeFileSync(fafPath, FIXTURE);
    // A CFM 5.10–5.22 / faf-cli ≤7.12.0 block, footed BI-SYNC, newer than project.faf.
    const OLD_BLOCK = `${FAF_START}\n# CLAUDE.md — compose-fixture\n\n---\n\n*STATUS: BI-SYNC ACTIVE — 2026-08-19T14:52:20.989Z*\n${FAF_END}`;
    const NOTES = '\n\n## My notes\n\nKeep me.\n';
    fs.writeFileSync(mdPath, OLD_BLOCK + NOTES);
    const past = new Date(Date.now() - 60_000);
    fs.utimesSync(fafPath, past, past);
    const before = read(mdPath);

    const first = await sessionRefresh(dir);
    expect(first.action).toBe('refreshed');
    const out = read(mdPath);
    expect(out).not.toContain('BI-SYNC');
    expect(out.endsWith(NOTES)).toBe(true);
    expect(out.split(FAF_START).length - 1).toBe(1);
    expect(mask(out)).toBe(mask(fafCliBytes(FIXTURE, before)));

    const second = await sessionRefresh(dir);
    expect(second.action).toBe('fresh');
    expect(read(mdPath)).toBe(out);
  });

  test('session refresh never writes from a project.faf that is not a YAML mapping (empty / scalar / list / malformed)', async () => {
    for (const [tag, bad] of [['empty', ''], ['scalar', 'oops\n'], ['list', '- a\n- b\n'], ['malformed', 'project: [unclosed\n']] as const) {
      const dir = sandbox(`hook-bad-${tag}`);
      const fafPath = path.join(dir, 'project.faf');
      const mdPath = path.join(dir, 'CLAUDE.md');
      fs.writeFileSync(fafPath, FIXTURE);
      expect((await sessionRefresh(dir)).action).toBe('created');
      const good = read(mdPath);

      fs.writeFileSync(fafPath, bad);
      const future = new Date(Date.now() + 5000);
      fs.utimesSync(fafPath, future, future); // newer than CLAUDE.md → the gate would let a write through
      const r = await sessionRefresh(dir);
      expect(r.action).toBe('error');
      expect(read(mdPath)).toBe(good); // CLAUDE.md byte-identical
    }
  });

  test('legacy CFM CLAUDE.md is never removed: unedited or hand-filled, every old byte stays below the new block (faf_sync, faf_auto, session refresh; LF and CRLF)', async () => {
    // 5.23 round 2 deleted an "unedited" template to write a clean file; its
    // matcher also matched templates whose placeholder lines the user had filled
    // in by hand, and that text was lost. Now nothing unlinks CLAUDE.md: faf-cli's
    // injector prefixes its block and the old file is kept as it was.
    const UNEDITED = legacyFafAutoTemplate('compose-fixture', 'AI-ready project context', 'Auto-detected stack');
    const HAND_FILLED = legacyFafAutoTemplate(
      'Billing Platform (payments team)',
      'Ship the billing API before Q4; the payments team owns /billing.',
      'Next.js 14 app router + Supabase',
    );
    const cases: Array<[string, string]> = [
      ['unedited-lf', UNEDITED],
      ['unedited-crlf', UNEDITED.replace(/\n/g, '\r\n')],
      ['hand-filled', HAND_FILLED],
    ];
    const kept = (out: string, legacy: string): void => {
      expect(out.endsWith(legacy)).toBe(true); // byte-for-byte, at the end
      expect(out.startsWith(`${FAF_START}\n`)).toBe(true);
      expect(out.split(FAF_START).length - 1).toBe(1);
    };
    for (const [tag, legacy] of cases) {
      // faf_sync
      const s = sandbox(`legacy-sync-${tag}`);
      fs.writeFileSync(path.join(s, 'project.faf'), FIXTURE);
      fs.writeFileSync(path.join(s, 'CLAUDE.md'), legacy);
      const r = await client.callTool({ name: 'faf_sync', arguments: { path: s } });
      expect(r.isError).toBeFalsy();
      const synced = read(path.join(s, 'CLAUDE.md'));
      kept(synced, legacy);
      expect(mask(synced)).toBe(mask(fafCliBytes(FIXTURE, legacy)));

      // faf_auto
      const a = sandbox(`legacy-auto-${tag}`);
      fs.writeFileSync(path.join(a, 'CLAUDE.md'), legacy);
      const ra = await client.callTool({ name: 'faf_auto', arguments: { path: a } });
      expect(ra.isError).toBeFalsy();
      expect(toolText(ra)).toContain('Updated CLAUDE.md (faf-managed block)');
      const auto = read(path.join(a, 'CLAUDE.md'));
      kept(auto, legacy);
      expect(mask(auto)).toBe(mask(fafCliBytes(read(path.join(a, 'project.faf')), legacy)));

      // SessionStart hook
      const h = sandbox(`legacy-hook-${tag}`);
      fs.writeFileSync(path.join(h, 'project.faf'), FIXTURE);
      fs.writeFileSync(path.join(h, 'CLAUDE.md'), legacy);
      expect((await sessionRefresh(h)).action).toBe('refreshed');
      const hooked = read(path.join(h, 'CLAUDE.md'));
      kept(hooked, legacy);
      expect(mask(hooked)).toBe(mask(fafCliBytes(FIXTURE, legacy)));
    }
  });

  test('legacy CFM CLAUDE.md that the user edited is kept byte-for-byte — the block is added above it', async () => {
    const EDITED = legacyFafAutoTemplate('compose-fixture', 'AI-ready project context', 'Auto-detected stack') +
      '\n## Team rules (hand-written)\n\n- Never force-push main.\n';
    const dir = sandbox('legacy-edited');
    fs.writeFileSync(path.join(dir, 'project.faf'), FIXTURE);
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), EDITED);
    const r = await client.callTool({ name: 'faf_sync', arguments: { path: dir } });
    expect(r.isError).toBeFalsy();
    const out = read(path.join(dir, 'CLAUDE.md'));
    expect(out.endsWith(EDITED)).toBe(true); // every byte the user owns is still there
    expect(out.startsWith(`${FAF_START}\n`)).toBe(true);
    expect(out.split(FAF_START).length - 1).toBe(1);
    expect(mask(out)).toBe(mask(fafCliBytes(FIXTURE, EDITED)));
  });

  test('.well-known server card tool names == runtime tools/list names (FAF_TOOLS=all)', async () => {
    const prev = process.env.FAF_TOOLS;
    process.env.FAF_TOOLS = 'all';
    let runtime: string[];
    try {
      runtime = (await client.listTools()).tools.map((t) => t.name).sort();
    } finally {
      if (prev === undefined) {delete process.env.FAF_TOOLS;} else {process.env.FAF_TOOLS = prev;}
    }
    const card = JSON.parse(read(path.join(ROOT, '.well-known', 'mcp', 'server-card.json')));
    const names = (card.tools as Array<{ name: string }>).map((t) => t.name).sort();
    expect(names).toEqual(runtime);
    expect(names).not.toContain('faf_bi_sync');
  });
});
