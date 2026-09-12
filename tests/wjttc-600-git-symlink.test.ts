/**
 * 🔒 WJTTC 6.0.0 — W4 security: faf_git never follows a cloned repo's links
 *
 * Found in W2: a repo whose README.md is a symbolic link to a file outside the
 * clone had that file's text read into project.goal and human_context.what.
 * claude-faf-mcp's own clone passes `-c core.symlinks=false` (and `--depth 1`),
 * so git checks every link out as a plain text file holding the link's target
 * path — never the target's bytes.
 *
 * The repo here is real: a local bare repository, pushed from a work tree
 * whose README.md is a link (mode 120000) to a mkdtemp "secret" file. faf_git
 * is called over MCP with a github.com URL, which git maps to that bare repo
 * through `url.<file-url>.insteadOf` in the environment (GIT_CONFIG_COUNT), so
 * no network is used. The secret's text must appear in no tool output and in
 * no file anywhere under the test's folders — except the secret itself.
 *
 * The link is written into git's index directly (hash-object + update-index),
 * so the test needs no symlink permission on Windows.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { pathToFileURL } from 'url';
import { ClaudeFafMcpServer } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

type R = { isError?: boolean; content: Array<{ type: string; text?: string }>; structuredContent?: any };

const SECRET = `CFM-SECRET-${Math.random().toString(36).slice(2)}-must-never-leak`;
const URL_IN = 'https://github.com/cfm-test/linked-readme';
const tmpRoots: string[] = [];
const savedEnv: Record<string, string | undefined> = {};
let root: string;
let secretFile: string;
let client: Client;
let server: ClaudeFafMcpServer;

const git = (args: string[], cwd: string, input?: string): string =>
  execFileSync('git', ['-c', 'user.name=cfm-test', '-c', 'user.email=cfm@test.invalid', '-c', 'init.defaultBranch=main', ...args], {
    cwd, input, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'],
  }).trim();

/** Every file under `dir` that contains `needle`. */
function filesContaining(dir: string, needle: string): string[] {
  const hits: string[] = [];
  const walk = (d: string): void => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {walk(p); continue;}
      if (!e.isFile()) {continue;}
      if (fs.readFileSync(p).includes(needle)) {hits.push(p);}
    }
  };
  walk(dir);
  return hits;
}

beforeAll(async () => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'cfm-git-link-'));
  tmpRoots.push(root);
  secretFile = path.join(root, 'secret', 'credentials.txt');
  fs.mkdirSync(path.dirname(secretFile));
  // Written like a README, so detection would take its line as the goal if it
  // ever read the file through the link.
  fs.writeFileSync(secretFile, `# Internal notes\n\n${SECRET} is the deploy key for the production database cluster.\n`);

  // A work tree with a real package.json and a README.md that is a link to the secret.
  const work = path.join(root, 'work');
  fs.mkdirSync(work);
  git(['init', '--quiet'], work);
  // No description: the goal would come from the README.
  fs.writeFileSync(path.join(work, 'package.json'), JSON.stringify({ name: 'linked-readme', version: '1.0.0' }, null, 2));
  git(['add', 'package.json'], work);
  const blob = git(['hash-object', '-w', '--stdin'], work, secretFile);
  git(['update-index', '--add', '--cacheinfo', `120000,${blob},README.md`], work);
  git(['commit', '--quiet', '-m', 'README is a link'], work);
  const bare = path.join(root, 'remote.git');
  git(['init', '--quiet', '--bare', bare], root);
  git(['push', '--quiet', bare, 'HEAD:refs/heads/main'], work);
  git(['--git-dir', bare, 'symbolic-ref', 'HEAD', 'refs/heads/main'], root);

  // git maps the github.com URL faf-cli normalises to the local bare repo.
  for (const k of ['GIT_CONFIG_COUNT', 'GIT_CONFIG_KEY_0', 'GIT_CONFIG_VALUE_0', 'FAF_TOOLS']) {savedEnv[k] = process.env[k];}
  process.env.GIT_CONFIG_COUNT = '1';
  process.env.GIT_CONFIG_KEY_0 = `url.${pathToFileURL(bare).href}.insteadOf`;
  process.env.GIT_CONFIG_VALUE_0 = `${URL_IN}.git`;
  process.env.FAF_TOOLS = 'all';

  server = new ClaudeFafMcpServer({ transport: 'stdio' });
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  await server.getServer().connect(serverT);
  client = new Client({ name: 'wjttc-git-link', version: '1.0.0' }, { capabilities: {} });
  await client.connect(clientT);
});

afterAll(async () => {
  await client.close();
  await server.getServer().close();
  for (const d of tmpRoots) {fs.rmSync(d, { recursive: true, force: true });}
  for (const [k, v] of Object.entries(savedEnv)) {
    if (v === undefined) {delete process.env[k];} else {process.env[k] = v;}
  }
});

describe('🔒 faf_git — a link in the cloned repo is a plain file, never the file it points to', () => {
  test('the fixture is what it claims: the repo\'s README.md is a link to the secret', () => {
    const check = fs.mkdtempSync(path.join(root, 'check-'));
    execFileSync('git', ['clone', '--quiet', process.env.GIT_CONFIG_VALUE_0 as string, 'c'], {
      cwd: check, stdio: 'pipe', env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
    });
    const readme = path.join(check, 'c', 'README.md');
    // A default clone on a system with links makes a link whose target is the secret.
    if (fs.lstatSync(readme).isSymbolicLink()) {
      expect(fs.readlinkSync(readme)).toBe(secretFile);
      expect(fs.readFileSync(readme, 'utf-8')).toContain(SECRET);
    } else {
      expect(fs.readFileSync(readme, 'utf-8')).toBe(secretFile); // core.symlinks=false by default (Windows)
    }
    fs.rmSync(check, { recursive: true, force: true });
  });

  test('faf_git writes project.faf from the clone, and the secret\'s text is in no reply and no file', async () => {
    const out = path.join(root, 'out', 'app');
    fs.mkdirSync(out, { recursive: true });
    const r = (await client.callTool({ name: 'faf_git', arguments: { url: URL_IN, path: out } })) as R;
    const reply = JSON.stringify(r);
    expect(r.isError).toBeFalsy();
    expect(fs.existsSync(path.join(out, 'project.faf'))).toBe(true);
    expect(fs.readFileSync(path.join(out, 'project.faf'), 'utf-8')).toContain('linked-readme');
    expect(reply).not.toContain(SECRET);
    // Nowhere on disk but the secret file itself (the temp clone is removed).
    expect(filesContaining(root, SECRET).filter((p) => p !== secretFile)).toEqual([]);
  });

  test('the preview (no path) returns the .faf text without the secret, and writes nothing', async () => {
    const r = (await client.callTool({ name: 'faf_git', arguments: { url: URL_IN } })) as R;
    expect(r.isError).toBeFalsy();
    expect(JSON.stringify(r)).not.toContain(SECRET);
    expect(r.content.map((c) => c.text ?? '').join('\n')).toContain('linked-readme');
    expect(filesContaining(root, SECRET).filter((p) => p !== secretFile)).toEqual([]);
  });
});
