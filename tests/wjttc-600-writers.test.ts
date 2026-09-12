/**
 * WJTTC 6.0.0 — W1: every writer is non-destructive and composed from faf-cli.
 *
 * The owner rule: no FAF writer replaces, reorders, truncates or deletes text
 * it cannot prove it wrote — only its managed block or its own entry. Each
 * case below is a writer (or a reader of project context) that broke it
 * before 6.0.0:
 *
 *   #1  / #16  safe path + atomic write (faf_status, faf_dna, faf_debug, the
 *              copilot export, a read-only project.faf, no raw fs writes)
 *   #2  / #37  project.faf edited in place (faf_human_add, faf_go, faf_auto
 *              lists every existing value it changed)
 *   #3         the injector call sites never refuse or reclaim (exports)
 *   #4 / #18   soul.fafm through faf-cli's Soul (faf_etch, faf_recall)
 *   #9         faf_conductor export: one managed block per file, no force
 *   #10        faf_readme apply: fills only empty slots, no-op writes nothing
 *   #11        faf_quick: assembleFreshFaf, refuses an existing file, no force
 *   #12        advice names the fix (file:line:col), never force/recreate
 *   #14 / #27  faf_tri_sync: faf-cli's MEMORY.md writer at Claude Code's path
 *   #23 / Q9   faf_setup: exact-entry remove, shape refusals, previews, scope
 *   #25        faf_debug writes nothing
 *   #40        faf_auto reports each file's outcome
 *   faf_init   force means overwrite (after a backup); no force means merge
 *
 * Isolation: mkdtemp sandboxes under os.tmpdir(); CLAUDE_CONFIG_DIR points at a
 * mkdtemp folder for tri-sync; the home cases run in a child process whose HOME
 * is a mkdtemp folder. The repo's own files are never written. No network.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import { FafToolHandler } from '../src/handlers/tools.js';
import { FafEngineAdapter } from '../src/handlers/engine-adapter.js';
import { setupSessionHook, HOOK_COMMAND } from '../src/faf-core/commands/setup-hook.js';
import { fafCli } from '../src/utils/faf-cli-bridge.js';

const { FAF_START, FAF_END, claudeProjectId, claudeProjectRoot } = await fafCli;

const ROOT = path.resolve(import.meta.dir, '..');
const REPO_GUARDED = ['CLAUDE.md', 'project.faf', 'AGENTS.md'].map((f) => path.join(ROOT, f));

const read = (p: string): string => fs.readFileSync(p, 'utf-8');
const sandboxes: string[] = [];
function sandbox(tag: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `cfm-w1-${tag}-`));
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
function past(p: string): void {
  const t = new Date(Date.now() - 120_000);
  fs.utimesSync(p, t, t);
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

/** A hand-kept project.faf: comments, exact scalars, a user _meta, a typed none. */
const HAND_FAF = [
  '# HAND-COMMENT: curated by hand, keep every line',
  'faf_version: "3.0"',
  'version: 1.10          # exact scalar',
  'build_id: 12345678901234567890',
  'port: 0x1F90',
  'project:',
  '  name: hand-app   # HAND-NAME-COMMENT',
  '  goal: Ship the hand app',
  '  main_language: TypeScript',
  '  type: backend',
  'stack:',
  '  database: None # deliberate: stateless',
  '  frontend: N/A',
  'human_context:',
  '  who: Platform team',
  '  why: Because my manager asked for it',
  '_meta:',
  '  owner: HAND-META',
  '',
].join('\n');

function expectHandBytesKept(out: string): void {
  for (const line of [
    '# HAND-COMMENT: curated by hand, keep every line',
    'version: 1.10          # exact scalar',
    'build_id: 12345678901234567890',
    'port: 0x1F90',
    '  name: hand-app   # HAND-NAME-COMMENT',
    '  database: None # deliberate: stateless',
    '  owner: HAND-META',
  ]) {
    expect(out).toContain(line);
  }
}

