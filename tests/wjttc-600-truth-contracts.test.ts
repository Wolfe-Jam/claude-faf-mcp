/**
 * 🏁 WJTTC 6.0.0 — W3: one score, faf-cli's renders, true tool contracts, Core 14
 *
 * Audit findings (AUDIT-claude-faf-mcp-6.0.md):
 *   #31 #65      one scorer: faf_go, faf_doctor and the heartbeat report scoreFafYaml;
 *                faf_score prints populated/active
 *   #32 #47 #48  validateFaf on faf_trust and faf_doctor; "unknown (—)" for -1;
 *                the receipt's subject is the project
 *   #46          ✪ only at 100
 *   #66          the faf-parity/v1 claim is true (claude-faf-mcp's own spec)
 *   #24          faf_check = validateFaf + the scorer's slot states
 *   #33          the exports are faf-cli's renders
 *   #34          no `faf` on PATH is ever run; the resources and faf_debug use the bundled faf-cli
 *   #35 #69      Core 14; prompts faf / faf-bench; every named tool is listed
 *   #49 #50      descriptions and annotations say what the handlers do
 *   #51 #67 #68  arguments checked against the schema; failures are isError;
 *                -32602 / -32002; no file:// resource; no listChanged
 *   #70 #71      faf_sync names a file it could not write; MCP advice, not CLI syntax
 *
 * Every folder is a mkdtemp; HOME and CLAUDE_CONFIG_DIR are temp folders.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { stringify } from 'yaml';
import { ClaudeFafMcpServer } from '../src/server.js';
import { FafToolHandler } from '../src/handlers/tools.js';
import { FafEngineAdapter } from '../src/handlers/engine-adapter.js';
import { FafPromptHandler } from '../src/handlers/prompts.js';
import { sessionRefresh } from '../src/faf-core/commands/session-refresh.js';
import { quietText } from '../src/utils/sanitize-output.js';
import { fafCli } from '../src/utils/faf-cli-bridge.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

type R = { isError?: boolean; content: Array<{ type: string; text?: string }>; structuredContent?: any; _meta?: any; metadata?: any };

const ROOT = path.join(import.meta.dir, '..');
const CORE_14 = [
  'faf_init', 'faf_auto', 'faf_go', 'faf_bench', 'faf_score', 'faf_doctor', 'faf_sync',
  'faf_context', 'faf_trust', 'faf_about', 'faf_etch', 'faf_recall', 'faf_setup', 'faf_tri_sync',
];

const tmpRoots: string[] = [];
const saved: Record<string, string | undefined> = {};
function tmp(prefix: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(d);
  return d;
}
/** A project folder (one level below a fresh temp folder, so no .faf above it). */
function dirWith(faf: string | null, extra: Record<string, string> = {}): string {
  const dir = path.join(tmp('cfm-w3-'), 'app');
  fs.mkdirSync(dir);
  if (faf !== null) {fs.writeFileSync(path.join(dir, 'project.faf'), faf);}
  for (const [f, body] of Object.entries(extra)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), body);
  }
  return dir;
}
const text = (r: R): string => r.content?.map((c) => c.text ?? '').join('\n') ?? '';
const read = (p: string): string => fs.readFileSync(p, 'utf-8');
const handler = (dir?: string): FafToolHandler => {
  const e = new FafEngineAdapter();
  if (dir) {e.setWorkingDirectory(dir);}
  return new FafToolHandler(e);
};

