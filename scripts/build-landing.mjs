#!/usr/bin/env node
/**
 * build-landing.mjs — the claude.faf.one landing page, written from
 * package.json, project.faf and the Core tools/list.
 *
 * public/ holds only this page (wrangler.toml [assets] serves public/). Nothing
 * on it is typed by hand that a file already says: the version, description,
 * Node floor and licence come from package.json; the title, goal and 3Ws from
 * project.faf; the tool names and counts from manifest.json and agent.fafa
 * (both written from the live tools/list by scripts/sync-version.js, and
 * checked against it by tests/wjttc-600-ship-copy.test.ts). The page has no
 * script, no overlay and no remote fetch.
 *
 *   node scripts/build-landing.mjs           write public/index.html
 *   node scripts/build-landing.mjs --check   exit 1 if public/index.html is stale
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parse } from 'yaml';

const here = path.dirname(fileURLToPath(import.meta.url));

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** The inputs the page is built from, read from a checkout. */
export function landingInputs(root = path.join(here, '..')) {
  const read = (p) => fs.readFileSync(path.join(root, p), 'utf-8');
  const pkg = JSON.parse(read('package.json'));
  const faf = parse(read('project.faf')) ?? {};
  const manifest = JSON.parse(read('manifest.json'));
  const card = parse(read('agent.fafa')) ?? {};
  return {
    pkg,
    faf,
    coreTools: (manifest.tools ?? []).map((t) => t.name),
    allCount: (card.capabilities ?? []).length,
  };
}

