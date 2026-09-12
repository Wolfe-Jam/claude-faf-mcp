/**
 * WJTTC 6.0.0 — retire, prune, package contents.
 *
 * Retired tools answer with one line and are never listed (Q4). faf_check
 * no longer writes `_protected_fields` (Q6). The AGENTS.md / .cursorrules /
 * GEMINI.md / conductor imports into project.faf are gone (Q7). Dead modules,
 * dependencies and package entries are pruned (#78-#82), and the lint glob
 * reaches every file (#89). Every directory here comes from mkdtemp.
 */
import { describe, test, expect, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { spawnSync } from 'child_process';
import { FafToolHandler } from '../src/handlers/tools';
import { FafEngineAdapter } from '../src/handlers/engine-adapter';
import { ClaudeFafMcpServer } from '../src/server';

const ROOT = path.join(__dirname, '..');
const sandboxes: string[] = [];
function sandbox(tag: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `cfm-600-${tag}-`));
  sandboxes.push(d);
  return d;
}
afterAll(() => {
  for (const d of sandboxes) fs.rmSync(d, { recursive: true, force: true });
});

function textOf(r: { content?: unknown }): string {
  const block = (r.content as Array<{ type?: string; text?: string }> | undefined)?.[0];
  return block?.text ?? '';
}
const pkg = (): any => JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));

async function allToolNames(): Promise<string[]> {
  const prev = process.env.FAF_TOOLS;
  process.env.FAF_TOOLS = 'all';
  try {
    const { tools } = await new FafToolHandler(new FafEngineAdapter('native')).listTools();
    return tools.map((t: any) => t.name);
  } finally {
    if (prev === undefined) {delete process.env.FAF_TOOLS;} else {process.env.FAF_TOOLS = prev;}
  }
}
async function toolDef(name: string): Promise<any> {
  const prev = process.env.FAF_TOOLS;
  process.env.FAF_TOOLS = 'all';
  try {
    const { tools } = await new FafToolHandler(new FafEngineAdapter('native')).listTools();
    return tools.find((t: any) => t.name === name);
  } finally {
    if (prev === undefined) {delete process.env.FAF_TOOLS;} else {process.env.FAF_TOOLS = prev;}
  }
}

const SIX_WS = `project:
  name: guarded
  goal: Keep hand-written context exactly as written
# a comment the tools must never drop
human_context:
  who: Platform engineers at Acme building internal tools
  what: A service mesh control plane for the whole company
  why: Every team re-invented routing and got it wrong
  where: Kubernetes clusters in three regions
  when: Every deploy, every day, since 2024
  how: Go services with a React admin console on top
`;

// ── Q4: retired tools ──

describe('Q4 — faf_clear, faf_friday, faf_guide, faf_write are retired', () => {
  const RETIRED: Array<[string, string, RegExp]> = [
    ['faf_clear', 'retired in 6.0.0', /nothing to clear/],
    ['faf_friday', 'retired in 6.0.0', /faf_auto/],
    ['faf_guide', 'retired in 6.0.0', /faf_context/],
    ['faf_write', 'retired in 6.0.0', /faf_init/],
    ['faf_chat', 'retired in 5.7.0', /faf_go/],
  ];

  test('never listed, even with FAF_TOOLS=all', async () => {
    const names = await allToolNames();
    for (const [name] of RETIRED) expect(names).not.toContain(name);
  });

  test('a call by name is isError with one plain line: when, and what to use instead', async () => {
    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    for (const [name, when, instead] of RETIRED) {
      const r = await handler.callTool(name, {});
      expect(r.isError).toBe(true);
      const text = textOf(r);
      expect(text).toContain(`${name} was ${when}`);
      expect(text).toMatch(instead);
      expect(text.split('\n')).toHaveLength(1);
    }
    // The map is keyed by own entries only: a prototype name is still unknown.
    for (const name of ['toString', 'constructor', '__proto__', 'hasOwnProperty']) {
      await expect(handler.callTool(name, {})).rejects.toThrow(`Unknown tool: ${name}`);
    }
  });

  test('faf_write writes nothing, even inside the project', async () => {
    const dir = sandbox('write');
    const target = path.join(dir, 'new-file.txt');
    const r = await new FafToolHandler(new FafEngineAdapter('native')).callTool('faf_write', { path: target, content: 'x' });
    expect(r.isError).toBe(true);
    expect(fs.existsSync(target)).toBe(false);
  });
});