/** A .faf faf-cli scores below 100 (stack empty, 6Ws partly), valid. */
const PARTIAL = `faf_version: "3.0"
project:
  name: shop-api
  goal: An API for the shop
  main_language: TypeScript
stack:
  backend: Express
human_context:
  who: The shop team
  what: Orders and carts
`;
/** A .faf faf-cli scores 100. */
const TROPHY = `faf_version: "3.0"
project:
  name: champion
  goal: Win the cup
  main_language: TypeScript
human_context:
  who: a team
  what: a cli
  why: to win
  where: npm
  when: now
  how: with tests
stack:
  frontend: slotignored
  css_framework: slotignored
  ui_library: slotignored
  state_management: slotignored
  backend: Node.js
  api_type: cli
  runtime: Node.js
  database: slotignored
  connection: slotignored
  hosting: local
  build: tsc
  cicd: GitHub Actions
`;
/** The Table-of-8 filled, the stack empty: faf-cli scores it well below 100. */
const EIGHT_FILLED = `faf_version: "3.0"
project:
  name: eight
  goal: Everything a person can say
  main_language: TypeScript
human_context:
  who: Developers
  what: A service
  why: Because
  where: Cloud
  when: v1
  how: Carefully
stack:
  backend: Express
`;
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
  process.env.HOME = tmp('cfm-w3-home-');
  process.env.CLAUDE_CONFIG_DIR = tmp('cfm-w3-claude-');
  process.env.FAF_WORKING_DIR = dirWith(PARTIAL);
  server = new ClaudeFafMcpServer({ transport: 'stdio' } as any);
  const [c, s] = InMemoryTransport.createLinkedPair();
  await server.getServer().connect(s);
  client = new Client({ name: 'wjttc-w3', version: '1.0.0' }, { capabilities: {} });
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

// ─────────────────────────────────────────────────────────────── #31 #65
describe('#31 / #65 — one score: faf-cli\'s scoreFafYaml everywhere', () => {
  test('faf_go on a filled Table-of-8 reports faf-cli\'s score, is not complete, and points to faf_auto', async () => {
    const dir = dirWith(EIGHT_FILLED, { 'package.json': JSON.stringify({ name: 'eight', dependencies: { express: '^4' } }) });
    const { scoreFafYaml } = await fafCli;
    const truth = scoreFafYaml(EIGHT_FILLED).score;
    expect(truth).toBeLessThan(100);
    const r = await call('faf_go', { path: dir });
    const data = JSON.parse(text(r));
    expect(data.complete).toBe(false);
    expect(data.score).toBe(truth);
    expect(data.status).toBe('can-source');
    expect(data.message).toContain(`Stopped at ${truth}%`);
    expect(data.message).toContain('faf_auto');
    expect(text(r)).not.toMatch(/GOLD CODE|100% AI-Readiness|✪/);
  });

  test('faf_go answers end on faf-cli\'s score and a "Stopped at" line below 100, never ✪', async () => {
    const dir = dirWith(PARTIAL);
    const r = await call('faf_go', { path: dir, answers: { 'human_context.why': 'Because shops need APIs' } });
    const { scoreFafYaml } = await fafCli;
    const truth = scoreFafYaml(read(path.join(dir, 'project.faf'))).score;
    expect(text(r)).toContain(`Score: ${truth}% (faf-cli)`);
    expect(text(r)).toContain(`Stopped at ${truth}%`);
    expect(text(r)).not.toContain('✪');
  });

  test('faf_go on a .faf faf-cli scores 100 is complete, with ✪', async () => {
    const r = await call('faf_go', { path: dirWith(TROPHY) });
    const data = JSON.parse(text(r));
    expect(data.complete).toBe(true);
    expect(data.score).toBe(100);
    expect(data.message).toContain('✪ 100%');
  });

  test('faf_doctor\'s score is faf_score\'s score', async () => {
    const dir = dirWith(PARTIAL);
    const score = (await call('faf_score', { path: dir })).structuredContent.score;
    const doctor = await call('faf_doctor', { path: dir });
    expect(doctor.structuredContent.score).toBe(score);
    expect(text(doctor)).toContain(`Score: ${score}%`);
    expect(text(doctor)).not.toMatch(/Target 70|championship|Perfect health/i);
  });

  test('faf_score prints populated/active slots, as faf-cli and faf_init do', async () => {
    const r = await call('faf_score', { path: dirWith(TROPHY) });
    const sc = r.structuredContent;
    expect(sc.active).toBeLessThan(sc.total);
    expect(text(r)).toContain(`${sc.populated}/${sc.active} slots populated`);
    expect(text(r)).not.toContain(`/${sc.total} slots populated`);
  });

  test('the heartbeat counts intent from the scorer: placeholders and a typed None are not intent', async () => {
    const dir = dirWith(`faf_version: "3.0"
project:
  name: hb
  goal: describe your project goal
human_context:
  who: development teams
  what: None
  why: A real reason
  where: n/a
  when: unknown
  how: null
`);
    const r = await sessionRefresh(dir);
    expect(r.message).toContain("+1 intent the code can't carry");
  });

  test('the `faf` steps run faf_auto for an existing project.faf too, and name the project from the .faf', async () => {
    const dir = dirWith(PARTIAL);
    const r = await handler(dir).callTool('faf', { path: dir });
    expect(text(r)).toContain('shop-api');
    expect(text(r)).toMatch(/1\. faf_auto/);
    expect(text(r)).not.toContain('create with faf_auto if not');
  });
});

