/**
 * 🏁 WJTTC — tool schema truth (claude-faf-mcp 6.0.0, audit #49 #50 #51 #52 #67 #68 #70 #71)
 *
 * Ported from faf-mcp 3.0's tests/wjttc-tool-schema-truth.test.ts. BRAKE tier:
 * a tool's contract is what a host and a model act on, so every part of it
 * must be what the handler does.
 *
 *   1. Every property a tool declares in tools/list is read by the handler
 *      that serves it (the dispatch table in tools.ts, sliced per handler).
 *   2. Every faf_* tool name the handlers print is a tool that exists, and
 *      every tool a prompt names is on the default tools/list.
 *   3. The annotations match what each handler does: a call that changes a
 *      file carries readOnlyHint: false, and a tool marked read-only changes
 *      no file (each tool is run once, in a fresh mkdtemp project, with HOME
 *      and CLAUDE_CONFIG_DIR in temp folders).
 *
 * Every call here goes through the real MCP protocol (SDK Client + in-memory
 * transport), so the server's own wire handling is under test too.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { createHash } from 'crypto';
import { ClaudeFafMcpServer } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

type ToolText = { isError?: boolean; content: Array<{ type: string; text?: string }>; structuredContent?: any };
type ToolDef = {
  name: string;
  title?: string;
  description?: string;
  inputSchema: { properties?: Record<string, unknown> };
  annotations?: { title?: string; readOnlyHint?: boolean; destructiveHint?: boolean; idempotentHint?: boolean; openWorldHint?: boolean };
};

const ROOT = path.join(import.meta.dir, '..');
const firstText = (r: ToolText): string => r.content?.[0]?.text ?? '';

const SAMPLE_FAF = `faf_version: "3.0"
project:
  name: schema-truth-fixture
  goal: Fixture for the tool schema truth suite.
  main_language: TypeScript
stack:
  runtime: Node.js
  build: tsc
human_context:
  who: maintainers
  what: a fixture
`;

/** The tools that write a file — each must carry readOnlyHint: false. */
const WRITERS = [
  'faf_init', 'faf_auto', 'faf_go', 'faf_sync', 'faf_tri_sync', 'faf_setup', 'faf_etch',
  'faf_quick', 'faf_readme', 'faf_human_add', 'faf_agents', 'faf_cursor', 'faf_gemini',
  'faf_conductor', 'faf_git',
];

let client: Client;
let server: ClaudeFafMcpServer;
let tools: ToolDef[];
const tmpRoots: string[] = [];
const saved: Record<string, string | undefined> = {};

function tmp(prefix: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(d);
  return d;
}

/** A fresh project: project.faf, package.json and a README the tools can read. */
function project(): string {
  const dir = path.join(tmp('cfm-truth-'), 'app');
  fs.mkdirSync(dir);
  fs.writeFileSync(path.join(dir, 'project.faf'), SAMPLE_FAF);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'schema-truth-fixture', version: '0.0.1', description: 'Fixture for the tool schema truth suite.', scripts: { build: 'tsc' } }));
  fs.writeFileSync(path.join(dir, 'README.md'), '# schema-truth-fixture\n\nWho: maintainers.\n\nWhy: to prove every contract.\n');
  return dir;
}

/** Every file under the given roots, by path → sha256 (folders as "dir"). */
function snapshot(roots: string[]): Map<string, string> {
  const out = new Map<string, string>();
  const walk = (d: string): void => {
    let entries: fs.Dirent[] = [];
    try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        out.set(p, 'dir');
        walk(p);
      } else {
        let hash = 'unreadable';
        try { hash = createHash('sha256').update(fs.readFileSync(p)).digest('hex'); } catch { /* keep */ }
        out.set(p, hash);
      }
    }
  };
  for (const r of roots) {walk(r);}
  return out;
}

function changed(a: Map<string, string>, b: Map<string, string>): string[] {
  const keys = new Set([...a.keys(), ...b.keys()]);
  return [...keys].filter((k) => a.get(k) !== b.get(k)).sort();
}

