/**
 * WJTTC 5.23 — project.faf and soul.fafm are faf-cli's own bytes.
 *
 * faf_init, faf_auto (and faf_go's bootstrap, which runs both) write project.faf
 * through faf-cli: assembleFreshFaf for a new file, updateExistingFaf for an
 * existing one, writeFaf for the bytes, scoreFafYaml for the number reported.
 * faf_etch saves the project soul through faf-cli's FafmSoul, so nothing a soul
 * carries beyond its facts is dropped. The reference for every assertion is
 * faf-cli itself, run on a copy of the same fixture.
 *
 * Isolation: every case uses a mkdtemp sandbox under os.tmpdir() and passes it
 * explicitly; the repo's own CLAUDE.md / project.faf must never change. No network.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import { ClaudeFafMcpServer } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { FafToolHandler } from '../src/handlers/tools.js';
import { FafEngineAdapter } from '../src/handlers/engine-adapter.js';
import { fafCli } from '../src/utils/faf-cli-bridge.js';

const { assembleFreshFaf, updateExistingFaf, writeFaf, readFaf, readFafRaw, scoreFafYaml, FafmSoul } = await fafCli;

const ROOT = path.resolve(import.meta.dir, '..');
const REPO_GUARDED = ['CLAUDE.md', 'project.faf'].map((f) => path.join(ROOT, f));

const read = (p: string): string => fs.readFileSync(p, 'utf-8');

const sandboxes: string[] = [];
function sandbox(tag: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `cfm-523w-${tag}-`));
  sandboxes.push(d);
  return d;
}

/** A small real repo: faf-cli detects its name, goal, language and backend. */
function writeRepo(dir: string): void {
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'acme-widgets', version: '1.0.0', description: 'Widgets for acme', dependencies: { express: '^4.0.0' } }, null, 2),
  );
  fs.writeFileSync(path.join(dir, 'README.md'), '# acme-widgets\n\nA widget API for Acme.\n');
}

/** What faf-cli writes for a new project.faf in a copy of the fixture repo. */
function fafCliFresh(): string {
  const d = sandbox('ref-fresh');
  writeRepo(d);
  writeFaf(path.join(d, 'project.faf'), assembleFreshFaf(d) as any);
  return read(path.join(d, 'project.faf'));
}

/** What faf-cli writes when it updates `existing` in a copy of the fixture repo. */
function fafCliUpdated(existing: string): string {
  const d = sandbox('ref-update');
  writeRepo(d);
  const p = path.join(d, 'project.faf');
  fs.writeFileSync(p, existing);
  writeFaf(p, updateExistingFaf(d, readFaf(p) as unknown as Record<string, unknown>) as any);
  return read(p);
}

function toolText(result: { content?: unknown }): string {
  const block = (result.content as Array<{ type?: string; text?: string }> | undefined)?.[0];
  return block?.text ?? '';
}