// ── Q6: faf_check protect / unlock ──

describe('Q6 — faf_check writes nothing: protect / unlock are retired', () => {
  test('the schema has no protect / unlock, and the report shows no lock', async () => {
    const def = await toolDef('faf_check');
    expect(Object.keys(def.inputSchema.properties)).toEqual(['path']);
    expect(JSON.stringify(def)).not.toMatch(/protect|unlock/i);

    const dir = sandbox('check-report');
    fs.writeFileSync(path.join(dir, 'project.faf'), `${SIX_WS}_protected_fields:\n  - who\n`);
    const r = await new FafToolHandler(new FafEngineAdapter('native')).callTool('faf_check', { path: dir });
    expect(r.isError).toBeFalsy();
    expect(textOf(r)).not.toContain('🔒');
    expect(textOf(r)).not.toContain('Protected');
    expect((r.structuredContent as any).protected).toBeUndefined();
  });

  test('protect: isError, and project.faf is byte-for-byte unchanged (no _protected_fields)', async () => {
    const dir = sandbox('check-protect');
    const p = path.join(dir, 'project.faf');
    fs.writeFileSync(p, SIX_WS);
    const r = await new FafToolHandler(new FafEngineAdapter('native')).callTool('faf_check', { path: dir, protect: true });
    expect(r.isError).toBe(true);
    expect(textOf(r)).toContain('faf_check protect/unlock was retired in 6.0.0');
    expect(fs.readFileSync(p, 'utf-8')).toBe(SIX_WS);
  });

  test('unlock: isError, and an existing _protected_fields key is left as written', async () => {
    const dir = sandbox('check-unlock');
    const p = path.join(dir, 'project.faf');
    const before = `${SIX_WS}_protected_fields:\n  - who\n  - why\n`;
    fs.writeFileSync(p, before);
    const r = await new FafToolHandler(new FafEngineAdapter('native')).callTool('faf_check', { path: dir, unlock: true });
    expect(r.isError).toBe(true);
    expect(fs.readFileSync(p, 'utf-8')).toBe(before);
  });
});

// ── Q7: the interop imports into project.faf ──

describe('Q7 — the AGENTS.md / .cursorrules / GEMINI.md / conductor imports are retired', () => {
  const CASES: Array<[string, string, (dir: string) => void]> = [
    ['faf_agents', 'AGENTS.md', (d) => fs.writeFileSync(path.join(d, 'AGENTS.md'), '# Imported\n\n## Guidelines\n- rule one\n- rule two\n')],
    ['faf_cursor', '.cursorrules', (d) => fs.writeFileSync(path.join(d, '.cursorrules'), '# Imported\n\n## Rules\n- rule one\n')],
    ['faf_gemini', 'GEMINI.md', (d) => fs.writeFileSync(path.join(d, 'GEMINI.md'), '# Imported\n\n## Coding Style\n- rule one\n')],
    ['faf_conductor', 'conductor/', (d) => {
      fs.mkdirSync(path.join(d, 'conductor'));
      fs.writeFileSync(path.join(d, 'conductor', 'product.md'), '# Sub product\n\n## Overview\nAn imported product\n');
      fs.writeFileSync(path.join(d, 'conductor', 'workflow.md'), '# Workflow\n\n## Rules\n- My rule\n');
    }],
  ];
  // A legacy scalar `project:` (the shape merge spread into character keys, #7).
  const FAF = '# hand-written\nproject: myname\nhuman_context:\n  who: devs\n';

  test('import (merge: true) is isError and project.faf is unchanged — in the folder and in a parent (#13, #41, #42)', async () => {
    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    for (const [tool, file, seed] of CASES) {
      // Same folder.
      const dir = sandbox(`${tool}-here`);
      const p = path.join(dir, 'project.faf');
      fs.writeFileSync(p, FAF);
      seed(dir);
      for (let run = 0; run < 2; run++) {
        const r = await handler.callTool(tool, { path: dir, action: 'import', merge: true });
        expect(r.isError).toBe(true);
        expect(textOf(r)).toContain(`${tool} import was retired in 6.0.0`);
        expect(textOf(r)).toContain(file);
      }
      expect(fs.readFileSync(p, 'utf-8')).toBe(FAF);

      // From a subfolder: the parent's project.faf is never reached.
      const mono = sandbox(`${tool}-mono`);
      const rootFaf = path.join(mono, 'project.faf');
      fs.writeFileSync(rootFaf, FAF);
      const leaf = path.join(mono, 'packages', 'web');
      fs.mkdirSync(leaf, { recursive: true });
      seed(leaf);
      const r = await handler.callTool(tool, { path: leaf, action: 'import', merge: true });
      expect(r.isError).toBe(true);
      expect(fs.readFileSync(rootFaf, 'utf-8')).toBe(FAF);
      expect(fs.existsSync(path.join(leaf, 'project.faf'))).toBe(false);
    }
  });

  test('the interop schemas carry no import action and no merge flag', async () => {
    for (const [tool] of CASES) {
      const def = await toolDef(tool);
      expect(def.inputSchema.properties.action.enum).not.toContain('import');
      expect(def.inputSchema.properties.merge).toBeUndefined();
      expect(def.description).not.toMatch(/import/i);
    }
  });
});