/** The page, as a string. Pure: same inputs, same bytes. */
export function renderLanding({ pkg, faf, coreTools, allCount }) {
  const project = faf.project ?? {};
  const who = faf.human_context ?? {};
  const repo = String(pkg.repository?.url ?? '').replace(/^git\+/, '').replace(/\.git$/, '');
  const version = pkg.version;
  const floor = String(pkg.engines?.node ?? '').replace(/^>=\s*/, '').replace(/\.0\.0$/, '');
  const bundle = `${repo}/releases/download/v${version}/${pkg.name}-${version}.mcpb`;
  const title = `${pkg.name} — ${project.title ?? pkg.name}`;
  const description = pkg.description;
  const config = JSON.stringify({ mcpServers: { faf: { command: 'npx', args: ['-y', pkg.name] } } }, null, 2);
  const w = (k) => (typeof who[k] === 'string' && who[k].trim() ? `<div class="w"><span>${k.toUpperCase()}</span>${esc(who[k])}</div>` : '');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="https://claude.faf.one/">
<meta property="og:image" content="https://raw.githubusercontent.com/Wolfe-Jam/claude-faf-mcp/main/assets/icons/faf-icon-512.png">
<link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍊</text></svg>">
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif; background: #0a0a0a; color: #eee; line-height: 1.5; }
  main { max-width: 760px; margin: 0 auto; padding: 56px 24px 40px; }
  header { text-align: center; margin-bottom: 36px; }
  .logo { font-size: 72px; }
  h1 { font-size: 2.2rem; font-weight: 900; letter-spacing: -1px; }
  .version { display: inline-block; background: #ff6600; color: #000; font-weight: 800; font-size: .85rem; padding: 2px 12px; border-radius: 4px; margin: 8px 0; }
  .goal { color: #ffd27f; font-size: 1.15rem; font-weight: 600; }
  .ids { color: #888; font-size: .9rem; margin-top: 8px; }
  code, pre { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
  .ids code { color: #bbb; }
  .stats { display: flex; justify-content: center; gap: 36px; flex-wrap: wrap; margin: 28px 0; }
  .stat b { display: block; font-size: 1.6rem; color: #fff; }
  .stat span { font-size: 11px; letter-spacing: 1px; text-transform: uppercase; color: #777; }
  section { background: rgba(255,102,0,.04); border: 1px solid rgba(255,102,0,.2); border-radius: 12px; padding: 22px; margin-bottom: 22px; }
  h2 { font-size: 13px; letter-spacing: 2px; text-transform: uppercase; color: #ff6600; margin-bottom: 12px; }
  h3 { font-size: .95rem; margin: 14px 0 6px; }
  p { color: #bbb; font-size: .92rem; }
  pre { background: rgba(0,0,0,.45); border-radius: 6px; padding: 12px 14px; font-size: 13px; color: #ddd; overflow-x: auto; margin-top: 6px; }
  ul.tools { list-style: none; display: flex; flex-wrap: wrap; gap: 8px; }
  ul.tools li code { background: rgba(0,0,0,.45); color: #ffb366; padding: 3px 8px; border-radius: 4px; font-size: 13px; }
  .w { font-size: .92rem; color: #ccc; padding: 4px 0; }
  .w span { display: inline-block; width: 56px; color: #ff6600; font-weight: 700; font-size: 12px; }
  a { color: #ff8533; text-decoration: none; }
  a:hover { text-decoration: underline; }
  footer { text-align: center; font-size: 12px; color: #777; border-top: 1px solid rgba(255,102,0,.15); padding-top: 20px; margin-top: 12px; }
  footer div { margin: 4px 0; }
</style>
</head>
<body>
<main>
  <header>
    <div class="logo">🍊</div>
    <h1>${esc(pkg.name)}</h1>
    <div class="version">v${esc(version)}</div>
    <div class="goal">${esc(project.goal)}</div>
    <div class="ids">MCP Registry: <code>one.faf/${esc(pkg.name)}</code> · IANA-registered <code>application/vnd.faf+yaml</code> · npm <code>${esc(pkg.name)}</code></div>
  </header>

  <div class="stats">
    <div class="stat"><b>${coreTools.length}</b><span>Core tools</span></div>
    <div class="stat"><b>${allCount}</b><span>with FAF_TOOLS=all</span></div>
    <div class="stat"><b>${esc(floor)}+</b><span>Node</span></div>
    <div class="stat"><b>${esc(pkg.license)}</b><span>Licence</span></div>
  </div>

  <section>
    <h2>Install</h2>
    <h3>Claude Desktop — one click</h3>
    <p>Download <a href="${esc(bundle)}">${esc(pkg.name)}-${esc(version)}.mcpb</a> and open it. The extension runs the server bundled inside it, with the Node that Claude Desktop provides.</p>
    <h3>Claude Desktop — config</h3>
    <p>Add to <code>claude_desktop_config.json</code>, then restart Claude Desktop:</p>
<pre>${esc(config)}</pre>
    <h3>Claude Code</h3>
<pre>claude mcp add faf -- npx -y ${esc(pkg.name)}</pre>
    <p>The npx config and the SessionStart hook are not pinned: they run the latest ${esc(pkg.name)}. Needs Node ${esc(floor)} or later.</p>
  </section>

  <section>
    <h2>Core tools</h2>
    <ul class="tools">${coreTools.map((t) => `<li><code>${esc(t)}</code></li>`).join('')}</ul>
    <p style="margin-top:10px">Set <code>FAF_TOOLS=all</code> to list all ${allCount}. Every tool runs on the faf-cli the package depends on; nothing is run from your PATH.</p>
  </section>

  <section>
    <h2>This project, in its own .faf</h2>
    ${w('who')}${w('what')}${w('why')}
  </section>

  <footer>
    <div><a href="${esc(repo)}">GitHub</a> · <a href="https://www.npmjs.com/package/${esc(pkg.name)}">npm</a> · <a href="https://faf.one">faf.one</a> · <a href="${esc(repo)}/blob/main/PRIVACY.md">Privacy</a> · <a href="mailto:team@faf.one">team@faf.one</a></div>
    <div>Hosted MCP endpoint: <code>https://mcpaas.live/claude/mcp/v1</code></div>
    <div>FAF stops AI Faffing about.</div>
  </footer>
</main>
</body>
</html>
`;
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const root = path.join(here, '..');
  const out = path.join(root, 'public', 'index.html');
  const html = renderLanding(landingInputs(root));
  if (process.argv.includes('--check')) {
    const current = fs.existsSync(out) ? fs.readFileSync(out, 'utf-8') : '';
    if (current !== html) {
      console.error('public/index.html is stale: run `node scripts/build-landing.mjs` (npm run sync-version does it).');
      process.exit(1);
    }
    console.log('public/index.html is current');
  } else {
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, html);
    console.log(`public/index.html written — v${JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8')).version}`);
  }
}
