/**
 * 🏁 WJTTC — Skills over MCP (io.modelcontextprotocol/skills, SEP-2640)
 *
 * The server ships the skills in the package's skills/ folder. Each test goes
 * through the real protocol (SDK Client, in-memory transport, the server's own
 * handlers) and checks the wire against SEP-2640: the declaration, the listing,
 * the digests against the bytes actually served, the frontmatter against the
 * SKILL.md actually served, and the errors.
 *
 * Tier 1 BRAKE  — what a host verifies before it loads a skill
 * Tier 2 ENGINE — what the skill says is true of this server
 * Tier 3 AERO   — edges: bad skills, limits, packaging
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { z } from 'zod';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { ClaudeFafMcpServer } from '../src/server.js';
import { CORE_TOOL_NAMES } from '../src/handlers/tools.js';
import {
  FafSkillsHandler, findSkillsRoot, readFrontmatter,
  SKILLS_EXTENSION, MAX_RESOURCES_PER_SKILL, MAX_BYTES_PER_SKILL,
} from '../src/handlers/skills.js';
import { FAF_PROMPT_DESCRIPTION } from '../src/handlers/prompts.js';

const ROOT = path.join(__dirname, '..');
const any = z.any();

const tmpRoots: string[] = [];
let client: Client;
let server: ClaudeFafMcpServer;
const saved: Record<string, string | undefined> = {};

function tmp(prefix: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(d);
  return d;
}
const sha = (b: Buffer | string): string => `sha256:${createHash('sha256').update(b).digest('hex')}`;
const req = (method: string, params: Record<string, unknown> = {}) =>
  client.request({ method, params }, any) as Promise<any>;
async function errorCode(p: Promise<unknown>): Promise<number | undefined> {
  try { await p; return undefined; } catch (e: any) { return e.code; }
}
function skillDir(root: string, name: string, body: string, extra: Record<string, string> = {}): void {
  const dir = path.join(root, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), body);
  for (const [f, text] of Object.entries(extra)) {
    fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
    fs.writeFileSync(path.join(dir, f), text);
  }
}

beforeAll(async () => {
  saved.FAF_WORKING_DIR = process.env.FAF_WORKING_DIR;
  // The working directory holds a skills/ folder of its own: it must never be served.
  const project = tmp('cfm-skills-proj-');
  skillDir(path.join(project, 'skills'), 'evil', '---\nname: evil\ndescription: not ours\n---\nx\n');
  process.env.FAF_WORKING_DIR = project;
  server = new ClaudeFafMcpServer({ transport: 'stdio' });
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await server.getServer().connect(serverT);
  client = new Client({ name: 'wjttc-skills', version: '1.0.0' }, { capabilities: {} });
  await client.connect(clientT);
});

afterAll(async () => {
  await client.close();
  await server.getServer().close();
  for (const d of tmpRoots) {fs.rmSync(d, { recursive: true, force: true });}
  if (saved.FAF_WORKING_DIR === undefined) {delete process.env.FAF_WORKING_DIR;}
  else {process.env.FAF_WORKING_DIR = saved.FAF_WORKING_DIR;}
});

// ── Tier 1: BRAKE ──

describe('Tier 1 BRAKE — what a host verifies', () => {
  test('declares the extension with directoryRead, and the resources capability beside it', () => {
    const caps = client.getServerCapabilities() as any;
    expect(caps.extensions[SKILLS_EXTENSION]).toEqual({ directoryRead: true });
    expect(caps.resources).toBeDefined();
  });

  test('the shipped skills all load: no problems', () => {
    expect(new FafSkillsHandler().problems).toEqual([]);
  });

  test('skills/list: every entry has uri, frontmatter and a resources array, and the uri ends in /<name>/SKILL.md', async () => {
    const res = await req('skills/list');
    expect(res.skills.length).toBeGreaterThan(0);
    for (const s of res.skills) {
      expect(Array.isArray(s.resources)).toBe(true);
      expect(typeof s.frontmatter.name).toBe('string');
      expect(typeof s.frontmatter.description).toBe('string');
      expect(s.uri).toBe(`skill://${s.frontmatter.name}/SKILL.md`);
      expect(s.resources.some((r: any) => r.uri === s.uri)).toBe(true);
    }
  });

  test('every listed file: the bytes resources/read serves match its digest and size', async () => {
    const { skills } = await req('skills/list');
    for (const s of skills) {
      for (const r of s.resources) {
        expect(r.digest).toMatch(/^sha256:[0-9a-f]{64}$/);
        const { contents } = await client.readResource({ uri: r.uri });
        const bytes = contents[0].blob !== undefined
          ? Buffer.from(contents[0].blob as string, 'base64')
          : Buffer.from(contents[0].text as string, 'utf-8');
        expect(bytes.length).toBe(r.size);
        expect(sha(bytes)).toBe(r.digest);
      }
    }
  });

  test('the listing is complete: it names every file in the skill folder, each once', async () => {
    const { skills } = await req('skills/list');
    for (const s of skills) {
      const dir = path.join(ROOT, 'skills', s.frontmatter.name);
      const onDisk: string[] = [];
      const walk = (d: string) => { for (const n of fs.readdirSync(d)) { const f = path.join(d, n); if (fs.statSync(f).isDirectory()) {walk(f);} else {onDisk.push(path.relative(dir, f).split(path.sep).join('/'));} } };
      walk(dir);
      const listed = s.resources.map((r: any) => r.uri.slice(`skill://${s.frontmatter.name}/`.length));
      expect([...listed].sort()).toEqual(onDisk.sort());
      expect(new Set(listed).size).toBe(listed.length);
    }
  });

  test('frontmatter in the listing equals the frontmatter of the SKILL.md served', async () => {
    const { skills } = await req('skills/list');
    for (const s of skills) {
      const { contents } = await client.readResource({ uri: s.uri });
      expect(readFrontmatter(contents[0].text as string)).toEqual(s.frontmatter);
    }
  });

  test('skills/get returns the same entry as the listing; an unknown uri is -32602', async () => {
    const { skills } = await req('skills/list');
    for (const s of skills) {
      expect((await req('skills/get', { uri: s.uri })).skill).toEqual(s);
    }
    expect(await errorCode(req('skills/get', { uri: 'skill://nope/SKILL.md' }))).toBe(-32602);
    expect(await errorCode(req('skills/get', { uri: 'claude-faf://context' }))).toBe(-32602);
  });

  test('a skills/ folder in the working directory is never served', async () => {
    const { skills } = await req('skills/list');
    expect(skills.map((s: any) => s.frontmatter.name)).not.toContain('evil');
    expect(await errorCode(client.readResource({ uri: 'skill://evil/SKILL.md' }))).toBe(-32002);
    expect(findSkillsRoot()).toBe(path.join(ROOT, 'skills'));
  });

  test('reading an unlisted skill:// uri is resource-not-found, not a guess', async () => {
    expect(await errorCode(client.readResource({ uri: 'skill://faf/NOT-THERE.md' }))).toBe(-32002);
    expect(await errorCode(client.readResource({ uri: 'skill://faf/../../package.json' }))).toBe(-32002);
  });
});

// ── Tier 2: ENGINE ──

describe('Tier 2 ENGINE — the skill tells the truth about this server', () => {
  test('every faf_* tool a skill names is on the default tools/list', () => {
    const named = new Set<string>();
    const walk = (d: string) => { for (const n of fs.readdirSync(d)) { const f = path.join(d, n); if (fs.statSync(f).isDirectory()) {walk(f);} else { for (const m of fs.readFileSync(f, 'utf-8').matchAll(/\bfaf_[a-z_]+/g)) {named.add(m[0]);} } } };
    walk(path.join(ROOT, 'skills'));
    expect(named.size).toBeGreaterThan(0);
    for (const tool of named) {expect(CORE_TOOL_NAMES).toContain(tool);}
  });

  test('the tools reference covers all fourteen Core tools', () => {
    const ref = fs.readFileSync(path.join(ROOT, 'skills', 'faf', 'references', 'tools.md'), 'utf-8');
    for (const tool of CORE_TOOL_NAMES) {expect(ref).toContain(`\`${tool}\``);}
  });

  test('resources/list carries each SKILL.md with name and description from its frontmatter, beside the two faf resources', async () => {
    const { resources } = await client.listResources();
    const uris = resources.map((r) => r.uri);
    expect(uris).toContain('claude-faf://context');
    expect(uris).toContain('claude-faf://status');
    const skill = resources.find((r) => r.uri === 'skill://faf/SKILL.md')!;
    expect(skill.name).toBe('faf');
    expect(skill.mimeType).toBe('text/markdown');
    expect(skill.description).toContain('100%');
  });

  test('resources/directory/read lists direct children: files, and subdirectories as inode/directory', async () => {
    const top = await req('resources/directory/read', { uri: 'skill://faf' });
    expect(top.resources).toContainEqual({ uri: 'skill://faf/SKILL.md', name: 'SKILL.md', mimeType: 'text/markdown' });
    expect(top.resources).toContainEqual({ uri: 'skill://faf/references', name: 'references', mimeType: 'inode/directory' });
    const refs = await req('resources/directory/read', { uri: 'skill://faf/references' });
    expect(refs.resources).toEqual([{ uri: 'skill://faf/references/tools.md', name: 'tools.md', mimeType: 'text/markdown' }]);
  });

  test('resources/directory/read on a file or an unknown uri is -32602', async () => {
    expect(await errorCode(req('resources/directory/read', { uri: 'skill://faf/SKILL.md' }))).toBe(-32602);
    expect(await errorCode(req('resources/directory/read', { uri: 'skill://nope' }))).toBe(-32602);
    expect(await errorCode(req('resources/directory/read', { uri: 'skill://faf/' }))).toBe(-32602);
  });

  test('skill results carry resultType complete', async () => {
    expect((await req('skills/list')).resultType).toBe('complete');
    expect((await req('skills/get', { uri: 'skill://faf/SKILL.md' })).resultType).toBe('complete');
  });

  test('the faf prompt and the faf skill describe the same thing, in the same words', () => {
    // Claude Code shows the prompt as /<server>:faf with this description; a host
    // that loads the skill shows the skill's. Two texts for one name drift apart
    // (the prompt said "Relentless pursuit…" after that wording was retired).
    const skill = readFrontmatter(fs.readFileSync(path.join(ROOT, 'skills', 'faf', 'SKILL.md'), 'utf-8'));
    expect(FAF_PROMPT_DESCRIPTION).toBe(String(skill.description));
    expect(FAF_PROMPT_DESCRIPTION).not.toMatch(/relentless/i);
  });
});

// ── Tier 3: AERO ──

describe('Tier 3 AERO — edges and packaging', () => {
  test('a bad skill is skipped with a reason; the good one beside it is served', () => {
    const root = tmp('cfm-skills-root-');
    skillDir(root, 'good', '---\nname: good\ndescription: fine\n---\nbody\n', { 'notes/a.md': 'a' });
    skillDir(root, 'misnamed', '---\nname: other\ndescription: x\n---\n');
    skillDir(root, 'nofront', 'no frontmatter\n');
    skillDir(root, 'nodesc', '---\nname: nodesc\n---\n');
    fs.mkdirSync(path.join(root, 'empty'));
    fs.writeFileSync(path.join(root, 'stray.md'), 'not a skill folder');
    const h = new FafSkillsHandler(root);
    expect(h.listSkills().skills.map((s) => s.frontmatter.name)).toEqual(['good']);
    expect(h.problems.length).toBe(4);
    expect(h.problems.join('\n')).toContain('misnamed');
    expect(() => h.readResource('skill://misnamed/SKILL.md')).toThrow();
  });

  test('an uppercase or doubled-hyphen name is refused', () => {
    const root = tmp('cfm-skills-names-');
    skillDir(root, 'Bad-Name', '---\nname: Bad-Name\ndescription: x\n---\n');
    skillDir(root, 'bad--name', '---\nname: bad--name\ndescription: x\n---\n');
    const h = new FafSkillsHandler(root);
    expect(h.hasSkills()).toBe(false);
    expect(h.problems.length).toBe(2);
  });

  test('no skills folder: nothing served, and the server does not declare the extension', () => {
    const h = new FafSkillsHandler(null);
    expect(h.hasSkills()).toBe(false);
    expect(h.listResources()).toEqual([]);
  });

  test('the shipped skills are inside the SEP-2640 limits', async () => {
    const { skills } = await req('skills/list');
    for (const s of skills) {
      expect(s.resources.length).toBeLessThanOrEqual(MAX_RESOURCES_PER_SKILL);
      expect(s.resources.reduce((n: number, r: any) => n + r.size, 0)).toBeLessThanOrEqual(MAX_BYTES_PER_SKILL);
    }
  });

  test('the npm package and the .mcpb both ship skills/', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
    expect(pkg.files).toContain('skills/**');
    expect(pkg.scripts['pack:mcpb']).toMatch(/cp -R dist skills /);
  });

  test('skill copy has no exclamation marks and no banned words', () => {
    const text = fs.readFileSync(path.join(ROOT, 'skills', 'faf', 'SKILL.md'), 'utf-8')
      + fs.readFileSync(path.join(ROOT, 'skills', 'faf', 'references', 'tools.md'), 'utf-8');
    expect(text).not.toMatch(/!(?!\[)/);
    expect(text.toLowerCase()).not.toContain('guarantee');
  });
});
