/**
 * WJTTC 6.0.0 — W2: boundaries, paths, inputs.
 *
 *   #15 #28 #29 #43 #44 #63 #64  one session-path resolver: home and '/' refused
 *                                by faf-cli's device+inode check for every writer
 *                                and the hook, before the session moves; '.'
 *                                resolves against the active project; a missing
 *                                path is an error; startup creates nothing
 *   #6                           faf_go answers: allow-listed slot paths, own
 *                                keys, text only, never through a value or list
 *   #7 #8 #22 #39                the older `project: <name>` lifted once at the
 *                                read boundary; the 5.22.1 shape is named
 *   #13 #26                      one finder (faf-cli's): readers name the file,
 *                                exports write next to it, writers target
 *                                <folder>/project.faf exactly
 *   #5 #21                       faf_git composes faf-cli's `faf git` helpers
 *   #20                          faf_dna reads with FafDNAManager; faf_init
 *                                births, faf_go / faf_auto record growth
 *   #38 #19                      faf_formats is a dry run of faf_auto, from the
 *                                project folder only
 *   #30 #45                      faf_read / faf_list: the active project plus
 *                                FAF_ALLOWED_ROOTS, no temp roots, no links out
 *
 * Isolation: mkdtemp sandboxes under os.tmpdir(); every case that needs HOME
 * runs in a child process whose HOME is a mkdtemp folder (bun reads HOME once);
 * CLAUDE_CONFIG_DIR points at a mkdtemp folder. fetch is stubbed to throw, and
 * faf_git clones a local bare repo through git's own url.<base>.insteadOf, so
 * nothing reaches the network. The repo's own files are never written.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execFileSync } from 'child_process';
import { parse as parseYaml } from 'yaml';
import { FafToolHandler } from '../src/handlers/tools.js';
import { FafEngineAdapter } from '../src/handlers/engine-adapter.js';
import { sessionRefresh } from '../src/faf-core/commands/session-refresh.js';
import { fafCli } from '../src/utils/faf-cli-bridge.js';

process.env.FAF_TOOLS = 'all';
const { scoreFafYaml, FafDNAManager } = await fafCli;

const ROOT = path.resolve(import.meta.dir, '..');
const REPO_GUARDED = ['CLAUDE.md', 'project.faf', 'AGENTS.md', 'README.md'].map((f) => path.join(ROOT, f));

const read = (p: string): string => fs.readFileSync(p, 'utf-8');
const real = (p: string): string => fs.realpathSync(p);
const sandboxes: string[] = [];
function sandbox(tag: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `cfm-w2-${tag}-`));
  sandboxes.push(d);
  return d;
}
function handler(cwd?: string): FafToolHandler {
  const engine = new FafEngineAdapter('native');
  if (cwd) {engine.setWorkingDirectory(cwd);}
  return new FafToolHandler(engine);
}
function text(r: { content?: unknown }): string {
  return ((r.content as Array<{ text?: string }> | undefined)?.[0]?.text) ?? '';
}
/** Every entry under `dir`, recursively, with its bytes (folders as ''). */
function snapshot(dir: string, rel = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = path.join(rel, e.name);
    if (e.isDirectory()) {
      out.set(`${r}/`, '');
      for (const [k, v] of snapshot(dir, r)) {out.set(k, v);}
    } else if (e.isSymbolicLink()) {
      out.set(r, `-> ${fs.readlinkSync(path.join(dir, r))}`);
    } else {
      out.set(r, read(path.join(dir, r)));
    }
  }
  return out;
}

const HAND_FAF = [
  '# HAND-COMMENT: keep me',
  'faf_version: "3.0"',
  'project:',
  '  name: hand-app   # HAND-NAME',
  '  goal: Ship the hand app',
  'stack:',
  '  backend: Express',
  '  database: Postgres',
  'human_context:',
  '  who: Platform team',
  '',
].join('\n');

let configDir = '';
const envBefore = { cfg: process.env.CLAUDE_CONFIG_DIR, roots: process.env.FAF_ALLOWED_ROOTS, fetch: globalThis.fetch };
const repoBefore = new Map<string, string>();

beforeAll(() => {
  for (const p of REPO_GUARDED) {if (fs.existsSync(p)) {repoBefore.set(p, read(p));}}
  configDir = sandbox('claude-config');
  process.env.CLAUDE_CONFIG_DIR = configDir;
  delete process.env.FAF_ALLOWED_ROOTS;
  // No network: anything that still fetched would fail here, fast.
  globalThis.fetch = (async () => { throw new Error('no network in tests'); }) as unknown as typeof fetch;
});

afterAll(() => {
  globalThis.fetch = envBefore.fetch;
  if (envBefore.cfg === undefined) {delete process.env.CLAUDE_CONFIG_DIR;} else {process.env.CLAUDE_CONFIG_DIR = envBefore.cfg;}
  if (envBefore.roots !== undefined) {process.env.FAF_ALLOWED_ROOTS = envBefore.roots;}
  for (const d of sandboxes) {
    try { fs.chmodSync(d, 0o755); } catch { /* best-effort */ }
    fs.rmSync(d, { recursive: true, force: true });
  }
  for (const [p, before] of repoBefore) {
    if (read(p) !== before) {
      fs.writeFileSync(p, before, 'utf-8');
      throw new Error(`ISOLATION BREACH: ${path.basename(p)} in the repo root was changed — restored`);
    }
  }
});

