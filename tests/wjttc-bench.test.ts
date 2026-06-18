import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FafToolHandler } from '../src/handlers/tools.js';
import { FafEngineAdapter } from '../src/handlers/engine-adapter';
import { FafPromptHandler } from '../src/handlers/prompts.js';
import { fafCli } from '../src/utils/faf-cli-bridge.js';

// WJTTC — faf_bench, the in-session AI-grounding benchmark.
//
// BRAKE: never leak the answer key (a tool that prints it makes the benchmark a
//   lie); the receipt seals the result; deterministic qset from the .faf.
// ENGINE: questions → grade flow; the cold→with-faf delta is the product;
//   grading is mechanical; the render ends in a prescription, never a verdict.

const testDir = path.join(process.cwd(), 'test-faf-bench');
const FAF = `project:
  name: bench-fixture
  goal: prove the benchmark grades the delta
  main_language: TypeScript
human_context:
  who: FAF developers
  what: a benchmark fixture project
  why: to verify faf_bench end to end
  where: CI
  when: build time
  how: bun test
stack:
  backend: Node.js
`;

const newHandler = () => {
  const engine = new FafEngineAdapter('native');
  engine.setWorkingDirectory(testDir);
  return new FafToolHandler(engine);
};

beforeAll(() => {
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'project.faf'), FAF);
});
afterAll(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
});

describe('BRAKE — faf_bench never leaks the answer key', () => {
  test('action=questions returns questions + qsetHash, and NO answers anywhere', async () => {
    const res = await newHandler().callTool('faf_bench', { action: 'questions' });
    const sc: any = res.structuredContent;
    expect(sc.action).toBe('questions');
    expect(sc.qsetHash).toBeTruthy();
    expect(sc.total).toBeGreaterThan(0);
    expect(Array.isArray(sc.questions)).toBe(true);
    // No answer key in the projection — not as a field, not as a key.
    expect(sc.answers).toBeUndefined();
    expect(JSON.stringify(sc)).not.toContain('"answers"');
    // Each question carries ONLY n / path / question — never an answer.
    for (const q of sc.questions) {
      expect(Object.keys(q).sort()).toEqual(['n', 'path', 'question']);
    }
  });
});

describe('ENGINE — faf_bench grades the cold→with-faf delta', () => {
  test('perfect faf answers + empty cold → full delta + ✪ receipt', async () => {
    const { deriveQuestionSet } = await fafCli;
    const qset = deriveQuestionSet(FAF);
    const N = qset.questions.length;
    expect(N).toBeGreaterThan(0);

    // A test MAY peek at the answer key to simulate a perfect with-faf run.
    const fafAnswers: Record<string, string> = {};
    for (const [n, ans] of Object.entries(qset.answers)) fafAnswers[String(n)] = ans as string;

    const res = await newHandler().callTool('faf_bench', {
      action: 'grade',
      cold: {},            // answered nothing without the .faf
      faf: fafAnswers,     // answered everything with it
    });
    const sc: any = res.structuredContent;
    expect(sc.action).toBe('grade');
    expect(sc.protocol).toBe('in-session');
    expect(sc.total).toBe(N);
    expect(sc.cold.correct).toBe(0);
    expect(sc.faf.correct).toBe(N);
    expect(sc.delta).toBe(N);
    expect(sc.receipt.hash).toMatch(/^[0-9a-f]{16,}$/);
  });

  test('grade with no answers is refused', async () => {
    const res = await newHandler().callTool('faf_bench', { action: 'grade' });
    expect(res.isError).toBe(true);
  });

  test('the render shows the pair + a prescription + the ✪, never a bare cold verdict', async () => {
    const { deriveQuestionSet } = await fafCli;
    const qset = deriveQuestionSet(FAF);
    const fafAnswers: Record<string, string> = {};
    for (const [n, ans] of Object.entries(qset.answers)) fafAnswers[String(n)] = ans as string;

    const res = await newHandler().callTool('faf_bench', { action: 'grade', cold: {}, faf: fafAnswers });
    const text = (res.content[0] as any).text as string;
    expect(text).toContain('Without context:');
    expect(text).toContain('With FAF:');
    expect(text).toContain('Delta:');
    expect(text).toContain('Prescription:');
    expect(text).toContain('✪');
  });
});

describe('ENGINE — the /faf-bench two-pass protocol prompt', () => {
  const prompts = new FafPromptHandler();

  test('/faf-bench is registered with a path arg', () => {
    const list = prompts.listPrompts().prompts;
    const bench = list.find((p) => p.name === '/faf-bench');
    expect(bench).toBeDefined();
    expect(bench!.arguments?.[0]?.name).toBe('path');
  });

  test('the prompt drives an honest two-pass run (cold blind, then with-faf)', () => {
    const text = prompts.getPrompt('/faf-bench').messages[0].content.text;
    expect(text).toContain('action: "questions"');
    expect(text).toContain('action: "grade"');
    expect(text).toContain('DO NOT read project.faf yet');     // cold must be blind
    expect(text).toContain('NEVER invent token counts');        // token honesty
    expect(text).toContain('never present the cold number alone as a verdict'); // bench doctrine
  });

  test('path arg flows into the prompt', () => {
    const text = prompts.getPrompt('/faf-bench', { path: '/tmp/demo' }).messages[0].content.text;
    expect(text).toContain('/tmp/demo');
  });

  test('the original /faf prompt still works; unknown still throws', () => {
    expect(prompts.getPrompt('/faf').messages[0].content.text).toContain('/faf');
    expect(() => prompts.getPrompt('/nope')).toThrow();
  });
});

describe('ENGINE — faf_bench needs a .faf', () => {
  test('no project.faf → a clear prescription, not a crash', async () => {
    // Under os.tmpdir() so findFafFile has no ancestor .faf to walk up into
    // (a dir inside this repo would resolve to the repo's own project.faf).
    const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-bench-empty-'));
    try {
      const engine = new FafEngineAdapter('native');
      engine.setWorkingDirectory(emptyDir);
      const res = await new FafToolHandler(engine).callTool('faf_bench', { action: 'questions' });
      expect(res.isError).toBe(true);
      expect((res.content[0] as any).text).toContain('project.faf');
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});
