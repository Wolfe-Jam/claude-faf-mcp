/**
 * WJTTC — faf-cli 8.10.0, The Human Slots Edition, in claude-faf-mcp.
 *
 * The goal and the six W's are human slots: AI suggests, a person confirms.
 * faf-cli 8.10.0 leaves them empty and offers suggestions (suggestIntent).
 * Here the same rule holds for every tool:
 *  - faf_go (no answers) offers each suggestion with its source, to confirm;
 *    only answers passed back to faf_go are written.
 *  - faf_readme suggests; apply writes nothing.
 *  - faf_init and faf_auto say how many suggestions are waiting.
 */
import { describe, test, expect, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { parse as parseYaml } from 'yaml';
import { FafToolHandler } from '../src/handlers/tools.js';
import { FafEngineAdapter } from '../src/handlers/engine-adapter.js';

const sandboxes: string[] = [];
afterAll(() => { for (const d of sandboxes) {fs.rmSync(d, { recursive: true, force: true });} });

function sandbox(tag: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `cfm-810-${tag}-`));
  sandboxes.push(d);
  return d;
}
function handler(cwd?: string): FafToolHandler {
  const engine = new FafEngineAdapter('native');
  if (cwd) {engine.setWorkingDirectory(cwd);}
  return new FafToolHandler(engine);
}
function text(r: { content?: unknown }): string {
  return ((r.content as Array<{ text?: string }> | undefined)?.[0]?.text) ?? '';
}

const TAGLINE = 'A tiny parser that turns small config files into typed objects for Node.js apps.';
const WHY = 'Hand-rolled config parsing breaks on edge cases and gives you untyped data.';

/** A repo with a README tagline, a Why section and a package.json description. */
function repo(tag: string, faf?: string): string {
  const d = sandbox(tag);
  fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name: 'tinyconf', version: '1.0.0', description: 'Parse small config files into typed objects', main: 'index.js' }));
  fs.writeFileSync(path.join(d, 'README.md'), `# tinyconf\n\n${TAGLINE}\n\n## Why\n\n${WHY}\n\n## How to install\n\nnpm i tinyconf\n`);
  fs.writeFileSync(path.join(d, 'index.js'), 'module.exports = {};\n');
  if (faf !== undefined) {fs.writeFileSync(path.join(d, 'project.faf'), faf);}
  return d;
}

const EMPTY_HUMAN = 'faf_version: "3.0"\nproject:\n  name: tinyconf\n  goal: ""\nhuman_context:\n  who: ""\n  what: ""\n  why: ""\n  where: ""\n  when: ""\n  how: ""\n';

describe('faf_readme suggests; it never writes a human slot', () => {
  test('apply: true leaves project.faf byte for byte, and lists the suggestions with their sources', async () => {
    const dir = repo('readme', EMPTY_HUMAN);
    const fafPath = path.join(dir, 'project.faf');
    const r = await handler().callTool('faf_readme', { path: dir, apply: true });
    expect(r.isError).toBeFalsy();
    expect(fs.readFileSync(fafPath, 'utf-8')).toBe(EMPTY_HUMAN);
    const out = text(r);
    expect(out).toContain(WHY);
    expect(out).toContain('README.md § Why');
    expect(out).toContain('faf_go');
  });

  test('the install line under "How to install" is never offered as how', async () => {
    const dir = repo('readme-how', EMPTY_HUMAN);
    const out = text(await handler().callTool('faf_readme', { path: dir }));
    expect(out).not.toContain('npm i tinyconf');
  });

  test('faf_readme is marked read-only', async () => {
    const tools = (await handler().listTools()).tools as Array<{ name: string; annotations?: { readOnlyHint?: boolean } }>;
    const prev = process.env.FAF_TOOLS;
    process.env.FAF_TOOLS = 'all';
    try {
      const all = (await handler().listTools()).tools as Array<{ name: string; annotations?: { readOnlyHint?: boolean } }>;
      const readme = [...tools, ...all].find((t) => t.name === 'faf_readme');
      expect(readme?.annotations?.readOnlyHint).toBe(true);
    } finally {
      if (prev === undefined) {delete process.env.FAF_TOOLS;} else {process.env.FAF_TOOLS = prev;}
    }
  });
});