/**
 * Run `steps` in a child process with HOME = `home` and cwd = `cwd`. The steps
 * see `handler(cwd?)`, `text(r)`, `step(key, fn)`, `HOME`, `fs`, `path` and
 * `sessionRefresh`, and record into `out`; the last stdout line is `out` as JSON.
 */
function probe(home: string, cwd: string, steps: string[], claudeConfig = sandbox('probe-config')): Record<string, any> {
  const script = path.join(sandbox('probe'), 'probe.ts');
  fs.writeFileSync(script, [
    `import * as fs from 'fs';`,
    `import * as path from 'path';`,
    `import { FafToolHandler } from ${JSON.stringify(path.join(ROOT, 'src/handlers/tools.ts'))};`,
    `import { FafEngineAdapter } from ${JSON.stringify(path.join(ROOT, 'src/handlers/engine-adapter.ts'))};`,
    `import { sessionRefresh } from ${JSON.stringify(path.join(ROOT, 'src/faf-core/commands/session-refresh.ts'))};`,
    `globalThis.fetch = (async () => { throw new Error('no network in tests'); }) as any;`,
    `const HOME = process.env.HOME as string;`,
    `const out: Record<string, any> = {};`,
    `const text = (r: any): string => r?.content?.[0]?.text ?? '';`,
    `const handler = (cwd?: string) => { const e = new FafEngineAdapter('native'); if (cwd) { e.setWorkingDirectory(cwd); } return { h: new FafToolHandler(e), e }; };`,
    `async function step(key: string, fn: () => Promise<any>) { try { out[key] = await fn(); } catch (e: any) { out[key] = { threw: String(e?.message ?? e) }; } }`,
    `const call = async (h: FafToolHandler, name: string, args: any) => { const r: any = await h.callTool(name, args); return { isError: !!r.isError, text: text(r), sc: r.structuredContent ?? null }; };`,
    ...steps,
    `console.log(JSON.stringify(out));`,
  ].join('\n'));
  const env: Record<string, string> = {
    ...(process.env as Record<string, string>),
    HOME: home,
    BUN_RUNTIME_TRANSPILER_CACHE_PATH: '0',
    CLAUDE_CONFIG_DIR: claudeConfig,
  };
  delete env.FAF_WORKING_DIR;
  delete env.MCP_WORKING_DIR;
  delete env.FAF_ALLOWED_ROOTS;
  const run = Bun.spawnSync([process.execPath, script], { cwd, env, stdout: 'pipe', stderr: 'pipe' });
  if (run.exitCode !== 0) {throw new Error(`probe exited ${run.exitCode}: ${run.stderr.toString().slice(-2000)}`);}
  const lines = run.stdout.toString().trim().split('\n');
  return JSON.parse(lines[lines.length - 1]);
}

// ─────────────────────────────────────── #15 #28 #29 #30 — home, every writer
describe('#15 / #28 / #29 — the home folder is refused by every writer, before the session moves', () => {
  test('HOME = mkdtemp, server started in HOME: every writer and the hook refuse; nothing in HOME changes; a refused call leaves the session', () => {
    const home = sandbox('home');
    fs.writeFileSync(path.join(home, 'CLAUDE.md'), '# my global rules\n');
    fs.writeFileSync(path.join(home, 'project.faf'), HAND_FAF);
    fs.writeFileSync(path.join(home, 'README.md'), '# home\n\nWhy: because.\n');
    fs.mkdirSync(path.join(home, '.ssh'));
    fs.writeFileSync(path.join(home, '.ssh', 'id_test'), 'SECRET-SSH-KEY\n');
    const proj = sandbox('home-proj');
    fs.writeFileSync(path.join(proj, 'project.faf'), 'project:\n  name: proj\n');
    const before = snapshot(home);
    const probeConfig = sandbox('home-config');

    const out = probe(home, home, [
      `const { h } = handler();`,
      `await step('go', () => call(h, 'faf_go', { path: HOME, answers: { 'human_context.what': 'x' } }));`,
      `await step('sync', () => call(h, 'faf_sync', { path: HOME }));`,
      `await step('syncBare', () => call(h, 'faf_sync', {}));`,
      `await step('autoBare', () => call(h, 'faf_auto', {}));`,
      `await step('etch', () => call(h, 'faf_etch', { path: HOME, text: 'remember' }));`,
      `await step('tri', () => call(h, 'faf_tri_sync', { path: HOME }));`,
      `await step('agents', () => call(h, 'faf_agents', { path: HOME, action: 'export' }));`,
      `await step('human', () => call(h, 'faf_human_add', { path: HOME, field: 'what', value: 'x' }));`,
      `await step('readme', () => call(h, 'faf_readme', { path: HOME, apply: true }));`,
      `await step('git', () => call(h, 'faf_git', { url: 'acme/demo', path: HOME }));`,
      `await step('context', () => call(h, 'faf_context', { path: HOME }));`,
      `await step('ssh', () => call(h, 'faf_read', { path: path.join(HOME, '.ssh', 'id_test') }));`,
      `await step('hook', async () => sessionRefresh(HOME));`,
      // #15: another spelling of home (case, on a case-insensitive disk).
      `const upper = HOME.toUpperCase();`,
      `await step('caseVariant', async () => upper !== HOME && fs.existsSync(upper) ? call(h, 'faf_auto', { path: upper }) : { skipped: true });`,
      // #29: a refused call never moves the session.
      `const p = handler(${JSON.stringify(proj)});`,
      `await step('autoHome', () => call(p.h, 'faf_auto', { path: HOME }));`,
      `await step('after', async () => p.e.getWorkingDirectory());`,
    ], probeConfig);

    for (const key of ['go', 'sync', 'syncBare', 'autoBare', 'etch', 'tri', 'agents', 'human', 'readme', 'git', 'context', 'autoHome']) {
      expect(`${key}: ${out[key]?.isError}`).toBe(`${key}: true`);
      expect(`${key}: ${out[key]?.text}`).toContain('your home folder (or the filesystem root)');
    }
    expect(out.ssh.isError).toBe(true);
    expect(out.ssh.text).not.toContain('SECRET-SSH-KEY');
    expect(out.hook.action).toBe('error');
    expect(out.hook.message).toContain('home folder');
    if (!out.caseVariant.skipped) {
      expect(out.caseVariant.isError).toBe(true);
      expect(out.caseVariant.text).toContain('home folder');
    }
    expect(real(out.after)).toBe(real(proj));
    expect(snapshot(home)).toEqual(before);
    expect(fs.readdirSync(probeConfig)).toEqual([]); // no MEMORY.md for the home folder
  });
});

