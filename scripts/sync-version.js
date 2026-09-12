#!/usr/bin/env node
/**
 * sync-version.js — write every version stamp and tool count from its source.
 *
 * Sources: package.json (version, engines.node) and the live server (its
 * tools/list with and without FAF_TOOLS=all, resources/list, prompts/list —
 * read over MCP from the built dist/src/index.js). Nothing below is typed by
 * hand:
 *
 *   project.faf                       project.version (faf-cli updateFafFile: comments kept)
 *   manifest.json                     version, compatibility.runtimes.node, the tool list
 *                                     (the Core, in order), the count in the description
 *   agent.fafa                        agent.version, capabilities (every tool), tool_tiers
 *   .well-known/mcp/server-card.json  serverInfo, tools, resources, prompts
 *   README.md, package.json, glama.json, smithery.yaml, scripts/postinstall.js,
 *   CONTRIBUTING.md                   "Core N" / "M with FAF_TOOLS=all"; the README's
 *                                     .mcpb download link (a versioned release URL)
 *   public/index.html                 scripts/build-landing.mjs
 *   server.json                       scripts/gen-server-card.js; when the version
 *                                     changed, scripts/verify-mcpb.mjs --record packs the
 *                                     new bundle, checks it runs, and records its sha
 *
 * Runs on `npm version` (the "version" lifecycle hook) and by hand:
 *   node scripts/sync-version.js [--no-build] [--skip-mcpb] [--root <dir>] [--tools-json <file>]
 *
 *   --no-build     use dist/ as it is (default: npm run build first)
 *   --skip-mcpb    leave server.json alone when its .mcpb entry names another version
 *   --root <dir>   stamp the files under <dir> (tests)
 *   --tools-json   read the live lists from a file instead of starting the server (tests)
 *
 * tests/wjttc-600-ship-copy.test.ts checks every stamp against package.json
 * and the live tools/list.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const repo = path.join(__dirname, '..');
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const root = path.resolve(flag('--root') || repo);
const toolsJson = flag('--tools-json');
const skipMcpb = argv.includes('--skip-mcpb');
const noBuild = argv.includes('--no-build');

const file = (p) => path.join(root, p);
const read = (p) => fs.readFileSync(file(p), 'utf-8');
const changed = [];
function write(p, text) {
  if (fs.existsSync(file(p)) && read(p) === text) return;
  fs.writeFileSync(file(p), text);
  changed.push(p);
}

/** The count phrases every surface uses: "Core 14", "14 Core", "30 with FAF_TOOLS=all". */
function stampCounts(text, core, all) {
  return text
    .replace(/\bCore \d+(?![\d.]\d)/g, `Core ${core}`)
    .replace(/(?<![\d.])\b\d+ Core\b/g, `${core} Core`)
    .replace(/(?<![\d.])\b\d+( with `?FAF_TOOLS=all`?)/g, `${all}$1`);
}