// ── #78: dead code ──

/** Every relative module a source file loads (static, dynamic and require), type-only imports excluded. */
function localImports(file: string): string[] {
  const text = fs.readFileSync(file, 'utf-8');
  const out: string[] = [];
  const re = /(?:^\s*import\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]|^\s*export\s+(?!type\b)[^;]*?from\s+['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)|require\(\s*['"]([^'"]+)['"]\s*\))/gms;
  for (const m of text.matchAll(re)) {
    const spec = m[1] ?? m[2] ?? m[3] ?? m[4];
    if (!spec || !spec.startsWith('.')) continue;
    const base = path.resolve(path.dirname(file), spec);
    const candidates = [base.replace(/\.js$/, '.ts'), base, `${base}.ts`, `${base}.js`, path.join(base, 'index.ts')];
    const hit = candidates.find((c) => fs.existsSync(c) && fs.statSync(c).isFile());
    if (hit) out.push(hit);
  }
  return out;
}

describe('#78 — no dead modules ship', () => {
  test('every src module is reachable from the bin (src/index.ts); the Worker lives outside src/ (worker/index.js)', () => {
    const seen = new Set<string>();
    const stack = [path.join(ROOT, 'src', 'index.ts')];
    while (stack.length) {
      const f = stack.pop()!;
      if (seen.has(f)) continue;
      seen.add(f);
      stack.push(...localImports(f));
    }
    const all: string[] = [];
    const walk = (d: string): void => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) walk(p);
        else if (/\.(ts|js)$/.test(e.name)) all.push(p);
      }
    };
    walk(path.join(ROOT, 'src'));
    const unreachable = all.filter((f) => !seen.has(f)).map((f) => path.relative(ROOT, f)).sort();
    expect(unreachable).toEqual([]);
    expect(fs.existsSync(path.join(ROOT, 'worker', 'index.js'))).toBe(true); // 6.0.0 W4 #80
  });

  test("the audit's named dead modules, getServerInfo, TOOL_REGISTRY and tests/scripts are gone", () => {
    const gone = [
      'src/config/visibility.ts', 'src/faf-core/engines/faf-dna.ts', 'src/faf-core/fix-once/types.ts',
      'src/faf-core/utils/balance-visualizer.ts', 'src/faf-core/utils/championship-style.ts',
      'src/faf-core/utils/platform-detector.ts', 'src/faf-core/utils/technical-credit.ts',
      'src/utils/auto-path-detection.ts', 'src/utils/championship-format.ts', 'src/utils/username-detector.ts',
      'src/utils/visual-style.ts', 'src/utils/fuzzy-detector.ts', 'src/fafa/a2a-card.ts',
      'src/handlers/tool-registry.ts', 'src/handlers/tool-types.ts', 'src/licensing/pro-gate.ts',
      'src/types/mcp-tools.ts', 'src/types/tool-visibility.ts', 'src/faf-core/compiler/faf-compiler.ts',
      ...['audit', 'auto', 'doctor', 'formats', 'human', 'init', 'innit', 'migrate', 'quick', 'readme',
        'score', 'sync', 'update', 'validate'].map((c) => `src/faf-core/commands/${c}.ts`),
      'tests/scripts',
    ];
    for (const rel of gone) expect(fs.existsSync(path.join(ROOT, rel))).toBe(false);
    expect((ClaudeFafMcpServer.prototype as any).getServerInfo).toBeUndefined();
  });
});

