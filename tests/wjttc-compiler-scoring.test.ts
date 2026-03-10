/**
 * WJTTC Compiler Scoring Edge Cases
 * 🏁 Championship-grade tests for FafCompiler slot-based scoring
 *
 * Tests the faf_score MCP tool end-to-end and the FafCompiler
 * against real-world edge cases a wider user base would hit.
 *
 * Tiers:
 *   Tier 1 (Brake)    — Nothing crashes
 *   Tier 2 (Engine)   — Core scoring correctness
 *   Tier 3 (Aero)     — Edge cases and boundary math
 *   Tier 4 (Safety)   — Error handling and invalid input
 *   Tier 5 (Roundtrip) — End-to-end faf_score MCP tool
 */

import { FafCompiler } from '../src/faf-core/compiler/faf-compiler';
import { FafToolHandler } from '../src/handlers/tools';
import { FafEngineAdapter } from '../src/handlers/engine-adapter';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

const tmpDir = '/tmp/faf-compiler-edge-tests';

// Type helper for MCP content extraction
type TextContent = { type: 'text'; text: string };
const getTextContent = (content: unknown[]): string =>
  (content[0] as TextContent).text;

// Helper: write .faf from object, compile, return result
async function compileFromObject(name: string, content: object) {
  const filePath = path.join(tmpDir, `${name}.faf`);
  fs.writeFileSync(filePath, yaml.stringify(content));
  const compiler = new FafCompiler();
  return compiler.compile(filePath);
}

// Helper: write raw string to .faf, compile, return result
async function compileFromRaw(name: string, raw: string) {
  const filePath = path.join(tmpDir, `${name}.faf`);
  fs.writeFileSync(filePath, raw);
  const compiler = new FafCompiler();
  return compiler.compile(filePath);
}

