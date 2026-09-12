#!/usr/bin/env node
/**
 * verify-mcpb.mjs — prove the .mcpb runs its own bundled code before its sha
 * is recorded anywhere.
 *
 *   1. pack      `npm run pack:mcpb` (or --file <path> for a bundle already built,
 *                e.g. the release asset the registry workflow downloads)
 *   2. unpack    into a new temp folder, with @anthropic-ai/mcpb's own unpacker
 *   3. resolve   manifest.server.mcp_config with mcpb's own variable
 *                substitution (${__dirname} → the unpacked folder), as a host does
 *   4. start     that exact command, with a temp HOME and no network need
 *   5. talk      initialize → tools/list → resources/list → faf_score on a
 *                temp project; serverInfo.version must be package.json's, the
 *                tools must be the manifest's, faf_score must answer
 *   6. record    only with --record, and only after 1–5 passed: the bundle's
 *                sha256 goes into server.json through gen-server-card --sha
 *
 * Usage:
 *   node scripts/verify-mcpb.mjs                   pack, then check
 *   node scripts/verify-mcpb.mjs --record          pack, check, record the sha in server.json
 *   node scripts/verify-mcpb.mjs --file x.mcpb     check a bundle already built
 *   node scripts/verify-mcpb.mjs --file x.mcpb --expect-sha <hex>
 *                                                  and require its sha256 (the registry workflow)
 * Exit 0 = every check passed; 1 = a check failed (nothing recorded).
 */
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { talk } from './lib/mcp-stdio.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const record = argv.includes('--record');
const expectSha = flag('--expect-sha');
let file = flag('--file');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
const version = flag('--expect-version') || pkg.version;
const temps = [];
const tmp = (prefix) => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  temps.push(d);
  return d;
};

let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed++;
  return ok;
};

async function main() {
  if (!file) {
    console.log('verify-mcpb: packing with `npm run pack:mcpb`\n');
    const r = spawnSync('npm', ['run', 'pack:mcpb'], { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' });
    if (r.status !== 0) throw new Error(`npm run pack:mcpb exited ${r.status}`);
    file = path.join(root, `${pkg.name}-${pkg.version}.mcpb`);
  }
  file = path.resolve(file);
  if (!fs.existsSync(file)) throw new Error(`no bundle at ${file}`);

  const sha = createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  console.log(`\nverify-mcpb: ${path.basename(file)}  sha256 ${sha}\n`);
  if (expectSha) check('sha256 matches the expected sha (server.json fileSha256)', sha === expectSha, `expected ${expectSha}`);

  const { unpackExtension, getMcpConfigForManifest } = await import('@anthropic-ai/mcpb');
  const dir = tmp('cfm-mcpb-');
  const unpacked = await unpackExtension({ mcpbPath: file, outputDir: dir, silent: true });
  if (unpacked === false) throw new Error('mcpb could not unpack the bundle');

  const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf-8'));
  check('manifest version is the package version', manifest.version === version, `manifest ${manifest.version}, expected ${version}`);
  check('mcp_config runs the bundled entry with node, not npx', manifest.server?.mcp_config?.command === 'node' &&
    (manifest.server?.mcp_config?.args ?? []).some((a) => a === `\${__dirname}/${manifest.server?.entry_point}`),
    JSON.stringify(manifest.server?.mcp_config));
  check('the entry point is in the bundle', fs.existsSync(path.join(dir, manifest.server.entry_point)), manifest.server.entry_point);
  check('the bundle carries no devDependencies', !['typescript', 'eslint', '@anthropic-ai/mcpb'].some((d) => fs.existsSync(path.join(dir, 'node_modules', d))));

  // Never start a bundle that failed the checks above (an npx config would
  // fetch whatever npm has, which is the defect this script exists to catch).
  if (failed) throw new Error(`${failed} check(s) failed before start — no sha recorded`);

  const config = await getMcpConfigForManifest({
    manifest, extensionPath: dir, systemDirs: {}, userConfig: {}, pathSeparator: path.sep,
  });
  if (!config) throw new Error('mcpb resolved no mcp_config from the manifest');
  const command = config.command === 'node' ? process.execPath : config.command;

  // A host starts the server with its own environment; this one has a temp
  // HOME and a temp project, and nothing from the checkout.
  const home = tmp('cfm-mcpb-home-');
  const project = path.join(tmp('cfm-mcpb-project-'), 'app');
  fs.mkdirSync(project);
  fs.writeFileSync(path.join(project, 'project.faf'), [
    'faf_version: "3.0"', 'project:', '  name: mcpb-check', '  goal: Check the bundle answers', '  main_language: TypeScript', '',
  ].join('\n'));
  const env = { ...process.env, HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: path.join(home, '.claude'), ...(config.env ?? {}) };
  for (const k of ['FAF_TOOLS', 'FAF_EXTENDED', 'FAF_WORKING_DIR', 'MCP_WORKING_DIR', 'FAF_ALLOWED_ROOTS']) delete env[k];

  const { initialize, results } = await talk({
    command,
    args: config.args ?? [],
    cwd: project,
    env,
    requests: [
      { method: 'tools/list' },
      { method: 'resources/list' },
      { method: 'tools/call', params: { name: 'faf_score', arguments: { path: project } } },
    ],
  });
  check('initialize: serverInfo is claude-faf-mcp at the package version',
    initialize?.serverInfo?.name === 'claude-faf-mcp' && initialize?.serverInfo?.version === version,
    JSON.stringify(initialize?.serverInfo));
  const tools = (results[0]?.result?.tools ?? []).map((t) => t.name).sort();
  const listed = (manifest.tools ?? []).map((t) => t.name).sort();
  check('tools/list == the tools manifest.json lists', tools.length > 0 && JSON.stringify(tools) === JSON.stringify(listed), `${tools.length} live, ${listed.length} in the manifest`);
  const resources = (results[1]?.result?.resources ?? []).map((r) => r.uri).sort();
  check('resources/list answers', resources.length > 0, resources.join(', '));
  const score = results[2]?.result;
  check('faf_score answers from the bundle', !!score && !score.isError && typeof score.structuredContent?.score === 'number',
    score?.isError ? String(score.content?.[0]?.text ?? '').slice(0, 200) : `score ${score?.structuredContent?.score}`);

  if (failed) throw new Error(`${failed} check(s) failed — no sha recorded`);
  console.log(`\nALL PASS — ${path.basename(file)} runs its own bundle`);

  if (record) {
    execFileSync(process.execPath, [path.join(root, 'scripts', 'gen-server-card.js'), '--sha', sha], { cwd: root, stdio: 'inherit' });
    console.log(`recorded sha256 ${sha} in server.json — upload exactly this file: ${path.relative(root, file) || file}`);
  }
}

main()
  .catch((error) => {
    console.error(`\nverify-mcpb: ${error && error.message ? error.message : error}`);
    process.exitCode = 1;
  })
  .finally(() => {
    for (const d of temps) fs.rmSync(d, { recursive: true, force: true });
  });
