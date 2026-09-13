/**
 * 🏎️ WJTTC MCP Test Suite
 * WolfeJam Technical & Testing Center for MCP Servers
 *
 * "When brakes must work flawlessly, so must our MCP servers"
 *
 * Based on MCP Specification 2025-11-25.
 *
 * TIER 1: PROTOCOL COMPLIANCE     content arrays, error codes, tool definitions
 * TIER 2: CAPABILITY NEGOTIATION  the advertised tools are the callable ones
 * TIER 3: TOOL INTEGRITY          faf_read, faf_score, faf_debug, faf_readme, faf_human_add, faf_check
 * TIER 4: RESOURCE MANAGEMENT     files by type, folders
 * TIER 5: SECURITY VALIDATION     traversal, links, injection, null bytes, error text, size limit
 * TIER 7: INTEGRATION READINESS   names, descriptions, error messages
 *
 * TIER 6 (performance) lives in tests/performance.test.ts: wall-clock limits
 * on shared runners are observability, not a gate.
 *
 * 6.0.0 (audit #90 #92): every test here can fail — no `fail()` (bun has no
 * global one), no assertion that only runs inside a catch the call never
 * reaches, no expect(true). Every folder is a mkdtemp and every handler has a
 * temp active project, so nothing depends on the checkout, HOME or the clock.
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
// This suite verifies the FULL tool contract; the Core-tier default surface
// is covered by tests/core-tier.test.ts.
process.env.FAF_TOOLS = 'all';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { FafToolHandler } from '../src/handlers/tools';
import { FafEngineAdapter } from '../src/handlers/engine-adapter';

type TextContent = { type: 'text'; text: string };
const getTextContent = (content: unknown[]): string => (content[0] as TextContent).text;

const tmpRoots: string[] = [];
function tmp(prefix: string): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tmpRoots.push(d);
  return d;
}
/** A handler whose active project is a fresh temp folder. */
function sandbox(prefix: string): { handler: FafToolHandler; dir: string } {
  const dir = fs.realpathSync(tmp(prefix));
  const engine = new FafEngineAdapter();
  engine.setWorkingDirectory(dir);
  return { handler: new FafToolHandler(engine), dir };
}
afterAll(() => {
  for (const d of tmpRoots) {fs.rmSync(d, { recursive: true, force: true });}
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIER 1: PROTOCOL COMPLIANCE (JSON-RPC 2.0 + MCP Core)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('🏎️ TIER 1: Protocol Compliance', () => {
  let handler: FafToolHandler;
  beforeAll(() => { handler = sandbox('wjttc-mcp-t1-').handler; });

  describe('JSON-RPC 2.0 Message Structure', () => {
    it('MUST: Tool responses contain a non-empty content array of text items', async () => {
      const result = await handler.callTool('faf_debug', {});
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      for (const item of result.content as any[]) {
        expect(item.type).toBe('text');
        expect(typeof item.text).toBe('string');
      }
    });

    it('MUST: An unknown tool is refused with InvalidParams (-32602), and the message carries no stack or source path', async () => {
      let caught: unknown;
      try {
        await handler.callTool('nonexistent_tool', {});
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(McpError);
      const err = caught as McpError;
      expect(err.code).toBe(ErrorCode.InvalidParams);
      expect(err.message).toContain('Unknown tool: nonexistent_tool');
      expect(err.message).not.toMatch(/\n\s+at |\.ts:\d|\.js:\d/);
    });
  });

  describe('MCP Core Protocol', () => {
    it('MUST: Tool definitions include a name, a description and an object inputSchema', async () => {
      const { tools } = await handler.listTools();
      expect(tools.length).toBeGreaterThan(0);
      for (const tool of tools as any[]) {
        expect(tool.name.length).toBeGreaterThan(0);
        expect(tool.description.length).toBeGreaterThan(0);
        expect(tool.inputSchema.type).toBe('object');
      }
    });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIER 2: CAPABILITY NEGOTIATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('🏎️ TIER 2: Capability Negotiation', () => {
  let handler: FafToolHandler;
  beforeAll(() => { handler = sandbox('wjttc-mcp-t2-').handler; });

  it('MUST: Every advertised tool is dispatched (no advertised name is "Unknown tool")', async () => {
    const { tools } = await handler.listTools();
    const unknown: string[] = [];
    for (const tool of tools as any[]) {
      try {
        // Arguments that fail each schema: the call is refused as isError by
        // the argument check, never thrown as an unknown tool — and nothing runs.
        await handler.callTool(tool.name, { __not_an_argument__: 1 });
      } catch (error) {
        if (error instanceof McpError && /Unknown tool/.test(error.message)) {unknown.push(tool.name);}
      }
    }
    expect(unknown).toEqual([]);
  });

  it('SHOULD: Tool names follow faf(_word)*, and required fields exist in properties', async () => {
    const { tools } = await handler.listTools();
    for (const tool of tools as any[]) {
      expect(tool.name).toMatch(/^faf(_[a-z]+)*$/);
      for (const field of tool.inputSchema.required ?? []) {expect(tool.inputSchema.properties).toHaveProperty(field);}
    }
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIER 3: TOOL INTEGRITY
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('🏎️ TIER 3: Tool Integrity', () => {
  let handler: FafToolHandler;
  let testDir: string;
  beforeAll(() => { ({ handler, dir: testDir } = sandbox('wjttc-mcp-t3-')); });

  describe('Core Tools - faf_read', () => {
    it('MUST: Read existing files byte for byte', async () => {
      const testFile = path.join(testDir, 'read-test.txt');
      const content = 'Championship Test Content ✪';
      fs.writeFileSync(testFile, content);
      const result = await handler.callTool('faf_read', { path: testFile });
      expect(result.isError).toBeFalsy();
      expect(getTextContent(result.content)).toBe(content);
    });

    it('MUST: A missing file is an isError result naming the failure, not a throw', async () => {
      const result = await handler.callTool('faf_read', { path: path.join(testDir, 'nonexistent.txt') });
      expect(result.isError).toBe(true);
      expect(getTextContent(result.content)).toMatch(/Failed to read file|not found|no such file/i);
    });
  });

  describe('Core Tools - faf_score', () => {
    it('MUST: Return faf-cli\'s score for the project\'s .faf', async () => {
      const dir = fs.mkdtempSync(path.join(testDir, 'score-'));
      const faf = 'faf_version: "3.0"\nproject:\n  name: score-fixture\n  goal: Score me\n  main_language: TypeScript\n';
      fs.writeFileSync(path.join(dir, 'project.faf'), faf);
      const result = await handler.callTool('faf_score', { path: dir });
      expect(result.isError).toBeFalsy();
      const { fafCli } = await import('../src/utils/faf-cli-bridge.js');
      const { scoreFafYaml } = await fafCli;
      expect((result as any).structuredContent.score).toBe(scoreFafYaml(faf).score);
      expect(getTextContent(result.content)).toContain(`FAF SCORE: ${scoreFafYaml(faf).score}/100`);
    });
  });

  describe('Core Tools - faf_debug', () => {
    it('MUST: Return the working directory and the bundled engine, and no credentials', async () => {
      const text = getTextContent((await handler.callTool('faf_debug', {})).content);
      expect(text).toContain('Working Directory');
      expect(text).toContain(testDir);
      expect(text).toContain('FAF Engine: faf-cli');
      expect(text.toLowerCase()).not.toMatch(/password|api_key|secret/);
    });
  });

  describe('faf_readme', () => {
    it('SHOULD: Fill empty 6W slots from README.md, and write only inside the sandbox', async () => {
      const dir = fs.mkdtempSync(path.join(testDir, 'readme-'));
      fs.writeFileSync(path.join(dir, 'README.md'), '# Test Project\n\n## Who\nCreated by the FAF Team\n\n## Why\nTo validate MCP tools\n');
      fs.writeFileSync(path.join(dir, 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: sandbox\n');
      const result = await handler.callTool('faf_readme', { path: dir, apply: true });
      expect(result.isError).toBeFalsy();
      const after = fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8');
      expect(after).toContain('name: sandbox');
      expect(after).toMatch(/who:/);
      expect(fs.readdirSync(dir).sort()).toEqual(['README.md', 'project.faf']);
    });
  });

  describe('faf_human_add', () => {
    it('SHOULD: Set one human_context slot in the sandbox\'s project.faf', async () => {
      const dir = fs.mkdtempSync(path.join(testDir, 'human-'));
      const sandboxFaf = path.join(dir, 'project.faf');
      fs.writeFileSync(sandboxFaf, 'faf_version: "3.0"\nproject:\n  name: sandbox\n');
      const result = await handler.callTool('faf_human_add', { field: 'who', value: 'WJTTC Test Suite', path: dir });
      expect(result.isError).not.toBe(true);
      expect(fs.readFileSync(sandboxFaf, 'utf-8')).toMatch(/who:\s*WJTTC Test Suite/);
    });

    it('ISOLATION: chdir alone never redirects a write — the path argument decides', async () => {
      const dir = fs.mkdtempSync(path.join(testDir, 'chdir-'));
      const elsewhere = fs.mkdtempSync(path.join(testDir, 'elsewhere-'));
      fs.writeFileSync(path.join(dir, 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: sandbox-chdir\n');
      fs.writeFileSync(path.join(elsewhere, 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: elsewhere\n');
      const engine = new FafEngineAdapter();
      engine.setWorkingDirectory(elsewhere);
      const stickyHandler = new FafToolHandler(engine);
      const originalCwd = process.cwd();
      process.chdir(dir);
      try {
        await stickyHandler.callTool('faf_human_add', { field: 'who', value: 'Sandbox Isolation Probe', path: dir });
      } finally {
        process.chdir(originalCwd);
      }
      expect(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8')).toContain('Sandbox Isolation Probe');
      expect(fs.readFileSync(path.join(elsewhere, 'project.faf'), 'utf-8')).not.toContain('Sandbox Isolation Probe');
    });
  });

  describe('faf_check', () => {
    it('SHOULD: Report faf-cli\'s validateFaf verdict — a file with no faf_version is not valid', async () => {
      const dir = fs.mkdtempSync(path.join(testDir, 'check-'));
      fs.writeFileSync(path.join(dir, 'project.faf'), 'project:\n  name: sandbox\n');
      const result: any = await handler.callTool('faf_check', { path: dir });
      expect(result.structuredContent.valid).toBe(false);
      expect(JSON.stringify(result.structuredContent.errors)).toContain('faf_version');
    });
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIER 4: RESOURCE MANAGEMENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('🏎️ TIER 4: Resource Management', () => {
  let handler: FafToolHandler;
  let testDir: string;
  beforeAll(() => { ({ handler, dir: testDir } = sandbox('wjttc-mcp-t4-')); });

  it('MUST: Text, JSON and .faf files read back exactly', async () => {
    const files: Record<string, string> = {
      'text.txt': 'Plain text content',
      'data.json': JSON.stringify({ name: 'test', value: 42 }),
      'project.faf': 'faf_version: "3.0"\nproject:\n  name: championship\n',
    };
    for (const [name, body] of Object.entries(files)) {
      fs.writeFileSync(path.join(testDir, name), body);
      const result = await handler.callTool('faf_read', { path: path.join(testDir, name) });
      expect(result.isError).toBeFalsy();
      expect(getTextContent(result.content)).toBe(body);
    }
  });

  it('MUST: A 1MB file reads back whole', async () => {
    const largeFile = path.join(testDir, 'large.txt');
    fs.writeFileSync(largeFile, 'X'.repeat(1024 * 1024));
    const result = await handler.callTool('faf_read', { path: largeFile });
    expect(getTextContent(result.content).length).toBe(1024 * 1024);
  });

  it('SHOULD: faf_list lists the subfolders, flags the one that holds a project.faf, and skips files', async () => {
    const dir = fs.mkdtempSync(path.join(testDir, 'list-'));
    fs.writeFileSync(path.join(dir, 'file1.txt'), 'content');
    fs.mkdirSync(path.join(dir, 'plain'));
    fs.mkdirSync(path.join(dir, 'with-faf'));
    fs.writeFileSync(path.join(dir, 'with-faf', 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: listed\n');
    const result = await handler.callTool('faf_list', { path: dir });
    expect(result.isError).toBeFalsy();
    const text = getTextContent(result.content);
    expect(text).toContain('plain');
    expect(text).toContain('with-faf');
    expect(text).toContain('Total: 2 items');
    expect(text).not.toContain('file1.txt');
    const flagged = text.split('\n').find((l) => l.includes('with-faf')) ?? '';
    expect(flagged).not.toBe(text.split('\n').find((l) => l.includes('plain')));
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIER 5: SECURITY VALIDATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('🏎️ TIER 5: Security Validation', () => {
  let handler: FafToolHandler;
  let testDir: string;
  let secretDir: string;
  const SECRET = 'WJTTC-SECRET-DO-NOT-LEAK';
  beforeAll(() => {
    ({ handler, dir: testDir } = sandbox('wjttc-mcp-t5-'));
    secretDir = fs.realpathSync(tmp('wjttc-mcp-secret-'));
    fs.writeFileSync(path.join(secretDir, 'id_rsa'), `-----BEGIN RSA ${SECRET}\n`);
  });

  it('MUST: Traversal and absolute escapes out of the active project are refused, and no secret is read', async () => {
    const secret = path.join(secretDir, 'id_rsa');
    const attempts = [secret, path.relative(testDir, secret), `${testDir}/../${path.basename(secretDir)}/id_rsa`, '/etc/passwd'];
    for (const attempt of attempts) {
      const result = await handler.callTool('faf_read', { path: attempt });
      expect(result.isError).toBe(true);
      const text = getTextContent(result.content);
      expect(text).not.toContain(SECRET);
      expect(text).not.toContain('root:');
    }
  });

  it('MUST: A link inside the project that points outside it is refused', async () => {
    const link = path.join(testDir, 'link-out.txt');
    try {
      fs.symlinkSync(path.join(secretDir, 'id_rsa'), link);
    } catch {
      return; // no link permission here (Windows without developer mode): nothing to test
    }
    const result = await handler.callTool('faf_read', { path: link });
    expect(result.isError).toBe(true);
    expect(getTextContent(result.content)).not.toContain(SECRET);
  });

  it('MUST: Shell-looking paths are paths: refused or not found, and nothing runs', async () => {
    const sentinel = path.join(testDir, 'pwned');
    const inputs = [`file.txt; touch ${sentinel}`, `file.txt && touch ${sentinel}`, `$(touch ${sentinel})`, `\`touch ${sentinel}\``];
    for (const input of inputs) {
      const result = await handler.callTool('faf_read', { path: input });
      expect(result.isError).toBe(true);
    }
    expect(fs.existsSync(sentinel)).toBe(false);
  });

  it('MUST: A null byte in a path is an isError result, never a read', async () => {
    fs.writeFileSync(path.join(testDir, 'file.txt'), 'real file');
    const result = await handler.callTool('faf_read', { path: `${path.join(testDir, 'file.txt')}\x00malicious` });
    expect(result.isError).toBe(true);
    expect(getTextContent(result.content)).not.toBe('real file');
  });

  it('MUST NOT: Error text carries a stack trace or a source path', async () => {
    const result = await handler.callTool('faf_read', { path: path.join(testDir, 'definitely-missing', '12345.txt') });
    expect(result.isError).toBe(true);
    const text = getTextContent(result.content);
    expect(text).not.toMatch(/\n\s+at |\.ts:\d|node_modules/);
  });

  it('SHOULD: A file over the 50MB limit is refused, not read', async () => {
    const huge = path.join(testDir, 'huge.bin');
    fs.writeFileSync(huge, '');
    fs.truncateSync(huge, 51 * 1024 * 1024); // sparse where the filesystem allows
    const result = await handler.callTool('faf_read', { path: huge });
    expect(result.isError).toBe(true);
    expect(getTextContent(result.content)).toContain('File too large');
  });
});

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIER 7: INTEGRATION READINESS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('🏎️ TIER 7: Integration Readiness', () => {
  let handler: FafToolHandler;
  beforeAll(() => { handler = sandbox('wjttc-mcp-t7-').handler; });

  it('MUST: Tool names are lowercase with underscores; descriptions are prose, not code', async () => {
    const { tools } = await handler.listTools();
    for (const tool of tools as any[]) {
      expect(tool.name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(tool.description.length).toBeGreaterThan(10);
      expect(tool.description).not.toMatch(/function\s*\(|=>/);
    }
  });

  it('SHOULD: Tool descriptions carry no decorative emoji', async () => {
    const { tools } = await handler.listTools();
    expect((tools as any[]).filter((t) => /[\u{1F300}-\u{1FAFF}]/u.test(t.description)).map((t) => t.name)).toEqual([]);
  });

  it('MUST: An error message says what went wrong', async () => {
    const result = await handler.callTool('faf_read', { path: '/nonexistent/path/file.txt' });
    expect(result.isError).toBe(true);
    expect(getTextContent(result.content).toLowerCase()).toMatch(/error|not found|failed|unable|outside/);
  });

  it('SHOULD: Rapid sequential requests all answer', async () => {
    const results = [];
    for (let i = 0; i < 20; i++) {results.push(await handler.callTool('faf_debug', {}));}
    expect(results.filter((r) => !r.isError && getTextContent(r.content).includes('Working Directory')).length).toBe(20);
  });
});
