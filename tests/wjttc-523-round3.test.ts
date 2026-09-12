/**
 * WJTTC 5.23 round 3 — safety guards and truthful output.
 *
 *  - faf_init / faf_auto / faf_go's bootstrap refuse the home directory and a
 *    filesystem root (faf-cli's `faf init/auto/go` refuse the same), writing nothing.
 *  - CFM ≤5.22.1's `project: <name>` scalar is lifted to `{ name }` before faf_auto
 *    updates the file and before faf_go applies answers; faf_go's setter replaces
 *    a non-mapping step instead of throwing.
 *  - Error and report text says what happened: faf_auto on a non-Error throw,
 *    faf_init on an existing file (session project set), faf_go's bootstrap
 *    (files written, no "a% → a%"), faf_conductor / faf_git refusals, the
 *    SessionStart hook's one-line diagnostic, faf_sync's parser file path.
 *
 * Isolation: every case uses a mkdtemp sandbox under os.tmpdir(); the home case
 * runs in a child process whose HOME is a mkdtemp dir (bun reads HOME once, at
 * startup). The repo's own CLAUDE.md / project.faf must never change. No network.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import { ClaudeFafMcpServer } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { FafToolHandler } from '../src/handlers/tools.js';
import { FafEngineAdapter } from '../src/handlers/engine-adapter.js';
import { sessionRefresh } from '../src/faf-core/commands/session-refresh.js';
import { fafCli } from '../src/utils/faf-cli-bridge.js';

const { scoreFafYaml, FAF_START } = await fafCli;

const ROOT = path.resolve(import.meta.dir, '..');
const REPO_GUARDED = ['CLAUDE.md', 'project.faf'].map((f) => path.join(ROOT, f));
// 6.0.0: one resolver refuses home and '/' for every writer (faf-cli's
// isNonProjectRoot, by device and inode) before the session moves.
const REFUSAL = 'is your home folder (or the filesystem root), not a project';

const read = (p: string): string => fs.readFileSync(p, 'utf-8');

const sandboxes: string[] = [];
function sandbox(tag: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `cfm-523r3-${tag}-`));
  sandboxes.push(d);
  return d;
}

function writeRepo(dir: string): void {
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'acme-widgets', version: '1.0.0', description: 'Widgets for acme', dependencies: { express: '^4.0.0' } }, null, 2),
  );
  fs.writeFileSync(path.join(dir, 'README.md'), '# acme-widgets\n\nA widget API for Acme.\n');
}

/** CFM 5.22.1 faf_init's project.faf, exactly as it wrote it (non-chrome case). */
function legacyInitFaf(dir: string, name: string): string {
  return `# FAF - Foundational AI Context
project: ${name}
type: general
context: I⚡🍊
generated: 2026-08-01T00:00:00.000Z
version: 5.22.1


# The Formula
human_input: Your project files
multiplier: FAF Context
output: Championship Performance

# Quick Context
working_directory: ${dir}
initialized_by: claude-faf-mcp
vitamin_context: true
faffless: true


`;
}

function toolText(result: { content?: unknown }): string {
  const block = (result.content as Array<{ type?: string; text?: string }> | undefined)?.[0];
  return block?.text ?? '';
}

/** Every entry under `dir`, recursively, with its bytes (directories as ''). */
function snapshot(dir: string, rel = ''): Map<string, string> {
  const out = new Map<string, string>();
  for (const e of fs.readdirSync(path.join(dir, rel), { withFileTypes: true })) {
    const r = path.join(rel, e.name);
    if (e.isDirectory()) {
      out.set(`${r}/`, '');
      for (const [k, v] of snapshot(dir, r)) {out.set(k, v);}
    } else {
      out.set(r, read(path.join(dir, r)));
    }
  }
  return out;
}