beforeAll(async () => {
  for (const k of ['FAF_TOOLS', 'HOME', 'CLAUDE_CONFIG_DIR', 'FAF_WORKING_DIR']) {saved[k] = process.env[k];}
  process.env.FAF_TOOLS = 'all'; // audit the whole surface, not just the Core tier
  process.env.HOME = tmp('cfm-truth-home-');
  process.env.CLAUDE_CONFIG_DIR = tmp('cfm-truth-claude-');
  process.env.FAF_WORKING_DIR = project();

  server = new ClaudeFafMcpServer({ transport: 'stdio' } as any);
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await server.getServer().connect(serverT);
  client = new Client({ name: 'wjttc-schema-truth', version: '1.0.0' }, { capabilities: {} });
  await client.connect(clientT);
  tools = (await client.listTools()).tools as ToolDef[];
});

afterAll(async () => {
  await client.close();
  await server.getServer().close();
  for (const d of tmpRoots) {fs.rmSync(d, { recursive: true, force: true });}
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) {delete process.env[k];} else {process.env[k] = v;}
  }
});

describe('🏁 WJTTC — tool schema truth', () => {
  test('every declared inputSchema property is read by the handler that serves the tool', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'handlers', 'tools.ts'), 'utf-8');
    const fileHandlerSrc = fs.readFileSync(path.join(ROOT, 'src', 'handlers', 'fileHandler.ts'), 'utf-8');
    // Dispatch table: case 'faf_x': return await this.handleFoo(args)
    const dispatch = new Map<string, string>();
    for (const m of src.matchAll(/case '(faf(?:_[a-z_]+)?)':(?:\s*\{)?\s*(?:\/\/[^\n]*\n\s*)*return (?:await )?this\.(handle\w+)\(/g)) {
      dispatch.set(m[1], m[2]);
    }
    const offenders: string[] = [];
    for (const tool of tools) {
      const props = Object.keys(tool.inputSchema?.properties ?? {});
      if (!props.length) {continue;}
      const handler = dispatch.get(tool.name);
      if (!handler) {
        offenders.push(`${tool.name} (no handler in the dispatch table)`);
        continue;
      }
      const start = src.indexOf(`private async ${handler}(`);
      expect(start).toBeGreaterThan(-1);
      const next = src.indexOf('\n  private ', start + 1);
      const body = src.slice(start, next === -1 ? undefined : next) + (tool.name === 'faf_read' ? fileHandlerSrc : '');
      for (const p of props) {
        const read = new RegExp(`args\\??\\.${p}\\b|args\\??\\[['"]${p}['"]\\]|\\{[^}]*\\b${p}\\b[^}]*\\}\\s*=\\s*args`).test(body);
        if (!read) {offenders.push(`${tool.name}.${p} (declared, never read in ${handler})`);}
      }
    }
    expect(offenders).toEqual([]);
  });

  test('every faf_* tool name the handlers and prompts mention is a tool that exists, and every tool a prompt names is on the default tools/list', async () => {
    // A tool that tells you to run a tool must name a real one. Retired tools
    // are named only to say they are retired; faf_version is the .faf field.
    // A prompt runs on a default install, so every tool it names must be one
    // a host lists without FAF_TOOLS=all (6.0.0: the Core 14).
    const prompts = await client.listPrompts();
    const promptText = (await Promise.all(prompts.prompts.map((p) => client.getPrompt({ name: p.name }))))
      .map((g) => g.messages.map((m) => (m.content as { text?: string }).text ?? '').join('\n')).join('\n');
    const prev = process.env.FAF_TOOLS;
    delete process.env.FAF_TOOLS;
    let core: Set<string>;
    try {
      core = new Set((await client.listTools()).tools.map((t) => t.name));
    } finally {
      if (prev !== undefined) {process.env.FAF_TOOLS = prev;}
    }
    expect([...new Set(promptText.match(/\bfaf_[a-z_]+\b/g) ?? [])].filter((n) => !core.has(n))).toEqual([]);

    const files = [
      'src/handlers/tools.ts', 'src/handlers/fileHandler.ts', 'src/handlers/prompts.ts', 'src/handlers/resources.ts',
      ...fs.readdirSync(path.join(ROOT, 'src', 'faf-core', 'commands')).map((f) => `src/faf-core/commands/${f}`),
      ...fs.readdirSync(path.join(ROOT, 'src', 'faf-core', 'utils')).map((f) => `src/faf-core/utils/${f}`),
    ];
    const src = files.map((f) => fs.readFileSync(path.join(ROOT, f), 'utf-8')).join('\n');
    const registered = new Set(tools.map((x) => x.name));
    const allow = new Set(['faf_clear', 'faf_friday', 'faf_guide', 'faf_write', 'faf_chat', 'faf_version']);
    const unknown = [...new Set(src.match(/\bfaf_[a-z_]+\b/g) ?? [])].filter((n) => !registered.has(n) && !allow.has(n));
    expect(unknown).toEqual([]);
  });

  test('every tool has a title (top level and in annotations) and all four hints', () => {
    const missing: string[] = [];
    for (const t of tools) {
      const a = t.annotations ?? {};
      if (!t.title || t.title !== a.title) {missing.push(`${t.name}.title`);}
      for (const h of ['readOnlyHint', 'destructiveHint', 'idempotentHint', 'openWorldHint'] as const) {
        if (typeof a[h] !== 'boolean') {missing.push(`${t.name}.${h}`);}
      }
    }
    expect(missing).toEqual([]);
  });

  test('every writer carries readOnlyHint: false; every other tool readOnlyHint: true; faf_git is openWorld', () => {
    const wrong = tools
      .filter((t) => (t.annotations?.readOnlyHint === true) === WRITERS.includes(t.name))
      .map((t) => `${t.name}: readOnlyHint ${t.annotations?.readOnlyHint}`);
    expect(wrong).toEqual([]);
    expect(tools.find((t) => t.name === 'faf_git')!.annotations?.openWorldHint).toBe(true);
    expect(tools.filter((t) => t.annotations?.openWorldHint === true).map((t) => t.name)).toEqual(['faf_git']);
    // A tool that can replace what is there is destructive.
    for (const name of ['faf_init', 'faf_human_add', 'faf_go']) {
      expect(tools.find((t) => t.name === name)!.annotations?.destructiveHint).toBe(true);
    }
  });

  test('the annotations match what each handler does: a read-only tool changes no file; a call that changes a file is marked a writer', async () => {
    const home = process.env.HOME as string;
    const claudeDir = process.env.CLAUDE_CONFIG_DIR as string;
    const argsFor = (name: string, dir: string): Record<string, unknown> | null => {
      const fresh = path.join(path.dirname(dir), 'fresh');
      switch (name) {
        case 'faf_about': case 'faf_debug': return {};
        case 'faf_score': return { path: dir, details: true };
        case 'faf_init': return { path: fresh };
        case 'faf_setup': return { path: dir, confirm: true };
        case 'faf_sync': return { path: dir, all: true };
        case 'faf_read': return { path: path.join(dir, 'project.faf') };
        case 'faf_list': return { path: dir };
        case 'faf_readme': return { path: dir, apply: true };
        case 'faf_human_add': return { path: dir, field: 'where', value: 'npm' };
        case 'faf_context': return { path: dir, detail: true };
        case 'faf_go': return { path: dir, answers: { 'human_context.why': 'to prove every contract' } };
        case 'faf_bench': return { path: dir, action: 'questions' };
        case 'faf_quick': fs.mkdirSync(fresh); return { path: fresh, input: 'quick-app, a quick goal' };
        case 'faf_agents': case 'faf_cursor': case 'faf_gemini': case 'faf_conductor': return { path: dir, action: 'export' };
        case 'faf_tri_sync': return { path: dir, action: 'export' };
        case 'faf_etch': return { path: dir, text: 'every contract is true' };
        case 'faf_git': return null; // uses the network; its hints are pinned above
        default: return { path: dir };
      }
    };
    const offenders: string[] = [];
    for (const t of tools) {
      const dir = project();
      const args = argsFor(t.name, dir);
      if (args === null) {continue;}
      // The active project is this fixture, for tools that take no path.
      await client.callTool({ name: 'faf_context', arguments: { path: dir } });
      const roots = [path.dirname(dir), home, claudeDir];
      const before = snapshot(roots);
      const r = (await client.callTool({ name: t.name, arguments: args })) as ToolText;
      const diff = changed(before, snapshot(roots));
      if (t.annotations?.readOnlyHint === true && diff.length > 0) {
        offenders.push(`${t.name} is marked read-only but changed ${diff.map((f) => path.basename(f)).join(', ')}`);
      }
      if (diff.length > 0 && t.annotations?.readOnlyHint !== false) {
        offenders.push(`${t.name} changed files without readOnlyHint: false`);
      }
      if (WRITERS.includes(t.name) && t.name !== 'faf_readme' && diff.length === 0) {
        offenders.push(`${t.name} was expected to write in this fixture (${r.isError ? `isError: ${firstText(r).slice(0, 120)}` : 'wrote nothing'})`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