// ── #79: runtime dependencies ──

describe('#79 — only live runtime dependencies', () => {
  test('esbuild, @upstash/redis and faf-scoring-kernel are not dependencies (package.json, lock, pack:mcpb)', () => {
    const p = pkg();
    const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf-8'));
    for (const dep of ['esbuild', '@upstash/redis', 'faf-scoring-kernel']) {
      expect(p.dependencies[dep]).toBeUndefined();
      expect(lock.packages[''].dependencies[dep]).toBeUndefined();
    }
    expect(lock.packages['node_modules/esbuild']).toBeUndefined();
    expect(lock.packages['node_modules/@upstash/redis']).toBeUndefined();
    expect(p.scripts['pack:mcpb']).not.toContain('esbuild');
  });
});

// ── #80: package contents ──

describe('#80 — the npm package holds what it should', () => {
  const FILES = [
    'dist/**', '!dist/**/*.map', 'assets/icons/**', 'scripts/postinstall.js', 'project.faf',
    'README.md', 'CLAUDE.md', 'PRIVACY.md', 'manifest.json', 'LICENSE', 'CHANGELOG.md',
  ];

  test('files is the audit list; .npmignore and .mcpbignore are gone', () => {
    expect(pkg().files).toEqual(FILES);
    expect(fs.existsSync(path.join(ROOT, '.npmignore'))).toBe(false);
    expect(fs.existsSync(path.join(ROOT, '.mcpbignore'))).toBe(false);
  });

  test('npm pack ships project.faf and postinstall — no dev scripts, tests, maps or phantom entries', () => {
    // npm pack runs `prepare` (a build into dist/) even with --ignore-scripts,
    // so pack a copy of the tree whose package.json has no scripts.
    const stage = sandbox('pack');
    for (const entry of fs.readdirSync(ROOT)) {
      if (entry === 'node_modules' || entry === '.git') continue;
      fs.cpSync(path.join(ROOT, entry), path.join(stage, entry), { recursive: true });
    }
    const { scripts: _scripts, ...manifest } = pkg();
    fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify(manifest, null, 2));
    const r = spawnSync('npm', ['pack', '--dry-run', '--json'], {
      cwd: stage, encoding: 'utf-8', env: { ...process.env, HOME: stage, npm_config_update_notifier: 'false' },
    });
    expect(r.status).toBe(0);
    const files: string[] = JSON.parse(r.stdout)[0].files.map((f: { path: string }) => f.path);
    const allowed = new Set(['package.json', 'project.faf', 'scripts/postinstall.js', 'README.md', 'CLAUDE.md',
      'PRIVACY.md', 'manifest.json', 'LICENSE', 'CHANGELOG.md']);
    const stray = files.filter((f) => !allowed.has(f) && !f.startsWith('assets/icons/') &&
      !(f.startsWith('dist/') && !f.endsWith('.map')));
    expect(stray).toEqual([]);
    expect(files).toContain('project.faf');
    expect(files).toContain('scripts/postinstall.js');
    expect(files).toContain('assets/icons/faf-icon-512.png'); // the manifest icon
  });

  test('main is side-effect free and differs from the bin: importing it starts no server', async () => {
    const p = pkg();
    expect(p.main).not.toBe(p.bin['claude-faf-mcp']);
    const mainSrc = path.join(ROOT, p.main.replace(/^dist\//, '').replace(/\.js$/, '.ts'));
    expect(fs.existsSync(mainSrc)).toBe(true);
    const home = sandbox('main-home');
    const child = Bun.spawn([process.execPath, mainSrc], {
      cwd: home, env: { ...process.env, HOME: home }, stdin: 'pipe', stdout: 'pipe', stderr: 'pipe',
    });
    const timer = setTimeout(() => child.kill(), 15000);
    const code = await child.exited;
    clearTimeout(timer);
    const out = await new Response(child.stdout).text();
    expect(code).toBe(0); // exits by itself: a started stdio server would wait on stdin until killed
    expect(out).toBe('');
    // The Smithery sandbox entry lives in main and builds a server without a transport.
    const { createSandboxServer } = await import('../src/server');
    expect(typeof createSandboxServer().connect).toBe('function');
  }, 30000);
});

// ── #81: the faf-cli bridge and the A2A card ──

describe('#81 — faf-cli loads by its package name; the A2A card is faf-cli buildA2ACard', () => {
  test('the bridge is a bare import("faf-cli") — no directory walk, no file:// path', () => {
    const src = fs.readFileSync(path.join(ROOT, 'src', 'utils', 'faf-cli-bridge.ts'), 'utf-8');
    const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    expect(code).toContain("export const fafCli = import('faf-cli');");
    expect(code).not.toMatch(/from ['"](fs|path|url)['"]|node_modules|pathToFileURL|__dirname/);
  });

  test('scripts/verify-fafa.js passes its A2A layer through faf-cli (no dist/src/fafa)', () => {
    const script = fs.readFileSync(path.join(ROOT, 'scripts', 'verify-fafa.js'), 'utf-8');
    expect(script).not.toContain('fafa/a2a-card');
    const home = sandbox('fafa-home');
    const r = spawnSync('node', [path.join(ROOT, 'scripts', 'verify-fafa.js')], {
      cwd: ROOT, encoding: 'utf-8', timeout: 90000, env: { ...process.env, HOME: home },
    });
    expect(r.stdout).toMatch(/PASS {2}L4 A2A conformance \(maps to a valid A2A AgentCard\) — \d+ skills/);
  }, 120000);
});

// ── #82: npm run dev ──

describe('#82 — npm run dev starts a server that answers', () => {
  test('npm run dev answers initialize over stdio', async () => {
    const home = sandbox('dev-home');
    const child = Bun.spawn(['npm', 'run', '--silent', 'dev'], {
      cwd: ROOT, env: { ...process.env, HOME: home, npm_config_update_notifier: 'false' },
      stdin: 'pipe', stdout: 'pipe', stderr: 'pipe',
    });
    child.stdin.write(JSON.stringify({
      jsonrpc: '2.0', id: 1, method: 'initialize',
      params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'dev-test', version: '1' } },
    }) + '\n');
    child.stdin.flush();
    const reader = child.stdout.getReader();
    let buf = '';
    const deadline = Date.now() + 30000;
    let response: any = null;
    while (!response && Date.now() < deadline) {
      const next = await Promise.race([
        reader.read(),
        new Promise<{ done: true; value: undefined }>((res) => setTimeout(() => res({ done: true, value: undefined }), deadline - Date.now())),
      ]);
      if (next.done) break;
      buf += new TextDecoder().decode(next.value);
      for (const line of buf.split('\n')) {
        try { const m = JSON.parse(line); if (m.id === 1) response = m; } catch { /* partial line */ }
      }
    }
    child.kill();
    await child.exited;
    expect(response?.result?.serverInfo?.name).toBe('claude-faf-mcp');
  }, 45000);
});

// ── #89 (first half): the lint glob ──

describe('#89 — npm run lint hands eslint the whole glob', () => {
  test('the shell passes src/**/*.ts through unexpanded, so eslint lints every file', () => {
    const lint: string = pkg().scripts.lint;
    expect(lint.startsWith('eslint ')).toBe(true);
    // Run the script's arguments through sh exactly as npm would, and print them.
    // (6.0.0 W4 #89: a --max-warnings ratchet follows the glob.)
    const r = spawnSync('sh', ['-c', `printf '%s\\n' ${lint.slice('eslint '.length)}`], { cwd: ROOT, encoding: 'utf-8' });
    expect(r.stdout.trim().split('\n')[0]).toBe('src/**/*.ts');
  });
});

// ── step 10: archived files ──

describe('archived files are out of the tree and unreferenced', () => {
  test('mcp-registry-entry.json and faf-mcp-config.json are gone, and nothing points at them', () => {
    for (const f of ['mcp-registry-entry.json', 'faf-mcp-config.json']) {
      expect(fs.existsSync(path.join(ROOT, f))).toBe(false);
    }
    const skip = new Set(['node_modules', 'dist', '.git', 'CHANGELOG.md', path.basename(__filename)]);
    const hits: string[] = [];
    const walk = (d: string): void => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        if (skip.has(e.name)) continue;
        const p = path.join(d, e.name);
        if (e.isDirectory()) { walk(p); continue; }
        if (fs.statSync(p).size > 2_000_000) continue;
        const t = fs.readFileSync(p, 'utf-8');
        if (t.includes('mcp-registry-entry.json') || t.includes('faf-mcp-config.json')) hits.push(path.relative(ROOT, p));
      }
    };
    walk(ROOT);
    expect(hits).toEqual([]);
  });
});