describe('WJTTC 5.23 round 3 — safety guards and truthful output', () => {
  let server: ClaudeFafMcpServer;
  let client: Client;
  const repoBefore = new Map<string, string>();

  beforeAll(async () => {
    for (const p of REPO_GUARDED) {if (fs.existsSync(p)) {repoBefore.set(p, read(p));}}
    server = new ClaudeFafMcpServer({ transport: 'stdio', fafEnginePath: 'native' });
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    await server.getServer().connect(serverT);
    client = new Client({ name: 'wjttc-523-r3', version: '1.0.0' }, { capabilities: {} });
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

  // ── 2. home / filesystem-root refusal ──

  test('home directory: faf_init, faf_auto and faf_go refuse and write nothing (HOME = mkdtemp, server cwd = HOME)', () => {
    const home = sandbox('home');
    const RULES = '# My global engineering rules\n\nNever touch this file.\n';
    fs.writeFileSync(path.join(home, 'CLAUDE.md'), RULES);
    const before = snapshot(home);

    // bun caches os.homedir() at startup, so the guard only sees the fake HOME
    // in a process started with it. The script lives outside HOME (its bytes
    // are not part of the snapshot) and imports the repo's src by absolute path.
    const script = path.join(sandbox('home-script'), 'probe.ts');
    fs.writeFileSync(script, [
      `import { FafToolHandler } from ${JSON.stringify(path.join(ROOT, 'src/handlers/tools.ts'))};`,
      `import { FafEngineAdapter } from ${JSON.stringify(path.join(ROOT, 'src/handlers/engine-adapter.ts'))};`,
      'const handler = new FafToolHandler(new FafEngineAdapter("native"));',
      'const out: Record<string, { isError: boolean; text: string }> = {};',
      'for (const [key, name, args] of [',
      '  ["faf_init {path: HOME}", "faf_init", { path: process.env.HOME }],',
      '  ["faf_init {path: ~/}", "faf_init", { path: "~/" }],',
      '  ["faf_auto {}", "faf_auto", {}],',
      '  ["faf_go {}", "faf_go", {}],',
      '] as const) {',
      '  const r: any = await handler.callTool(name, args as any);',
      '  out[key] = { isError: !!r.isError, text: r.content?.[0]?.text ?? "" };',
      '}',
      'console.log(JSON.stringify(out));',
    ].join('\n'));

    // BUN_RUNTIME_TRANSPILER_CACHE_PATH=0: bun would otherwise cache its
    // transpiled sources under HOME/Library/Caches — bun's bytes, not ours.
    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      HOME: home,
      BUN_RUNTIME_TRANSPILER_CACHE_PATH: '0',
    };
    delete env.FAF_WORKING_DIR;
    delete env.MCP_WORKING_DIR;
    const run = Bun.spawnSync([process.execPath, script], { cwd: home, env, stdout: 'pipe', stderr: 'pipe' });
    expect(run.exitCode).toBe(0);
    const lines = run.stdout.toString().trim().split('\n');
    const out = JSON.parse(lines[lines.length - 1]) as Record<string, { isError: boolean; text: string }>;

    expect(Object.keys(out)).toHaveLength(4);
    for (const [key, r] of Object.entries(out)) {
      expect(`${key}: ${r.isError}`).toBe(`${key}: true`);
      // The refusal names the directory as the tool resolved it: HOME itself, or
      // the server cwd, which the OS may report through a different spelling
      // (macOS: /var → /private/var). Either way it is this home.
      const named = /(\S+) is your home folder/.exec(r.text)?.[1] ?? '';
      expect(r.text).toContain(REFUSAL);
      expect(fs.realpathSync(named)).toBe(fs.realpathSync(home));
    }
    expect(snapshot(home)).toEqual(before); // no project.faf, CLAUDE.md byte-identical, no new dirs
  });

  test('filesystem root: faf_init, faf_auto and faf_go {path: "/"} refuse and write nothing', async () => {
    const hadRootFaf = fs.existsSync('/project.faf');
    const hadRootClaude = fs.existsSync('/CLAUDE.md');
    // Own handler: a path arg makes "/" the session project, which must not leak
    // into the shared client used by the other cases.
    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    for (const name of ['faf_init', 'faf_auto', 'faf_go']) {
      const r = await handler.callTool(name, { path: '/' });
      expect(`${name}: ${r.isError}`).toBe(`${name}: true`);
      expect(toolText(r)).toContain(`${name}: / ${REFUSAL}`);
    }
    expect(fs.existsSync('/project.faf')).toBe(hadRootFaf);
    expect(fs.existsSync('/CLAUDE.md')).toBe(hadRootClaude);
  });

  // ── 3. CFM ≤5.22.1 schema: `project: <name>` ──

  test('faf_auto on a 5.22.1 faf_init project.faf keeps the name as project.name (and CLAUDE.md is titled with it)', async () => {
    const dir = sandbox('old-auto');
    writeRepo(dir);
    fs.writeFileSync(path.join(dir, 'project.faf'), legacyInitFaf(dir, 'old-init'));

    const r = await client.callTool({ name: 'faf_auto', arguments: { path: dir } });
    expect(r.isError).toBeFalsy();

    const data = parseYaml(read(path.join(dir, 'project.faf')));
    expect(data.project).toBeTypeOf('object');
    expect(data.project.name).toBe('old-init'); // the existing value wins over the detected 'acme-widgets'
    expect(read(path.join(dir, 'CLAUDE.md'))).toContain('# CLAUDE.md — old-init');
  });

  test('faf_go applies answers to a 5.22.1 faf_init project.faf without throwing, keeping the name', async () => {
    const dir = sandbox('old-go');
    writeRepo(dir);
    fs.writeFileSync(path.join(dir, 'project.faf'), legacyInitFaf(dir, 'old-init'));
    const handler = new FafToolHandler(new FafEngineAdapter('native'));

    const ask = JSON.parse(toolText(await handler.callTool('faf_go', { path: dir })));
    expect(ask.questions.map((q: { field: string }) => q.field)).not.toContain('project.name'); // the name is known

    const r = await handler.callTool('faf_go', {
      path: dir,
      answers: { 'project.goal': 'Ship widgets to Acme', 'human_context.who': 'Acme developers' },
    });
    expect(r.isError).toBeFalsy();
    expect(toolText(r)).toContain('Answers Applied');
    const data = parseYaml(read(path.join(dir, 'project.faf')));
    expect(data.project.name).toBe('old-init');
    expect(data.project.goal).toBe('Ship widgets to Acme');
    expect(data.human_context.who).toBe('Acme developers');
  });

  test('faf_go answers never step through a value: `human_context: TBD` is refused and kept (6.0.0, #6)', async () => {
    const dir = sandbox('go-scalar-step');
    const FAF = 'project:\n  name: step-app\nhuman_context: TBD\n';
    fs.writeFileSync(path.join(dir, 'project.faf'), FAF);
    const handler = new FafToolHandler(new FafEngineAdapter('native'));

    const r = await handler.callTool('faf_go', { path: dir, answers: { 'human_context.who': 'Platform team' } });
    expect(r.isError).toBe(true);
    expect(toolText(r)).toContain('human_context holds the value "TBD", not a mapping');
    expect(read(path.join(dir, 'project.faf'))).toBe(FAF);
  });

  // ── 7. faf_auto: description, schema, error text ──

  test('faf_auto: served description is a full sentence naming the CLAUDE.md write; no unread `force` prop', async () => {
    const tools = (await client.listTools()).tools;
    const auto = tools.find((t) => t.name === 'faf_auto')!;
    expect(auto.description!).toContain("Then writes CLAUDE.md's faf-managed block.");
    expect(auto.description!.trim().endsWith('.')).toBe(true);
    expect(Object.keys((auto.inputSchema as { properties: object }).properties)).toEqual(['path']);
  });

  test('faf_auto reports the reason when the scorer throws a non-Error (whitespace + tab project.faf), never "undefined"', async () => {
    const dir = sandbox('auto-ws');
    fs.writeFileSync(path.join(dir, 'project.faf'), ' \t\n');
    const r = await client.callTool({ name: 'faf_auto', arguments: { path: dir } });
    expect(r.isError).toBe(true);
    const text = toolText(r);
    expect(text).not.toContain('undefined');
    expect(text).toMatch(/Error: \S/);
    expect(read(path.join(dir, 'project.faf'))).toBe(' \t\n');
  });

  // ── 8. faf_init: path description, existing-file branch ──

  test('faf_init: `path` description says what omitting it does', async () => {
    const init = (await client.listTools()).tools.find((t) => t.name === 'faf_init')!;
    const desc = (init.inputSchema as { properties: { path: { description: string } } }).properties.path.description;
    expect(desc).toContain('Omit to create ~/Projects/unnamed-project; pass the workspace path to init it.');
    expect(desc).not.toContain('Omit to use current directory');
  });

  test('faf_init on a project that already has project.faf makes it the session project and leaves the file alone', async () => {
    const dir = sandbox('init-exists');
    const FAF = 'project:\n  name: exists-app\n';
    fs.writeFileSync(path.join(dir, 'project.faf'), FAF);
    const engine = new FafEngineAdapter('native');
    engine.setWorkingDirectory(sandbox('init-exists-elsewhere'));
    const handler = new FafToolHandler(engine);

    const r = await handler.callTool('faf_init', { path: dir });
    expect(r.isError).toBeFalsy();
    expect(toolText(r)).toContain('already exists');
    expect(engine.getWorkingDirectory()).toBe(fs.realpathSync(dir)); // a bare faf_sync next acts on the project just named
    expect(read(path.join(dir, 'project.faf'))).toBe(FAF);
  });

  // ── 9. faf_go bootstrap report ──

  test('faf_go bootstrap reports the files it wrote (CLAUDE.md included) and no "a% → a%" arrow', async () => {
    const dir = sandbox('go-boot');
    writeRepo(dir);
    const NOTES = '# Team notes\n\nKeep me.\n';
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), NOTES);
    const handler = new FafToolHandler(new FafEngineAdapter('native'));

    const j = JSON.parse(toolText(await handler.callTool('faf_go', { path: dir })));
    const boot = j.bootstrap;
    expect(boot.filesWritten).toEqual(['project.faf', 'CLAUDE.md']);
    expect(boot.message).toContain('Wrote project.faf and CLAUDE.md.');
    // faf_init already runs faf-cli's detection, so birth and sourced agree here.
    expect(boot.birthScore).toBe(boot.sourcedScore);
    expect(boot.sourcedScore).toBe(scoreFafYaml(read(path.join(dir, 'project.faf'))).score);
    expect(boot.message).toContain(`(${boot.sourcedScore}%)`);
    expect(boot.message).not.toContain('→');

    const md = read(path.join(dir, 'CLAUDE.md'));
    expect(md.startsWith(FAF_START)).toBe(true);
    expect(md.endsWith(NOTES)).toBe(true); // the notes are kept below the block
  });

  // ── 11 (+ faf_git). refusals carry the command's reason ──

  test('faf_conductor and faf_git refusals carry the reason, never "undefined" (no network: the URL is rejected before any fetch)', async () => {
    const dir = sandbox('refusals');
    const handler = new FafToolHandler(new FafEngineAdapter('native'));

    const c = await handler.callTool('faf_conductor', { path: dir, action: 'export' });
    expect(c.isError).toBe(true);
    expect(toolText(c)).toContain('No project.faf (or .faf) in');
    expect(toolText(c)).not.toContain('undefined');

    const g = await handler.callTool('faf_git', { url: 'not a github url' });
    expect(g.isError).toBe(true);
    expect(toolText(g)).toContain('"not a github url"'); // faf-cli's normalizeGitUrl names it
    expect(toolText(g)).toContain('Expected owner/repo or https://github.com/owner/repo.');
    expect(toolText(g)).not.toContain('undefined');
  });

  // ── 12. parser file path; hook diagnostic is one clean line ──

  test('SessionStart hook: the diagnostic for an invalid project.faf is one line with no colour codes', async () => {
    for (const [bad, reason] of [
      ['', 'Empty .faf file detected'],
      ['- a\n- b\n', 'Invalid .faf structure - must be a YAML object'],
    ] as const) {
      const dir = sandbox('hook-diag');
      fs.writeFileSync(path.join(dir, 'project.faf'), bad);
      const r = await sessionRefresh(dir);
      expect(r.action).toBe('error');
      expect(r.message).toBe(`faf: session refresh skipped (${reason})`);
      expect(fs.existsSync(path.join(dir, 'CLAUDE.md'))).toBe(false);
    }
  });

  test('faf_sync names the project.faf the parser refused (not "unknown file")', async () => {
    const dir = sandbox('sync-bad');
    fs.writeFileSync(path.join(dir, 'project.faf'), '- a\n- b\n');
    const r = await client.callTool({ name: 'faf_sync', arguments: { path: dir } });
    expect(r.isError).toBe(true);
    // getProjectPath confines the path through symlinks (macOS: /var → /private/var).
    expect(toolText(r)).toContain(`File: ${path.join(fs.realpathSync(dir), 'project.faf')}`);
    expect(toolText(r)).not.toContain('unknown file');
    expect(fs.existsSync(path.join(dir, 'CLAUDE.md'))).toBe(false);
  });

  // ── 5 / 6 / 10. served wording ──

  test('served wording: faf_git authors, faf_about carries no banned or reversed markers', async () => {
    const prev = process.env.FAF_TOOLS;
    process.env.FAF_TOOLS = 'all';
    let tools;
    try {
      tools = (await client.listTools()).tools;
    } finally {
      if (prev === undefined) {delete process.env.FAF_TOOLS;} else {process.env.FAF_TOOLS = prev;}
    }
    const git = tools.find((t) => t.name === 'faf_git')!;
    expect(git.description!.startsWith('Author a project.faf for a repository by URL. Uses the network:')).toBe(true);
    expect(git.annotations?.openWorldHint).toBe(true);
    expect(JSON.stringify(git.inputSchema)).not.toMatch(/generat/i);

    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    const about = toolText(await handler.callTool('faf_about', {}));
    // 6.0.0 (W4 #84): facts only — the media type and the versions, no speed or reach claims.
    expect(about).toContain('application/vnd.faf+yaml');
    expect(about).not.toContain('<29ms');
    expect(about).not.toContain('any AI tool');
    expect(about).not.toMatch(/Generated/);
    expect(about).not.toContain('Universal');
  });
});