// ─────────────────────────────────────── #43 #44 #63 #64 — paths
describe('#43 / #44 / #63 / #64 — one resolver for every path', () => {
  test('faf_context on a path that does not exist is an error and the active project stays', async () => {
    const dir = sandbox('ctx');
    const h = handler(dir);
    const r = await h.callTool('faf_context', { path: path.join(dir, 'nope-dir') });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain('path not found');
    const now = await h.callTool('faf_context', {});
    expect(real((now.structuredContent as any).active)).toBe(real(dir));
  });

  test('faf_etch on a missing folder says "path not found" and creates nothing', async () => {
    const dir = sandbox('etch');
    const missing = path.join(dir, 'typo-project');
    const r = await handler(dir).callTool('faf_etch', { path: missing, text: 'x' });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain('path not found');
    expect(fs.existsSync(missing)).toBe(false);
  });

  test('faf_init {path: "."} writes in the active project, never ~/Projects; a name with no letters is refused (HOME = mkdtemp)', () => {
    const home = sandbox('home-dot');
    fs.mkdirSync(path.join(home, 'Projects'));
    const app = path.join(home, 'work', 'app');
    fs.mkdirSync(app, { recursive: true });
    fs.writeFileSync(path.join(app, 'package.json'), JSON.stringify({ name: 'dot-app' }));
    const out = probe(home, app, [
      `const { h, e } = handler(${JSON.stringify(app)});`,
      `await step('dot', () => call(h, 'faf_init', { path: '.' }));`,
      `await step('bang', () => call(h, 'faf_init', { path: '!!!' }));`,
      `await step('active', async () => e.getWorkingDirectory());`,
    ]);
    expect(out.dot.isError).toBe(false);
    expect(fs.existsSync(path.join(app, 'project.faf'))).toBe(true);
    expect(out.bang.isError).toBe(true);
    expect(out.bang.text).toContain('not a folder name faf can use');
    expect(fs.readdirSync(path.join(home, 'Projects'))).toEqual([]);
    expect(real(out.active)).toBe(real(app));
  });

  test('a server started at "/" creates no ~/Projects (HOME = a fresh mkdtemp)', () => {
    const home = sandbox('home-root');
    const out = probe(home, '/', [
      `await step('wd', async () => new FafEngineAdapter('native').getWorkingDirectory());`,
    ]);
    expect(fs.existsSync(path.join(home, 'Projects'))).toBe(false);
    expect(fs.readdirSync(home)).toEqual([]);
    expect(real(out.wd)).toBe(real(home));
  });
});