function writeRepo(dir: string): void {
  fs.writeFileSync(path.join(dir, 'README.md'),
    '# hand-app\n\nA command line tool that ships widgets to Acme.\n\n## Why\n\nManual widget shipping takes a day per release.\n\n## Who\n\nAcme release engineers.\n');
  fs.writeFileSync(path.join(dir, 'package.json'),
    JSON.stringify({ name: 'hand-app', version: '1.0.0', description: 'Ships widgets to Acme', dependencies: { express: '^4.0.0' } }, null, 2));
}

const repoBefore = new Map<string, string>();
let configDir = '';
const envBefore = { cfg: process.env.CLAUDE_CONFIG_DIR, remote: process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR };

beforeAll(() => {
  for (const p of REPO_GUARDED) {if (fs.existsSync(p)) {repoBefore.set(p, read(p));}}
  configDir = sandbox('claude-config');
  process.env.CLAUDE_CONFIG_DIR = configDir;
  delete process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR;
});

afterAll(() => {
  if (envBefore.cfg === undefined) {delete process.env.CLAUDE_CONFIG_DIR;} else {process.env.CLAUDE_CONFIG_DIR = envBefore.cfg;}
  if (envBefore.remote !== undefined) {process.env.CLAUDE_CODE_REMOTE_MEMORY_DIR = envBefore.remote;}
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

// ─────────────────────────────────────────────── #1 / #16 safe path + atomic write
describe('#1 / #16 — reads and writes go through faf-cli\'s safe path', () => {
  test('faf_status never reads a project.faf that links out of the project into the reply', async () => {
    const outside = sandbox('status-secret');
    fs.writeFileSync(path.join(outside, 'credentials'), 'aws_access_key_id = SECRET-TOKEN-123\n');
    const dir = sandbox('status');
    fs.symlinkSync(path.join(outside, 'credentials'), path.join(dir, 'project.faf'));
    const r = await handler().callTool('faf_status', { path: dir });
    expect(text(r)).not.toContain('SECRET-TOKEN-123');
    expect(r.isError).toBe(true);
  });

  test('faf_dna never writes through a .faf-dna link that leaves the project', async () => {
    const outside = sandbox('dna-out');
    const dir = sandbox('dna');
    fs.writeFileSync(path.join(dir, 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: dna-app\n');
    fs.symlinkSync(path.join(outside, '.faf-dna'), path.join(dir, '.faf-dna')); // dangling, points out
    const r = await handler().callTool('faf_dna', { path: dir });
    expect(fs.existsSync(path.join(outside, '.faf-dna'))).toBe(false);
    expect(r.isError).toBe(true);
    expect(text(r)).toMatch(/refused|not written/);
  });

  test('faf_debug writes nothing: a .claude-faf-test link to a file outside is left as it is', async () => {
    const outside = sandbox('debug-out');
    const target = path.join(outside, 'rc');
    fs.writeFileSync(target, 'KEEP ME\n');
    const dir = sandbox('debug');
    fs.symlinkSync(target, path.join(dir, '.claude-faf-test'));
    fs.writeFileSync(path.join(dir, 'user-file.txt'), 'mine\n');
    const before = snapshot(dir);
    const r = await handler(dir).callTool('faf_debug', {});
    expect(text(r)).toContain('Write Permissions');
    expect(read(target)).toBe('KEEP ME\n');
    expect(snapshot(dir)).toEqual(before);
  });

  test('faf_sync copilot never writes into a .github that links out of the project', async () => {
    const outside = sandbox('gh-out');
    const dir = sandbox('gh');
    fs.writeFileSync(path.join(dir, 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: gh-app\n  goal: test the copilot root\n');
    fs.symlinkSync(outside, path.join(dir, '.github'));
    await handler().callTool('faf_sync', { path: dir, copilot: true });
    expect(fs.readdirSync(outside)).toEqual([]);
  });

  test('a write that fails says "not written; original kept" and leaves the file byte for byte', async () => {
    if (process.getuid?.() === 0) {return;} // root writes through 0444
    const dir = sandbox('ro');
    const fafPath = path.join(dir, 'project.faf');
    fs.writeFileSync(fafPath, HAND_FAF);
    fs.chmodSync(dir, 0o555); // no temp file, no rename: the write cannot happen
    try {
      const r = await handler().callTool('faf_human_add', { path: dir, field: 'what', value: 'A CLI' });
      expect(r.isError).toBe(true);
      expect(text(r)).toContain('not written; original kept');
      expect(read(fafPath)).toBe(HAND_FAF);
    } finally {
      fs.chmodSync(dir, 0o755);
    }
  });

  test('no src module writes, truncates or removes a file itself — every write is faf-cli\'s safe write', () => {
    const offenders: string[] = [];
    const walk = (d: string): void => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) {walk(p); continue;}
        if (!/\.ts$/.test(e.name)) {continue;}
        read(p).split('\n').forEach((line, i) => {
          if (/\b(writeFileSync|writeFile|appendFileSync|appendFile|truncateSync|unlinkSync|unlink)\s*\(/.test(line)) {
            offenders.push(`${path.relative(ROOT, p)}:${i + 1}  ${line.trim()}`);
          }
        });
      }
    };
    walk(path.join(ROOT, 'src'));
    expect(offenders).toEqual([]);
  });
});

// ─────────────────────────────────────────────── #2 / #37 project.faf in place
describe('#2 / #37 — project.faf is edited in place; nothing hand-written is lost', () => {
  test('faf_human_add keeps comments, exact scalars, the user _meta and a typed None', async () => {
    const dir = sandbox('human-add');
    const fafPath = path.join(dir, 'project.faf');
    fs.writeFileSync(fafPath, HAND_FAF);
    const r = await handler().callTool('faf_human_add', { path: dir, field: 'what', value: 'A CLI for widgets' });
    expect(r.isError).toBeFalsy();
    const out = read(fafPath);
    expectHandBytesKept(out);
    expect(parseYaml(out).human_context.what).toBe('A CLI for widgets');
  });

  test('faf_go answers keep comments, exact scalars and the user _meta', async () => {
    const dir = sandbox('go-answers');
    const fafPath = path.join(dir, 'project.faf');
    fs.writeFileSync(fafPath, HAND_FAF);
    const r = await handler().callTool('faf_go', { path: dir, answers: { 'human_context.where': 'The Acme cloud' } });
    expect(r.isError).toBeFalsy();
    const out = read(fafPath);
    expectHandBytesKept(out);
    expect(parseYaml(out).human_context.where).toBe('The Acme cloud');
  });

  test('faf_auto keeps the hand-written None and lists every value the file held that it changed', async () => {
    const dir = sandbox('auto-diff');
    writeRepo(dir);
    const fafPath = path.join(dir, 'project.faf');
    fs.writeFileSync(fafPath, HAND_FAF);
    const r = await handler().callTool('faf_auto', { path: dir });
    const out = read(fafPath);
    expectHandBytesKept(out); // `database: None # deliberate: stateless` stays as typed (no repo fact)
    // faf-cli's app-type (backend) leaves frontend out: the typed N/A becomes
    // slotignored. That change is named, never hidden behind "values kept".
    expect(parseYaml(out).stack.frontend).toBe('slotignored');
    expect(text(r)).toContain('stack.frontend: "N/A" → "slotignored"');
    expect(text(r)).not.toContain('existing values kept');
  });
});

// ─────────────────────────────────────────────── #3 injector call sites
describe('#3 — the export tools inject faf\'s block; they never refuse or take over a file', () => {
  test('faf_agents / faf_cursor / faf_gemini export on a hand-written file put the block on top and keep every byte below', async () => {
    for (const [tool, file, start] of [
      ['faf_agents', 'AGENTS.md', FAF_START],
      ['faf_cursor', '.cursorrules', '# faf:start'],
      ['faf_gemini', 'GEMINI.md', FAF_START],
    ] as const) {
      const dir = sandbox('export');
      fs.writeFileSync(path.join(dir, 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: export-app\n  goal: test the export\n');
      const HAND = '<!-- faf: export-app | TypeScript -->\n# Hand-written agent rules\n\n- NEVER call the payments API.\n';
      fs.writeFileSync(path.join(dir, file), HAND);
      const r = await handler().callTool(tool, { path: dir, action: 'export' });
      expect(`${tool}: ${!!r.isError}`).toBe(`${tool}: false`);
      const out = read(path.join(dir, file));
      expect(out.startsWith(start)).toBe(true);
      expect(out.endsWith(HAND)).toBe(true);
      expect(text(r)).not.toMatch(/force|overwrite/i);
    }
  });
});

// ─────────────────────────────────────────────── #2 faf_git's project.faf write
describe('#2 — faf_git never writes over a project.faf', () => {
  test('an existing project.faf is refused before anything is fetched, and left byte for byte', async () => {
    const dir = sandbox('git-exists');
    const fafPath = path.join(dir, 'project.faf');
    fs.writeFileSync(fafPath, HAND_FAF);
    const r = await handler().callTool('faf_git', { url: 'faf-w1-no-such-owner/no-such-repo', path: dir });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain('already exists');
    expect(text(r)).toContain('faf_auto');
    expect(read(fafPath)).toBe(HAND_FAF);
  });
});

// ─────────────────────────────────────────────── #4 / #18 soul
describe('#4 / #18 — soul.fafm through faf-cli\'s Soul', () => {
  test('faf_recall prints a bare-string fact\'s text, never "undefined"', async () => {
    const dir = sandbox('recall');
    fs.writeFileSync(path.join(dir, 'soul.fafm'),
      'version: "1.1"\nprofile: knowledge\nnamepoint: "@t"\nmemory:\n  facts:\n    - "a bare string fact BARE-1"\n    - text: a structured fact STRUCT-1\n      priority: high\n');
    const r = await handler().callTool('faf_recall', { path: dir });
    expect(r.isError).toBeFalsy();
    expect(text(r)).toContain('BARE-1');
    expect(text(r)).toContain('STRUCT-1');
    expect(text(r)).not.toContain('undefined');
  });

  test('faf_etch creates no folder: a path that does not exist is refused', async () => {
    const parent = sandbox('etch');
    const missing = path.join(parent, 'no-such-project');
    const r = await handler().callTool('faf_etch', { path: missing, text: 'remember this' });
    expect(r.isError).toBe(true);
    expect(fs.existsSync(missing)).toBe(false);
  });
});

// ─────────────────────────────────────────────── #9 conductor
describe('#9 — faf_conductor export: one managed block per file, never an overwrite', () => {
  test('a hand-written conductor/product.md keeps every byte below the block (force is refused, never an overwrite)', async () => {
    const dir = sandbox('conductor');
    fs.writeFileSync(path.join(dir, 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: cond\n  goal: Conduct widgets\n  main_language: Go\nstack:\n  backend: Gin\n');
    fs.mkdirSync(path.join(dir, 'conductor'));
    const HAND = '# My product\n\n- My rule\n';
    fs.writeFileSync(path.join(dir, 'conductor', 'product.md'), HAND);
    // 6.0.0: arguments are checked against the schema, which has no force.
    const forced = await handler().callTool('faf_conductor', { path: dir, action: 'export', force: true });
    expect(forced.isError).toBe(true);
    expect(text(forced)).toContain('unknown argument force');
    expect(read(path.join(dir, 'conductor', 'product.md'))).toBe(HAND);
    const r = await handler().callTool('faf_conductor', { path: dir, action: 'export' });
    expect(r.isError).toBeFalsy();
    const product = read(path.join(dir, 'conductor', 'product.md'));
    expect(product.startsWith(FAF_START)).toBe(true);
    expect(product.endsWith(HAND)).toBe(true);
    expect(product).toContain('Conduct widgets');
    const stack = read(path.join(dir, 'conductor', 'tech-stack.md'));
    expect(stack).toContain('- Go');
    expect(stack).toContain('backend: Gin');
    const all = process.env.FAF_TOOLS;
    process.env.FAF_TOOLS = 'all';
    try {
      const tools = (await handler().listTools()).tools as Array<{ name: string; inputSchema: { properties: object } }>;
      const listed = tools.find((t) => t.name === 'faf_conductor')!;
      expect(Object.keys(listed.inputSchema.properties)).not.toContain('force');
    } finally {
      if (all === undefined) {delete process.env.FAF_TOOLS;} else {process.env.FAF_TOOLS = all;}
    }
  });
});

// ─────────────────────────────────────────────── #10 readme
describe('#10 — faf_readme apply fills only empty slots; a no-op writes nothing', () => {
  test('force cannot replace a hand-written 6W; comments survive; the second apply writes nothing', async () => {
    const dir = sandbox('readme');
    writeRepo(dir);
    const fafPath = path.join(dir, 'project.faf');
    fs.writeFileSync(fafPath, HAND_FAF);
    // 6.0.0: arguments are checked against the schema, which has no force.
    const forced = await handler().callTool('faf_readme', { path: dir, apply: true, force: true });
    expect(forced.isError).toBe(true);
    expect(read(fafPath)).toBe(HAND_FAF);
    const r = await handler().callTool('faf_readme', { path: dir, apply: true });
    expect(r.isError).toBeFalsy();
    const out = read(fafPath);
    expectHandBytesKept(out);
    const hc = parseYaml(out).human_context;
    expect(hc.why).toBe('Because my manager asked for it'); // hand-written, kept
    expect(hc.who).toBe('Platform team');                   // hand-written, kept
    expect(hc.what).toBe('Ships widgets to Acme');          // empty → filled
    expect(text(r)).toContain('what');

    past(fafPath);
    const mtime = fs.statSync(fafPath).mtimeMs;
    const again = await handler().callTool('faf_readme', { path: dir, apply: true });
    expect(again.isError).toBeFalsy();
    expect(read(fafPath)).toBe(out);
    expect(fs.statSync(fafPath).mtimeMs).toBe(mtime);
  });
});

// ─────────────────────────────────────────────── #11 quick
describe('#11 — faf_quick composes assembleFreshFaf and only creates', () => {
  test('an existing project.faf is never replaced, force or not', async () => {
    const dir = sandbox('quick-exists');
    const fafPath = path.join(dir, 'project.faf');
    fs.writeFileSync(fafPath, HAND_FAF);
    const forced = await handler().callTool('faf_quick', { path: dir, input: 'other, a new goal, python', force: true });
    expect(forced.isError).toBe(true); // 6.0.0: no force in the schema — refused, nothing run
    expect(read(fafPath)).toBe(HAND_FAF);
    const r = await handler().callTool('faf_quick', { path: dir, input: 'other, a new goal, python' });
    expect(r.isError).toBe(true);
    expect(text(r)).toContain('faf_auto');
    expect(read(fafPath)).toBe(HAND_FAF);
  });

  test('a legacy .faf is never shadowed by a new project.faf', async () => {
    const dir = sandbox('quick-legacy');
    fs.writeFileSync(path.join(dir, '.faf'), 'project:\n  name: curated\n');
    const r = await handler().callTool('faf_quick', { path: dir, input: 'other, a goal' });
    expect(r.isError).toBe(true);
    expect(fs.existsSync(path.join(dir, 'project.faf'))).toBe(false);
  });

  test('a new file is a valid faf-cli .faf: no invented language, no timestamp or version keys, framework in its slot', async () => {
    const { validateFaf, readFaf } = await fafCli;
    const dir = sandbox('quick-new');
    const r = await handler().callTool('faf_quick', { path: dir, input: 'rust-svc, telemetry collector' });
    expect(r.isError).toBeFalsy();
    const data = readFaf(path.join(dir, 'project.faf')) as Record<string, any>;
    expect(validateFaf(data as any).valid).toBe(true);
    expect(data.faf_version).toBeDefined();
    expect(data.project.name).toBe('rust-svc');
    expect(data.project.goal).toBe('telemetry collector');
    expect(data.project.main_language ?? '').not.toBe('TypeScript');
    for (const k of ['generated', 'version', 'initialized_by']) {expect(data).not.toHaveProperty(k);}

    const api = sandbox('quick-api');
    await handler().callTool('faf_quick', { path: api, input: 'api, REST API, python, fastapi' });
    const apiData = readFaf(path.join(api, 'project.faf')) as Record<string, any>;
    expect(apiData.stack.backend).toBe('FastAPI');
    expect(String(apiData.stack.frontend ?? '').toLowerCase()).not.toContain('fastapi');
    expect(apiData.project.main_language).toBe('Python');
  });
});

// ─────────────────────────────────────────────── #12 advice
describe('#12 — advice names the fix, never force or recreate', () => {
  const TYPO = 'faf_version: "3.0"\nproject:\n  name: demo\n  goal: "unterminated\nstack:\n  frontend: React\n';

  test('faf_score on a one-typo file points at file:line:col', async () => {
    const dir = sandbox('score-typo');
    fs.writeFileSync(path.join(dir, 'project.faf'), TYPO);
    const r = await handler().callTool('faf_score', { path: dir });
    expect(text(r)).toMatch(/project\.faf:\d+:\d+/);
    expect(text(r)).not.toMatch(/force|recreate|fresh project\.faf/i);
  });

  test('faf_sync on a one-typo file points at file:line:col and changes nothing', async () => {
    const dir = sandbox('sync-typo');
    fs.writeFileSync(path.join(dir, 'project.faf'), TYPO);
    const r = await handler().callTool('faf_sync', { path: dir });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatch(/project\.faf:\d+:\d+/);
    expect(text(r)).not.toMatch(/--force|recreate/);
    expect(read(path.join(dir, 'project.faf'))).toBe(TYPO);
    expect(fs.existsSync(path.join(dir, 'CLAUDE.md'))).toBe(false);
  });

  test('faf_doctor calls a comments-only file "no keys" and suggests no overwrite', async () => {
    const dir = sandbox('doctor-comments');
    fs.writeFileSync(path.join(dir, 'project.faf'), '# just my notes\n# more notes\n');
    const r = await handler().callTool('faf_doctor', { path: dir });
    expect(text(r)).toContain('no keys');
    expect(text(r)).not.toMatch(/force|fresh project\.faf/i);
  });

  test('faf_init on an existing file suggests no force; the file is unchanged', async () => {
    const dir = sandbox('init-exists');
    fs.writeFileSync(path.join(dir, 'project.faf'), HAND_FAF);
    const r = await handler().callTool('faf_init', { path: dir });
    expect(text(r)).toContain('already exists');
    expect(text(r)).not.toMatch(/force|overwrite/i);
    expect(read(path.join(dir, 'project.faf'))).toBe(HAND_FAF);
  });
});

// ─────────────────────────────────────────────── faf_init force
describe('faf_init force means overwrite, and the old file is kept as a backup', () => {
  test('force replaces a hand-written project.faf with a fresh one; the backup holds the original bytes', async () => {
    const dir = sandbox('init-force');
    const fafPath = path.join(dir, 'project.faf');
    fs.writeFileSync(fafPath, HAND_FAF);
    const r = await handler().callTool('faf_init', { path: dir, force: true });
    expect(r.isError).toBeFalsy();
    expect(read(fafPath)).not.toContain('HAND-COMMENT');
    const backups = fs.readdirSync(dir).filter((f) => f.startsWith('project.faf.bak-'));
    expect(backups).toHaveLength(1);
    expect(read(path.join(dir, backups[0]))).toBe(HAND_FAF);
    expect(text(r)).toContain(backups[0]);
  });
});

// ─────────────────────────────────────────────── #14 / #27 tri-sync
describe('#14 / #27 — faf_tri_sync writes faf-cli\'s block into the MEMORY.md Claude Code reads', () => {
  const memoryFor = (dir: string): string =>
    path.join(configDir, 'projects', claudeProjectId(claudeProjectRoot(dir)), 'memory', 'MEMORY.md');

  test('the file lands at Claude Code\'s project id (every non-alphanumeric → "-")', async () => {
    const dir = path.join(sandbox('tri'), 'my_app.v2');
    fs.mkdirSync(dir);
    fs.writeFileSync(path.join(dir, 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: my-app\n  goal: tri-sync path\n');
    const r = await handler().callTool('faf_tri_sync', { path: dir });
    expect(r.isError).toBeFalsy();
    const target = memoryFor(dir);
    expect(path.basename(path.dirname(path.dirname(target)))).not.toMatch(/[._]/);
    expect(fs.existsSync(target)).toBe(true);
    expect(read(target)).toContain(FAF_START);
  });

  test('Claude\'s notes — a quoted old heading, CRLF, a BOM — stay byte for byte; "kept" is said after a read-back', async () => {
    const dir = sandbox('tri-notes');
    fs.writeFileSync(path.join(dir, 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: notes-app\n  goal: keep the notes\n');
    const target = memoryFor(dir);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    const NOTES = [
      '\uFEFF# My notes',
      '',
      'NOTE-A1: how the old section looked:',
      '```',
      '# Project Context (from project.faf)',
      '*This section is managed by tri-sync. Claude\'s own notes below are preserved.*',
      '```',
      'NOTE-A2: keep me.',
      '',
    ].join('\r\n');
    fs.writeFileSync(target, NOTES);
    const r = await handler().callTool('faf_tri_sync', { path: dir });
    expect(r.isError).toBeFalsy();
    const out = read(target);
    expect(out).toContain(FAF_START);
    expect(out.endsWith(NOTES.slice(1))).toBe(true);
    expect(out.startsWith('\uFEFF')).toBe(true);
    expect(text(r)).toContain('read back and checked');
  });
});

// ─────────────────────────────────────────────── #23 / Q9 faf_setup
describe('#23 / Q9 — faf_setup touches only its own entry in the project settings', () => {
  const settingsOf = (dir: string): string => path.join(dir, '.claude', 'settings.json');
  function writeSettings(dir: string, body: string): string {
    fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
    fs.writeFileSync(settingsOf(dir), body);
    return body;
  }

  test('remove takes out only the exact faf hook; a user hook that mentions the command stays; messages name the scope', async () => {
    const dir = sandbox('setup-wrapper');
    const WRAPPER = './scripts/warm-cache.sh && npx claude-faf-mcp --session-refresh >> .cache/log';
    writeSettings(dir, JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: 'command', command: WRAPPER }] }] } }, null, 2) + '\n');
    const inst = await setupSessionHook(dir, { confirm: true });
    expect(inst.action).toBe('installed');
    expect(inst.message).toContain('project settings');
    const rm = await setupSessionHook(dir, { remove: true, confirm: true });
    expect(rm.action).toBe('removed');
    expect(rm.message).toContain('project settings');
    const cmds = JSON.parse(read(settingsOf(dir))).hooks.SessionStart.flatMap((m: any) => m.hooks.map((h: any) => h.command));
    expect(cmds).toEqual([WRAPPER]);
  });

  test('remove without confirm is a preview: nothing is written', async () => {
    const dir = sandbox('setup-remove-preview');
    const body = writeSettings(dir, JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: 'command', command: HOOK_COMMAND }] }] } }, null, 2) + '\n');
    const r = await setupSessionHook(dir, { remove: true });
    expect(r.action).toBe('preview');
    expect(read(settingsOf(dir))).toBe(body);
  });

  test('install refuses a string `hooks` and an object SessionStart instead of replacing them', async () => {
    for (const settings of [{ hooks: 'see-hooks.json' }, { hooks: { SessionStart: { hooks: [{ type: 'command', command: 'USER-OBJ-HOOK' }] } } }]) {
      const dir = sandbox('setup-shape');
      const body = writeSettings(dir, JSON.stringify(settings, null, 2) + '\n');
      const r = await setupSessionHook(dir, { confirm: true });
      expect(r.action).toBe('error');
      expect(r.message).toContain(HOOK_COMMAND); // the entry to add by hand
      expect(read(settingsOf(dir))).toBe(body);
    }
  });

  test('a settings.json in another layout is left byte for byte (the entry is given to add by hand)', async () => {
    const dir = sandbox('setup-layout');
    const body = writeSettings(dir, '{\n    "permissions": { "allow": ["Bash(ls)"] },\n    "model": "opus"\n}\n');
    const r = await setupSessionHook(dir, { confirm: true });
    expect(r.action).toBe('error');
    expect(r.message).toContain(HOOK_COMMAND);
    expect(read(settingsOf(dir))).toBe(body);
  });

  test('a settings.json that links out of the project is never written', async () => {
    const outside = sandbox('setup-out');
    const target = path.join(outside, 'settings.json');
    const body = '{}\n';
    fs.writeFileSync(target, body);
    const dir = sandbox('setup-link');
    fs.mkdirSync(path.join(dir, '.claude'));
    fs.symlinkSync(target, settingsOf(dir));
    const r = await setupSessionHook(dir, { confirm: true });
    expect(r.action).toBe('error');
    expect(read(target)).toBe(body);
  });
});