// ─────────────────────────────────────────────────────── #32 #47 #48
describe('#32 / #47 / #48 — validateFaf, unknown scores, the receipt\'s subject', () => {
  for (const [label, body] of [['a list', '- a\n- b\n'], ['a scalar', 'hello world\n'], ['a file without faf_version', 'project:\n  name: x\n  goal: y\n']] as const) {
    test(`faf_trust issues no receipt for ${label}`, async () => {
      const r = await call('faf_trust', { path: dirWith(body) });
      expect(r.isError).toBe(true);
      expect(r.structuredContent?.valid).toBe(false);
      expect(r.structuredContent?.receipt).toBeUndefined();
      expect(text(r)).not.toContain('FAF TRUST RECEIPT');
    });
  }

  test('faf_doctor names faf-cli\'s validateFaf errors and never calls such a file valid', async () => {
    const r = await call('faf_doctor', { path: dirWith('project:\n  name: x\n  goal: y\n') });
    expect(text(r)).toContain('Missing required field: faf_version');
    expect(text(r)).not.toContain('.faf structure is valid');
    expect(r.structuredContent.valid).toBe(false);
  });

  test('an About repo with no source_score is "unknown (—)" — never -1 — and gets no receipt', async () => {
    const dir = dirWith(ABOUT_NOSRC);
    const score = await call('faf_score', { path: dir });
    expect(text(score)).toContain('unknown (—)');
    expect(text(score)).not.toMatch(/-1\/100|-1%/);
    expect(score.structuredContent.unknown).toBe(true);
    const trust = await call('faf_trust', { path: dir });
    expect(trust.isError).toBe(true);
    expect(trust.structuredContent?.receipt).toBeUndefined();
    expect(text(trust)).not.toMatch(/-1\/100|-1%/);
    const hook = await sessionRefresh(dir);
    expect(hook.message).toContain('unknown (—)');
    expect(hook.message).not.toContain('-1%');
    const doctor = await call('faf_doctor', { path: dir });
    expect(text(doctor)).toContain('unknown (—)');
  });

  test('the receipt\'s subject is the project, not the server; the server is producedBy', async () => {
    const r = await call('faf_trust', { path: dirWith(TROPHY) });
    expect(r.isError).toBeFalsy();
    expect(r.structuredContent.receipt.subject).toBe('champion');
    expect(text(r)).toContain('FAF TRUST RECEIPT — champion');
    expect(r.structuredContent.parity.producedBy).toMatch(/^claude-faf-mcp@/);
  });
});

// ─────────────────────────────────────────────────────────────── #46
describe('#46 — ✪ appears only at 100', () => {
  test('quietText strips 🏆 and never turns it into ✪', () => {
    expect(quietText('🏆 GOLD CODE ACHIEVED!')).not.toContain('✪');
    expect(quietText('🏆 Perfect health!')).toBe('Perfect health!');
  });

  test('no tool output carries ✪ when faf_score is below 100; at 100, faf_score and faf_trust carry it', async () => {
    const dir = dirWith(PARTIAL, { 'package.json': JSON.stringify({ name: 'shop-api' }) });
    const { deriveQuestionSet } = await fafCli;
    const answers: Record<string, string> = {};
    for (const [n, a] of Object.entries(deriveQuestionSet(PARTIAL).answers)) {answers[n] = a as string;}
    const calls: Array<[string, Record<string, unknown>]> = [
      ['faf_score', { path: dir, details: true }], ['faf_doctor', { path: dir }], ['faf_trust', { path: dir }],
      ['faf_go', { path: dir }], ['faf_context', { path: dir, detail: true }], ['faf_about', {}],
      ['faf_bench', { path: dir, action: 'questions' }], ['faf_bench', { path: dir, action: 'grade', cold: {}, faf: answers }],
    ];
    const sealed: string[] = [];
    for (const [name, args] of calls) {
      if (text(await call(name, args)).includes('✪')) {sealed.push(name);}
    }
    expect((await call('faf_score', { path: dir })).structuredContent.score).toBeLessThan(100);
    expect(sealed).toEqual([]);

    const trophy = dirWith(TROPHY);
    expect(text(await call('faf_score', { path: trophy }))).toContain('✪ TROPHY');
    expect(text(await call('faf_trust', { path: trophy }))).toContain('✪ FAF TRUST RECEIPT');
  });
});