// ─────────────────────────────────────── #6 — faf_go answers
describe('#6 — faf_go answers: allow-listed slot paths, own keys, text only', () => {
  test('__proto__ / constructor keys are refused and nothing reaches Object.prototype (child process)', () => {
    const home = sandbox('home-proto');
    const dir = sandbox('proto');
    fs.writeFileSync(path.join(dir, 'project.faf'), HAND_FAF);
    const other = sandbox('proto-other');
    const out = probe(home, dir, [
      `const { h } = handler(${JSON.stringify(dir)});`,
      `await step('proto', () => call(h, 'faf_go', { path: ${JSON.stringify(dir)}, answers: { '__proto__.force': 'yes' } }));`,
      `await step('ctor', () => call(h, 'faf_go', { path: ${JSON.stringify(dir)}, answers: { 'constructor.prototype.all': 'yes' } }));`,
      `await step('polluted', async () => ({ force: ({} as any).force ?? null, all: ({} as any).all ?? null }));`,
      // A polluted prototype still cannot flip a flag or a path the caller did not send.
      `(Object.prototype as any).all = true; (Object.prototype as any).path = ${JSON.stringify(other)};`,
      `await step('syncPolluted', () => call(h, 'faf_sync', { path: ${JSON.stringify(dir)} }));`,
      `await step('ctxPolluted', () => call(h, 'faf_context', {}));`,
      `delete (Object.prototype as any).all; delete (Object.prototype as any).path;`,
    ]);
    expect(out.proto.isError).toBe(true);
    expect(out.proto.text).toContain('is not a slot faf_go fills');
    expect(out.ctor.isError).toBe(true);
    expect(out.polluted).toEqual({ force: null, all: null });
    expect(read(path.join(dir, 'project.faf'))).toBe(HAND_FAF);
    expect(out.syncPolluted.isError).toBe(false);
    expect(fs.existsSync(path.join(dir, 'CLAUDE.md'))).toBe(true);
    expect(fs.existsSync(path.join(dir, 'AGENTS.md'))).toBe(false); // `all` was not the caller's
    expect(real(out.ctxPolluted.sc.active)).toBe(real(dir));
    expect(fs.readdirSync(other)).toEqual([]);
  });

  test('a whole section as a key (stack, project) is refused; the mappings are kept', async () => {
    const dir = sandbox('go-section');
    fs.writeFileSync(path.join(dir, 'project.faf'), HAND_FAF);
    for (const answers of [{ stack: 'Go + Postgres' }, { project: 'Harbor' }]) {
      const r = await handler().callTool('faf_go', { path: dir, answers });
      expect(r.isError).toBe(true);
      expect(text(r)).toContain('Nothing was written');
    }
    expect(read(path.join(dir, 'project.faf'))).toBe(HAND_FAF);
  });

  test('an answer that is not text, or a list where the answer lands, is refused and the file is unchanged', async () => {
    const dir = sandbox('go-types');
    fs.writeFileSync(path.join(dir, 'project.faf'), HAND_FAF);
    const r = await handler().callTool('faf_go', { path: dir, answers: { 'project.goal': 5 } });
    expect(r.isError).toBe(true);
    // 6.0.0: the schema check refuses it before the handler runs.
    expect(text(r)).toContain('answers.project.goal must be string');

    const listDir = sandbox('go-list');
    const LIST = 'project:\n  name: list-app\nhuman_context:\n  - who\n';
    fs.writeFileSync(path.join(listDir, 'project.faf'), LIST);
    const l = await handler().callTool('faf_go', { path: listDir, answers: { 'human_context.who': 'Platform team' } });
    expect(l.isError).toBe(true);
    expect(text(l)).toContain('human_context holds a list');
    expect(read(path.join(listDir, 'project.faf'))).toBe(LIST);
    expect(read(path.join(dir, 'project.faf'))).toBe(HAND_FAF);
  });

  test('a Mk4 name (stack.db) is written to the on-wire slot the kernel scores (stack.database); the score is faf-cli\'s', async () => {
    const dir = sandbox('go-mk4');
    fs.writeFileSync(path.join(dir, 'project.faf'), 'project:\n  name: mk4-app\n  type: backend\nstack:\n  backend: Express\n');
    const r = await handler().callTool('faf_go', { path: dir, answers: { 'stack.db': 'Postgres' } });
    expect(r.isError).toBeFalsy();
    const out = read(path.join(dir, 'project.faf'));
    expect(parseYaml(out).stack.database).toBe('Postgres');
    expect(parseYaml(out).stack.db).toBeUndefined();
    expect(text(r)).toContain(`Score: ${scoreFafYaml(out).score}%`);
  });
});

