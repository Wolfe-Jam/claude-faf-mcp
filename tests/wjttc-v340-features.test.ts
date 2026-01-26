/**
 * 🏎️ WJTTC v3.4.0 Feature Test Suite
 * WolfeJam Technical & Testing Center
 *
 * Tests for new v3.4.0 tools:
 * - faf_go: Guided interview to Gold Code
 * - faf_auto: ONE COMMAND TO RULE THEM ALL
 * - faf_dna: DNA journey tracking
 * - faf_formats: TURBO-CAT format discovery
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * TEST TIERS:
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * TIER 1: BRAKE SYSTEMS 🚨 (Critical - must not fail)
 *   - Tool existence and registration
 *   - Basic invocation without crash
 *   - Error handling for missing files
 *
 * TIER 2: ENGINE SYSTEMS ⚡ (Core functionality)
 *   - faf_go question generation
 *   - faf_go answer application
 *   - faf_auto full workflow
 *   - faf_dna journey creation
 *   - faf_formats discovery
 *
 * TIER 3: AERODYNAMICS 🏁 (Polish & edge cases)
 *   - Performance benchmarks
 *   - Edge case handling
 *   - Output formatting
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { FafToolHandler } from '../src/handlers/tools';
import { FafEngineAdapter } from '../src/handlers/engine-adapter';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Type helper for MCP content extraction
type TextContent = { type: 'text'; text: string };
const getTextContent = (content: unknown[]): string =>
  (content[0] as TextContent).text;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TEST SETUP
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

describe('🏎️ WJTTC v3.4.0 Feature Suite', () => {
  let toolHandler: FafToolHandler;
  let engineAdapter: FafEngineAdapter;
  let testDir: string;
  let testProjectDir: string;

  beforeAll(() => {
    // Create temp test directory
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wjttc-v340-'));
    testProjectDir = path.join(testDir, 'test-project');
    fs.mkdirSync(testProjectDir, { recursive: true });

    // Create test package.json
    fs.writeFileSync(
      path.join(testProjectDir, 'package.json'),
      JSON.stringify({
        name: 'test-project',
        version: '1.0.0',
        description: 'Test project for WJTTC',
        dependencies: {
          typescript: '^5.0.0',
          react: '^18.0.0'
        },
        devDependencies: {
          jest: '^29.0.0'
        }
      }, null, 2)
    );

    // Create test README.md
    fs.writeFileSync(
      path.join(testProjectDir, 'README.md'),
      `# Test Project

A test project for WJTTC v3.4.0 feature validation.

## Why

Because testing makes software reliable.

## Who

For developers who care about quality.
`
    );

    // Create tsconfig.json for format detection
    fs.writeFileSync(
      path.join(testProjectDir, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { strict: true } }, null, 2)
    );

    // Initialize handlers
    engineAdapter = new FafEngineAdapter(testProjectDir);
    toolHandler = new FafToolHandler(engineAdapter);
  });

  afterAll(() => {
    // Cleanup
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIER 1: BRAKE SYSTEMS 🚨 (Critical)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('TIER 1: BRAKE SYSTEMS 🚨', () => {

    describe('Tool Registration', () => {
      it('should include faf_go in tool list', async () => {
        const { tools } = await toolHandler.listTools();
        const fafGo = tools.find(t => t.name === 'faf_go');
        expect(fafGo).toBeDefined();
        expect(fafGo?.description).toContain('Gold Code');
      });

      it('should include faf_auto in tool list', async () => {
        const { tools } = await toolHandler.listTools();
        const fafAuto = tools.find(t => t.name === 'faf_auto');
        expect(fafAuto).toBeDefined();
        expect(fafAuto?.description).toContain('ONE COMMAND');
      });

      it('should include faf_dna in tool list', async () => {
        const { tools } = await toolHandler.listTools();
        const fafDna = tools.find(t => t.name === 'faf_dna');
        expect(fafDna).toBeDefined();
        expect(fafDna?.description).toContain('DNA');
      });

      it('should include faf_formats in tool list', async () => {
        const { tools } = await toolHandler.listTools();
        const fafFormats = tools.find(t => t.name === 'faf_formats');
        expect(fafFormats).toBeDefined();
        expect(fafFormats?.description).toContain('TURBO-CAT');
      });

      it('should include faf_quick in tool list', async () => {
        const { tools } = await toolHandler.listTools();
        const fafQuick = tools.find(t => t.name === 'faf_quick');
        expect(fafQuick).toBeDefined();
        expect(fafQuick?.description).toContain('Lightning-fast');
      });

      it('should include faf_doctor in tool list', async () => {
        const { tools } = await toolHandler.listTools();
        const fafDoctor = tools.find(t => t.name === 'faf_doctor');
        expect(fafDoctor).toBeDefined();
        expect(fafDoctor?.description).toContain('Health check');
      });

      it('should have 27 total tools in v4.0.0', async () => {
        const { tools } = await toolHandler.listTools();
        expect(tools.length).toBe(27);
      });
    });

    describe('Basic Invocation (No Crash)', () => {
      it('faf_go should not crash without .faf file', async () => {
        const emptyDir = path.join(testDir, 'empty-project');
        fs.mkdirSync(emptyDir, { recursive: true });

        const result = await toolHandler.callTool('faf_go', { path: emptyDir });
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        const text = getTextContent(result.content);
        expect(text).toContain('needsInit');
      });

      it('faf_auto should not crash on empty directory', async () => {
        const emptyDir = path.join(testDir, 'auto-empty');
        fs.mkdirSync(emptyDir, { recursive: true });

        const result = await toolHandler.callTool('faf_auto', { path: emptyDir });
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      });

      it('faf_dna should not crash without .faf file', async () => {
        const emptyDir = path.join(testDir, 'dna-empty');
        fs.mkdirSync(emptyDir, { recursive: true });

        const result = await toolHandler.callTool('faf_dna', { path: emptyDir });
        expect(result).toBeDefined();
        const text = getTextContent(result.content);
        expect(text).toContain('No FAF DNA found');
      });

      it('faf_formats should not crash on empty directory', async () => {
        const emptyDir = path.join(testDir, 'formats-empty');
        fs.mkdirSync(emptyDir, { recursive: true });

        const result = await toolHandler.callTool('faf_formats', { path: emptyDir });
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
      });
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIER 2: ENGINE SYSTEMS ⚡ (Core Functionality)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('TIER 2: ENGINE SYSTEMS ⚡', () => {

    describe('faf_auto - Full Workflow', () => {
      let autoTestDir: string;

      beforeEach(() => {
        autoTestDir = path.join(testDir, `auto-test-${Date.now()}`);
        fs.mkdirSync(autoTestDir, { recursive: true });

        // Create package.json
        fs.writeFileSync(
          path.join(autoTestDir, 'package.json'),
          JSON.stringify({
            name: 'auto-test',
            version: '1.0.0',
            dependencies: { typescript: '^5.0.0' }
          }, null, 2)
        );

        // Create README
        fs.writeFileSync(
          path.join(autoTestDir, 'README.md'),
          '# Auto Test\n\nTest project for faf_auto.\n\n## Why\n\nFor testing.'
        );
      });

      it('should create project.faf when missing', async () => {
        const result = await toolHandler.callTool('faf_auto', { path: autoTestDir });
        const text = getTextContent(result.content);

        expect(text).toContain('Created project.faf');
        expect(fs.existsSync(path.join(autoTestDir, 'project.faf'))).toBe(true);
      });

      it('should run TURBO-CAT format discovery', async () => {
        const result = await toolHandler.callTool('faf_auto', { path: autoTestDir });
        const text = getTextContent(result.content);

        expect(text).toContain('TURBO-CAT');
        expect(text).toContain('formats');
      });

      it('should create CLAUDE.md when missing', async () => {
        const result = await toolHandler.callTool('faf_auto', { path: autoTestDir });
        const text = getTextContent(result.content);

        expect(text).toContain('CLAUDE.md');
        expect(fs.existsSync(path.join(autoTestDir, 'CLAUDE.md'))).toBe(true);
      });

      it('should show before/after scores', async () => {
        const result = await toolHandler.callTool('faf_auto', { path: autoTestDir });
        const text = getTextContent(result.content);

        expect(text).toContain('Before:');
        expect(text).toContain('After:');
        expect(text).toContain('%');
      });

      it('should complete in reasonable time', async () => {
        const start = Date.now();
        await toolHandler.callTool('faf_auto', { path: autoTestDir });
        const elapsed = Date.now() - start;

        expect(elapsed).toBeLessThan(5000); // 5 seconds max
      });
    });

    describe('faf_go - Guided Interview', () => {
      let goTestDir: string;

      beforeEach(() => {
        goTestDir = path.join(testDir, `go-test-${Date.now()}`);
        fs.mkdirSync(goTestDir, { recursive: true });

        // Create minimal .faf file with proper nested structure
        fs.writeFileSync(
          path.join(goTestDir, 'project.faf'),
          `project:
  name: go-test
type: test
generated: ${new Date().toISOString()}
`
        );
      });

      it('should return questions for missing fields', async () => {
        const result = await toolHandler.callTool('faf_go', { path: goTestDir });
        const text = getTextContent(result.content);
        const data = JSON.parse(text);

        expect(data.needsInput).toBe(true);
        expect(data.questions).toBeDefined();
        expect(Array.isArray(data.questions)).toBe(true);
        expect(data.questions.length).toBeGreaterThan(0);
      });

      it('should include priority fields first', async () => {
        const result = await toolHandler.callTool('faf_go', { path: goTestDir });
        const text = getTextContent(result.content);
        const data = JSON.parse(text);

        // project.goal should be among first questions
        const goalQuestion = data.questions.find((q: any) => q.field === 'project.goal');
        expect(goalQuestion).toBeDefined();
      });

      it('should apply answers and update score', async () => {
        const answers = {
          'project.goal': 'Test the faf_go feature',
          'human_context.why': 'To validate the guided interview works'
        };

        const result = await toolHandler.callTool('faf_go', {
          path: goTestDir,
          answers
        });
        const text = getTextContent(result.content);

        expect(text).toContain('Updated');
        expect(text).toContain('field');
        expect(text).toContain('%');
      });

      it('should show current score', async () => {
        const result = await toolHandler.callTool('faf_go', { path: goTestDir });
        const text = getTextContent(result.content);
        const data = JSON.parse(text);

        expect(data.currentScore).toBeDefined();
        expect(typeof data.currentScore).toBe('number');
      });
    });

    describe('faf_dna - DNA Journey', () => {
      let dnaTestDir: string;

      beforeEach(() => {
        dnaTestDir = path.join(testDir, `dna-test-${Date.now()}`);
        fs.mkdirSync(dnaTestDir, { recursive: true });

        // Create .faf file
        fs.writeFileSync(
          path.join(dnaTestDir, 'project.faf'),
          `project: dna-test
type: test
generated: ${new Date().toISOString()}
human_context:
  why: Testing DNA tracking
`
        );
      });

      it('should create birth certificate on first run', async () => {
        const result = await toolHandler.callTool('faf_dna', { path: dnaTestDir });
        const text = getTextContent(result.content);

        expect(text).toContain('Birth');
        expect(fs.existsSync(path.join(dnaTestDir, '.faf-dna'))).toBe(true);
      });

      it('should show journey on subsequent runs', async () => {
        // First run creates DNA
        await toolHandler.callTool('faf_dna', { path: dnaTestDir });

        // Second run shows journey
        const result = await toolHandler.callTool('faf_dna', { path: dnaTestDir });
        const text = getTextContent(result.content);

        expect(text).toContain('DNA');
        expect(text).toContain('%');
      });

      it('should track milestones', async () => {
        await toolHandler.callTool('faf_dna', { path: dnaTestDir });

        const dnaPath = path.join(dnaTestDir, '.faf-dna');
        const dnaContent = JSON.parse(fs.readFileSync(dnaPath, 'utf-8'));

        expect(dnaContent.milestones).toBeDefined();
        expect(Array.isArray(dnaContent.milestones)).toBe(true);
        expect(dnaContent.milestones.length).toBeGreaterThan(0);
      });

      it('should include birth certificate', async () => {
        await toolHandler.callTool('faf_dna', { path: dnaTestDir });

        const dnaPath = path.join(dnaTestDir, '.faf-dna');
        const dnaContent = JSON.parse(fs.readFileSync(dnaPath, 'utf-8'));

        expect(dnaContent.birthCertificate).toBeDefined();
        expect(dnaContent.birthCertificate.born).toBeDefined();
        expect(dnaContent.birthCertificate.birthDNA).toBeDefined();
        expect(dnaContent.birthCertificate.certificate).toBeDefined();
      });
    });

    describe('faf_formats - TURBO-CAT Discovery', () => {
      it('should discover package.json', async () => {
        const result = await toolHandler.callTool('faf_formats', { path: testProjectDir });
        const text = getTextContent(result.content);

        expect(text).toContain('package.json');
      });

      it('should discover tsconfig.json', async () => {
        const result = await toolHandler.callTool('faf_formats', { path: testProjectDir });
        const text = getTextContent(result.content);

        expect(text).toContain('tsconfig.json');
      });

      it('should discover README.md', async () => {
        const result = await toolHandler.callTool('faf_formats', { path: testProjectDir });
        const text = getTextContent(result.content);

        expect(text).toContain('README.md');
      });

      it('should return JSON when requested', async () => {
        const result = await toolHandler.callTool('faf_formats', {
          path: testProjectDir,
          json: true
        });
        const text = getTextContent(result.content);

        const data = JSON.parse(text);
        expect(data.discoveredFormats).toBeDefined();
        expect(Array.isArray(data.discoveredFormats)).toBe(true);
      });

      it('should provide slot fill recommendations', async () => {
        const result = await toolHandler.callTool('faf_formats', {
          path: testProjectDir,
          json: true
        });
        const text = getTextContent(result.content);
        const data = JSON.parse(text);

        expect(data.slotFillRecommendations).toBeDefined();
        // Should detect TypeScript from package.json deps
        expect(data.slotFillRecommendations.mainLanguage).toBe('TypeScript');
      });

      it('should generate stack signature', async () => {
        const result = await toolHandler.callTool('faf_formats', {
          path: testProjectDir,
          json: true
        });
        const text = getTextContent(result.content);
        const data = JSON.parse(text);

        expect(data.stackSignature).toBeDefined();
        expect(typeof data.stackSignature).toBe('string');
      });

      it('should calculate intelligence score', async () => {
        const result = await toolHandler.callTool('faf_formats', {
          path: testProjectDir,
          json: true
        });
        const text = getTextContent(result.content);
        const data = JSON.parse(text);

        expect(data.totalIntelligenceScore).toBeDefined();
        expect(typeof data.totalIntelligenceScore).toBe('number');
        expect(data.totalIntelligenceScore).toBeGreaterThan(0);
      });
    });

    describe('faf_quick - Lightning Fast Creation', () => {
      let quickTestDir: string;

      beforeEach(() => {
        quickTestDir = path.join(testDir, `quick-test-${Date.now()}`);
        fs.mkdirSync(quickTestDir, { recursive: true });
      });

      it('should show usage when no input provided', async () => {
        const result = await toolHandler.callTool('faf_quick', { path: quickTestDir });
        const text = getTextContent(result.content);

        expect(text).toContain('Usage');
        expect(text).toContain('project-name, description');
      });

      it('should create .faf from quick input', async () => {
        const result = await toolHandler.callTool('faf_quick', {
          path: quickTestDir,
          input: 'my-app, e-commerce platform, typescript, react, vercel'
        });
        const text = getTextContent(result.content);

        expect(text).toContain('Created');
        expect(text).toContain('my-app');
        expect(fs.existsSync(path.join(quickTestDir, 'project.faf'))).toBe(true);
      });

      it('should detect project type from framework', async () => {
        const result = await toolHandler.callTool('faf_quick', {
          path: quickTestDir,
          input: 'my-app, web app, typescript, react'
        });
        const text = getTextContent(result.content);

        expect(text).toContain('react');
      });

      it('should require minimum 2 parts', async () => {
        const result = await toolHandler.callTool('faf_quick', {
          path: quickTestDir,
          input: 'just-a-name'
        });
        const text = getTextContent(result.content);

        expect(text).toContain('Need at least');
        expect(result.isError).toBe(true);
      });

      it('should not overwrite without force', async () => {
        // Create first
        await toolHandler.callTool('faf_quick', {
          path: quickTestDir,
          input: 'first-app, first description'
        });

        // Try to create again
        const result = await toolHandler.callTool('faf_quick', {
          path: quickTestDir,
          input: 'second-app, second description'
        });
        const text = getTextContent(result.content);

        expect(text).toContain('already exists');
      });
    });

    describe('faf_doctor - Health Check', () => {
      it('should detect missing .faf file', async () => {
        const emptyDir = path.join(testDir, `doctor-empty-${Date.now()}`);
        fs.mkdirSync(emptyDir, { recursive: true });

        const result = await toolHandler.callTool('faf_doctor', { path: emptyDir });
        const text = getTextContent(result.content);

        expect(text).toContain('No .faf file found');
        expect(text).toContain('❌');
      });

      it('should detect valid .faf file', async () => {
        const result = await toolHandler.callTool('faf_doctor', { path: testProjectDir });
        const text = getTextContent(result.content);

        expect(text).toContain('Health Check');
      });

      it('should check for CLAUDE.md', async () => {
        const doctorDir = path.join(testDir, `doctor-test-${Date.now()}`);
        fs.mkdirSync(doctorDir, { recursive: true });
        fs.writeFileSync(path.join(doctorDir, 'project.faf'), 'project:\n  name: test\n  goal: testing');

        const result = await toolHandler.callTool('faf_doctor', { path: doctorDir });
        const text = getTextContent(result.content);

        expect(text).toContain('CLAUDE.md');
      });

      it('should detect project type', async () => {
        const result = await toolHandler.callTool('faf_doctor', { path: testProjectDir });
        const text = getTextContent(result.content);

        expect(text).toContain('Node.js');
      });

      it('should show version', async () => {
        const result = await toolHandler.callTool('faf_doctor', { path: testProjectDir });
        const text = getTextContent(result.content);

        expect(text).toContain('claude-faf-mcp version');
      });
    });
  });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIER 3: AERODYNAMICS 🏁 (Polish & Edge Cases)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  describe('TIER 3: AERODYNAMICS 🏁', () => {

    describe('Performance Benchmarks', () => {
      it('faf_formats should complete in <100ms', async () => {
        const start = Date.now();
        await toolHandler.callTool('faf_formats', { path: testProjectDir });
        const elapsed = Date.now() - start;

        expect(elapsed).toBeLessThan(100);
      });

      it('faf_go should complete in <200ms', async () => {
        // Create temp .faf
        const perfDir = path.join(testDir, 'perf-test');
        fs.mkdirSync(perfDir, { recursive: true });
        fs.writeFileSync(path.join(perfDir, 'project.faf'), 'project: perf\n');

        const start = Date.now();
        await toolHandler.callTool('faf_go', { path: perfDir });
        const elapsed = Date.now() - start;

        expect(elapsed).toBeLessThan(200);
      });
    });

    describe('Edge Cases', () => {
      it('faf_go should handle 100% complete project', async () => {
        const completeDir = path.join(testDir, 'complete-project');
        fs.mkdirSync(completeDir, { recursive: true });

        // Create fully complete .faf
        fs.writeFileSync(
          path.join(completeDir, 'project.faf'),
          `project:
  name: complete-project
  goal: Test complete project
  main_language: TypeScript
human_context:
  who: Developers
  what: Complete project test
  why: Testing 100% case
  where: Local testing
  when: v1.0.0
  how: Via WJTTC
stack:
  frontend: React
  backend: Express
  database: PostgreSQL
  hosting: Vercel
  build: Vite
stack_signature: typescript-react
`
        );

        const result = await toolHandler.callTool('faf_go', { path: completeDir });
        const text = getTextContent(result.content);
        const data = JSON.parse(text);

        expect(data.complete).toBe(true);
        expect(data.score).toBe(100);
      });

      it('faf_auto should not overwrite existing CLAUDE.md', async () => {
        const existingDir = path.join(testDir, 'existing-claude');
        fs.mkdirSync(existingDir, { recursive: true });

        const originalContent = '# Original CLAUDE.md\n\nDo not overwrite!';
        fs.writeFileSync(path.join(existingDir, 'CLAUDE.md'), originalContent);
        fs.writeFileSync(path.join(existingDir, 'package.json'), '{"name":"test"}');

        await toolHandler.callTool('faf_auto', { path: existingDir });

        const afterContent = fs.readFileSync(path.join(existingDir, 'CLAUDE.md'), 'utf-8');
        expect(afterContent).toBe(originalContent);
      });

      it('faf_formats should handle project with no known formats', async () => {
        const unknownDir = path.join(testDir, 'unknown-formats');
        fs.mkdirSync(unknownDir, { recursive: true });
        fs.writeFileSync(path.join(unknownDir, 'random.xyz'), 'unknown format');

        const result = await toolHandler.callTool('faf_formats', {
          path: unknownDir,
          json: true
        });
        const text = getTextContent(result.content);
        const data = JSON.parse(text);

        expect(data.discoveredFormats).toEqual([]);
        expect(data.stackSignature).toBe('unknown-stack');
      });
    });

    describe('Output Formatting', () => {
      it('faf_auto should include timing information', async () => {
        const timingDir = path.join(testDir, 'timing-test');
        fs.mkdirSync(timingDir, { recursive: true });

        const result = await toolHandler.callTool('faf_auto', { path: timingDir });
        const text = getTextContent(result.content);

        expect(text).toContain('Completed in');
        expect(text).toMatch(/\d+\.\d+s/); // e.g., "0.5s"
      });

      it('faf_dna should show motivational message', async () => {
        const motivDir = path.join(testDir, 'motiv-test');
        fs.mkdirSync(motivDir, { recursive: true });
        fs.writeFileSync(path.join(motivDir, 'project.faf'), 'project: motiv\n');

        const result = await toolHandler.callTool('faf_dna', { path: motivDir });
        const text = getTextContent(result.content);

        // Should have some motivational content
        expect(text.length).toBeGreaterThan(100);
      });

      it('faf_formats should include TURBO-CAT branding', async () => {
        const result = await toolHandler.callTool('faf_formats', { path: testProjectDir });
        const text = getTextContent(result.content);

        expect(text).toContain('TURBO-CAT');
        expect(text).toContain('😽');
      });
    });
  });
});