// ─────────────────────────────────────────────── #40 faf_auto per-file outcome
describe('#40 — faf_auto reports each file\'s outcome', () => {
  test('a CLAUDE.md that cannot be written is named, and so is the project.faf that was', async () => {
    if (process.getuid?.() === 0) {return;}
    const dir = sandbox('auto-ro');
    writeRepo(dir);
    const md = path.join(dir, 'CLAUDE.md');
    fs.writeFileSync(md, '# my rules\n');
    fs.chmodSync(md, 0o444);
    try {
      const r = await handler().callTool('faf_auto', { path: dir });
      expect(text(r)).toMatch(/^project\.faf created; CLAUDE\.md not written: /);
      expect(text(r)).toContain('original kept');
      expect(fs.existsSync(path.join(dir, 'project.faf'))).toBe(true);
      expect(read(md)).toBe('# my rules\n');
    } finally {
      fs.chmodSync(md, 0o644);
    }
  });
});

// ─────────────────────────────────────────────── Q9 / #11 home refusal
describe('Q9 / #11 — the home folder: faf_setup and faf_quick write nothing', () => {
  test('faf_setup {path: HOME} names the user settings and refuses; faf_quick {path: HOME} refuses (HOME = mkdtemp)', () => {
    const home = sandbox('home');
    fs.writeFileSync(path.join(home, 'CLAUDE.md'), '# global rules\n');
    const before = snapshot(home);
    const script = path.join(sandbox('home-script'), 'probe.ts');
    fs.writeFileSync(script, [
      `import { FafToolHandler } from ${JSON.stringify(path.join(ROOT, 'src/handlers/tools.ts'))};`,
      `import { FafEngineAdapter } from ${JSON.stringify(path.join(ROOT, 'src/handlers/engine-adapter.ts'))};`,
      'const handler = new FafToolHandler(new FafEngineAdapter("native"));',
      'const out: Record<string, { isError: boolean; text: string }> = {};',
      'for (const [key, name, args] of [',
      '  ["setup", "faf_setup", { path: process.env.HOME, confirm: true }],',
      '  ["quick", "faf_quick", { path: process.env.HOME, input: "home-app, a goal" }],',
      '] as const) {',
      '  const r: any = await handler.callTool(name, args as any);',
      '  out[key] = { isError: !!r.isError, text: r.content?.[0]?.text ?? "" };',
      '}',
      'console.log(JSON.stringify(out));',
    ].join('\n'));
    const env: Record<string, string> = { ...(process.env as Record<string, string>), HOME: home, BUN_RUNTIME_TRANSPILER_CACHE_PATH: '0' };
    delete env.FAF_WORKING_DIR;
    delete env.MCP_WORKING_DIR;
    delete env.CLAUDE_CONFIG_DIR;
    const run = Bun.spawnSync([process.execPath, script], { cwd: home, env, stdout: 'pipe', stderr: 'pipe' });
    expect(run.exitCode).toBe(0);
    const lines = run.stdout.toString().trim().split('\n');
    const out = JSON.parse(lines[lines.length - 1]) as Record<string, { isError: boolean; text: string }>;
    expect(out.setup.isError).toBe(true);
    expect(out.setup.text).toContain('user settings');
    expect(out.quick.isError).toBe(true);
    expect(snapshot(home)).toEqual(before);
  });
});