// ─────────────────────────────────────── #7 #8 #22 #39 — the older project: <name>
describe('#7 / #8 / #22 / #39 — `project: <name>` is lifted once, at the read boundary', () => {
  test('faf_go keeps a numeric or boolean project name (project: 2048 / true)', async () => {
    for (const [raw, name] of [['2048', '2048'], ['true', 'true']]) {
      const dir = sandbox('go-scalar');
      fs.writeFileSync(path.join(dir, 'project.faf'), `# keep\nproject: ${raw}\n`);
      const r = await handler().callTool('faf_go', { path: dir, answers: { 'project.goal': 'Ship it' } });
      expect(r.isError).toBeFalsy();
      const data = parseYaml(read(path.join(dir, 'project.faf')));
      expect(data.project).toEqual({ name, goal: 'Ship it' });
      expect(read(path.join(dir, 'project.faf'))).toContain('# keep');
    }
  });

  test('faf_sync, the hook, faf_agents and faf_tri_sync title everything with the name', async () => {
    const dir = sandbox('legacy-name');
    fs.writeFileSync(path.join(dir, 'project.faf'), 'project: legacy-app\n');
    const s = await handler().callTool('faf_sync', { path: dir });
    expect(s.isError).toBeFalsy();
    expect(read(path.join(dir, 'CLAUDE.md'))).toContain('# CLAUDE.md — legacy-app');
    expect(text(s)).toContain('faf_auto moves it to project.name');

    const a = await handler().callTool('faf_agents', { path: dir, action: 'export' });
    expect(a.isError).toBeFalsy();
    expect(read(path.join(dir, 'AGENTS.md'))).toContain('legacy-app');

    const t = await handler().callTool('faf_tri_sync', { path: dir });
    expect(t.isError).toBeFalsy();
    const memory = /Written to: (.+)/.exec(text(t))?.[1] ?? '';
    expect(read(memory)).toContain('**Name:** legacy-app');

    const hookDir = sandbox('legacy-hook');
    fs.writeFileSync(path.join(hookDir, 'project.faf'), 'project: legacy-hook-name\n');
    expect((await sessionRefresh(hookDir)).action).toBe('created');
    expect(read(path.join(hookDir, 'CLAUDE.md'))).toContain('# CLAUDE.md — legacy-hook-name');
    expect(read(path.join(dir, 'project.faf'))).toBe('project: legacy-app\n'); // readers never write it
  });

  test('faf_init and faf_score name the older shape and point to faf_auto', async () => {
    const dir = sandbox('legacy-hint');
    fs.writeFileSync(path.join(dir, 'project.faf'), 'project: legacy-app\n');
    const i = await handler().callTool('faf_init', { path: dir });
    expect(text(i)).toContain('`project: legacy-app`');
    expect(text(i)).toContain('faf_auto moves it to project.name');
    const s = await handler().callTool('faf_score', { path: dir });
    expect(text(s)).toContain('faf_auto moves it to project.name');
    expect((s.structuredContent as any).legacyProject).toBe(true);
    expect(read(path.join(dir, 'project.faf'))).toBe('project: legacy-app\n');
  });

  test('the whole 5.22.1 CLAUDE.md faf wrote is taken out; one hand line keeps the file and says so', async () => {
    const template = (name: string, extra = ''): string => [
      '# \u{1F3CE}\u{FE0F} CLAUDE.md - AI Telemetry Link', '', `## Project: ${name}`, '**Championship-Grade Project DNA Foundation**', '',
      '### \u{1F3AF} Project Mission', 'AI-ready project context', '', '### \u{1F3D7}\u{FE0F} Architecture Overview', 'Auto-detected stack', '',
      '---', '', '**STATUS: BI-SYNC ACTIVE \u{1F517}**', '*Last Sync: 2026-08-20T10:00:00.000Z*', '*Sync Engine: FAF Auto*', '',
    ].join('\n') + extra;

    const dir = sandbox('legacy-md');
    fs.writeFileSync(path.join(dir, 'project.faf'), 'project: legacy-app\n');
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), template('legacy-app'));
    const r = await handler().callTool('faf_auto', { path: dir });
    expect(r.isError).toBeFalsy();
    const md = read(path.join(dir, 'CLAUDE.md'));
    expect(md).not.toContain('AI Telemetry Link');
    expect(md).not.toContain('BI-SYNC');
    expect(md).toContain('# CLAUDE.md — legacy-app');
    expect(text(r)).toContain('faf wrote every line of it');

    const edited = sandbox('legacy-md-edited');
    fs.writeFileSync(path.join(edited, 'project.faf'), 'project: legacy-app\n');
    const EDITED = template('legacy-app', '\n## My rules\n\n- Never force-push.\n');
    fs.writeFileSync(path.join(edited, 'CLAUDE.md'), EDITED);
    const e = await handler().callTool('faf_sync', { path: edited });
    expect(e.isError).toBeFalsy();
    expect(read(path.join(edited, 'CLAUDE.md')).endsWith(EDITED)).toBe(true);
    expect(text(e)).toContain('left as you have it');
  });
});