/** The server's own lists, read over MCP from the built bin. */
async function liveLists() {
  if (toolsJson) return JSON.parse(fs.readFileSync(toolsJson, 'utf-8'));
  if (!noBuild) {
    const r = spawnSync('npm', ['run', 'build'], { cwd: repo, stdio: 'inherit', shell: process.platform === 'win32' });
    if (r.status !== 0) throw new Error(`npm run build exited ${r.status}`);
  }
  const { talk } = await import('./lib/mcp-stdio.mjs');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cfm-sync-'));
  try {
    const base = { ...process.env, HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude') };
    for (const k of ['FAF_TOOLS', 'FAF_EXTENDED', 'FAF_WORKING_DIR', 'MCP_WORKING_DIR']) delete base[k];
    const ask = (env) => talk({
      command: process.execPath,
      args: [path.join(repo, 'dist', 'src', 'index.js')],
      cwd: home,
      env,
      requests: [{ method: 'tools/list' }, { method: 'resources/list' }, { method: 'prompts/list' }],
    });
    const core = await ask(base);
    const all = await ask({ ...base, FAF_TOOLS: 'all' });
    return {
      serverInfo: core.initialize.serverInfo,
      core: core.results[0].result.tools,
      all: all.results[0].result.tools,
      resources: core.results[1].result.resources,
      prompts: core.results[2].result.prompts,
    };
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
}

async function main() {
  const pkg = JSON.parse(read('package.json'));
  const version = pkg.version;
  const engines = pkg.engines && pkg.engines.node;
  const lists = await liveLists();
  const coreNames = lists.core.map((t) => t.name);
  const N = coreNames.length;
  const M = lists.all.length;

  // project.faf — faf-cli edits the Document in place (comments, order, exact scalars kept).
  const { updateFafFile } = await import('faf-cli');
  const faf = updateFafFile(file('project.faf'), (doc) => { doc.setIn(['project', 'version'], version); });
  if (faf.written) changed.push('project.faf');

  // manifest.json — the .mcpb: its version, runtime floor and the Core it lists.
  const manifest = JSON.parse(read('manifest.json'));
  const shortBy = new Map((manifest.tools || []).map((t) => [t.name, t.description]));
  const order = (manifest.tools || []).map((t) => t.name);
  const rank = (name) => (order.includes(name) ? order.indexOf(name) : order.length);
  manifest.version = version;
  manifest.description = stampCounts(manifest.description, N, M);
  manifest.tools = [...lists.core].sort((a, b) => rank(a.name) - rank(b.name)).map((t) => ({ name: t.name, description: shortBy.get(t.name) || t.title || t.description }));
  manifest.compatibility = manifest.compatibility || {};
  manifest.compatibility.runtimes = { ...(manifest.compatibility.runtimes || {}), node: engines };
  write('manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);

  // agent.fafa — the A2A card: every tool is a capability; the tiers are the runtime's.
  const YAML = require('yaml');
  const card = YAML.parseDocument(read('agent.fafa'));
  card.setIn(['agent', 'version'], version);
  card.set('capabilities', card.createNode(lists.all.map((t) => ({
    name: t.name, type: 'tool', description: t.description, cites_spec: 'application/vnd.faf+yaml', tags: ['faf'],
  }))));
  card.setIn(['metadata', 'tool_tiers'], card.createNode({
    status: 'live',
    default: `Core ${N}: the tools/list a host sees without FAF_TOOLS`,
    core: coreNames,
    all: `${M} with FAF_TOOLS=all; every tool is callable by name either way`,
  }));
  write('agent.fafa', card.toString({ lineWidth: 0 }));

  // .well-known/mcp/server-card.json — a snapshot of the live lists.
  const serverCard = JSON.parse(read('.well-known/mcp/server-card.json'));
  const next = {
    serverInfo: { name: lists.serverInfo.name, version },
    authentication: serverCard.authentication || { required: false },
    tools: lists.all.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema })),
    resources: lists.resources,
    prompts: lists.prompts,
  };
  write('.well-known/mcp/server-card.json', `${JSON.stringify(next, null, 1)}\n`);

  // The prose surfaces: counts, and the README's versioned .mcpb link.
  for (const p of ['README.md', 'glama.json', 'smithery.yaml', 'scripts/postinstall.js', 'CONTRIBUTING.md']) {
    if (!fs.existsSync(file(p))) continue;
    let text = stampCounts(read(p), N, M);
    if (p === 'README.md') {
      text = text
        .replace(/releases\/(?:latest\/)?download\/v?\d+\.\d+\.\d+[^/\s)]*\/claude-faf-mcp-\d+\.\d+\.\d+[^\s)`]*?\.mcpb/g,
          `releases/download/v${version}/claude-faf-mcp-${version}.mcpb`)
        .replace(/`claude-faf-mcp-\d+\.\d+\.\d+[^`]*\.mcpb`/g, `\`claude-faf-mcp-${version}.mcpb\``);
    }
    write(p, text);
  }
  const pkgNext = { ...pkg, description: stampCounts(pkg.description, N, M) };
  write('package.json', `${JSON.stringify(pkgNext, null, 2)}\n`);

  // public/index.html — the landing page, from the files just written.
  const { renderLanding, landingInputs } = await import('./build-landing.mjs');
  fs.mkdirSync(file('public'), { recursive: true });
  write('public/index.html', renderLanding(landingInputs(root)));

  // server.json — the registry card. A new version needs the new bundle's sha.
  const serverJson = JSON.parse(read('server.json'));
  const mcpb = (serverJson.packages || []).find((p) => p.registryType === 'mcpb');
  const env = { ...process.env, GEN_SERVER_CARD_ROOT: root };
  if (mcpb && mcpb.version !== version) {
    if (skipMcpb) {
      console.log(`server.json: its .mcpb entry is still v${mcpb.version} — run \`npm run verify:mcpb -- --record\` to pack, check and record v${version}`);
    } else {
      execFileSync(process.execPath, [path.join(repo, 'scripts', 'verify-mcpb.mjs'), '--record'], { cwd: repo, stdio: 'inherit' });
      changed.push('server.json');
    }
  } else {
    const before = read('server.json');
    execFileSync(process.execPath, [path.join(repo, 'scripts', 'gen-server-card.js')], { cwd: root, env, stdio: 'ignore' });
    if (read('server.json') !== before) changed.push('server.json');
  }

  console.log(`sync-version: v${version}, Core ${N} (${M} with FAF_TOOLS=all) — ${changed.length ? `wrote ${[...new Set(changed)].join(', ')}` : 'every stamp already current'}`);
}

main().catch((error) => {
  console.error(`sync-version: ${error && error.message ? error.message : error}`);
  process.exit(1);
});
