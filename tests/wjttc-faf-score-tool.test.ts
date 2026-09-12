/**
 * WJTTC — the faf_score MCP tool, end to end.
 *
 * faf_score reports faf-cli's scoreFafYaml (the one scorer). This suite was
 * Tier 5 of wjttc-compiler-scoring.test.ts; Tiers 1-4 exercised the Mk3
 * FafCompiler, which no tool reached and 6.0.0 removed.
 */

import { FafToolHandler } from '../src/handlers/tools';
import { FafEngineAdapter } from '../src/handlers/engine-adapter';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'yaml';

let tmpDir: string;

// Type helper for MCP content extraction
type TextContent = { type: 'text'; text: string };
const getTextContent = (content: unknown[]): string =>
  (content[0] as TextContent).text;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-score-tool-'));
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('faf_score MCP tool end-to-end', () => {
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
    expect(text).toMatch(/FAF SCORE: \d+\/100/);
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
    expect(text).toContain('--- Slot breakdown ---');
    expect(text).toMatch(/Populated \(\d+\):/);
    expect(text).toMatch(/Empty \(\d+\):/);
    expect(text).toMatch(/Ignored \(\d+\):/);
    expect(text).toMatch(/\d+\/\d+ slots populated/);
  });

  test('faf_score shows next milestone for non-perfect scores', async () => {
    fs.writeFileSync(path.join(toolTestDir, 'project.faf'), yaml.stringify({
      project: { name: 'test' }
    }));
    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    const result = await handler.callTool('faf_score', { path: toolTestDir });
    const text = getTextContent(result.content);
    expect(text).toMatch(/next: .+ \(\d+%\)/);
  });

  test('faf_score with no .faf returns 0/100 honestly', async () => {
    const emptyDir = path.join(tmpDir, 'mcp-empty-dir');
    fs.mkdirSync(emptyDir, { recursive: true });
    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    const result = await handler.callTool('faf_score', { path: emptyDir });
    const text = getTextContent(result.content);
    expect(text).toContain('FAF SCORE: 0/100 (0%)');
    expect(text).toContain('no .faf');
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
    // To hit a TRUE 100% under faf-cli's scoreFafYaml, every applicable slot
    // must be populated OR explicitly slotignored.
    fs.writeFileSync(path.join(toolTestDir, 'project.faf'), yaml.stringify({
      faf_version: '3.0',
      project: { name: 'champion', goal: 'win', main_language: 'TypeScript', type: 'cli', framework: 'native' },
      stack: {
        frontend: 'slotignored', css_framework: 'slotignored', ui_library: 'slotignored',
        state_management: 'slotignored', backend: 'Node.js', api_type: 'cli', runtime: 'Node.js',
        database: 'slotignored', connection: 'slotignored', hosting: 'local', build: 'tsc',
        cicd: 'GitHub Actions', monorepo_tool: 'slotignored', package_manager: 'npm',
        workspaces: 'slotignored', admin: 'slotignored', cache: 'slotignored',
        search: 'slotignored', storage: 'slotignored',
      },
      human_context: { who: 'a', what: 'b', why: 'c', where: 'd', when: 'e', how: 'f' }
    }));
    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    const result = await handler.callTool('faf_score', { path: toolTestDir });
    const text = getTextContent(result.content);
    expect(text).toContain('FAF SCORE: 100/100 (100%)');
    expect(text).toContain('TROPHY');
    expect(text).toContain('top tier');
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
    expect(text).toMatch(/RED|YELLOW|GREEN|BRONZE|SILVER|GOLD|TROPHY/);
    expect(text).toContain('Scored by faf-cli');
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
