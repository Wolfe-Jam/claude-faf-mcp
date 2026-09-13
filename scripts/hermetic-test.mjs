#!/usr/bin/env node
/**
 * hermetic-test.mjs — run the test command with a temp HOME and prove the
 * checkout was not written.
 *
 *   node scripts/hermetic-test.mjs bun test [args…]
 *
 * Why a wrapper and not only a bunfig preload: bun reads HOME once, when the
 * process starts (os.homedir() ignores a later process.env.HOME), so the temp
 * HOME has to be in the environment bun starts with. tests/setup/hermetic.ts
 * (the bunfig preload) refuses to run the suite without it.
 *
 * Around the run:
 *   - HOME / USERPROFILE / XDG_* point at a new mkdtemp folder, removed afterwards;
 *   - TMPDIR / TMP / TEMP point at another new mkdtemp folder for this run
 *     (os.tmpdir() in every test), removed afterwards;
 *   - the host's FAF_* and CLAUDE_CONFIG_DIR settings are cleared, so a
 *     developer's environment never changes what a test sees;
 *   - every file in the checkout (except node_modules, .git, dist, coverage and
 *     release bundles) is hashed before and after: a test that writes into the
 *     checkout fails the run, even when every test passed;
 *   - anything a test left in the temp HOME, outside the runtime's own caches,
 *     is listed and fails the run: a test that needs a home folder makes its own;
 *   - anything a test left in the run's temp folder, outside the runtime's own
 *     cache, is listed and fails the run: a test removes every folder it makes
 *     there.
 */
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const [command, ...args] = process.argv.slice(2);
if (!command) {
  console.error('usage: node scripts/hermetic-test.mjs <command> [args…]');
  process.exit(2);
}

const SKIP = new Set(['node_modules', '.git', 'dist', 'coverage', '.mcpb-staging']);
function snapshot(dir) {
  const out = new Map();
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (SKIP.has(e.name) || e.name.endsWith('.mcpb') || e.name.endsWith('.tgz')) continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      let h = 'unreadable';
      try { h = e.isSymbolicLink() ? `link:${fs.readlinkSync(p)}` : createHash('sha256').update(fs.readFileSync(p)).digest('hex'); } catch { /* keep */ }
      out.set(path.relative(dir, p), h);
    }
  };
  walk(dir);
  return out;
}

/** Files in the temp HOME that are not a runtime's own cache. */
const CACHES = [/^Library\/Caches(\/|$)/, /^\.bun(\/|$)/, /^\.cache(\/|$)/, /^\.npm(\/|$)/, /^AppData(\/|$)/, /^\.config\/(bun|npm)(\/|$)/];
/** The runtime's own cache in the temp folder: Node's module compile cache
 *  (os.tmpdir()/node-compile-cache, which tsc 5.7+ turns on). */
const TMP_CACHES = [/^node-compile-cache(\/|$)/];
/** Everything left under `dir` (a file, a link, or a folder with nothing in
 *  it), except what matches `skip`. */
function leftIn(dir, skip = []) {
  const out = [];
  const walk = (d) => {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    if (entries.length === 0 && d !== dir) out.push(`${path.relative(dir, d).split(path.sep).join('/')}/`);
    for (const e of entries) {
      const p = path.join(d, e.name);
      const rel = path.relative(dir, p).split(path.sep).join('/');
      if (skip.some((re) => re.test(rel))) continue;
      if (e.isDirectory()) walk(p); else out.push(rel);
    }
  };
  walk(dir);
  return out;
}

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cfm-test-home-'));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cfm-test-tmp-'));
const env = { ...process.env };
for (const k of ['FAF_TOOLS', 'FAF_EXTENDED', 'FAF_WORKING_DIR', 'MCP_WORKING_DIR', 'FAF_ALLOWED_ROOTS', 'CLAUDE_CONFIG_DIR', 'FAF_DEBUG']) delete env[k];
Object.assign(env, {
  HOME: home,
  USERPROFILE: home,
  XDG_CONFIG_HOME: path.join(home, '.config'),
  XDG_CACHE_HOME: path.join(home, '.cache'),
  XDG_DATA_HOME: path.join(home, '.local', 'share'),
  TMPDIR: tmp,
  TMP: tmp,
  TEMP: tmp,
  CFM_TEST_HOME: home,
  CFM_TEST_TMP: tmp,
  npm_config_update_notifier: 'false',
});

const before = snapshot(root);
const child = spawn(command, args, { cwd: root, env, stdio: 'inherit', shell: process.platform === 'win32' });
// A timeout or Ctrl-C that stops this wrapper stops the run too (no orphan bun).
for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.on(sig, () => child.kill(sig));
let code = await new Promise((resolve) => {
  child.on('error', (e) => {
    console.error(`hermetic-test: could not run ${command}: ${e.message}`);
    resolve(1);
  });
  child.on('exit', (status, signal) => resolve(status ?? (signal ? 1 : 0)));
});
const after = snapshot(root);

const changed = [...new Set([...before.keys(), ...after.keys()])].filter((k) => before.get(k) !== after.get(k)).sort();
if (changed.length) {
  console.error(`\nhermetic-test: the run wrote into the checkout (${changed.length} file(s)):\n  ${changed.join('\n  ')}`);
  code = code || 1;
}
const stray = leftIn(home, CACHES).filter((rel) => !rel.endsWith('/'));
if (stray.length) {
  console.error(`\nhermetic-test: the run left files in the temp HOME (${stray.length}); a test that needs a home folder makes its own:\n  ${stray.slice(0, 40).join('\n  ')}`);
  code = code || 1;
}
const strayTmp = leftIn(tmp, TMP_CACHES);
if (strayTmp.length) {
  console.error(`\nhermetic-test: the run left ${strayTmp.length} path(s) in its temp folder (TMPDIR); a test removes every folder it makes there:\n  ${strayTmp.slice(0, 40).join('\n  ')}`);
  code = code || 1;
}
fs.rmSync(home, { recursive: true, force: true });
fs.rmSync(tmp, { recursive: true, force: true });
process.exit(code);