// ─────────────────────────────────────────────────────────────── #66
describe('#66 — the parity claim is true: faf-parity/v1 is claude-faf-mcp\'s own spec', () => {
  test('no tool, prompt or parity header claims any conformant engine reproduces the hash', async () => {
    const r = await call('faf_trust', { path: dirWith(TROPHY) });
    expect(text(r)).not.toMatch(/any conformant engine/i);
    expect(text(r)).toContain('faf-parity/v1');
    expect(text(r)).toContain('sha256(projection)');
    const all = JSON.stringify((await client.listTools()).tools);
    expect(all).not.toMatch(/any conformant|identical across any/i);
    const prompt = new FafPromptHandler().getPrompt('/faf').messages[0].content.text;
    expect(prompt).not.toMatch(/any engine reproduces/i);
    const header = read(path.join(ROOT, 'src', 'trust', 'parity.ts'));
    expect(header).not.toMatch(/all produce the IDENTICAL hash/);
  });
});

// ─────────────────────────────────────────────────────────────── #24
describe('#24 — faf_check is validateFaf plus the scorer\'s slot states, and writes nothing', () => {
  test('a Trophy file is valid with every 6W populated — no string-length "Quality: N%"', async () => {
    const dir = dirWith(TROPHY);
    const r = await call('faf_check', { path: dir });
    expect(r.structuredContent.valid).toBe(true);
    expect(r.structuredContent.humanContext).toEqual({ who: 'populated', what: 'populated', why: 'populated', where: 'populated', when: 'populated', how: 'populated' });
    expect(text(r)).not.toContain('Quality:');
    expect(read(path.join(dir, 'project.faf'))).toBe(TROPHY);
  });

  test('a long placeholder is an empty slot; a missing faf_version is invalid', async () => {
    const r = await call('faf_check', { path: dirWith('project:\n  name: p\nhuman_context:\n  who: development teams\n') });
    expect(r.structuredContent.valid).toBe(false);
    expect(r.structuredContent.errors).toContain('Missing required field: faf_version');
    expect(r.structuredContent.humanContext.who).toBe('empty');
  });
});

// ─────────────────────────────────────────────────────────────── #33
describe('#33 — the exports are faf-cli\'s renders', () => {
  test('faf_sync { all: true }: AGENTS.md, .cursorrules, GEMINI.md and copilot are faf-cli\'s bytes, with no slotignored values', async () => {
    const faf = stringify({
      faf_version: '3.0',
      project: { name: 'render-me', goal: 'Prove the renders', main_language: 'TypeScript' },
      stack: { backend: 'Express', frontend: 'slotignored', package_manager: 'slotignored', runtime: 'Node.js' },
      human_context: { who: 'devs', where: 'npm', how: 'npm test' },
    });
    const dir = dirWith(faf, { 'package.json': JSON.stringify({ name: 'render-me', scripts: { test: 'bun test' } }) });
    const r = await call('faf_sync', { path: dir, all: true });
    expect(r.isError).toBeFalsy();
    const { renderAgentsMd, renderCursorrules, renderGeminiMd, renderCopilotInstructions, enrichFromRepo, readFaf } = await fafCli;
    const data = readFaf(path.join(dir, 'project.faf'));
    const inside = (p: string, start = '<!-- faf:start -->', end = '<!-- faf:end -->'): string => {
      const t = read(path.join(dir, p));
      return t.slice(t.indexOf(start) + start.length, t.indexOf(end)).trim();
    };
    expect(inside('AGENTS.md')).toBe(renderAgentsMd(enrichFromRepo(dir, data)).trim());
    expect(inside('.cursorrules', '# faf:start', '# faf:end')).toBe(renderCursorrules(data).trim());
    expect(inside('GEMINI.md')).toBe(renderGeminiMd(enrichFromRepo(dir, data)).trim());
    expect(inside('.github/copilot-instructions.md')).toBe(renderCopilotInstructions(data).trim());
    for (const f of ['AGENTS.md', '.cursorrules', 'GEMINI.md', '.github/copilot-instructions.md']) {
      expect(read(path.join(dir, f))).not.toContain('slotignored');
    }
    expect(read(path.join(dir, 'AGENTS.md'))).not.toContain('Deployed:');
    expect(inside('GEMINI.md').split('\n').length).toBeGreaterThan(3);
  });
});