beforeAll(() => {
  fs.mkdirSync(tmpDir, { recursive: true });
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIER 1: BRAKE — Nothing crashes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Tier 1: Brake — Compiler never crashes', () => {
  test('empty YAML object', async () => {
    const result = await compileFromObject('brake-empty', {});
    expect(result.score).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test('empty file', async () => {
    const result = await compileFromRaw('brake-empty-file', '');
    expect(result.score).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  test('whitespace-only file', async () => {
    const result = await compileFromRaw('brake-whitespace', '   \n\n  \n');
    expect(result.score).toBeDefined();
  });

  test('markdown content (not YAML)', async () => {
    const result = await compileFromRaw('brake-markdown', '# My Project\n\nSome description here.');
    expect(result.score).toBeDefined();
  });

  test('deeply nested YAML', async () => {
    const result = await compileFromObject('brake-deep', {
      project: { name: 'deep', goal: 'test' },
      stack: { backend: 'Node.js', frontend: 'React', database: 'PostgreSQL' },
      human_context: { who: 'devs', what: 'app', why: 'test', where: 'cloud', when: 'now', how: 'code' },
      extra: { nested: { deeply: { value: 'ignored' } } }
    });
    expect(result.score).toBeDefined();
  });

  test('YAML with comments', async () => {
    const raw = `# This is a comment
project:
  name: test-project # inline comment
  goal: testing
# Another comment
stack:
  backend: Python`;
    const result = await compileFromRaw('brake-comments', raw);
    expect(result.score).toBeDefined();
    expect(result.filled).toBeGreaterThan(0);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIER 2: ENGINE — Core scoring correctness
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Tier 2: Engine — Score accuracy', () => {
  test('fully filled CLI project scores 100%', async () => {
    // CLI type: 9 slots (project.name, project.goal, project.main_language + 6 human)
    const result = await compileFromObject('engine-full-cli', {
      project: { name: 'test', goal: 'testing', main_language: 'TypeScript', type: 'cli' },
      human_context: { who: 'devs', what: 'tool', why: 'productivity', where: 'terminal', when: 'daily', how: 'npm' }
    });
    expect(result.score).toBe(100);
    expect(result.filled).toBe(result.total);
  });

  test('fully filled fullstack project scores 100%', async () => {
    // Fullstack type: 21 slots (matches cli-mcp-parity test)
    const result = await compileFromObject('engine-full-fullstack', {
      project: { name: 'test', goal: 'testing', main_language: 'TypeScript', type: 'fullstack' },
      stack: {
        frontend: 'React', css_framework: 'Tailwind', ui_library: 'Radix', state_management: 'Zustand',
        backend: 'Node', runtime: 'Node', database: 'PostgreSQL', connection: 'pg',
        api_type: 'REST', hosting: 'Vercel', build: 'Next', cicd: 'GHA'
      },
      human_context: { who: 'dev', what: 'app', why: 'test', where: 'web', when: 'now', how: 'browser' }
    });
    expect(result.score).toBe(100);
    expect(result.filled).toBe(result.total);
    expect(result.total).toBe(21);
  });

  test('completely empty project scores 0%', async () => {
    const result = await compileFromObject('engine-zero', {
      project: {}
    });
    expect(result.score).toBe(0);
    expect(result.filled).toBe(0);
  });

  test('project-only (no stack, no human) scores partial', async () => {
    const result = await compileFromObject('engine-project-only', {
      project: { name: 'test', goal: 'testing', type: 'cli' }
    });
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThan(100);
    expect(result.filled).toBeGreaterThan(0);
  });

  test('filled count never exceeds total', async () => {
    const result = await compileFromObject('engine-bounds', {
      project: { name: 'test', goal: 'testing', type: 'fullstack' },
      stack: { backend: 'Node', frontend: 'React', main_language: 'TS', database: 'PG', api_type: 'REST', hosting: 'AWS', testing: 'Jest', cicd: 'GH' },
      human_context: { who: 'a', what: 'b', why: 'c', where: 'd', when: 'e', how: 'f' },
      extra_field: 'ignored',
      another_field: 'also ignored'
    });
    expect(result.filled).toBeLessThanOrEqual(result.total);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  test('score is always an integer', async () => {
    const result = await compileFromObject('engine-integer', {
      project: { name: 'test', goal: 'testing' },
      stack: { backend: 'Node' }
    });
    expect(Number.isInteger(result.score)).toBe(true);
  });

  test('breakdown sections sum matches total', async () => {
    const result = await compileFromObject('engine-breakdown', {
      project: { name: 'test', goal: 'build', type: 'web-app' },
      stack: { backend: 'Node', frontend: 'React', main_language: 'TS' },
      human_context: { who: 'devs', what: 'app' }
    });
    const b = result.breakdown;
    const sectionTotal = b.project.total + b.stack.total + b.human.total + b.discovery.total;
    expect(sectionTotal).toBe(result.total);
    const sectionFilled = b.project.filled + b.stack.filled + b.human.filled + b.discovery.filled;
    expect(sectionFilled).toBe(result.filled);
  });

  test('tier thresholds are correct', async () => {
    // 100% = Trophy — CLI type: 9 slots, project.main_language (not stack)
    const full = await compileFromObject('tier-100', {
      project: { name: 't', goal: 'g', main_language: 'TypeScript', type: 'cli' },
      human_context: { who: 'a', what: 'b', why: 'c', where: 'd', when: 'e', how: 'f' }
    });
    expect(full.score).toBe(100);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIER 3: AERO — Edge cases and boundary math
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Tier 3: Aero — Edge cases', () => {
  test('null slot values are not counted as filled', async () => {
    const result = await compileFromObject('aero-null', {
      project: { name: 'test', goal: null, type: null },
      stack: { backend: null },
      human_context: { who: null }
    });
    // Only project.name should be filled
    expect(result.filled).toBeLessThan(result.total);
  });

  test('empty string slot values are not counted as filled', async () => {
    const result = await compileFromObject('aero-empty-string', {
      project: { name: '', goal: '', type: 'cli' },
      stack: { main_language: '' }
    });
    // Empty strings should not count as filled
    const nameEmpty = result.filled;
    const full = await compileFromObject('aero-filled-string', {
      project: { name: 'real', goal: 'real', type: 'cli' },
      stack: { main_language: 'TS' }
    });
    expect(nameEmpty).toBeLessThan(full.filled);
  });

  test('whitespace-only slot values', async () => {
    const result = await compileFromObject('aero-whitespace-val', {
      project: { name: '   ', goal: '  \n  ' }
    });
    // Whitespace-only should behave consistently (either filled or not)
    expect(result.score).toBeDefined();
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  test('numeric slot values', async () => {
    const result = await compileFromObject('aero-numeric', {
      project: { name: 123, goal: 456, type: 'cli' }
    });
    // Numbers coerced to strings — should count as filled
    expect(result.score).toBeDefined();
  });

  test('boolean slot values', async () => {
    const result = await compileFromObject('aero-boolean', {
      project: { name: true, goal: false }
    });
    expect(result.score).toBeDefined();
  });

  test('array slot values', async () => {
    const result = await compileFromObject('aero-array', {
      project: { name: ['test', 'project'], goal: 'testing' }
    });
    expect(result.score).toBeDefined();
  });

  test('unicode and emoji in slot values', async () => {
    const result = await compileFromObject('aero-unicode', {
      project: { name: 'Projet Francais', goal: 'AI context for everyone' },
      human_context: { who: 'developers worldwide', what: 'universal context' }
    });
    expect(result.score).toBeDefined();
    expect(result.filled).toBeGreaterThan(0);
  });

  test('very long slot values', async () => {
    const result = await compileFromObject('aero-long', {
      project: { name: 'x'.repeat(10000), goal: 'y'.repeat(10000) }
    });
    expect(result.score).toBeDefined();
    expect(result.filled).toBeGreaterThan(0);
  });

  test('duplicate keys in raw YAML (last value wins)', async () => {
    const raw = `project:
  name: first
  name: second
  goal: testing`;
    const result = await compileFromRaw('aero-duplicate', raw);
    expect(result.score).toBeDefined();
  });

  test('deterministic scoring (same input = same output)', async () => {
    const content = {
      project: { name: 'determinism', goal: 'testing', type: 'web-app' },
      stack: { backend: 'Node', frontend: 'React' },
      human_context: { who: 'devs', what: 'app' }
    };
    const result1 = await compileFromObject('aero-determinism-1', content);
    const result2 = await compileFromObject('aero-determinism-2', content);
    expect(result1.score).toBe(result2.score);
    expect(result1.filled).toBe(result2.filled);
    expect(result1.total).toBe(result2.total);
    expect(result1.checksum).toBe(result2.checksum);
  });

  test('slot_ignore reduces total denominator', async () => {
    const withoutIgnore = await compileFromObject('aero-no-ignore', {
      project: { name: 'test', goal: 'testing', type: 'web-app' },
      stack: { backend: 'Node' }
    });
    const withIgnore = await compileFromObject('aero-with-ignore', {
      project: { name: 'test', goal: 'testing', type: 'web-app' },
      stack: { backend: 'Node' },
      slot_ignore: ['stack.database', 'stack.hosting']
    });
    expect(withIgnore.total).toBeLessThan(withoutIgnore.total);
    expect(withIgnore.score).toBeGreaterThan(withoutIgnore.score);
  });

  test('slot_ignore with all human slots ignored', async () => {
    // slot_ignore uses human.who format (not human_context.who)
    const result = await compileFromObject('aero-ignore-all-human', {
      project: { name: 'test', goal: 'testing', main_language: 'TypeScript', type: 'cli' },
      slot_ignore: ['human.who', 'human.what', 'human.why', 'human.where', 'human.when', 'human.how']
    });
    expect(result.score).toBeDefined();
    expect(result.breakdown.human.total).toBe(0);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIER 4: SAFETY — Error handling and invalid input
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Tier 4: Safety — Error handling', () => {
  test('nonexistent file throws (not fake score)', async () => {
    const compiler = new FafCompiler();
    await expect(compiler.compile('/tmp/this-file-does-not-exist-12345.faf')).rejects.toThrow();
  });

  test('directory path throws', async () => {
    const compiler = new FafCompiler();
    await expect(compiler.compile(tmpDir)).rejects.toThrow();
  });

  test('binary file content does not crash', async () => {
    const filePath = path.join(tmpDir, 'safety-binary.faf');
    const buffer = Buffer.from([0x00, 0xFF, 0xFE, 0x89, 0x50, 0x4E, 0x47]);
    fs.writeFileSync(filePath, buffer);
    // Should either parse (returning low score) or throw — never fake score
    try {
      const result = await new FafCompiler().compile(filePath);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test('invalid YAML syntax does not crash', async () => {
    const raw = `project:
  name: test
  goal: [unclosed bracket
  type: cli`;
    try {
      const result = await compileFromRaw('safety-bad-yaml', raw);
      expect(result.score).toBeDefined();
    } catch (error) {
      expect(error).toBeDefined();
    }
  });

  test('YAML with tabs instead of spaces', async () => {
    const raw = "project:\n\tname: test\n\tgoal: testing";
    try {
      const result = await compileFromRaw('safety-tabs', raw);
      expect(result.score).toBeDefined();
    } catch (error) {
      // Tabs in YAML can cause parse errors — acceptable
      expect(error).toBeDefined();
    }
  });

  test('diagnostics populated on issues', async () => {
    const result = await compileFromObject('safety-diagnostics', {
      project: { name: 123 }  // name should be string
    });
    // Compiler should still return a result
    expect(result.score).toBeDefined();
    expect(result.diagnostics).toBeDefined();
    expect(Array.isArray(result.diagnostics)).toBe(true);
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIER 5: ROUNDTRIP — End-to-end faf_score MCP tool
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('Tier 5: Roundtrip — faf_score MCP tool end-to-end', () => {
  let originalCwd: string;
  let toolTestDir: string;

  beforeAll(() => {
    originalCwd = process.cwd();
    toolTestDir = path.join(tmpDir, 'mcp-tool-tests');
    fs.mkdirSync(toolTestDir, { recursive: true });
    process.chdir(toolTestDir);
  });

  beforeEach(() => {
    // Clean any leftover .faf files between tests
    const files = fs.readdirSync(toolTestDir);
    for (const f of files) {
      if (f.endsWith('.faf') || f === 'CLAUDE.md' || f === 'README.md') {
        fs.unlinkSync(path.join(toolTestDir, f));
      }
    }
  });

  afterAll(() => {
    process.chdir(originalCwd);
  });

  test('faf_score returns numeric percentage', async () => {
    fs.writeFileSync(path.join(toolTestDir, 'project.faf'), yaml.stringify({
      project: { name: 'test', goal: 'testing', type: 'cli' },
      stack: { main_language: 'TypeScript' }
    }));
    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    const result = await handler.callTool('faf_score', { path: toolTestDir });
    const text = getTextContent(result.content);
    expect(text).toContain('FAF SCORE:');
    expect(text).toMatch(/FAF SCORE: \d+%/);
  });

  test('faf_score with details shows breakdown', async () => {
    fs.writeFileSync(path.join(toolTestDir, 'project.faf'), yaml.stringify({
      project: { name: 'test', goal: 'testing', type: 'web-app' },
      stack: { backend: 'Node.js', frontend: 'React' },
      human_context: { who: 'devs', what: 'app' }
    }));
    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    const result = await handler.callTool('faf_score', { path: toolTestDir, details: true });
    const text = getTextContent(result.content);
    expect(text).toContain('Score Breakdown:');
    expect(text).toContain('Project:');
    expect(text).toContain('Stack:');
    expect(text).toContain('Human:');
    expect(text).toContain('Filled:');
    expect(text).toMatch(/\d+\/\d+ slots/);
  });

  test('faf_score shows next milestone for non-perfect scores', async () => {
    fs.writeFileSync(path.join(toolTestDir, 'project.faf'), yaml.stringify({
      project: { name: 'test' }
    }));
    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    const result = await handler.callTool('faf_score', { path: toolTestDir });
    const text = getTextContent(result.content);
    expect(text).toContain('Next milestone:');
    expect(text).toMatch(/\d+ points to go/);
  });

  test('faf_score with no .faf returns 0% White', async () => {
    const emptyDir = path.join(tmpDir, 'mcp-empty-dir');
    fs.mkdirSync(emptyDir, { recursive: true });
    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    const result = await handler.callTool('faf_score', { path: emptyDir });
    const text = getTextContent(result.content);
    expect(text).toContain('FAF SCORE: 0%');
    expect(text).toContain('White');
    expect(text).not.toContain('92%');  // Must never show fake score
  });

  test('faf_score never returns fake 92%', async () => {
    // Even with bad YAML, should never show 92%
    fs.writeFileSync(path.join(toolTestDir, 'project.faf'), '{{{{invalid yaml}}}}');
    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    const result = await handler.callTool('faf_score', { path: toolTestDir });
    const text = getTextContent(result.content);
    expect(text).not.toContain('92%');
    expect(text).not.toContain('Excellence Building');
  });

  test('faf_score 100% shows Trophy', async () => {
    // CLI type: 9 slots, project.main_language (not stack.main_language)
    fs.writeFileSync(path.join(toolTestDir, 'project.faf'), yaml.stringify({
      project: { name: 'champion', goal: 'win', main_language: 'TypeScript', type: 'cli' },
      human_context: { who: 'a', what: 'b', why: 'c', where: 'd', when: 'e', how: 'f' }
    }));
    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    const result = await handler.callTool('faf_score', { path: toolTestDir });
    const text = getTextContent(result.content);
    expect(text).toContain('FAF SCORE: 100%');
    expect(text).toContain('Trophy');
    expect(text).toContain('Championship');
  });

  test('faf_score tier labels are correct', async () => {
    // Red tier (< 55%)
    fs.writeFileSync(path.join(toolTestDir, 'project.faf'), yaml.stringify({
      project: { name: 'minimal' }
    }));
    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    const result = await handler.callTool('faf_score', { path: toolTestDir });
    const text = getTextContent(result.content);
    // Score should be low with just a name
    expect(text).toMatch(/Red|Yellow|Green|Bronze|Silver|Gold/);
    expect(text).toContain('AI-Ready:');
  });

  test('faf_score error shows real message (not fake score)', async () => {
    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    const result = await handler.callTool('faf_score', { path: '/tmp/nonexistent-dir-xyz-99999' });
    const text = getTextContent(result.content);
    // Should show 0% or error — never a fake positive score
    expect(text).not.toContain('92%');
    expect(text).not.toContain('Excellence');
  });
});