// ─────────────────────────────────────── #13 #26 — one finder
describe('#13 / #26 — one .faf finder (faf-cli\'s); writers target <folder>/project.faf', () => {
  test('from <P>/src the readers find and name <P>/project.faf', async () => {
    const p = sandbox('finder');
    fs.writeFileSync(path.join(p, 'project.faf'), HAND_FAF);
    const src = path.join(p, 'src');
    fs.mkdirSync(src);
    const want = path.join(real(p), 'project.faf');

    const status = await handler().callTool('faf_status', { path: src });
    expect(status.isError).toBeFalsy();
    expect((status.structuredContent as any).path).toBe(want);
    expect(text(status)).toContain(`${want} (one level up)`);

    const check = await handler().callTool('faf_check', { path: src });
    expect(check.isError).toBeFalsy();
    expect((check.structuredContent as any).path).toBe(want);

    const doctor = await handler().callTool('faf_doctor', { path: src });
    expect(text(doctor)).toContain(`Found .faf at: ${want}`);

    const ctx = await handler().callTool('faf_context', { path: src });
    expect((ctx.structuredContent as any).hasFaf).toBe(true);
    expect((ctx.structuredContent as any).path).toBe(want);
  });

  test('an export from <P>/src writes <P>/AGENTS.md (next to the .faf), never <P>/src/AGENTS.md; two levels up is not found', async () => {
    const p = sandbox('export-next');
    fs.writeFileSync(path.join(p, 'project.faf'), HAND_FAF);
    const src = path.join(p, 'src');
    fs.mkdirSync(src);
    const r = await handler().callTool('faf_agents', { path: src, action: 'export' });
    expect(r.isError).toBeFalsy();
    expect(fs.existsSync(path.join(p, 'AGENTS.md'))).toBe(true);
    expect(fs.existsSync(path.join(src, 'AGENTS.md'))).toBe(false);
    expect(text(r)).toContain(path.join(real(p), 'AGENTS.md'));

    const deep = path.join(src, 'deep');
    fs.mkdirSync(deep);
    const d = await handler().callTool('faf_cursor', { path: deep, action: 'export' });
    expect(d.isError).toBe(true);
    expect(fs.readdirSync(deep)).toEqual([]);
    expect(fs.existsSync(path.join(p, '.cursorrules'))).toBe(false);
  });

  test('a writer in <P>/src never fills <P>/project.faf; it names that file and writes nothing', async () => {
    const p = sandbox('writer-exact');
    fs.writeFileSync(path.join(p, 'project.faf'), HAND_FAF);
    const src = path.join(p, 'src');
    fs.mkdirSync(src);
    const r = await handler().callTool('faf_human_add', { path: src, field: 'what', value: 'x' });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain(`${path.join(real(p), 'project.faf')} (one level up)`);
    expect(read(path.join(p, 'project.faf'))).toBe(HAND_FAF);
    expect(fs.readdirSync(src)).toEqual([]);
  });

  test('a .faf-only folder: faf_sync renders from it; faf_auto writes project.faf from it and keeps the .faf byte for byte', async () => {
    const dir = sandbox('dotfaf');
    const DOT = 'project:\n  name: dot-only\n  goal: Keep my words\n';
    fs.writeFileSync(path.join(dir, '.faf'), DOT);
    const s = await handler().callTool('faf_sync', { path: dir });
    expect(s.isError).toBeFalsy();
    expect(read(path.join(dir, 'CLAUDE.md'))).toContain('dot-only');

    const i = await handler().callTool('faf_init', { path: dir });
    expect(text(i)).toContain('faf_auto writes project.faf from .faf');
    expect(fs.existsSync(path.join(dir, 'project.faf'))).toBe(false);

    const a = await handler().callTool('faf_auto', { path: dir });
    expect(a.isError).toBeFalsy();
    const data = parseYaml(read(path.join(dir, 'project.faf')));
    expect(data.project.name).toBe('dot-only');
    expect(data.project.goal).toBe('Keep my words');
    expect(read(path.join(dir, '.faf'))).toBe(DOT);
  });

  test('both local finders (and the 10-level walk) are gone from src', () => {
    expect(fs.existsSync(path.join(ROOT, 'src/utils/faf-file-finder.ts'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, 'src/faf-core/utils/file-utils.ts'))).toBe(false);
    const walkers: string[] = [];
    const walk = (d: string): void => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) {walk(p); continue;}
        if (/\.ts$/.test(e.name) && /for \(let i = 0; i < 10; i\+\+\)/.test(read(p))) {walkers.push(p);}
      }
    };
    walk(path.join(ROOT, 'src'));
    expect(walkers).toEqual([]);
  });
});