// ─────────────────────────────────────────────────────────────── #34
describe('#34 — no `faf` on PATH is ever run; the resources and faf_debug use the bundled faf-cli', () => {
  test('with a fake `faf` first on PATH, starting the server, reading both resources and faf_debug never run it', async () => {
    const bin = tmp('cfm-w3-bin-');
    const marker = path.join(bin, 'ran');
    fs.writeFileSync(path.join(bin, 'faf'), `#!/bin/sh\necho ran >> "${marker}"\necho '{"score": 12}'\n`, { mode: 0o755 });
    const prevPath = process.env.PATH;
    process.env.PATH = `${bin}${path.delimiter}${prevPath}`;
    try {
      const dir = dirWith(PARTIAL);
      process.env.FAF_WORKING_DIR = dir;
      const s = new ClaudeFafMcpServer({ transport: 'stdio' } as any);
      const [c, t] = InMemoryTransport.createLinkedPair();
      await s.getServer().connect(t);
      const cl = new Client({ name: 'w3-path', version: '1' }, { capabilities: {} });
      await cl.connect(c);
      const ctx = await cl.readResource({ uri: 'claude-faf://context' });
      const status = await cl.readResource({ uri: 'claude-faf://status' });
      const dbg = (await cl.callTool({ name: 'faf_debug', arguments: {} })) as R;
      const score = ((await cl.callTool({ name: 'faf_score', arguments: { path: dir } })) as R).structuredContent.score;
      await cl.close();
      await s.getServer().close();
      expect(fs.existsSync(marker)).toBe(false);
      expect(JSON.parse((ctx.contents[0] as any).text).score).toBe(score);
      expect((status.contents[0] as any).text).toContain(`FAF SCORE: ${score}/100`);
      const { version } = JSON.parse(read(path.join(ROOT, 'node_modules', 'faf-cli', 'package.json')));
      expect(text(dbg)).toContain(`faf-cli v${version}`);
      expect(text(dbg)).not.toContain('npm install -g faf-cli');
      expect(text(dbg)).not.toContain('FAF CLI Path');
    } finally {
      process.env.PATH = prevPath;
    }
  });

  test('the Mk3 CLI detector and the exec fallback are gone from the tree', () => {
    expect(fs.existsSync(path.join(ROOT, 'src', 'utils', 'cli-detector.ts'))).toBe(false);
    const adapter = read(path.join(ROOT, 'src', 'handlers', 'engine-adapter.ts'));
    expect(adapter).not.toMatch(/child_process|execAsync|getEnhancedEnv|REQUIRED FIRST/);
  });
});

