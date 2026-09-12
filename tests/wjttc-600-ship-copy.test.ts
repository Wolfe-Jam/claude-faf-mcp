/**
 * 🏁 WJTTC 6.0.0 — W4: the ship path, the public copy, and the gates
 *
 * Audit findings (AUDIT-claude-faf-mcp-6.0.md):
 *   #36 #53 #74  the .mcpb runs its own bundle; pack:mcpb is an explicit chain;
 *                server.json's sha is never typed and never carried to a new version
 *   #54 #72 #73 #75 #77 #89  Node 22 floor, CI that runs what ships and reports
 *                the real result, a pinned publisher, the key out of argv, the
 *                hono floor, a lint that can fail
 *   #55 #83      counts and version stamps are derived; sync-version writes every one
 *   #56 #57 #84 #85 #87 #88  no official-status claims, no false dependency or
 *                privacy claims, no banned words, true instructions
 *   #58 #59 #80  claude.faf.one serves only public/index.html; docs/ is gone;
 *                the Worker is out of src/
 *   #60 #62 #86  one install path; a working example; server.json from faf-cli
 *
 * Every temp folder is a mkdtemp; nothing here writes into the checkout.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parse } from 'yaml';
import { ClaudeFafMcpServer } from '../src/server.js';
import { fafCli } from '../src/utils/faf-cli-bridge.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const ROOT = path.resolve(import.meta.dir, '..');
const read = (p: string): string => fs.readFileSync(path.join(ROOT, p), 'utf-8');
const json = (p: string): any => JSON.parse(read(p));
const pkg = json('package.json');
const VERSION: string = pkg.version;

type Tool = { name: string; title?: string; description?: string; inputSchema: unknown };
type Lists = { serverInfo: any; core: Tool[]; all: Tool[]; resources: any[]; prompts: any[] };

const tmpRoots: string[] = [];
function tmp(prefix: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(d);
  return d;
}

let lists: Lists;
let client: Client;
let server: ClaudeFafMcpServer;
const savedTools = process.env.FAF_TOOLS;

beforeAll(async () => {
  delete process.env.FAF_TOOLS;
  server = new ClaudeFafMcpServer({ transport: 'stdio' });
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await server.getServer().connect(serverT);
  client = new Client({ name: 'wjttc-ship-copy', version: '1.0.0' }, { capabilities: {} });
  await client.connect(clientT);
  const core = (await client.listTools()).tools as Tool[];
  process.env.FAF_TOOLS = 'all';
  const all = (await client.listTools()).tools as Tool[];
  delete process.env.FAF_TOOLS;
  lists = {
    serverInfo: client.getServerVersion(),
    core,
    all,
    resources: (await client.listResources()).resources,
    prompts: (await client.listPrompts()).prompts,
  };
});

afterAll(async () => {
  await client.close();
  await server.getServer().close();
  for (const d of tmpRoots) {fs.rmSync(d, { recursive: true, force: true });}
  if (savedTools === undefined) {delete process.env.FAF_TOOLS;} else {process.env.FAF_TOOLS = savedTools;}
});

// ── #36 #53 #74: the .mcpb and server.json ──

describe('#36 — the .mcpb runs the server bundled inside it', () => {
  test('manifest mcp_config is node on ${__dirname}/<entry_point>, and entry_point is the package bin', () => {
    const m = json('manifest.json');
    expect(m.server.mcp_config.command).toBe('node');
    expect(m.server.mcp_config.args).toEqual([`\${__dirname}/${m.server.entry_point}`]);
    expect(m.server.entry_point).toBe(pkg.bin['claude-faf-mcp']);
    expect(JSON.stringify(m.server.mcp_config)).not.toContain('npx');
  });

  test('pack:mcpb is one explicit chain joined with && — no swallowed errors, no deleted runtime module, the pinned mcpb', () => {
    const chain: string = pkg.scripts['pack:mcpb'];
    expect(chain).not.toContain('2>/dev/null');
    expect(chain).not.toMatch(/;/);
    expect(chain).not.toContain('ajv-formats');
    expect(chain).not.toMatch(/rm -rf node_modules/);
    expect(chain).toContain('npm ci --omit=dev');
    expect(chain).toMatch(/&& mcpb pack \. /);
    for (const entry of ['dist', 'manifest.json', 'package.json', 'package-lock.json', 'assets/icons']) {expect(chain).toContain(entry);}
    // Everything the chain copies exists (a missing one would fail the chain).
    for (const entry of ['dist', 'manifest.json', 'package.json', 'package-lock.json', 'PRIVACY.md', 'README.md', 'LICENSE', 'CHANGELOG.md', 'assets/icons']) {
      if (entry !== 'dist') {expect(fs.existsSync(path.join(ROOT, entry))).toBe(true);}
    }
    expect(pkg.devDependencies['@anthropic-ai/mcpb']).toMatch(/^\d+\.\d+\.\d+$/); // an exact pin
    expect(pkg.scripts['verify:mcpb']).toBe('node scripts/verify-mcpb.mjs');
  });

  test('verify-mcpb refuses a bundle whose manifest runs npx, and records nothing', () => {
    // A tiny bundle packed with the pinned mcpb: the old mcp_config, a stub entry.
    const stage = path.join(tmp('cfm-mcpb-bad-'), 'stage');
    fs.mkdirSync(path.join(stage, 'dist', 'src'), { recursive: true });
    fs.writeFileSync(path.join(stage, 'dist', 'src', 'index.js'), 'process.exit(0);\n');
    const m = json('manifest.json');
    m.server.mcp_config = { command: 'npx', args: ['-y', 'claude-faf-mcp'] };
    delete m.icon;
    fs.writeFileSync(path.join(stage, 'manifest.json'), JSON.stringify(m, null, 2));
    const bundle = path.join(path.dirname(stage), 'bad.mcpb');
    const mcpb = path.join(ROOT, 'node_modules', '@anthropic-ai', 'mcpb', 'dist', 'cli', 'cli.js');
    const packed = spawnSync(process.execPath, [mcpb, 'pack', stage, bundle], { encoding: 'utf-8' });
    expect(packed.status).toBe(0);
    const before = read('server.json');
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'verify-mcpb.mjs'), '--file', bundle, '--record'], { encoding: 'utf-8', timeout: 60_000 });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('FAIL  mcp_config runs the bundled entry with node, not npx');
    expect(r.stdout + r.stderr).toContain('no sha recorded');
    expect(read('server.json')).toBe(before);
  }, 90_000);
});

describe('#53 #86 — server.json: faf-cli\'s identity, this repo\'s icons, a sha that belongs to its version', () => {
  function stage(version: string): string {
    const dir = tmp('cfm-servercard-');
    for (const f of ['server.json', 'project.faf']) {fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));}
    fs.mkdirSync(path.join(dir, 'assets', 'icons'), { recursive: true });
    for (const f of fs.readdirSync(path.join(ROOT, 'assets', 'icons'))) {fs.copyFileSync(path.join(ROOT, 'assets', 'icons', f), path.join(dir, 'assets', 'icons', f));}
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ ...pkg, version }, null, 2));
    return dir;
  }
  const gen = (dir: string, args: string[] = []) => spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'gen-server-card.js'), ...args], {
    encoding: 'utf-8', env: { ...process.env, GEN_SERVER_CARD_ROOT: dir },
  });

  test('a new version without --sha is refused and server.json is left as it was', () => {
    const dir = stage('9.9.9');
    const before = fs.readFileSync(path.join(dir, 'server.json'), 'utf-8');
    const r = gen(dir);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('npm run verify:mcpb -- --record');
    expect(fs.readFileSync(path.join(dir, 'server.json'), 'utf-8')).toBe(before);
    expect(gen(dir, ['--check']).status).toBe(1);
  });

  test('--sha records the bundle for the new version: the release URL for that version and that sha', () => {
    const dir = stage('9.9.9');
    const sha = 'b'.repeat(64);
    expect(gen(dir, ['--sha', sha]).status).toBe(0);
    const s = JSON.parse(fs.readFileSync(path.join(dir, 'server.json'), 'utf-8'));
    const mcpb = s.packages.find((p: any) => p.registryType === 'mcpb');
    expect(s.version).toBe('9.9.9');
    expect(mcpb.version).toBe('9.9.9');
    expect(mcpb.identifier).toBe('https://github.com/Wolfe-Jam/claude-faf-mcp/releases/download/v9.9.9/claude-faf-mcp-9.9.9.mcpb');
    expect(mcpb.fileSha256).toBe(sha);
  });

  test('a --sha that is not a sha256 is refused', () => {
    const dir = stage('9.9.9');
    const r = gen(dir, ['--sha', 'not-a-sha']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('64 lowercase hex');
  });

  test('the live server.json: title is faf-cli registryTitle, icons are this repo\'s own and exist, the mcpb entry is this version', async () => {
    const s = json('server.json');
    const { registryTitle, registryName } = await fafCli;
    const data = parse(read('project.faf'));
    expect(s.name).toBe(registryName(data));
    expect(s.title).toBe(registryTitle(data));
    expect(s.icons.length).toBeGreaterThan(0);
    for (const icon of s.icons) {
      expect(icon.src).toStartWith('https://raw.githubusercontent.com/Wolfe-Jam/claude-faf-mcp/main/assets/icons/');
      expect(fs.existsSync(path.join(ROOT, 'assets', 'icons', path.basename(icon.src)))).toBe(true);
    }
    const mcpb = s.packages.find((p: any) => p.registryType === 'mcpb');
    expect(mcpb.identifier).toContain(`/v${VERSION}/claude-faf-mcp-${VERSION}.mcpb`);
    expect(mcpb.fileSha256).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ── #55 #83: derived counts and version stamps ──

describe('#55 #83 — every surface agrees with tools/list and package.json', () => {
  test('every version stamp is package.json\'s', () => {
    expect(parse(read('project.faf')).project.version).toBe(VERSION);
    expect(json('manifest.json').version).toBe(VERSION);
    expect(parse(read('agent.fafa')).agent.version).toBe(VERSION);
    expect(json('.well-known/mcp/server-card.json').serverInfo.version).toBe(VERSION);
    const s = json('server.json');
    expect(s.version).toBe(VERSION);
    for (const p of s.packages) {expect(p.version).toBe(VERSION);}
    expect(lists.serverInfo.version).toBe(VERSION);
    // The README's download link names a release that exists for this version.
    const links = [...read('README.md').matchAll(/releases\/(latest\/)?download\/(v[^/]+)\/(claude-faf-mcp-[^)\s`]+\.mcpb)/g)];
    expect(links.length).toBeGreaterThan(0);
    for (const l of links) {
      expect(l[1]).toBeUndefined(); // a versioned tag URL, never releases/latest
      expect(l[2]).toBe(`v${VERSION}`);
      expect(l[3]).toBe(`claude-faf-mcp-${VERSION}.mcpb`);
    }
  });

  test('manifest.json lists the Core, agent.fafa and the server card list every tool, with the live descriptions and schemas', () => {
    const core = lists.core.map((t) => t.name).sort();
    const all = lists.all.map((t) => t.name).sort();
    expect(json('manifest.json').tools.map((t: any) => t.name).sort()).toEqual(core);
    const card = parse(read('agent.fafa'));
    expect(card.capabilities.map((c: any) => c.name).sort()).toEqual(all);
    for (const c of card.capabilities) {expect(c.description).toBe(lists.all.find((t) => t.name === c.name)!.description);}
    expect([...card.metadata.tool_tiers.core].sort()).toEqual(core);
    expect(card.metadata.tool_tiers.status).toBe('live');
    const sc = json('.well-known/mcp/server-card.json');
    expect(sc.tools).toEqual(lists.all.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })));
    expect(sc.resources).toEqual(lists.resources);
    expect(sc.prompts).toEqual(lists.prompts);
  });

  const COUNT_SURFACES = ['README.md', 'package.json', 'glama.json', 'smithery.yaml', 'manifest.json', 'scripts/postinstall.js', 'CONTRIBUTING.md', 'public/index.html'];
  test('every tool count on a public surface is the live one; no test counts', () => {
    const N = lists.core.length;
    const M = lists.all.length;
    const wrong: string[] = [];
    for (const f of COUNT_SURFACES) {
      const t = read(f);
      for (const m of t.matchAll(/\bCore (\d+)(?![\d.]\d)/g)) {if (Number(m[1]) !== N) {wrong.push(`${f}: "${m[0]}"`);}}
      for (const m of t.matchAll(/(?<![\d.])\b(\d+) Core\b/g)) {if (Number(m[1]) !== N) {wrong.push(`${f}: "${m[0]}"`);}}
      for (const m of t.matchAll(/(?<![\d.])\b(\d+) with `?FAF_TOOLS=all/g)) {if (Number(m[1]) !== M) {wrong.push(`${f}: "${m[0]}"`);}}
      for (const m of t.matchAll(/(?<!Core )(?<![\d.])\b\d+ (MCP )?tools\b/g)) {wrong.push(`${f}: "${m[0]}" (say "Core ${N}" / "${M} with FAF_TOOLS=all")`);}
      for (const m of t.matchAll(/\b\d[\d,]* (tests|suites)\b/gi)) {wrong.push(`${f}: "${m[0]}" (test counts are not stamped)`);}
    }
    expect(wrong).toEqual([]);
  });

  test('the README tool tables name every tool, Core and Extended, and nothing retired as live', () => {
    const readme = read('README.md');
    const coreTable = readme.slice(readme.indexOf('**Core**'), readme.indexOf('**Extended**'));
    const extTable = readme.slice(readme.indexOf('**Extended**'), readme.indexOf('## 🐘'));
    const rows = (s: string) => [...s.matchAll(/^\| `(faf[a-z_]*)` \|/gm)].map((m) => m[1]).sort();
    const core = lists.core.map((t) => t.name).sort();
    const extended = lists.all.map((t) => t.name).filter((n) => !core.includes(n)).sort();
    expect(rows(coreTable)).toEqual(core);
    expect(rows(extTable)).toEqual(extended);
  });

  test('the landing page is exactly what scripts/build-landing.mjs renders from package.json, project.faf and the tool lists', async () => {
    const { renderLanding, landingInputs } = await import('../scripts/build-landing.mjs');
    expect(read('public/index.html')).toBe(renderLanding(landingInputs(ROOT)));
    expect(read('public/index.html')).toContain(`v${VERSION}`);
  });

  test('sync-version writes every stamp for a new version (a copy of the files, version 9.9.9) and a second run changes nothing', async () => {
    const dir = tmp('cfm-sync-');
    for (const f of ['project.faf', 'manifest.json', 'agent.fafa', 'server.json', 'README.md', 'glama.json', 'smithery.yaml', 'CONTRIBUTING.md', '.well-known/mcp/server-card.json', 'scripts/postinstall.js']) {
      fs.mkdirSync(path.dirname(path.join(dir, f)), { recursive: true });
      fs.copyFileSync(path.join(ROOT, f), path.join(dir, f));
    }
    fs.writeFileSync(path.join(dir, 'package.json'), `${JSON.stringify({ ...pkg, version: '9.9.9' }, null, 2)}\n`);
    const toolsJson = path.join(dir, 'tools.json');
    fs.writeFileSync(toolsJson, JSON.stringify(lists));
    const run = () => spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'sync-version.js'), '--root', dir, '--tools-json', toolsJson, '--skip-mcpb'], { encoding: 'utf-8' });
    const first = run();
    expect(first.status).toBe(0);
    const rd = (f: string) => fs.readFileSync(path.join(dir, f), 'utf-8');
    expect(parse(rd('project.faf')).project.version).toBe('9.9.9');
    expect(rd('project.faf')).toContain('# Distribution map'); // faf-cli's in-place edit keeps comments
    expect(JSON.parse(rd('manifest.json')).version).toBe('9.9.9');
    expect(parse(rd('agent.fafa')).agent.version).toBe('9.9.9');
    expect(JSON.parse(rd('.well-known/mcp/server-card.json')).serverInfo.version).toBe('9.9.9');
    expect(rd('README.md')).toContain('releases/download/v9.9.9/claude-faf-mcp-9.9.9.mcpb');
    expect(rd('public/index.html')).toContain('v9.9.9');
    expect(first.stdout).toContain('npm run verify:mcpb -- --record'); // server.json waits for the new bundle's sha
    const snapshot = ['project.faf', 'manifest.json', 'agent.fafa', 'README.md', 'public/index.html'].map(rd);
    expect(run().stdout).toContain('every stamp already current');
    expect(['project.faf', 'manifest.json', 'agent.fafa', 'README.md', 'public/index.html'].map(rd)).toEqual(snapshot);
  });

  test('npm version runs sync-version and stages every file it writes', () => {
    const staged = pkg.scripts.version as string;
    expect(staged).toContain('npm run sync-version');
    for (const f of ['project.faf', 'manifest.json', 'agent.fafa', '.well-known/mcp/server-card.json', 'server.json', 'README.md', 'public/index.html']) {expect(staged).toContain(f);}
  });
});

// ── #56 #57 #84 #85 #87 #88: public copy ──

const WORK_SURFACES = [
  'README.md', 'CHANGELOG.md', 'PRIVACY.md', 'SECURITY.md', 'SUPPORT.md', 'CONTRIBUTING.md', 'CLAUDE.md',
  'examples/README.md', 'manifest.json', 'server.json', 'glama.json', 'smithery.yaml', 'package.json',
  'agent.fafa', 'project.faf', 'public/index.html', '.well-known/mcp/server-card.json', '.github/workflows/ci.yml',
];

/** The prose of a surface: markdown without code; JSON and YAML as their string
 *  values, never their keys (`generated` is a field faf-cli's context block names). */