// ─────────────────────────────────────── #5 #21 — faf_git
describe('#5 / #21 — faf_git composes faf-cli\'s `faf git` helpers', () => {
  // A local bare repo stands in for GitHub through git's url.<base>.insteadOf
  // (a file:// URL; not set up for Windows paths here).
  const hasGit = !!Bun.which('git') && process.platform !== 'win32';
  const gitEnvKeys = ['GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0'];

  /** A local bare repo that https://github.com/acme/demo.git resolves to. */
  function localRepo(files: Record<string, string>, links: Record<string, string> = {}): () => void {
    const src = sandbox('git-src');
    for (const [name, body] of Object.entries(files)) {fs.writeFileSync(path.join(src, name), body);}
    for (const [name, target] of Object.entries(links)) {fs.symlinkSync(target, path.join(src, name));}
    const git = (args: string[], cwd: string): void => { execFileSync('git', args, { cwd, stdio: 'pipe' }); };
    git(['init', '-q'], src);
    git(['add', '-A'], src);
    git(['-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '-qm', 'init'], src);
    const bare = sandbox('git-bare');
    fs.mkdirSync(path.join(bare, 'acme'));
    git(['clone', '--bare', '-q', src, path.join(bare, 'acme', 'demo.git')], bare);
    const saved = gitEnvKeys.map((k) => process.env[k]);
    process.env.GIT_CONFIG_COUNT = '1';
    process.env.GIT_CONFIG_KEY_0 = `url.file://${bare}/.insteadOf`;
    process.env.GIT_CONFIG_VALUE_0 = 'https://github.com/';
    return () => {
      gitEnvKeys.forEach((k, i) => { if (saved[i] === undefined) {delete process.env[k];} else {process.env[k] = saved[i];} });
    };
  }

  test.skipIf(!hasGit)('writes a new project.faf that faf-cli scores as reported: canonical keys, no header, no invented version', async () => {
    const restore = localRepo({
      'package.json': JSON.stringify({ name: 'demo-app', description: 'A demo API', dependencies: { express: '^4.0.0' } }, null, 2),
      'README.md': '# demo-app\n\nA demo API for widgets.\n',
      'index.js': 'module.exports = 1;\n',
    });
    try {
      const out = sandbox('git-out');
      const r = await handler().callTool('faf_git', { url: 'acme/demo', path: out });
      expect(r.isError).toBeFalsy();
      const written = read(path.join(out, 'project.faf'));
      const data = parseYaml(written);
      expect(data.project.name).toBe('demo-app');
      expect(data.stack.backend).toBe('Express');
      expect(written).not.toMatch(/# Generated|faf\.dev|4\.5\.0/);
      const score = scoreFafYaml(written);
      expect(text(r)).toContain(`faf-cli scores it ${score.score}%`);
      expect(text(r)).not.toContain('Trophy');
    } finally {
      restore();
    }
  });

  test.skipIf(!hasGit)('preview writes nothing, and a link in the repo is never followed out of the clone', async () => {
    const secretDir = sandbox('git-secret');
    const secret = path.join(secretDir, 'notes.md');
    fs.writeFileSync(secret, '# Secret\n\nSECRET-TOKEN-XYZ is the payments key.\n');
    const restore = localRepo({ 'package.json': JSON.stringify({ name: 'link-app' }) }, { 'README.md': secret });
    try {
      const cwd = sandbox('git-preview');
      const r = await handler(cwd).callTool('faf_git', { url: 'acme/demo' });
      expect(r.isError).toBeFalsy();
      expect(text(r)).toContain('preview, nothing written');
      expect(text(r)).not.toContain('SECRET-TOKEN-XYZ');
      expect(fs.readdirSync(cwd)).toEqual([]);
    } finally {
      restore();
    }
  });

  test('the v4.5 GitHub-API port and its scorer are gone; the tool says it uses the network', async () => {
    for (const f of ['github-extractor.ts', 'faf-git-generator.ts', 'slot-counter.ts']) {
      expect(fs.existsSync(path.join(ROOT, 'src/faf-core/parsers', f))).toBe(false);
    }
    const git = (await handler().listTools()).tools.find((t) => t.name === 'faf_git')!;
    expect(git.annotations?.openWorldHint).toBe(true);
    expect(git.description).toContain('Uses the network');
  });
});

// ─────────────────────────────────────── #20 — faf_dna
describe('#20 — .faf-dna is faf-cli\'s: faf_init births, faf_go records growth, faf_dna reads', () => {
  test('faf_init writes a birth certificate faf-cli can add to; faf_go adds a version; faf_dna shows the journey', async () => {
    const dir = sandbox('dna');
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'dna-app', dependencies: { express: '^4.0.0' } }));
    await handler().callTool('faf_init', { path: dir });
    const dna = new FafDNAManager(dir);
    expect(dna.isFafShape()).toBe(true);
    expect(dna.load()!.versions.length).toBe(1);

    await handler().callTool('faf_go', { path: dir, answers: { 'project.goal': 'Serve widgets', 'human_context.who': 'Platform team' } });
    const after = new FafDNAManager(dir).load()!;
    expect(after.versions.length).toBe(2);
    expect(after.current.score).toBe(scoreFafYaml(read(path.join(dir, 'project.faf'))).score);

    const before = read(path.join(dir, '.faf-dna'));
    const r = await handler().callTool('faf_dna', { path: dir });
    expect(r.isError).toBeFalsy();
    const sc = r.structuredContent as any;
    expect(sc.versions).toBe(2);
    expect(sc.milestones.map((m: any) => m.type)).toContain('birth');
    expect(sc.journey).toBe(new FafDNAManager(dir).getJourney());
    expect(read(path.join(dir, '.faf-dna'))).toBe(before); // faf_dna reads only
  });

  test('faf_dna writes nothing: no .faf-dna, another tool\'s shape, or a folder with only a .faf-dna', async () => {
    const none = sandbox('dna-none');
    fs.writeFileSync(path.join(none, 'project.faf'), HAND_FAF);
    await handler().callTool('faf_dna', { path: none });
    expect(fs.existsSync(path.join(none, '.faf-dna'))).toBe(false);

    const old = sandbox('dna-old');
    fs.writeFileSync(path.join(old, 'project.faf'), HAND_FAF);
    const OLD = JSON.stringify({ birthCertificate: { born: '2026-01-01T00:00:00.000Z', birthDNA: 30, certificate: 'FAF-2026-OLD' }, current: { score: 40, version: 'v1.0.0' }, milestones: [{ type: 'birth', score: 30 }], format: 'faf-dna-v1' }, null, 2);
    fs.writeFileSync(path.join(old, '.faf-dna'), OLD);
    const r = await handler().callTool('faf_dna', { path: old });
    expect(r.isError).toBeFalsy();
    expect((r.structuredContent as any).readOnly).toContain("not in faf's shape");
    expect(read(path.join(old, '.faf-dna'))).toBe(OLD);

    const only = sandbox('dna-only');
    fs.writeFileSync(path.join(only, '.faf-dna'), OLD);
    const o = await handler().callTool('faf_dna', { path: only });
    expect((o.structuredContent as any).hasFaf).toBe(false);
  });
});