// ─────────────────────────────────────────────────────── #35 #69
describe('#35 / #69 — Core 14, prompts without a slash, every named tool listed', () => {
  test('the default tools/list is the Core 14', async () => {
    const names = (await client.listTools()).tools.map((t) => t.name).sort();
    expect(names).toEqual([...CORE_14].sort());
  });

  test('every tool named in the prompts, the README onboarding and the manifest is in the default tools/list', async () => {
    const listed = new Set((await client.listTools()).tools.map((t) => t.name));
    const prompts = new FafPromptHandler();
    const promptText = prompts.listPrompts().prompts.map((p) => prompts.getPrompt(p.name).messages[0].content.text).join('\n');
    const readme = read(path.join(ROOT, 'README.md'));
    const onboarding = readme.slice(readme.indexOf('## Quick Start'), readme.indexOf('## Scoring'));
    const manifest = JSON.parse(read(path.join(ROOT, 'manifest.json')));
    const named = new Set([
      ...(promptText.match(/\bfaf_[a-z_]+\b/g) ?? []),
      ...(onboarding.match(/\bfaf_[a-z_]+\b/g) ?? []),
      ...(manifest.tools as Array<{ name: string }>).map((t) => t.name),
      ...(JSON.stringify(manifest.prompts ?? []).match(/\bfaf_[a-z_]+\b/g) ?? []),
    ]);
    expect(named.size).toBeGreaterThan(5);
    expect([...named].filter((n) => !listed.has(n))).toEqual([]);
    expect(CORE_14).toContain((manifest.tools as Array<{ name: string }>)[0].name); // led by a Core tool
  });

  test('prompts are faf and faf-bench (declared in the manifest too); /faf step 1 is faf_score', async () => {
    const { prompts } = await client.listPrompts();
    expect(prompts.map((p) => p.name).sort()).toEqual(['faf', 'faf-bench']);
    const manifest = JSON.parse(read(path.join(ROOT, 'manifest.json')));
    expect((manifest.prompts as Array<{ name: string }>).map((p) => p.name).sort()).toEqual(['faf', 'faf-bench']);
    const faf = await client.getPrompt({ name: 'faf' });
    const t = (faf.messages[0].content as { text: string }).text;
    expect(t).toMatch(/1\. \*\*Score\*\* — `faf_score`/);
    expect(t).not.toContain('faf_status');
    const bench = await client.getPrompt({ name: 'faf-bench' });
    expect((bench.messages[0].content as { text: string }).text).toContain('faf_context` { detail: true }');
  });

  test('faf_context { detail: true } returns the .faf\'s text', async () => {
    const dir = dirWith(PARTIAL);
    const r = await call('faf_context', { path: dir, detail: true });
    expect(r.structuredContent.content).toBe(PARTIAL);
    expect(text(r)).toContain('name: shop-api');
  });
});

// ─────────────────────────────────────────────────────── #49 #50
describe('#49 / #50 — descriptions and annotations say what the handlers do', () => {
  test('the descriptions promise nothing the handlers do not do', async () => {
    const prev = process.env.FAF_TOOLS;
    process.env.FAF_TOOLS = 'all';
    try {
      const tools = new Map((await client.listTools()).tools.map((t) => [t.name, t]));
      expect(tools.get('faf')!.description).toContain('Reads only');
      expect(tools.get('faf')!.annotations?.readOnlyHint).toBe(true);
      expect(tools.get('faf_about')!.description).not.toMatch(/bridges/i);
      expect(tools.get('faf_score')!.description).not.toMatch(/Mk4/);
      expect(tools.get('faf_status')!.description).toContain('first 20 lines');
      for (const w of ['who', 'what', 'why', 'where', 'when', 'how', 'goal', 'name']) {expect(tools.get('faf_go')!.description).toContain(w);}
      expect(tools.get('faf_init')!.annotations?.destructiveHint).toBe(true);
      expect(tools.get('faf_human_add')!.annotations?.title).not.toBe('Add Human Context');
      expect(tools.get('faf_conductor')!.annotations?.title).not.toBe('Sync Conductor');
    } finally {
      if (prev === undefined) {delete process.env.FAF_TOOLS;} else {process.env.FAF_TOOLS = prev;}
    }
  });

  test('faf_read puts its metadata in _meta, not a top-level metadata key', async () => {
    const dir = dirWith(PARTIAL);
    const r = (await handler(dir).callTool('faf_read', { path: path.join(dir, 'project.faf') })) as R;
    expect(r.metadata).toBeUndefined();
    expect(r._meta?.file_size).toBe(Buffer.byteLength(PARTIAL));
  });
});