describe('WJTTC 5.23 — project.faf and soul.fafm compose faf-cli', () => {
  let server: ClaudeFafMcpServer;
  let client: Client;
  const repoBefore = new Map<string, string>();

  beforeAll(async () => {
    for (const p of REPO_GUARDED) {if (fs.existsSync(p)) {repoBefore.set(p, read(p));}}
    server = new ClaudeFafMcpServer({ transport: 'stdio', fafEnginePath: 'native' });
    const [clientT, serverT] = InMemoryTransport.createLinkedPair();
    await server.getServer().connect(serverT);
    client = new Client({ name: 'wjttc-523-writers', version: '1.0.0' }, { capabilities: {} });
    await client.connect(clientT);
  });

  afterAll(async () => {
    try { await client.close(); } catch { /* best-effort teardown */ }
    try { await server.getServer().close(); } catch { /* best-effort teardown */ }
    for (const d of sandboxes) {fs.rmSync(d, { recursive: true, force: true });}
    for (const [p, before] of repoBefore) {
      if (read(p) !== before) {
        fs.writeFileSync(p, before, 'utf-8');
        throw new Error(`ISOLATION BREACH: ${path.basename(p)} in the repo root was changed — restored`);
      }
    }
  });

  test('faf_init writes faf-cli assembleFreshFaf + writeFaf bytes, reports scoreFafYaml, and makes the project current', async () => {
    const dir = sandbox('init');
    writeRepo(dir);
    const elsewhere = sandbox('init-elsewhere');
    const engine = new FafEngineAdapter('native');
    engine.setWorkingDirectory(elsewhere);
    const handler = new FafToolHandler(engine);

    const r = await handler.callTool('faf_init', { path: dir });
    expect(r.isError).toBeFalsy();

    const written = read(path.join(dir, 'project.faf'));
    expect(written).toBe(fafCliFresh());
    const score = scoreFafYaml(written);
    expect(toolText(r)).toContain(`${score.score}/100 (${score.populated}/${score.active} slots populated)`);
    expect(engine.getWorkingDirectory()).toBe(dir); // the next steps act on the new project
  });

  test('faf_go applies answers to the file faf_init wrote', async () => {
    const dir = sandbox('init-go');
    writeRepo(dir);
    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    expect((await handler.callTool('faf_init', { path: dir })).isError).toBeFalsy();

    const r = await handler.callTool('faf_go', {
      path: dir,
      answers: { 'project.goal': 'Ship widgets to Acme', 'human_context.who': 'Acme developers' },
    });
    expect(r.isError).toBeFalsy();
    expect(toolText(r)).toContain('Answers Applied');

    const data = parseYaml(read(path.join(dir, 'project.faf')));
    expect(data.project.name).toBe('acme-widgets');
    expect(data.project.goal).toBe('Ship widgets to Acme');
    expect(data.human_context.who).toBe('Acme developers');
  });

  test('CLAUDE.md written after faf_init carries the real project name', async () => {
    const dir = sandbox('init-sync');
    writeRepo(dir);
    expect((await client.callTool({ name: 'faf_init', arguments: { path: dir } })).isError).toBeFalsy();
    const r = await client.callTool({ name: 'faf_sync', arguments: { path: dir } });
    expect(r.isError).toBeFalsy();

    const md = read(path.join(dir, 'CLAUDE.md'));
    expect(md).toContain('# CLAUDE.md — acme-widgets');
    expect(md).not.toContain('# CLAUDE.md — Project');
  });

  test('faf_auto on a new project: faf-cli assembleFreshFaf bytes; Before/After are scoreFafYaml', async () => {
    const dir = sandbox('auto-new');
    writeRepo(dir);
    const r = await client.callTool({ name: 'faf_auto', arguments: { path: dir } });
    expect(r.isError).toBeFalsy();

    const written = read(path.join(dir, 'project.faf'));
    expect(written).toBe(fafCliFresh());
    expect(toolText(r)).toContain(`Before: 0% | After: ${scoreFafYaml(written).score}%`);
  });

  test('faf_auto on an existing project.faf: faf-cli updateExistingFaf bytes (existing values win); Before/After are scoreFafYaml', async () => {
    const EXISTING = [
      'faf_version: "3.0"',
      'project:',
      '  name: acme-widgets',
      '  goal: Our own goal — must survive',
      'human_context:',
      '  who: Acme developers',
      '',
    ].join('\n');
    const dir = sandbox('auto-existing');
    writeRepo(dir);
    fs.writeFileSync(path.join(dir, 'project.faf'), EXISTING);

    const r = await client.callTool({ name: 'faf_auto', arguments: { path: dir } });
    expect(r.isError).toBeFalsy();

    const written = read(path.join(dir, 'project.faf'));
    expect(written).toBe(fafCliUpdated(EXISTING));
    expect(parseYaml(written).project.goal).toBe('Our own goal — must survive');
    expect(toolText(r)).toContain(`Before: ${scoreFafYaml(EXISTING).score}% | After: ${scoreFafYaml(written).score}%`);
  });

  test('faf_auto refuses a project.faf that is not a YAML mapping and leaves it byte-identical', async () => {
    const dir = sandbox('auto-scalar');
    writeRepo(dir);
    fs.writeFileSync(path.join(dir, 'project.faf'), 'oops\n');
    const r = await client.callTool({ name: 'faf_auto', arguments: { path: dir } });
    expect(r.isError).toBe(true);
    expect(read(path.join(dir, 'project.faf'))).toBe('oops\n');
  });

  test('faf_etch keeps everything a faf-cli soul carries — index, preferences, custom, unknown keys', async () => {
    const dir = sandbox('etch');
    const soulPath = path.join(dir, 'soul.fafm');
    // A soul written by faf-cli itself (the same writer `faf memory etch` uses).
    const soul = new FafmSoul('@claude-code:etch', {
      profile: 'knowledge',
      preferences: { tone: 'terse' },
      custom: { team: 'core' },
      extra: { x_vendor: { plan: 'pro' } },
      memoryExtra: { x_notes: ['keep me'] },
    });
    soul.etch('Use Vitest, Jest chokes on ESM', { id: 'f1', type: 'project', priority: 'high', tags: ['decision'] });
    soul.add({
      text: 'Never touch api/', id: 'f2', type: 'project', priority: 'critical', tags: ['gotcha'], links: [],
      timestamp: '2026-01-01T00:00:00Z', source: null, extra: { x_fact: 'keep' },
    });
    soul.toFile(soulPath);
    const before = FafmSoul.load(soulPath);
    expect(before.index.length).toBe(2);

    const r = await client.callTool({ name: 'faf_etch', arguments: { path: dir, text: 'Deploys go through CI', id: 'f3', priority: 'standard' } });
    expect(r.isError).toBeFalsy();

    const after = FafmSoul.load(soulPath);
    expect(after.facts.map((f) => f.id)).toEqual(['f1', 'f2', 'f3']);
    expect(after.getFact('f2')?.extra).toEqual({ x_fact: 'keep' });
    expect(after.preferences).toEqual({ tone: 'terse' });
    expect(after.custom).toEqual({ team: 'core' });
    expect(after.extra).toEqual({ x_vendor: { plan: 'pro' } });
    expect(after.memoryExtra).toEqual({ x_notes: ['keep me'] });
    for (const line of before.index) {expect(after.index).toContain(line);}
    expect(after.index.some((l) => l.startsWith('f3'))).toBe(true);
    expect(parseYaml(readFafRaw(soulPath))).toHaveProperty('index');
  });
});
