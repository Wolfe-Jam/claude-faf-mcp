#!/usr/bin/env node
/**
 * smoke-package.mjs — install what npm would ship and start it, as a user does.
 *
 *   1. npm pack          the tarball `npm publish` would upload
 *   2. npm install       that tarball into a new temp folder (its own node_modules)
 *   3. start the bin     the installed package's `bin` (dist/src/index.js), with a temp HOME
 *   4. talk              initialize → tools/list → faf_score on a temp project:
 *                        serverInfo.version is package.json's, tools/list is the
 *                        Core manifest.json lists, faf_score answers
 *
 * Runs in CI (release-verify, ubuntu/macos/windows × Node 22/24) and by hand:
 *   node scripts/smoke-package.mjs
 * Exit 0 = the installed package starts and answers; 1 = it does not.
 */
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { talk } from './lib/mcp-stdio.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf-8'));
const shell = process.platform === 'win32';
const temps = [];
const tmp = (prefix) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix)); temps.push(d); return d; };

let failed = 0;
const check = (name, ok, detail = '') => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
  if (!ok) failed++;
};
const npm = (args, cwd, env = process.env) => {
  const r = spawnSync('npm', args, { cwd, env, encoding: 'utf-8', shell });
  if (r.status !== 0) throw new Error(`npm ${args.join(' ')} exited ${r.status}: ${(r.stderr || r.stdout || '').slice(-1200)}`);
  return r.stdout;
};

async function main() {
  const out = tmp('cfm-pack-');
  const home = tmp('cfm-pack-home-');
  const env = { ...process.env, HOME: home, USERPROFILE: home, npm_config_update_notifier: 'false', npm_config_fund: 'false', npm_config_audit: 'false' };

  const packed = JSON.parse(npm(['pack', '--json', '--pack-destination', out], root, env));
  const tarball = path.join(out, packed[0].filename);
  check('npm pack wrote the tarball', fs.existsSync(tarball), path.basename(tarball));

  const app = tmp('cfm-install-');
  fs.writeFileSync(path.join(app, 'package.json'), JSON.stringify({ name: 'cfm-install-check', version: '0.0.0', private: true }));
  npm(['install', '--no-save', tarball], app, env);
  const installed = path.join(app, 'node_modules', pkg.name);
  const ipkg = JSON.parse(fs.readFileSync(path.join(installed, 'package.json'), 'utf-8'));
  const bin = path.join(installed, ipkg.bin[pkg.name]);
  check('the installed package has its bin', fs.existsSync(bin), path.relative(app, bin));
  check('the installed package is this version', ipkg.version === pkg.version, ipkg.version);

  const project = path.join(tmp('cfm-install-project-'), 'app');
  fs.mkdirSync(project);
  fs.writeFileSync(path.join(project, 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: install-check\n  goal: Check the installed bin answers\n');
  const serverEnv = { ...env, CLAUDE_CONFIG_DIR: path.join(home, '.claude') };
  for (const k of ['FAF_TOOLS', 'FAF_EXTENDED', 'FAF_WORKING_DIR', 'MCP_WORKING_DIR', 'FAF_ALLOWED_ROOTS']) delete serverEnv[k];

  const { initialize, results } = await talk({
    command: process.execPath,
    args: [bin],
    cwd: project,
    env: serverEnv,
    requests: [
      { method: 'tools/list' },
      { method: 'tools/call', params: { name: 'faf_score', arguments: { path: project } } },
    ],
  });
  check('initialize: serverInfo is claude-faf-mcp at the package version',
    initialize?.serverInfo?.name === pkg.name && initialize?.serverInfo?.version === pkg.version, JSON.stringify(initialize?.serverInfo));
  const tools = (results[0]?.result?.tools ?? []).map((t) => t.name).sort();
  const core = (manifest.tools ?? []).map((t) => t.name).sort();
  check('tools/list is the Core manifest.json lists', JSON.stringify(tools) === JSON.stringify(core), `${tools.length} live, ${core.length} in the manifest`);
  const score = results[1]?.result;
  check('faf_score answers', !!score && !score.isError && typeof score.structuredContent?.score === 'number',
    score?.isError ? String(score.content?.[0]?.text ?? '').slice(0, 200) : `score ${score?.structuredContent?.score}`);

  if (failed) throw new Error(`${failed} check(s) failed`);
  console.log(`\nALL PASS — ${pkg.name}@${pkg.version} installs from its tarball and answers on Node ${process.version}`);
}

main()
  .catch((error) => {
    console.error(`\nsmoke-package: ${error && error.message ? error.message : error}`);
    process.exitCode = 1;
  })
  .finally(() => {
    for (const d of temps) fs.rmSync(d, { recursive: true, force: true });
  });