// ─────────────────────────────────────────────────── #51 #67 #68
describe('#51 / #67 / #68 — arguments are checked; failures are isError; honest capabilities', () => {
  test('an action outside the enum is isError and runs no default write', async () => {
    const dir = dirWith(PARTIAL);
    const agents = await handler(dir).callTool('faf_agents', { path: dir, action: 'bogus' }) as R;
    expect(agents.isError).toBe(true);
    expect(text(agents)).toContain('"export", "sync"');
    expect(fs.existsSync(path.join(dir, 'AGENTS.md'))).toBe(false);
    const tri = await handler(dir).callTool('faf_tri_sync', { path: dir, action: 'bogus' }) as R;
    expect(tri.isError).toBe(true);
    expect(fs.readdirSync(process.env.CLAUDE_CONFIG_DIR as string)).toEqual([]);
  });

  test('an unknown argument, a missing required argument and a wrong type are isError', async () => {
    const dir = dirWith(PARTIAL);
    const h = handler(dir);
    const extra = await h.callTool('faf_score', { path: dir, detail: true }) as R;
    expect(extra.isError).toBe(true);
    expect(text(extra)).toContain('unknown argument detail');
    expect((await h.callTool('faf_list', {}) as R).isError).toBe(true);
    const badRead = await h.callTool('faf_read', { path: 5 }) as R;
    expect(badRead.isError).toBe(true);
    expect(text(badRead)).not.toContain('is not a function');
    const badEtch = await h.callTool('faf_etch', { path: dir, text: 42 }) as R;
    expect(badEtch.isError).toBe(true);
    expect(fs.existsSync(path.join(dir, 'soul.fafm'))).toBe(false);
  });

  test('faf_tri_sync on invalid YAML, or with no project.faf, is an isError result — not a JSON-RPC error', async () => {
    const bad = await call('faf_tri_sync', { path: dirWith('project: [unclosed\n') });
    expect(bad.isError).toBe(true);
    const none = await call('faf_tri_sync', { path: dirWith(null) });
    expect(none.isError).toBe(true);
  });

  test('unknown tool and prompt are -32602; an unknown resource is -32002', async () => {
    const codeOf = async (p: Promise<unknown>): Promise<number | undefined> => {
      try { await p; return undefined; } catch (e: any) { return e?.code; }
    };
    expect(await codeOf(client.callTool({ name: 'faf_nope', arguments: {} }))).toBe(-32602);
    expect(await codeOf(client.getPrompt({ name: 'nope' }))).toBe(-32602);
    expect(await codeOf(client.readResource({ uri: 'claude-faf://nope' }))).toBe(-32002);
  });

  test('no file:// resource is listed or answered; listChanged is not advertised', async () => {
    const { resources } = await client.listResources();
    expect(resources.map((r) => r.uri).sort()).toEqual(['claude-faf://context', 'claude-faf://status']);
    let refused = false;
    try { await client.readResource({ uri: 'file:///etc/passwd' }); } catch { refused = true; }
    expect(refused).toBe(true);
    const caps = client.getServerCapabilities();
    expect(caps?.tools?.listChanged).toBeFalsy();
    expect(caps?.resources?.listChanged).toBeFalsy();
  });
});

// ─────────────────────────────────────────────────────── #70 #71
describe('#70 / #71 — faf_sync names what it could not write; MCP advice, not CLI syntax', () => {
  test('AGENTS.md as a folder: faf_sync { agents: true } is isError and names AGENTS.md with the reason; CLAUDE.md is written', async () => {
    const dir = dirWith(PARTIAL);
    fs.mkdirSync(path.join(dir, 'AGENTS.md'));
    const r = await call('faf_sync', { path: dir, agents: true });
    expect(r.isError).toBe(true);
    expect(text(r)).toMatch(/Not written:[\s\S]*AGENTS\.md/);
    expect(r.structuredContent.filesFailed.map((f: { file: string }) => path.basename(f.file))).toEqual(['AGENTS.md']);
    expect(fs.existsSync(path.join(dir, 'CLAUDE.md'))).toBe(true);
  });

  test('faf_score details and faf_auto advise in MCP form; no `faf score` (CLI) or --details', async () => {
    const dir = dirWith(PARTIAL);
    const score = text(await call('faf_score', { path: dir, details: true }));
    expect(score).not.toMatch(/`faf score`|\(CLI\)|--details/);
    expect(score).toContain('faf_auto');
    expect(score).not.toMatch(/mark them .?slotignored/);
    const auto = text(await call('faf_auto', { path: dir }));
    expect(auto).toContain('faf_score (details: true)');
    expect(auto).not.toContain('--details');
  });
});
