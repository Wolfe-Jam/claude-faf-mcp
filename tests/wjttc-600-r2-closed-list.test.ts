/**
 * 🏁 WJTTC 6.0.0 — round 2, the closed list (2026-09-12)
 *
 *   R2-1  the typed-None rule is stated as faf_auto runs it: in a tech slot the
 *         app-type uses, only a repo fact replaces it; in one the app-type
 *         leaves out, faf_auto writes slotignored; a 6W keeps its words
 *   R2-2  faf_go names faf_auto only for what faf_auto's dry run would fill;
 *         otherwise it names the slots still empty and takes them as answers
 *   R2-3  manifest.json's long description names only the Core a default
 *         install lists
 *   R2-4  mcpaas.live/claude is MCPaaS, a separate server, never this server's
 *         endpoint
 *   R2-5  faf_auto and faf_etch are destructive (tests/wjttc-600-tool-schema-truth.test.ts)
 *   R2-6  faf_go's JSON: an unknown score is null, never -1
 *   R2-7  npm test gives each run its own TMPDIR and fails on anything left there
 *   R2-8  faf-cli ^7.13.1; no reply calls a slotignored slot N/A
 *
 * Every folder is a mkdtemp, removed in afterAll; HOME and CLAUDE_CONFIG_DIR
 * are temp folders.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { parse } from 'yaml';
import { ClaudeFafMcpServer } from '../src/server.js';
import { FafPromptHandler } from '../src/handlers/prompts.js';
import { bundledFafCliVersion } from '../src/utils/faf-cli-version.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

type R = { isError?: boolean; content: Array<{ type: string; text?: string }>; structuredContent?: any };

const ROOT = path.join(import.meta.dir, '..');
const read = (p: string): string => fs.readFileSync(p, 'utf-8');
const text = (r: R): string => r.content?.map((c) => c.text ?? '').join('\n') ?? '';

const tmpRoots: string[] = [];
const saved: Record<string, string | undefined> = {};
function tmp(prefix: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(d);
  return d;
}
/** A project folder one level below a fresh temp folder (no .faf above it). */
function project(files: Record<string, string>): string {
  const dir = path.join(tmp('cfm-r2-'), 'app');
  fs.mkdirSync(dir);
  for (const [f, body] of Object.entries(files)) {fs.writeFileSync(path.join(dir, f), body);}
  return dir;
}

/** An Express repo: no file in it says where the app runs. */
const EXPRESS_PKG = JSON.stringify({ name: 'shop-api', description: 'An API for the shop', dependencies: { express: '^4.19.0' } });

/** An About repo with no source_score: faf-cli's score is unknown. */
const ABOUT_NOSRC = `faf_version: "3.0"
project:
  name: about-me
about:
  represents: acme/private-core
`;

let client: Client;
let server: ClaudeFafMcpServer;

beforeAll(async () => {
  for (const k of ['FAF_TOOLS', 'FAF_EXTENDED', 'HOME', 'CLAUDE_CONFIG_DIR', 'FAF_WORKING_DIR']) {saved[k] = process.env[k];}
  delete process.env.FAF_TOOLS;
  delete process.env.FAF_EXTENDED;
  process.env.HOME = tmp('cfm-r2-home-');
  process.env.CLAUDE_CONFIG_DIR = tmp('cfm-r2-claude-');
  process.env.FAF_WORKING_DIR = project({ 'project.faf': ABOUT_NOSRC });
  server = new ClaudeFafMcpServer({ transport: 'stdio' } as any);
  const [c, s] = InMemoryTransport.createLinkedPair();
  await server.getServer().connect(s);
  client = new Client({ name: 'wjttc-r2', version: '1.0.0' }, { capabilities: {} });
  await client.connect(c);
});

afterAll(async () => {
  await client.close();
  await server.getServer().close();
  for (const d of tmpRoots) {fs.rmSync(d, { recursive: true, force: true });}
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) {delete process.env[k];} else {process.env[k] = v;}
  }
});

async function call(name: string, args: Record<string, unknown>): Promise<R> {
  return (await client.callTool({ name, arguments: args })) as R;
}

async function toolDescription(name: string): Promise<string> {
  return (await client.listTools()).tools.find((t) => t.name === name)?.description ?? '';
}

/** The CHANGELOG section for the work on this branch: [Unreleased] while it
 *  is unreleased, then the entry for the package version once it is stamped. */
