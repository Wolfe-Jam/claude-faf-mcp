/**
 * Desktop-Native MCP Validation Test Suite
 *
 * Claude Desktop starts the server with no terminal and no `faf` on its PATH.
 * Every tool here runs on the faf-cli the package depends on, so each test
 * checks what the tool actually did with a temp project — never "it answered".
 *
 * 6.0.0 (audit #90 #92): hermetic — every folder is a mkdtemp, no chdir, no
 * fixed /tmp path, faf_init always gets an explicit path (never the host's
 * HOME or ~/Projects), and the timing checks live in tests/performance.test.ts.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { FafToolHandler } from '../src/handlers/tools';
import { FafEngineAdapter } from '../src/handlers/engine-adapter';
import { fafCli } from '../src/utils/faf-cli-bridge.js';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

type TextContent = { type: 'text'; text: string };
const getTextContent = (content: unknown[]): string => (content[0] as TextContent).text;

/** A .faf faf-cli scores 100 (every slot the app-type counts is filled). */
const TROPHY = `faf_version: "3.0"
project:
  name: desktop-trophy
  goal: Prove the desktop path end to end
  main_language: TypeScript
human_context:
  who: Developers
  what: A CLI fixture
  why: Testing the 100% case
  where: Local testing
  when: v1.0.0
  how: Via WJTTC
stack:
  frontend: slotignored
  css_framework: slotignored
  ui_library: slotignored
  state_management: slotignored
  backend: Node.js
  api_type: cli
  runtime: Node.js
  database: slotignored
  connection: slotignored
  hosting: local
  build: tsc
  cicd: GitHub Actions
`;

describe('🏁 Desktop-Native MCP Tests', () => {
  let testDir: string;
  let handler: FafToolHandler;
  const fresh = (name: string): string => fs.mkdtempSync(path.join(testDir, `${name}-`));

  beforeAll(() => {
    testDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'faf-desktop-test-')));
    const engine = new FafEngineAdapter();
    engine.setWorkingDirectory(testDir);
    handler = new FafToolHandler(engine);
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('🧡 Core native functions (the bundled faf-cli, no CLI on PATH)', () => {
    test('faf_read returns the file byte for byte', async () => {
      await handler.callTool('faf_context', { path: testDir });
      const testContent = '# Big Orange Test\n🧡 Native Desktop Mode';
      const testFile = path.join(testDir, 'test.md');
      fs.writeFileSync(testFile, testContent);
      const result = await handler.callTool('faf_read', { path: testFile });
      expect(result.isError).toBeFalsy();
      expect(getTextContent(result.content)).toBe(testContent);
    });

    test('faf_score reports faf-cli\'s score for the project\'s .faf', async () => {
      const dir = fresh('score');
      const faf = 'faf_version: "3.0"\nproject:\n  name: desktop\n  goal: Score on the desktop\n  main_language: TypeScript\n';
      fs.writeFileSync(path.join(dir, 'project.faf'), faf);
      const result = await handler.callTool('faf_score', { path: dir, details: true });
      const { scoreFafYaml } = await fafCli;
      const expected = scoreFafYaml(faf).score;
      expect(result.isError).toBeFalsy();
      expect(getTextContent(result.content)).toContain(`FAF SCORE: ${expected}/100 (${expected}%)`);
    });

    test('faf_debug names the working directory, write access and the bundled engine', async () => {
      const text = getTextContent((await handler.callTool('faf_debug', {})).content);
      expect(text).toContain(`Working Directory: ${testDir}`);
      expect(text).toContain('Write Permissions');
      expect(text).toContain('FAF Engine: faf-cli'); // the bundled faf-cli, never a PATH binary
    });
  });

  describe('⚡ A fresh folder, no CLI anywhere', () => {
    test('faf_status says there is no .faf; faf_init creates one where it was asked to', async () => {
      const dir = fresh('init');
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'desktop-init', version: '1.0.0' }));
      const status = await handler.callTool('faf_status', { path: dir });
      expect(getTextContent(status.content)).toMatch(/no \.faf|No project\.faf|not found/i);

      const init = await handler.callTool('faf_init', { path: dir });
      expect(init.isError).toBeFalsy();
      expect(fs.existsSync(path.join(dir, 'project.faf'))).toBe(true);
      expect(fs.readFileSync(path.join(dir, 'project.faf'), 'utf-8')).toContain('desktop-init');
    });
  });

  describe('✪ The 100% case', () => {
    test('a .faf faf-cli scores 100 reads 100% with the ✪ mark; one below does not', async () => {
      const dir = fresh('trophy');
      fs.writeFileSync(path.join(dir, 'project.faf'), TROPHY);
      const { scoreFafYaml } = await fafCli;
      expect(scoreFafYaml(TROPHY).score).toBe(100);
      const text = getTextContent((await handler.callTool('faf_score', { path: dir, details: true })).content);
      expect(text).toContain('FAF SCORE: 100/100');
      expect(text).toContain('✪');

      const below = fresh('below');
      fs.writeFileSync(path.join(below, 'project.faf'), TROPHY.replace('  cicd: GitHub Actions\n', ''));
      const belowText = getTextContent((await handler.callTool('faf_score', { path: below, details: true })).content);
      expect(belowText).not.toContain('FAF SCORE: 100/100');
      expect(belowText).not.toContain('✪');
    });
  });

  describe('🔒 Security & validation', () => {
    test('paths out of the active project are refused and read nothing', async () => {
      await handler.callTool('faf_context', { path: testDir }); // a tool with a path moves the active project
      const outside = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'faf-desktop-outside-')));
      fs.writeFileSync(path.join(outside, 'id_rsa'), 'DESKTOP-SECRET\n');
      for (const badPath of [path.join(outside, 'id_rsa'), path.relative(testDir, path.join(outside, 'id_rsa')), '/etc/passwd', '~/.ssh/id_rsa']) {
        const result = await handler.callTool('faf_read', { path: badPath });
        expect(result.isError).toBe(true);
        expect(getTextContent(result.content)).not.toMatch(/DESKTOP-SECRET|root:/);
      }
      fs.rmSync(outside, { recursive: true, force: true });
    });

    test('a 1MB file reads back whole', async () => {
      await handler.callTool('faf_context', { path: testDir });
      const largeFile = path.join(testDir, 'large.txt');
      fs.writeFileSync(largeFile, 'X'.repeat(1024 * 1024));
      const result = await handler.callTool('faf_read', { path: largeFile });
      expect(getTextContent(result.content).length).toBe(1024 * 1024);
    });
  });
});
