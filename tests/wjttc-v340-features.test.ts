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

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
// This suite verifies the FULL tool contract; the Core-tier default surface
// (12 tools, Extended opt-in) is covered separately by tests/core-tier.test.ts.
process.env.FAF_TOOLS = 'all';
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
        expect(fafGo?.description).toContain('6Ws');
      });

      it('should include faf_auto in tool list', async () => {
        const { tools } = await toolHandler.listTools();
        const fafAuto = tools.find(t => t.name === 'faf_auto');
        expect(fafAuto).toBeDefined();
        expect(fafAuto?.description).toContain('package.json');
      });

      it('should include faf_dna in tool list', async () => {
        const { tools } = await toolHandler.listTools();
        const fafDna = tools.find(t => t.name === 'faf_dna');
        expect(fafDna).toBeDefined();
        expect(fafDna?.description).toContain('.faf-dna');
        expect(fafDna?.annotations?.readOnlyHint).toBe(true);
      });

      it('should include faf_formats in tool list', async () => {
        const { tools } = await toolHandler.listTools();
        const fafFormats = tools.find(t => t.name === 'faf_formats');
        expect(fafFormats).toBeDefined();
        expect(fafFormats?.description).toContain('formats');
      });

      it('should include faf_quick in tool list', async () => {
        const { tools } = await toolHandler.listTools();
        const fafQuick = tools.find(t => t.name === 'faf_quick');
        expect(fafQuick).toBeDefined();
        expect(fafQuick?.description).toContain('Create a new project.faf from one line');
      });

      it('should include faf_doctor in tool list', async () => {
        const { tools } = await toolHandler.listTools();
        const fafDoctor = tools.find(t => t.name === 'faf_doctor');
        expect(fafDoctor).toBeDefined();
        expect(fafDoctor?.description).toContain('Diagnose');
      });

      it('should have at least 30 total tools', async () => {
        const { tools } = await toolHandler.listTools();
        // Lower bound only — don't block releases every time a new tool is added.
        // Catches regressions where tools go missing, without forcing a test edit per new tool.
        // 6.0.0 retired faf_clear, faf_friday, faf_guide and faf_write (34 → 30).
        expect(tools.length).toBeGreaterThanOrEqual(30);
      });
    });

    describe('Basic Invocation (No Crash)', () => {
      it('faf_go bootstraps (init+auto) when no .faf file exists', async () => {
        const emptyDir = path.join(testDir, 'empty-project');
        fs.mkdirSync(emptyDir, { recursive: true });

        const result = await toolHandler.callTool('faf_go', { path: emptyDir });
        expect(result).toBeDefined();
        expect(result.content).toBeDefined();
        const text = getTextContent(result.content);
        // faf_go is the front door: with no .faf it now BOOTSTRAPS (faf_init +
        // faf_auto) rather than bailing with 'needsInit', then presents the
        // Table-of-8. The bootstrap must actually create the file.
        expect(text).toContain('bootstrap');
        expect(fs.existsSync(path.join(emptyDir, 'project.faf'))).toBe(true);
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
        expect(text).toContain('No .faf-dna');
        expect(fs.readdirSync(emptyDir)).toEqual([]); // faf_dna reads only
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
      // 6.0.0 (#20): faf_dna only reads, with faf-cli's FafDNAManager. faf_init
      // writes the birth certificate; faf_auto and faf_go add to it.
      let dnaTestDir: string;

      beforeEach(() => {
        dnaTestDir = path.join(testDir, `dna-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        fs.mkdirSync(dnaTestDir, { recursive: true });
        fs.writeFileSync(path.join(dnaTestDir, 'package.json'), JSON.stringify({ name: 'dna-test', dependencies: { express: '^4.0.0' } }));
      });

      it('faf_dna writes nothing on a project with no .faf-dna', async () => {
        fs.writeFileSync(path.join(dnaTestDir, 'project.faf'), 'project:\n  name: dna-test\n');
        const result = await toolHandler.callTool('faf_dna', { path: dnaTestDir });
        expect(getTextContent(result.content)).toContain('No .faf-dna');
        expect(fs.existsSync(path.join(dnaTestDir, '.faf-dna'))).toBe(false);
      });

      it('faf_init writes the birth certificate; faf_dna shows the journey', async () => {
        await toolHandler.callTool('faf_init', { path: dnaTestDir });
        expect(fs.existsSync(path.join(dnaTestDir, '.faf-dna'))).toBe(true);
        const result = await toolHandler.callTool('faf_dna', { path: dnaTestDir });
        const text = getTextContent(result.content);
        expect(text).toContain('DNA');
        expect(text).toContain('%');
        expect((result.structuredContent as any).hasDna).toBe(true);
      });

      it('the .faf-dna is faf-cli\'s own shape: versions and growth.milestones', async () => {
        await toolHandler.callTool('faf_init', { path: dnaTestDir });
        const dnaContent = JSON.parse(fs.readFileSync(path.join(dnaTestDir, '.faf-dna'), 'utf-8'));
        expect(Array.isArray(dnaContent.versions)).toBe(true);
        expect(dnaContent.growth.milestones.length).toBeGreaterThan(0);
        expect(dnaContent.milestones).toBeUndefined();
      });

      it('should include birth certificate', async () => {
        await toolHandler.callTool('faf_init', { path: dnaTestDir });
        const dnaContent = JSON.parse(fs.readFileSync(path.join(dnaTestDir, '.faf-dna'), 'utf-8'));
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
        expect(data.formats).toBeDefined();
        expect(Array.isArray(data.formats)).toBe(true);
      });

      it('shows what faf_auto would write (a dry run), not recommendations of its own', async () => {
        const result = await toolHandler.callTool('faf_formats', {
          path: testProjectDir,
          json: true
        });
        const text = getTextContent(result.content);
        const data = JSON.parse(text);

        expect(data.slotFillRecommendations).toBeUndefined();
        // Should detect TypeScript from package.json deps
        expect(data.wouldFill['project.main_language']).toBe('TypeScript');
        expect(fs.existsSync(path.join(testProjectDir, 'project.faf'))).toBe(false); // nothing written
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

      it('has no score of its own (the one score is faf_score)', async () => {
        const result = await toolHandler.callTool('faf_formats', {
          path: testProjectDir,
          json: true
        });
        const text = getTextContent(result.content);
        const data = JSON.parse(text);

        expect(data.totalIntelligenceScore).toBeUndefined();
        expect(data.intelligenceScore).toBeUndefined();
        expect(text).not.toContain('Intelligence Score');
      });
    });

    describe('faf_quick - Lightning Fast Creation', () => {
      let quickTestDir: string;

      beforeEach(() => {
        quickTestDir = path.join(testDir, `quick-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
        fs.mkdirSync(quickTestDir, { recursive: true });
      });

      it('should refuse a call with no input, naming it (6.0.0: the schema requires input)', async () => {
        const result = await toolHandler.callTool('faf_quick', { path: quickTestDir });
        const text = getTextContent(result.content);

        expect(result.isError).toBe(true);
        expect(text).toContain('input is required');
        expect(fs.existsSync(path.join(quickTestDir, 'project.faf'))).toBe(false);
      });

      it('should show usage when the input is empty', async () => {
        const result = await toolHandler.callTool('faf_quick', { path: quickTestDir, input: '' });
        const text = getTextContent(result.content);

        expect(text).toContain('Usage');
        expect(text).toContain('project-name, goal');
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

        expect(text.toLowerCase()).toContain('react');
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

      it('should not overwrite an existing project.faf', async () => {
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

      it('should report the formats faf-cli finds in the folder', async () => {
        const result = await toolHandler.callTool('faf_doctor', { path: testProjectDir });
        const text = getTextContent(result.content);

        expect(text).toContain('faf-cli finds');
        expect(text).toContain('package.json');
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
  runtime: Node.js
  cicd: GitHub Actions
stack_signature: typescript-react
`
        );

        const result = await toolHandler.callTool('faf_go', { path: completeDir });
        const text = getTextContent(result.content);
        const data = JSON.parse(text);

        // 6.0.0 (#31): a filled Table-of-8 is not 100% by itself. The score is
        // faf-cli's (css_framework, ui_library, … are still empty here), and
        // faf_go is complete only when faf-cli says 100.
        const { scoreFafYaml } = await import('../src/utils/faf-cli-bridge.js').then((m) => m.fafCli);
        const truth = scoreFafYaml(fs.readFileSync(path.join(completeDir, 'project.faf'), 'utf-8')).score;
        expect(truth).toBeLessThan(100);
        expect(data.complete).toBe(false);
        expect(data.score).toBe(truth);
        expect(data.message).toContain(`Stopped at ${truth}%`);
        expect(text).not.toMatch(/GOLD CODE|🏆|✪/);

        // A .faf faf-cli scores 100: complete, and the ✪ appears.
        fs.writeFileSync(path.join(completeDir, 'project.faf'), `faf_version: "3.0"
project:
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
`);
        const trophy = JSON.parse(getTextContent((await toolHandler.callTool('faf_go', { path: completeDir })).content));
        expect(trophy.complete).toBe(true);
        expect(trophy.score).toBe(100);
        expect(trophy.message).toContain('✪ 100%');
      });

      it('faf_auto should not overwrite existing CLAUDE.md', async () => {
        const existingDir = path.join(testDir, 'existing-claude');
        fs.mkdirSync(existingDir, { recursive: true });

        const originalContent = '# Original CLAUDE.md\n\nDo not overwrite!';
        fs.writeFileSync(path.join(existingDir, 'CLAUDE.md'), originalContent);
        fs.writeFileSync(path.join(existingDir, 'package.json'), '{"name":"test"}');

        await toolHandler.callTool('faf_auto', { path: existingDir });

        // 5.23: faf_auto writes faf-cli's managed block; the hand-written file is kept byte-for-byte.
        const afterContent = fs.readFileSync(path.join(existingDir, 'CLAUDE.md'), 'utf-8');
        expect(afterContent.endsWith(originalContent)).toBe(true);
        expect(afterContent.match(/^<!-- faf:start -->$/gm)?.length).toBe(1);
      });

      it('faf_formats should handle project with no known formats (controlled fixture: a repo root with .git and manifests above it)', async () => {
        // #19: the result must not depend on where the checkout sits. The
        // fixture owns every folder above the scanned one up to a .git root
        // holding a package.json, tsconfig.json and Cargo.toml; faf-cli 7.13
        // reads only the scanned folder's own files.
        const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'wjttc-v340-mono-'));
        try {
          fs.mkdirSync(path.join(repo, '.git'));
          fs.writeFileSync(path.join(repo, 'package.json'), JSON.stringify({ name: 'mono-root', devDependencies: { typescript: '^5' } }));
          fs.writeFileSync(path.join(repo, 'tsconfig.json'), '{}');
          fs.writeFileSync(path.join(repo, 'Cargo.toml'), '[package]\nname = "root"\n');
          const unknownDir = path.join(repo, 'packages', 'unknown-formats');
          fs.mkdirSync(unknownDir, { recursive: true });
          fs.writeFileSync(path.join(unknownDir, 'random.xyz'), 'unknown format');

          const result = await toolHandler.callTool('faf_formats', {
            path: unknownDir,
            json: true
          });
          const text = getTextContent(result.content);
          const data = JSON.parse(text);

          expect(data.formats).toEqual([]);
          expect(data.stackSignature).toBe('unknown-stack');
          expect(text).not.toMatch(/TypeScript|Rust|cargo/);
        } finally {
          fs.rmSync(repo, { recursive: true, force: true });
        }
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

      it('faf_dna says where a lineage comes from when there is none', async () => {
        const motivDir = path.join(testDir, 'motiv-test');
        fs.mkdirSync(motivDir, { recursive: true });
        fs.writeFileSync(path.join(motivDir, 'project.faf'), 'project: motiv\n');

        const result = await toolHandler.callTool('faf_dna', { path: motivDir });
        const text = getTextContent(result.content);

        expect(text).toContain('faf_init writes the birth certificate');
      });

      it('faf_formats says it reads only and names each format\'s file', async () => {
        const result = await toolHandler.callTool('faf_formats', { path: testProjectDir });
        const text = getTextContent(result.content);

        expect(text).toContain('reads only; nothing is written');
        expect(text).toContain('package.json');
        const formats = (result.structuredContent as any).formats as Array<{ path: string }>;
        expect(formats.every((f) => f.path.startsWith(fs.realpathSync(testProjectDir)))).toBe(true);
      });
    });
  });
});