/** The CHANGELOG section for one released version (a claim stays with the release it shipped in). */
function section(version: string): string {
  const log = read(path.join(ROOT, 'CHANGELOG.md'));
  const start = log.indexOf(`## [${version}]`);
  const end = log.indexOf('\n## [', start + 1);
  return start < 0 ? '' : log.slice(start, end < 0 ? undefined : end);
}

function unreleased(): string {
  const log = read(path.join(ROOT, 'CHANGELOG.md'));
  const version = (JSON.parse(read(path.join(ROOT, 'package.json'))) as { version: string }).version;
  let start = log.indexOf('## [Unreleased]');
  if (start < 0) {start = log.indexOf(`## [${version}]`);}
  const end = log.indexOf('\n## [', start + 1);
  return log.slice(start, end < 0 ? undefined : end);
}

// ─────────────────────────────────────────────────────────────── R2-1
describe('R2-1 — the typed-None rule, stated as faf_auto runs it', () => {
  const TYPED = [
    'faf_version: "3.0"',
    'project:',
    '  name: typed-api',
    '  goal: An API for typed words',
    '  main_language: JavaScript',
    '  type: backend',
    'stack:',
    '  database: None',
    '  frontend: None',
    'human_context:',
    '  why: None',
    '',
  ].join('\n');

  test('faf_auto: None stays in a slot the app-type uses (no repo fact), becomes slotignored where it leaves the slot out, and stays in a 6W', async () => {
    const dir = project({ 'project.faf': TYPED, 'package.json': EXPRESS_PKG });
    const r = await call('faf_auto', { path: dir });
    expect(r.isError).toBeFalsy();
    const out = parse(read(path.join(dir, 'project.faf')));
    expect(out.stack.database).toBe('None');
    expect(out.stack.frontend).toBe('slotignored');
    expect(out.human_context.why).toBe('None');
    expect(text(r)).toContain('stack.frontend: "None" → "slotignored"');
  });

  test('faf_auto\'s description says what it does, in those words, and never N/A', async () => {
    const d = await toolDescription('faf_auto');
    expect(d).toContain('in a tech slot the app-type uses, only a repo fact replaces it (with no fact it stays as typed)');
    expect(d).toContain('in a tech slot the app-type leaves out, faf_auto writes slotignored');
    expect(d).toContain('in a 6W it stays as typed');
    expect(d).not.toContain('N/A');
  });

  test('the CHANGELOG line says the same; no surface shows slotignored as N/A', async () => {
    const line = section('6.0.0').split('\n').find((l) => l.startsWith('- faf_auto names every value')) ?? ''; // R2-1 shipped in 6.0.0
    expect(line).toContain('only a repo fact replaces it, and with no fact it stays as typed');
    expect(line).toContain('in a tech slot the app-type leaves out, faf_auto writes `slotignored`');
    expect(line).not.toContain('A hand-written None with no repo fact stays as typed.');
    const prev = process.env.FAF_TOOLS;
    process.env.FAF_TOOLS = 'all';
    let tools = '';
    try { tools = JSON.stringify((await client.listTools()).tools); } finally {
      if (prev === undefined) {delete process.env.FAF_TOOLS;} else {process.env.FAF_TOOLS = prev;}
    }
    const surfaces: Array<[string, string]> = [
      ['CHANGELOG [Unreleased]', unreleased()],
      ['README.md', read(path.join(ROOT, 'README.md'))],
      ['PRIVACY.md', read(path.join(ROOT, 'PRIVACY.md'))],
      ['tools/list', tools],
    ];
    const hits = surfaces.filter(([, t]) => /shown as N\/A|N\/A slot|slotignored \(N\/A\)/i.test(t)).map(([f]) => f);
    expect(hits).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────── R2-2
describe('R2-2 — faf_go never sends the agent back to a faf_auto with nothing left to write', () => {
  test('an Express repo faf_auto cannot fill hosting for: faf_go names stack.hosting as an answer, never faf_auto', async () => {
    const dir = project({ 'package.json': EXPRESS_PKG });
    const fafPath = path.join(dir, 'project.faf');
    expect((await call('faf_auto', { path: dir })).isError).toBeFalsy();
    const filled = read(fafPath);
    expect(parse(filled).stack?.hosting ?? '').toBe('');
    // faf_auto has nothing left to write: its dry run is empty, and a second run
    // leaves the file byte for byte.
    const dry = (await call('faf_formats', { path: dir, json: true })).structuredContent;
    expect(dry.wouldFill).toEqual({});
    expect(dry.wouldIgnore).toEqual([]);
    await call('faf_auto', { path: dir });
    expect(read(fafPath)).toBe(filled);

    const go = await call('faf_go', { path: dir });
    const data = JSON.parse(text(go));
    expect(data.complete).toBe(false);
    expect(data.status).toBe('needs-human');
    expect(data.sourceable).toBeUndefined();
    expect(text(go)).not.toContain('run faf_auto');
    expect(data.next).toContain('no fact in repo for');
    expect(data.next).not.toContain('faf_auto writes');
    expect(data.next).toContain('"stack.hosting": "…"');
    expect(data.next).toContain('faf_go takes them');
    expect(data.needsAnswer).toContain('stack.hosting');

    // faf_go takes the answer, and still names no faf_auto.
    const answered = await call('faf_go', { path: dir, answers: { 'stack.hosting': 'Fly.io' } });
    expect(answered.isError).toBeFalsy();
    expect(parse(read(fafPath)).stack.hosting).toBe('Fly.io');
    expect(text(answered)).not.toContain('run faf_auto');
    expect(text(answered)).not.toContain('"stack.hosting"');
  });

  test('with no project.faf, faf_go runs faf_auto itself and then does not send the agent back to it', async () => {
    const dir = project({ 'package.json': EXPRESS_PKG });
    const data = JSON.parse(text(await call('faf_go', { path: dir })));
    expect(data.bootstrap?.created).toBe(true);
    expect(data.next).not.toContain('run faf_auto');
    expect(data.next).toContain('stack.hosting');
  });

  test('when faf_auto would fill slots, faf_go names faf_auto for exactly the slots its dry run writes', async () => {
    const dir = project({
      'project.faf': 'faf_version: "3.0"\nproject:\n  name: shop-api\n  goal: An API for the shop\n',
      'package.json': EXPRESS_PKG,
    });
    const dry = (await call('faf_formats', { path: dir, json: true })).structuredContent;
    const data = JSON.parse(text(await call('faf_go', { path: dir })));
    expect(data.status).toBe('can-source');
    expect(data.next).toContain('fact from repo for');
    expect(data.next).toContain('faf_auto writes');
    expect(data.sourceable.length).toBeGreaterThan(0);
    const writes = new Set([...Object.keys(dry.wouldFill), ...dry.wouldIgnore]);
    expect(data.sourceable.filter((slot: string) => !writes.has(slot))).toEqual([]);
  });

  test('faf_go\'s description and the faf prompt say the same', async () => {
    const d = await toolDescription('faf_go');
    expect(d).not.toContain('then run faf_auto');
    expect(d).toContain('fact from repo');
    const prompt = new FafPromptHandler().getPrompt('faf').messages[0].content.text;
    expect(prompt).not.toContain('run `faf_auto` again then');
    expect(prompt).toContain('only when faf_auto\'s dry run would still fill a slot');
  });
});

// ─────────────────────────────────────────────────────────────── R2-3
describe('R2-3 — the manifest\'s long description names only what a default install lists', () => {
  test('every tool it names is on the default tools/list; no faf_git line, no GitHub-repo example, no README 6Ws line', async () => {
    const m = JSON.parse(read(path.join(ROOT, 'manifest.json')));
    const listed = new Set((await client.listTools()).tools.map((t) => t.name));
    const named = [...new Set((String(m.long_description).match(/\bfaf_[a-z_]+\b/g) ?? []) as string[])];
    expect(named.filter((n) => !listed.has(n))).toEqual([]);
    expect(m.long_description).not.toMatch(/GitHub repo|github\.com\/user\/repo/i);
    expect(m.long_description).not.toMatch(/6Ws from your README/i);
  });
});

// ─────────────────────────────────────────────────────────────── R2-4
describe('R2-4 — mcpaas.live/claude is MCPaaS, a separate server, never this server\'s endpoint', () => {
  test('the README Quick Start, smithery.yaml, the landing page and PRIVACY name it only as MCPaaS, a separate server', () => {
    const readme = read(path.join(ROOT, 'README.md'));
    const start = readme.indexOf('## Quick Start');
    const quick = readme.slice(start, readme.indexOf('\n## ', start + 1));
    const surfaces: Array<[string, string]> = [
      ['README Quick Start', quick],
      ['smithery.yaml', read(path.join(ROOT, 'smithery.yaml'))],
      ['public/index.html', read(path.join(ROOT, 'public', 'index.html'))],
      ['PRIVACY.md', read(path.join(ROOT, 'PRIVACY.md'))],
    ];
    const hits: string[] = [];
    for (const [name, t] of surfaces) {
      for (const line of t.split('\n')) {
        if (line.includes('mcpaas.live/claude') && !(line.includes('MCPaaS') && line.includes('separate'))) {hits.push(`${name}: ${line.trim()}`);}
      }
    }
    expect(hits).toEqual([]);
  });

  test('agent.fafa lists only this server\'s own endpoint (stdio)', () => {
    const card = parse(read(path.join(ROOT, 'agent.fafa')));
    expect(card.endpoints.map((e: { transport: string }) => e.transport)).toEqual(['stdio']);
    expect(read(path.join(ROOT, 'agent.fafa'))).not.toContain('mcpaas.live');
  });
});

// ─────────────────────────────────────────────────────────────── R2-6
describe('R2-6 — faf_go\'s JSON: an unknown score is null, never -1', () => {
  test('an About repo with no about.source_score: score and currentScore are null, scoreText is "unknown (—)"', async () => {
    const r = await call('faf_go', { path: project({ 'project.faf': ABOUT_NOSRC }) });
    const data = JSON.parse(text(r));
    expect(data.unknown).toBe(true);
    expect(data.score).toBeNull();
    expect(data.currentScore).toBeNull();
    expect(data.scoreText).toBe('unknown (—)');
    expect(text(r)).not.toMatch(/"(score|currentScore)": -1/);
  });

  test('the same when the Table-of-8 is answered', async () => {
    const eight = ABOUT_NOSRC.replace('  name: about-me\n', '  name: about-me\n  goal: The public face of a private core\n') +
      'human_context:\n  who: a team\n  what: a card\n  why: to point at the core\n  where: GitHub\n  when: now\n  how: by hand\n';
    const data = JSON.parse(text(await call('faf_go', { path: project({ 'project.faf': eight }) })));
    expect(data.unknown).toBe(true);
    expect(data.score).toBeNull();
    expect(data.scoreText).toBe('unknown (—)');
  });
});

// ─────────────────────────────────────────────────────────────── R2-7
describe('R2-7 — npm test gives each run its own TMPDIR and fails on anything left there', () => {
  const wrapper = path.join(ROOT, 'scripts', 'hermetic-test.mjs');
  /** Run `node <script>` under scripts/hermetic-test.mjs. */
  function wrapped(script: string): ReturnType<typeof spawnSync> {
    const file = path.join(tmp('cfm-r2-wrap-'), 'child.cjs');
    fs.writeFileSync(file, script);
    return spawnSync('node', [wrapper, 'node', file], { cwd: ROOT, encoding: 'utf-8', timeout: 60_000 });
  }

  test('a run gets a new temp folder as os.tmpdir(), TMP and TEMP, removed afterwards', () => {
    const r = wrapped('const os = require("os"); console.log(JSON.stringify({ tmpdir: os.tmpdir(), TMP: process.env.TMP, TEMP: process.env.TEMP }));\n');
    expect(r.status).toBe(0);
    const seen = JSON.parse(String(r.stdout).trim().split('\n').pop() as string);
    expect(path.basename(seen.tmpdir)).toStartWith('cfm-test-tmp-');
    expect(path.resolve(seen.tmpdir)).not.toBe(path.resolve(os.tmpdir()));
    expect(path.resolve(seen.TMP)).toBe(path.resolve(seen.tmpdir));
    expect(path.resolve(seen.TEMP)).toBe(path.resolve(seen.tmpdir));
    expect(fs.existsSync(seen.tmpdir)).toBe(false);
  });

  test('a file or an empty folder left in that temp folder fails the run and is named', () => {
    const r = wrapped('const fs = require("fs"), os = require("os"), path = require("path");\n' +
      'fs.writeFileSync(path.join(os.tmpdir(), "left-behind.txt"), "x");\n' +
      'fs.mkdirSync(path.join(os.tmpdir(), "left-empty"));\n');
    expect(r.status).toBe(1);
    expect(String(r.stderr)).toContain('left 2 path(s) in its temp folder');
    expect(String(r.stderr)).toContain('left-behind.txt');
    expect(String(r.stderr)).toContain('left-empty/');
  });

  test('tests/copilot-grade.test.ts leaves nothing in the run\'s temp folder', () => {
    const r = spawnSync('node', [wrapper, process.execPath, 'test', 'tests/copilot-grade.test.ts'], { cwd: ROOT, encoding: 'utf-8', timeout: 120_000 });
    expect(String(r.stderr)).not.toContain('in its temp folder');
    expect(r.status).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────── R2-8
describe('R2-8 — faf-cli ^8.0.0 (always-33); no reply calls a slotignored slot N/A', () => {
  test('package.json pins faf-cli ^8.0.0, and the faf-cli installed is 8.0.0 or later', () => {
    const pkg = JSON.parse(read(path.join(ROOT, 'package.json')));
    expect(pkg.dependencies['faf-cli']).toBe('^8.0.0');
    const [major] = String(bundledFafCliVersion()).split('.').map((n) => parseInt(n, 10));
    expect(major).toBe(8); // ^8.0.0 — the always-33 engine
  });

  test('faf_score, faf_check, faf_doctor, faf_go, faf_formats and faf_auto say slotignored, never N/A', async () => {
    const faf = [
      'faf_version: "3.0"',
      'project:',
      '  name: shop-api',
      '  goal: An API for the shop',
      '  main_language: JavaScript',
      '  type: backend',
      'stack:',
      '  frontend: slotignored',
      '  css_framework: slotignored',
      '  backend: Express',
      '',
    ].join('\n');
    const dir = project({ 'project.faf': faf, 'package.json': EXPRESS_PKG });
    const replies: string[] = [];
    for (const [name, args] of [
      ['faf_score', { path: dir, details: true }], ['faf_check', { path: dir }], ['faf_doctor', { path: dir }],
      ['faf_go', { path: dir }], ['faf_formats', { path: dir }], ['faf_auto', { path: dir }],
    ] as Array<[string, Record<string, unknown>]>) {
      const r = await call(name, args);
      expect(r.isError).toBeFalsy();
      replies.push(`${text(r)}\n${JSON.stringify(r.structuredContent ?? {})}`);
    }
    expect(replies.join('\n')).toContain('slotignored');
    expect(replies.filter((t) => t.includes('N/A'))).toEqual([]);
  });
});

// ─────────────────────────────────────────────── R2 follow-up: "fact from repo"
describe('fact from repo — every empty slot says what fills it, from faf_auto\'s own dry run', () => {
  test('faf_doctor and faf_score (details) label each empty slot; "faf_auto fills" appears nowhere', async () => {
    const dir = project({
      'project.faf': 'faf_version: "3.0"\nproject:\n  name: shop-api\n  goal: An API for the shop\n  type: backend\n',
      'package.json': EXPRESS_PKG,
    });
    const doctor = text(await call('faf_doctor', { path: dir }));
    const score = text(await call('faf_score', { path: dir, details: true }));
    for (const out of [doctor, score]) {
      expect(out).toContain('Empty slots:');
      expect(out).toMatch(/stack\.backend — fact from repo: Express/);
      expect(out).toMatch(/stack\.hosting — no fact in repo: answer it \(faf_go\)/);
      expect(out).toMatch(/human_context\.\w+ — yours: faf_go asks/);
      expect(out).toMatch(/faf_auto writes the \d+ facts? from repo/);
      expect(out).not.toContain('faf_auto fills');
    }
  });

  test('when the repo holds no fact for any empty slot, no line names faf_auto', async () => {
    const dir = project({ 'package.json': EXPRESS_PKG });
    await call('faf_auto', { path: dir });
    const doctor = text(await call('faf_doctor', { path: dir }));
    expect(doctor).toMatch(/stack\.hosting — no fact in repo/);
    expect(doctor).not.toMatch(/faf_auto writes the \d+ fact/);
  });

  test('a repo faf could not classify (type library, fallback): faf_go never sends the agent back to faf_auto', async () => {
    const dir = project({
      'project.faf': 'faf_version: "3.0"\nproject:\n  name: hand\n  goal: A hand-kept project\nstack:\n  frontend: React\n  backend: None\n',
    });
    await call('faf_auto', { path: dir });
    const after = read(path.join(dir, 'project.faf'));
    expect(after).toContain('# found: no classifying signals');
    const go = JSON.parse(text(await call('faf_go', { path: dir })));
    expect(go.status).toBe('needs-human');
    expect(go.next).not.toContain('faf_auto writes');
    // and faf_auto indeed has nothing to write: the file stays byte for byte
    await call('faf_auto', { path: dir });
    expect(read(path.join(dir, 'project.faf'))).toBe(after);
    const again = JSON.parse(text(await call('faf_go', { path: dir })));
    expect(again.status).toBe('needs-human');
  });
});