// ─────────────────────────────────────── #38 #19 — faf_formats
describe('#38 / #19 — faf_formats is a dry run of faf_auto, from the project folder only', () => {
  test('it shows what faf_auto writes (backend Express), no canned fills, no score of its own, and writes nothing', async () => {
    const dir = sandbox('formats');
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'api', dependencies: { express: '^4.0.0' } }));
    const r = await handler().callTool('faf_formats', { path: dir });
    expect(r.isError).toBeFalsy();
    expect(text(r)).toContain('stack.backend: Express');
    expect(text(r)).not.toMatch(/Intelligence Score|targetUser|coreProblem|Recommended Slot Fills/);
    const sc = r.structuredContent as any;
    expect(sc.wouldFill['stack.backend']).toBe('Express');
    expect(sc.intelligenceScore).toBeUndefined();
    expect(sc.formats[0].path).toBe(path.join(real(dir), sc.formats[0].fileName));
    expect(fs.readdirSync(dir)).toEqual(['package.json']);
    const tool = (await handler().listTools()).tools.find((t) => t.name === 'faf_formats')!;
    expect(tool.description).toContain('Reads only');
  });

  test('a parent folder\'s package.json and tsconfig.json never reach a subfolder (faf-cli 7.13 boundary)', async () => {
    const parent = sandbox('formats-parent');
    fs.writeFileSync(path.join(parent, 'package.json'), JSON.stringify({ name: 'parent', devDependencies: { typescript: '^5' } }));
    fs.writeFileSync(path.join(parent, 'tsconfig.json'), '{}');
    const child = path.join(parent, 'child');
    fs.mkdirSync(child);
    fs.writeFileSync(path.join(child, 'notes.xyz'), 'nothing known\n');
    const r = await handler().callTool('faf_formats', { path: child, json: true });
    const sc = r.structuredContent as any;
    expect(sc.formats).toEqual([]);
    expect(JSON.stringify(sc.wouldFill)).not.toContain('TypeScript');
  });
});

// ─────────────────────────────────────── #30 #45 — faf_read / faf_list roots
describe('#30 / #45 — faf_read and faf_list: the active project plus FAF_ALLOWED_ROOTS', () => {
  test('a file in another temp folder is refused; a relative path reads the active project\'s file', async () => {
    const proj = sandbox('read-proj');
    fs.writeFileSync(path.join(proj, 'README.md'), 'PROJECT-README-MARKER\n');
    const elsewhere = sandbox('read-else');
    fs.writeFileSync(path.join(elsewhere, 'token.txt'), 'TEMP-TOKEN-123\n');
    const h = handler(proj);
    const out = await h.callTool('faf_read', { path: path.join(elsewhere, 'token.txt') });
    expect(out.isError).toBe(true);
    expect(text(out)).not.toContain('TEMP-TOKEN-123');
    const rel = await h.callTool('faf_read', { path: 'README.md' });
    expect(text(rel)).toBe('PROJECT-README-MARKER\n');

    process.env.FAF_ALLOWED_ROOTS = elsewhere;
    try {
      const allowed = await h.callTool('faf_read', { path: path.join(elsewhere, 'token.txt') });
      expect(text(allowed)).toBe('TEMP-TOKEN-123\n');
    } finally {
      delete process.env.FAF_ALLOWED_ROOTS;
    }
  });

  test('faf_list refuses /etc and never follows a link out of the project', async () => {
    const proj = sandbox('list-proj');
    const outside = sandbox('list-out');
    fs.mkdirSync(path.join(outside, 'secret-dir'));
    fs.writeFileSync(path.join(outside, 'passwords.txt'), 'x');
    fs.symlinkSync(outside, path.join(proj, 'escape'));
    fs.mkdirSync(path.join(proj, 'app'));
    const h = handler(proj);
    const etc = await h.callTool('faf_list', { path: '/etc', filter: 'all' });
    expect(etc.isError).toBe(true);
    const list = await h.callTool('faf_list', { path: proj, filter: 'all', depth: 2 });
    expect(list.isError).toBeFalsy();
    const names = ((list.structuredContent as any).entries as Array<{ name: string; isLink: boolean }>);
    expect(names.map((e) => e.name).sort()).toEqual(['app', 'escape']);
    expect(names.find((e) => e.name === 'escape')!.isLink).toBe(true);
    expect(text(list)).not.toContain('passwords.txt');
  });
});