function prose(file: string): string {
  const t = read(file);
  if (/\.(json|fafa|faf|yaml|yml)$/.test(file)) {
    const out: string[] = [];
    const walk = (v: unknown): void => {
      if (typeof v === 'string') {out.push(v);} else if (Array.isArray(v)) {v.forEach(walk);} else if (v && typeof v === 'object') {Object.values(v).forEach(walk);}
    };
    walk(file.endsWith('.json') ? JSON.parse(t) : parse(t));
    return out.join('\n');
  }
  if (file.endsWith('.md')) {return t.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');}
  return t;
}

describe('#84 — no banned words, and ✪ (never the trophy emoji) on work surfaces', () => {
  test('generate/generator/generated, Guaranteed, Universal, bare F1 and 🏆 appear on no work surface', () => {
    const hits: string[] = [];
    for (const f of WORK_SURFACES) {
      prose(f).split('\n').forEach((line, i) => {
        for (const re of [/\bgenerat(e|es|ed|or|ors|ing|ion)\b/i, /\bguarantee/i, /\buniversal\b/i, /\bF1\b/, /🏆/u]) {
          if (re.test(line)) {hits.push(`${f}:${i + 1} ${re} — ${line.trim().slice(0, 100)}`);}
        }
      });
    }
    expect(hits).toEqual([]);
  });

  test('faf_about carries facts only: no speed, reach or mood claims', async () => {
    const r: any = await client.callTool({ name: 'faf_about', arguments: {} });
    const t = r.content[0].text as string;
    expect(t).toContain('application/vnd.faf+yaml');
    expect(t).toContain(`claude-faf-mcp ${VERSION}`);
    for (const claim of ['<29ms', 'any AI tool', 'Claude Happy', 'Zero drift', 'time to burn']) {expect(t).not.toContain(claim);}
    expect(t).toContain(`Core ${lists.core.length} tools`);
  });
});

describe('#56 #57 — no official-status claims; the dependency, network and file claims are true', () => {
  test('no surface claims Anthropic status or a modelcontextprotocol/servers listing; the registry line names one.faf/claude-faf-mcp', () => {
    const hits: string[] = [];
    for (const f of WORK_SURFACES.filter((f) => f !== 'CHANGELOG.md')) {
      const t = read(f);
      for (const re of [/Anthropic[_ ]MCP/i, /official Anthropic (MCP|registry|status)/i, /Anthropic engineering/i, /Anthropic-merged/i, /Merged in Anthropic/i, /servers\/pull\/2759/, /Listed in modelcontextprotocol/i, /^\s*[—-]+\s*Claude\s*$/m]) {
        if (re.test(t)) {hits.push(`${f}: ${re}`);}
      }
    }
    expect(hits).toEqual([]);
    expect(read('README.md')).toContain('one.faf/claude-faf-mcp');
    // The CHANGELOG keeps its history, annotated as a community listing.
    const log = read('CHANGELOG.md');
    expect(log).not.toMatch(/Validated by Anthropic engineering team|Published to official Anthropic/);
  });

  test('no false "standalone / zero dependencies / nothing leaves the machine" claims; SECURITY lists the real dependencies', () => {
    const hits: string[] = [];
    for (const f of ['README.md', 'SECURITY.md', 'PRIVACY.md', 'agent.fafa', 'manifest.json', 'SUPPORT.md', 'public/index.html']) {
      const t = read(f);
      for (const re of [/standalone/i, /zero CLI dependenc/i, /only one production dependency/i, /no data leaves/i, /No data is transmitted/i, /Claude Desktop configuration directory/i]) {
        if (re.test(t)) {hits.push(`${f}: ${re}`);}
      }
    }
    expect(hits).toEqual([]);
    const security = read('SECURITY.md');
    for (const dep of Object.keys(pkg.dependencies)) {expect(security).toContain(`\`${dep}\``);}
  });

  test('PRIVACY names faf_git\'s network use and every file claude-faf-mcp writes, and keeps the hosted-version section', () => {
    const privacy = read('PRIVACY.md');
    expect(privacy).toContain('git clone --depth 1');
    expect(privacy).toContain('https://faf.one/privacy');
    for (const file of ['project.faf', '.faf-dna', 'CLAUDE.md', 'AGENTS.md', '.cursorrules', 'GEMINI.md', '.github/copilot-instructions.md', 'conductor/', 'soul.fafm', 'MEMORY.md', '.claude/settings.json']) {
      expect(privacy).toContain(file);
    }
  });
});

describe('#60 #85 #87 #88 — one install path, true self-references, working instructions', () => {
  test('the README\'s config is npx -y claude-faf-mcp; bunx is only the alternative; the Inspector is not an install', () => {
    const readme = read('README.md');
    expect(readme).toContain('"faf": { "command": "npx", "args": ["-y", "claude-faf-mcp"] }');
    expect(readme).not.toMatch(/npm install -g claude-faf-mcp`, then add[^\n]*bunx/);
    expect(readme).not.toMatch(/Compose floor faf-cli \^/);
    expect(readme).not.toMatch(/faf-cli writes this MCP's CLAUDE\.md and AGENTS\.md/);
    // The major and the unpinned hook/npx are called out (Q11).
    expect(readme).toContain('6.0.0 is a major release');
    expect(readme).toMatch(/not pinned/);
  });

  test('project.faf names only real commands and the transport the package has; CLAUDE.md carries no BI-SYNC footer', () => {
    const faf = read('project.faf');
    expect(faf).not.toContain('faf surface');
    expect(faf).not.toMatch(/regenerat/i);
    expect(parse(faf).stack.api_type).toBe('MCP (stdio)');
    expect(read('CLAUDE.md')).not.toContain('BI-SYNC');
  });

  test('SUPPORT, CONTRIBUTING and SECURITY: no dead knobs or paths, Node 22 and bun, one Discussions URL', () => {
    const docs = ['SUPPORT.md', 'CONTRIBUTING.md', 'SECURITY.md', '.github/ISSUE_TEMPLATE/config.yml'].map((f) => [f, read(f)] as const);
    const hits: string[] = [];
    for (const [f, t] of docs) {
      for (const re of [/DEBUG=claude-faf-mcp/, /build\/index\.js/, /npm or yarn/, /faf_enhance/, /contributors list/, /NODE_ENV=production/, /coming soon/i, /Node\.js 18/, /wolfe-jam\.github\.io/]) {
        if (re.test(t)) {hits.push(`${f}: ${re}`);}
      }
      for (const m of t.matchAll(/github\.com\/Wolfe-Jam\/([\w-]+)\/discussions/g)) {
        if (m[1] !== 'claude-faf-mcp') {hits.push(`${f}: discussions at ${m[1]}`);}
      }
    }
    expect(hits).toEqual([]);
    expect(read('CONTRIBUTING.md')).toContain('Node.js 22');
    expect(read('CONTRIBUTING.md')).toContain('Bun');
    expect(read('CONTRIBUTING.md')).toContain('dist/src/index.js');
  });
});

describe('#62 — the example can be followed', () => {
  test('no committed legacy fixture; the README has no absolute path and no wrong tier; step 1 creates project.faf', async () => {
    expect(fs.existsSync(path.join(ROOT, 'examples', 'test-project', 'project.faf'))).toBe(false);
    const readme = read('examples/README.md');
    expect(readme).not.toMatch(/\/Users\/|~\/path/);
    expect(readme).not.toMatch(/40-60%|Bronze\/Silver|All \d+ tools/);

    const dir = path.join(tmp('cfm-example-'), 'test-project');
    fs.cpSync(path.join(ROOT, 'examples', 'test-project'), dir, { recursive: true });
    const r: any = await client.callTool({ name: 'faf_init', arguments: { path: dir } });
    expect(r.isError).toBeFalsy();
    const faf = parse(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8'));
    expect(faf.project.name).toBe('acme-dashboard');
    expect(typeof faf.project).toBe('object'); // never the legacy scalar shape
  });
});

// ── #58 #59 #80: claude.faf.one ──

describe('#58 #59 #80 — claude.faf.one serves only public/index.html; the Worker lives outside src/', () => {
  test('docs/ is gone; wrangler serves ./public (only index.html) and runs worker/index.js', () => {
    expect(fs.existsSync(path.join(ROOT, 'docs'))).toBe(false);
    const w = read('wrangler.toml');
    expect(w).toMatch(/^main = "worker\/index\.js"$/m);
    expect(w).toMatch(/^directory = "\.\/public"$/m);
    expect(fs.existsSync(path.join(ROOT, 'worker', 'index.js'))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, 'src', 'index.js'))).toBe(false);
    expect(fs.readdirSync(path.join(ROOT, 'public'))).toEqual(['index.html']);
  });

  test('the landing page: no overlay, no Mk3.1 fallback, no script, a real og:image, the package PRIVACY.md', () => {
    const html = read('public/index.html');
    for (const gone of ['Trust Edition', 'Mk3.1', 'Fallback', '<script', 'modelcontextprotocol/servers', 'mcpaas.live/privacy', 'thumbnail.png']) {expect(html).not.toContain(gone);}
    const og = /<meta property="og:image" content="([^"]+)">/.exec(html)?.[1] ?? '';
    expect(og).toStartWith('https://raw.githubusercontent.com/Wolfe-Jam/claude-faf-mcp/main/');
    expect(fs.existsSync(path.join(ROOT, og.replace('https://raw.githubusercontent.com/Wolfe-Jam/claude-faf-mcp/main/', '')))).toBe(true);
    expect(html).toContain('https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/PRIVACY.md');
  });
});

// ── #54 #72 #73 #75 #77 #89: Node, CI, publisher, audit, lint ──

describe('#54 #72 #73 #75 #77 #89 — the gates can fail, and CI runs what ships', () => {
  test('engines.node is >=22.0.0 and scripts/check-engines.mjs passes; prepublishOnly builds, tests and checks it', () => {
    expect(pkg.engines.node).toBe('>=22.0.0');
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'check-engines.mjs')], { encoding: 'utf-8' });
    expect(r.status).toBe(0);
    expect(pkg.scripts.prepublishOnly).toBe('npm run build && npm test && npm run check:engines');
  });

  test('check-engines fails when a CI matrix starts below the floor', () => {
    const dir = tmp('cfm-engines-');
    fs.mkdirSync(path.join(dir, '.github', 'workflows'), { recursive: true });
    fs.copyFileSync(path.join(ROOT, 'package.json'), path.join(dir, 'package.json'));
    fs.copyFileSync(path.join(ROOT, 'manifest.json'), path.join(dir, 'manifest.json'));
    fs.writeFileSync(path.join(dir, '.github', 'workflows', 'ci.yml'), read('.github/workflows/ci.yml').replace('node: [22.x, 24.x]', 'node: [20.x, 22.x]'));
    const r = spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'check-engines.mjs')], { encoding: 'utf-8', env: { ...process.env, CHECK_ENGINES_ROOT: dir } });
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('engine floor drift');
  });

  test('ci.yml: Node 22/24 on ubuntu, macOS and Windows; lint and type-check block; the tarball and the .mcpb are started; Status fails on a failed job', () => {
    const ci = read('.github/workflows/ci.yml');
    const jobs = parse(ci).jobs;
    for (const job of ['node-smoke', 'release-verify']) {
      expect(jobs[job].strategy.matrix.node).toEqual(['22.x', '24.x']);
      expect(jobs[job].strategy.matrix.os).toEqual(['ubuntu-latest', 'macos-latest', 'windows-latest']);
    }
    const steps = (job: string) => jobs[job].steps as Array<{ name?: string; run?: string; uses?: string; 'continue-on-error'?: boolean }>;
    for (const s of steps('quality')) {expect(s['continue-on-error']).toBeUndefined();}
    expect(steps('quality').map((s) => s.run)).toEqual(expect.arrayContaining(['npm run lint', 'npm run type-check', 'npm run check:engines']));
    expect(steps('release-verify').map((s) => s.run)).toEqual(expect.arrayContaining(['node scripts/smoke-package.mjs', 'node scripts/verify-mcpb.mjs']));
    expect(jobs.status.needs).toEqual(expect.arrayContaining(['release-verify', 'test', 'node-smoke', 'quality', 'build', 'security']));
    const statusRun = steps('status').map((s) => s.run ?? '').join('\n');
    expect(statusRun).toContain('process.exit(1)');
    expect(ci).not.toMatch(/echo "✅ Security: Passed"|PODIUM READY|\bF1\b|🏆/u);
    expect(steps('security').find((s) => s.uses?.startsWith('trufflesecurity/'))?.uses).toMatch(/@[0-9a-f]{40}$/);
    expect(steps('security').map((s) => s.run)).toContain('npm audit --audit-level=high');
  });

  test('the registry workflows pin mcp-publisher and check its sha256, keep the key out of argv and interpolate no input into a script', () => {
    for (const f of ['.github/workflows/mcp-registry-publish.yml', '.github/workflows/mcp-registry-publish-sibling.yml']) {
      const t = read(f);
      expect(t).not.toContain('releases/latest/download');
      expect(t).toMatch(/MCP_PUBLISHER_VERSION: v\d+\.\d+\.\d+/);
      expect(t).toMatch(/MCP_PUBLISHER_SHA256: [0-9a-f]{64}/);
      expect(t).toContain('sha256sum -c -');
      expect(t).not.toContain('--private-key');
      expect(t).toContain('registry-login.mjs --domain faf.one');
      const runs = (Object.values(parse(t).jobs) as any[]).flatMap((j) => j.steps.map((s: any) => s.run ?? ''));
      for (const run of runs) {expect(run).not.toMatch(/\$\{\{\s*(inputs|secrets)\./);}
    }
    const main = parse(read('.github/workflows/mcp-registry-publish.yml')).jobs;
    expect(main.publish.needs).toBe('verify');
    expect(JSON.stringify(main.verify.steps)).toContain('verify-mcpb.mjs --file');
  });

  test('registry-login signs with the key from the environment only; a bad key is refused; the key is never printed', () => {
    const key = 'c'.repeat(64);
    const script = path.join(ROOT, 'scripts', 'registry-login.mjs');
    const ok = spawnSync(process.execPath, [script, '--domain', 'faf.one', '--dry-run'], { encoding: 'utf-8', env: { ...process.env, MCP_PRIVATE_KEY: key } });
    expect(ok.status).toBe(0);
    expect(ok.stdout).toContain('the signature verifies');
    expect(ok.stdout).toMatch(/v=MCPv1; k=ed25519; p=[A-Za-z0-9+/]{43}=/);
    expect(ok.stdout + ok.stderr).not.toContain(key);
    const bad = spawnSync(process.execPath, [script, '--domain', 'faf.one', '--dry-run'], { encoding: 'utf-8', env: { ...process.env, MCP_PRIVATE_KEY: 'nope' } });
    expect(bad.status).toBe(1);
  });

  test('the hono override floor is the fixed version, and the lockfile holds fixed hono and js-yaml', () => {
    expect(pkg.overrides.hono).toBe('>=4.13.5');
    const lock = json('package-lock.json');
    const v = (p: string) => (lock.packages[p]?.version ?? '0.0.0').split('.').map(Number);
    const atLeast = (a: number[], b: number[]) => a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] >= b[2];
    expect(atLeast(v('node_modules/hono'), [4, 13, 5])).toBe(true);
    expect(atLeast(v('node_modules/js-yaml'), [4, 3, 2])).toBe(true);
  });

  test('CI holds a coverage floor on the totals over src/, and the check fails below it (#91)', () => {
    const jobs = parse(read('.github/workflows/ci.yml')).jobs;
    expect(jobs.test.steps.map((s: any) => s.run ?? '')).toContain('node scripts/check-coverage.mjs');
    const lcov = (lh: number, fnh: number) => `SF:${path.join('src', 'x.ts')}\nFNF:100\nFNH:${fnh}\nLF:100\nLH:${lh}\nend_of_record\nSF:tests/y.test.ts\nFNF:10\nFNH:0\nLF:10\nLH:0\nend_of_record\n`;
    const dir = tmp('cfm-coverage-');
    const check = (body: string) => {
      fs.writeFileSync(path.join(dir, 'lcov.info'), body);
      return spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'check-coverage.mjs'), path.join(dir, 'lcov.info')], { encoding: 'utf-8' });
    };
    expect(check(lcov(99, 99)).status).toBe(0); // the tests/ record is not counted
    const low = check(lcov(10, 99));
    expect(low.status).toBe(1);
    expect(low.stderr).toContain('coverage below the floor');
  });

  test('npm run lint blocks: it lints every src file and fails above a warning ratchet', () => {
    expect(pkg.scripts.lint).toMatch(/^eslint "src\/\*\*\/\*\.ts" --max-warnings \d+$/);
    expect(pkg.scripts['format:check']).toBeUndefined(); // prettier is not a dependency
  });
});