describe('faf_go offers suggestions to confirm, and writes only answers', () => {
  test('an empty why comes with the README suggestion and its source; the file is not changed', async () => {
    const dir = repo('go', EMPTY_HUMAN);
    const fafPath = path.join(dir, 'project.faf');
    const r = await handler().callTool('faf_go', { path: dir });
    expect(r.isError).toBeFalsy();
    expect(fs.readFileSync(fafPath, 'utf-8')).toBe(EMPTY_HUMAN);
    const reply = JSON.parse(text(r));
    const why = reply.questions.find((q: { field: string }) => q.field === 'human_context.why');
    expect(why.suggested).toBe(WHY);
    expect(why.source).toBe('README.md § Why');
    const goal = reply.questions.find((q: { field: string }) => q.field === 'project.goal');
    expect(goal.suggested).toBe(TAGLINE);
  });

  test('a confirmed answer is written as given', async () => {
    const dir = repo('go-answer', EMPTY_HUMAN);
    const r = await handler().callTool('faf_go', { path: dir, answers: { 'human_context.why': WHY } });
    expect(r.isError).toBeFalsy();
    const hc = parseYaml(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8')).human_context;
    expect(hc.why).toBe(WHY);
    expect(hc.who).toBe('');
  });
});

describe('faf_init and faf_auto say how many suggestions are waiting', () => {
  test('faf_init: the human slots stay empty, and the reply points to faf_go', async () => {
    const dir = repo('init');
    const r = await handler().callTool('faf_init', { path: dir });
    expect(r.isError).toBeFalsy();
    const data = parseYaml(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8'));
    expect(data.project.goal ?? '').toBe('');
    expect(data.human_context?.how ?? '').toBe('');
    expect(text(r)).toMatch(/\d+ suggestions? for the goal and the six W's \(README\.md, package\.json\) — confirm (them|it) in faf_go/);
  });

  test('faf_auto: the reply carries the same note', async () => {
    const dir = repo('auto');
    const r = await handler().callTool('faf_auto', { path: dir });
    expect(r.isError).toBeFalsy();
    expect(text(r)).toMatch(/suggestions? for the goal and the six W's .* confirm (them|it) in faf_go/);
  });
});

// ── Review of #168 (Fable 5.2), findings F1, F2, F7, F8 ──

describe('F1 — a row seeded from the goal names its source, and the repo suggestion still reaches the user', () => {
  test('goal filled: what is seeded from it (source project.goal) and faf-cli\'s README suggestion comes too', async () => {
    const dir = repo('go-seeded', EMPTY_HUMAN.replace('  goal: ""', '  goal: "A config parser for small Node.js apps."'));
    const reply = JSON.parse(text(await handler().callTool('faf_go', { path: dir })));
    const what = reply.questions.find((q: { field: string }) => q.field === 'human_context.what');
    expect(what.status).toBe('seeded');
    expect(what.source).toBe('project.goal');
    expect(what.repoSuggestion?.value).toBeTruthy();
    expect(what.repoSuggestion?.source).toBeTruthy();
  });
});

describe('F2 — faf_readme works wherever faf-cli finds suggestions', () => {
  test('a lowercase readme.md', async () => {
    const d = sandbox('readme-lower');
    fs.writeFileSync(path.join(d, 'readme.md'), `# tinyconf\n\n${TAGLINE}\n`);
    fs.writeFileSync(path.join(d, 'project.faf'), EMPTY_HUMAN);
    const r = await handler().callTool('faf_readme', { path: d });
    expect(r.isError).toBeFalsy();
    expect(text(r)).toContain(TAGLINE);
  });

  test('no README at all, only a package.json description', async () => {
    const d = sandbox('readme-none');
    fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name: 'tinyconf', version: '1.0.0', description: 'Parse small config files into typed objects' }));
    fs.writeFileSync(path.join(d, 'project.faf'), EMPTY_HUMAN);
    const r = await handler().callTool('faf_readme', { path: d });
    expect(r.isError).toBeFalsy();
    expect(text(r)).toContain('Parse small config files into typed objects');
    expect(text(r)).toContain('package.json description');
  });
});

describe('F7 — with nothing to suggest, faf_init and faf_auto still say the goal and six W\'s are empty', () => {
  test('a repo with no README and no description', async () => {
    const d = sandbox('nothing');
    fs.writeFileSync(path.join(d, 'package.json'), JSON.stringify({ name: 'bare', version: '1.0.0' }));
    fs.writeFileSync(path.join(d, 'index.js'), '\n');
    const init = await handler().callTool('faf_init', { path: d });
    expect(text(init)).toContain("The goal and six W's are empty: faf_go asks for them.");
    const auto = await handler().callTool('faf_auto', { path: d });
    expect(text(auto)).toContain("The goal and six W's are empty: faf_go asks for them.");
  });
});

describe('F8 — the other writers leave the six W\'s to a person', () => {
  test('faf_quick writes the goal it is given, and no W', async () => {
    const d = sandbox('quick');
    fs.writeFileSync(path.join(d, 'README.md'), `# tinyconf\n\n${TAGLINE}\n\n## Why\n\n${WHY}\n`);
    const r = await handler().callTool('faf_quick', { path: d, input: 'tinyconf, A config parser for small Node.js apps' });
    expect(r.isError).toBeFalsy();
    const data = parseYaml(fs.readFileSync(path.join(d, 'project.faf'), 'utf-8'));
    expect(data.project.goal).toBe('A config parser for small Node.js apps');
    for (const w of ['who', 'what', 'why', 'where', 'when', 'how']) {expect(data.human_context?.[w] ?? '').toBe('');}
  });

  test('a legacy .faf through faf_auto: the goal and six W\'s stay empty', async () => {
    const d = repo('legacy');
    fs.writeFileSync(path.join(d, '.faf'), 'faf_version: "3.0"\nproject:\n  name: tinyconf\n');
    const r = await handler().callTool('faf_auto', { path: d });
    expect(r.isError).toBeFalsy();
    const written = ['project.faf', '.faf'].map((f) => path.join(d, f)).filter((f) => fs.existsSync(f));
    for (const f of written) {
      const data = parseYaml(fs.readFileSync(f, 'utf-8'));
      expect(data.project?.goal ?? '').toBe('');
      for (const w of ['who', 'what', 'why', 'where', 'when', 'how']) {expect(data.human_context?.[w] ?? '').toBe('');}
    }
  });
});
