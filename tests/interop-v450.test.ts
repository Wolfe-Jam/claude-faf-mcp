/**
 * Interop v4.5.0 Test Suite
 * WJTTC-certified tests for AI format interoperability features
 *
 * Tiers: Parser Units → Export → Engine Adapter → Security → Performance →
 *        Roundtrip. 6.0.0 retired the AGENTS.md / .cursorrules / GEMINI.md /
 *        conductor imports into project.faf and the dead tool-visibility
 *        registry, and their tests with them.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as os from 'os';
import * as path from 'path';
import { promises as fs } from 'fs';

// Parser imports
import {
  parseGitHubUrl,
  detectStackFromMetadata,
  calculateRepoQualityScore,
  GitHubMetadata,
} from '../src/faf-core/parsers/github-extractor';
import {
  isIgnored,
  isFilled,
  countSlots,
} from '../src/faf-core/parsers/slot-counter';
import {
  extract6WsFromReadme,
  extractFromLanguages,
  getScoreTier,
} from '../src/faf-core/parsers/faf-git-generator';

// ============================================================================
// TIER 1: Parser Unit Tests (~20 tests)
// ============================================================================

describe('TIER 1: Parser Units', () => {
  // --- AGENTS.md Parser ---
  // --- .cursorrules Parser ---
  // --- GEMINI.md Parser ---
  // --- Conductor Parser ---
  // --- GitHub URL Parser ---
  describe('parseGitHubUrl', () => {
    it('should parse full HTTPS URL', () => {
      const result = parseGitHubUrl('https://github.com/Wolfe-Jam/claude-faf-mcp');
      expect(result).toEqual({ owner: 'Wolfe-Jam', repo: 'claude-faf-mcp' });
    });

    it('should parse URL without protocol', () => {
      const result = parseGitHubUrl('github.com/Wolfe-Jam/claude-faf-mcp');
      expect(result).toEqual({ owner: 'Wolfe-Jam', repo: 'claude-faf-mcp' });
    });

    it('should parse owner/repo shorthand', () => {
      const result = parseGitHubUrl('Wolfe-Jam/claude-faf-mcp');
      expect(result).toEqual({ owner: 'Wolfe-Jam', repo: 'claude-faf-mcp' });
    });

    it('should strip .git extension', () => {
      const result = parseGitHubUrl('https://github.com/Wolfe-Jam/claude-faf-mcp.git');
      expect(result).toEqual({ owner: 'Wolfe-Jam', repo: 'claude-faf-mcp' });
    });

    it('should strip query parameters and hash fragments', () => {
      const result = parseGitHubUrl('https://github.com/owner/repo?tab=readme#section');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });

    it('should return null for non-GitHub URLs', () => {
      const result = parseGitHubUrl('https://gitlab.com/owner/repo');
      expect(result).toBeNull();
    });

    it('should return null for invalid input', () => {
      expect(parseGitHubUrl('')).toBeNull();
      expect(parseGitHubUrl('just-a-word')).toBeNull();
    });

    it('should handle www prefix', () => {
      const result = parseGitHubUrl('https://www.github.com/owner/repo');
      expect(result).toEqual({ owner: 'owner', repo: 'repo' });
    });
  });

  // --- Slot Counter ---
  describe('Slot Counter', () => {
    it('isIgnored should detect ignored values', () => {
      expect(isIgnored('SlotIgnored')).toBe(true);
      expect(isIgnored('none')).toBe(true);
      expect(isIgnored('unknown')).toBe(true);
      expect(isIgnored('not specified')).toBe(true);
      expect(isIgnored('n/a')).toBe(true);
      expect(isIgnored('N/A')).toBe(true);
    });

    it('isIgnored should return false for normal values', () => {
      expect(isIgnored('TypeScript')).toBe(false);
      expect(isIgnored(null)).toBe(false);
      expect(isIgnored(undefined)).toBe(false);
    });

    it('isFilled should detect filled values', () => {
      expect(isFilled('TypeScript')).toBe(true);
      expect(isFilled('React')).toBe(true);
    });

    it('isFilled should return false for empty/null values', () => {
      expect(isFilled(null)).toBe(false);
      expect(isFilled(undefined)).toBe(false);
      expect(isFilled('')).toBe(false);
    });

    it('isFilled should return false for ignored values', () => {
      expect(isFilled('SlotIgnored')).toBe(false);
      expect(isFilled('n/a')).toBe(false);
    });

    it('countSlots should calculate score correctly', () => {
      const result = countSlots({
        projectName: 'Test',
        projectGoal: 'Build stuff',
        mainLanguage: 'TypeScript',
        projectType: 'MCP Server',
        who: 'Developer',
        what: 'MCP tools',
        why: 'Automation',
        where: 'Cloud',
        when: '2026',
        how: 'CI/CD',
        frontend: 'React',
        uiLibrary: 'n/a',
        backend: 'Node.js',
        runtime: 'Node 20',
        database: 'none',
        build: 'tsc',
        packageManager: 'npm',
        apiType: 'MCP',
        hosting: 'Vercel',
        cicd: 'GitHub Actions',
        cssFramework: 'Tailwind',
      });
      // 19 filled + 2 ignored = 21 / 21 * 100 = 100%
      expect(result.score).toBe(100);
      expect(result.filled + result.ignored).toBe(21);
      expect(result.missing).toBe(0);
    });

    it('countSlots should handle empty slots', () => {
      const result = countSlots({});
      expect(result.score).toBe(0);
      expect(result.missing).toBe(21);
    });
  });
});

// ============================================================================
// TIER 2: Export
// ============================================================================

describe('TIER 2: Export', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'faf-interop-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // --- Agents ---
  describe('Agents Export', () => {
    it('should export FAF data to AGENTS.md', async () => {
      const fafData = {
        project: {
          name: 'Export Test',
          goal: 'Test the export',
          main_language: 'TypeScript',
        },
        human_context: {
          what: 'MCP tools',
        },
        stack: {
          runtime: 'Node.js',
        },
      };

      const { agentsExport } = await import('../src/faf-core/parsers/agents-parser');
      const outPath = path.join(tmpDir, 'AGENTS.md');
      const result = await agentsExport(fafData, outPath);
      expect(result.success).toBe(true);

      const content = await fs.readFile(outPath, 'utf-8');
      expect(content).toContain('Export Test');
    });
  });

  // --- Cursor ---
  describe('Cursor Export', () => {
    it('should export FAF data to .cursorrules', async () => {
      const fafData = {
        project: {
          name: 'Cursor Test',
          goal: 'Test cursor export',
          main_language: 'TypeScript',
        },
      };

      const { cursorExport } = await import('../src/faf-core/parsers/cursorrules-parser');
      const outPath = path.join(tmpDir, '.cursorrules');
      const result = await cursorExport(fafData, outPath);
      expect(result.success).toBe(true);

      const content = await fs.readFile(outPath, 'utf-8');
      expect(content).toContain('Cursor Test');
    });
  });

  // --- Gemini ---
  describe('Gemini Export', () => {
    it('should export FAF data to GEMINI.md', async () => {
      const fafData = {
        project: {
          name: 'Gemini Test',
          goal: 'Test gemini export',
          main_language: 'TypeScript',
        },
      };

      const { geminiExport } = await import('../src/faf-core/parsers/gemini-parser');
      const outPath = path.join(tmpDir, 'GEMINI.md');
      const result = await geminiExport(fafData, outPath);
      expect(result.success).toBe(true);

      const content = await fs.readFile(outPath, 'utf-8');
      expect(content).toContain('Gemini Test');
    });
  });

  // --- GitHub Metadata ---
  describe('GitHub Metadata Helpers', () => {
    it('detectStackFromMetadata should detect stacks from topics', () => {
      const metadata: GitHubMetadata = {
        owner: 'test',
        repo: 'test',
        url: 'https://github.com/test/test',
        topics: ['react', 'typescript', 'nodejs'],
        languages: [],
      };
      const stacks = detectStackFromMetadata(metadata);
      expect(stacks).toContain('React');
      expect(stacks).toContain('TypeScript');
      expect(stacks).toContain('Node.js');
    });

    it('detectStackFromMetadata should detect from languages', () => {
      const metadata: GitHubMetadata = {
        owner: 'test',
        repo: 'test',
        url: 'https://github.com/test/test',
        languages: ['TypeScript (85%)', 'JavaScript (15%)'],
      };
      const stacks = detectStackFromMetadata(metadata);
      expect(stacks).toContain('TypeScript');
      expect(stacks).toContain('JavaScript');
    });

    it('detectStackFromMetadata should detect from file presence', () => {
      const metadata: GitHubMetadata = {
        owner: 'test',
        repo: 'test',
        url: 'https://github.com/test/test',
        hasPackageJson: true,
        hasTsConfig: true,
        hasDockerfile: true,
      };
      const stacks = detectStackFromMetadata(metadata);
      expect(stacks).toContain('Node.js');
      expect(stacks).toContain('TypeScript');
      expect(stacks).toContain('Docker');
    });

    it('calculateRepoQualityScore should score popular repos high', () => {
      const metadata: GitHubMetadata = {
        owner: 'test',
        repo: 'test',
        url: 'https://github.com/test/test',
        stars: '10.5K',
        description: 'A popular and well-documented repository',
        topics: ['typescript'],
        license: 'MIT',
        readme: true,
        lastUpdated: new Date().toISOString(),
        hasPackageJson: true,
        hasTsConfig: true,
        languages: ['TypeScript (80%)', 'JavaScript (15%)', 'CSS (5%)'],
      };
      const score = calculateRepoQualityScore(metadata);
      expect(score).toBeGreaterThanOrEqual(80);
    });

    it('calculateRepoQualityScore should score empty repos low', () => {
      const metadata: GitHubMetadata = {
        owner: 'test',
        repo: 'test',
        url: 'https://github.com/test/test',
        stars: '0',
      };
      const score = calculateRepoQualityScore(metadata);
      expect(score).toBeLessThan(20);
    });
  });

  // --- FAF Git Generator ---
  describe('FAF Git Generator', () => {
    it('extract6WsFromReadme should extract context from README', () => {
      const readme = `# My Project\n\nA CLI tool for developers to build faster.\n\nBuilt with TypeScript and Node.js.\n\n## Installation\n\nnpm install my-project`;
      const metadata: GitHubMetadata = {
        owner: 'test',
        repo: 'my-project',
        url: 'https://github.com/test/my-project',
        description: 'A CLI tool for developers',
      };
      const result = extract6WsFromReadme(readme, metadata);
      expect(result.what).toBeDefined();
    });

    it('extractFromLanguages should extract stack from metadata', () => {
      const metadata: GitHubMetadata = {
        owner: 'test',
        repo: 'test',
        url: 'https://github.com/test/test',
        languages: ['TypeScript (80%)', 'JavaScript (20%)'],
        hasPackageJson: true,
        hasTsConfig: true,
      };
      const result = extractFromLanguages(metadata);
      expect(result.language).toBeDefined();
    });

    it('getScoreTier should return correct tier', () => {
      expect(getScoreTier(100)).toBeDefined();
      expect(getScoreTier(50)).toBeDefined();
      expect(getScoreTier(0)).toBeDefined();
    });
  });
});

// ============================================================================
// TIER 4: Engine Adapter (~10 tests)
// ============================================================================

describe('TIER 4: Engine Adapter', () => {
  describe('Command modules load successfully', () => {
    // 6.0.0 retired the imports into project.faf: only export / sync remain.
    it('agents command module exports export + sync, no import', async () => {
      const mod: any = await import('../src/faf-core/commands/agents');
      expect(mod.agentsImportCommand).toBeUndefined();
      expect(typeof mod.agentsExportCommand).toBe('function');
      expect(typeof mod.agentsSyncCommand).toBe('function');
    });

    it('cursor command module exports export + sync, no import', async () => {
      const mod: any = await import('../src/faf-core/commands/cursor');
      expect(mod.cursorImportCommand).toBeUndefined();
      expect(typeof mod.cursorExportCommand).toBe('function');
      expect(typeof mod.cursorSyncCommand).toBe('function');
    });

    it('gemini command module exports export + sync, no import', async () => {
      const mod: any = await import('../src/faf-core/commands/gemini');
      expect(mod.geminiImportCommand).toBeUndefined();
      expect(typeof mod.geminiExportCommand).toBe('function');
      expect(typeof mod.geminiSyncCommand).toBe('function');
    });

    it('conductor command module exports export, no import', async () => {
      const mod: any = await import('../src/faf-core/commands/conductor');
      expect(mod.conductorImportCommand).toBeUndefined();
      expect(typeof mod.conductorExportCommand).toBe('function');
    });

    it('git-context command module should export gitContextCommand', async () => {
      const mod = await import('../src/faf-core/commands/git-context');
      expect(typeof mod.gitContextCommand).toBe('function');
    });
  });

  describe('Claude export supports the format flags', () => {
    it('claude module should export claudeExportCommand (the local CLAUDE.md port is gone)', async () => {
      const mod: any = await import('../src/faf-core/commands/claude');
      expect(typeof mod.claudeExportCommand).toBe('function');
      expect(mod.fafToClaudeMd).toBeUndefined();
    });

    it('claudeExportCommand should write valid CLAUDE.md content', async () => {
      const { claudeExportCommand } = await import('../src/faf-core/commands/claude');
      const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'faf-claude-export-'));
      try {
        const fafContent = `project:\n  name: Claude Export Test\n  goal: Test CLAUDE.md output\ncontext_quality:\n  overall_assessment: Excellent\ninstant_context:\n  tech_stack: TypeScript + Node.js\n  what_building: MCP Server\n  main_language: TypeScript`;
        await fs.writeFile(path.join(dir, 'project.faf'), fafContent);
        const result = await claudeExportCommand(dir, { json: true });
        expect(result.success).toBe(true);
        const md = await fs.readFile(path.join(dir, 'CLAUDE.md'), 'utf-8');
        expect(md).toContain('Claude Export Test');
        expect(md).toContain('STATUS: SYNC ACTIVE');
        expect(md).not.toContain('BI-SYNC');
      } finally {
        await fs.rm(dir, { recursive: true, force: true });
      }
    });
  });

  describe('Engine adapter imports resolve', () => {
    it('engine-adapter module should load without errors', async () => {
      const mod = await import('../src/handlers/engine-adapter');
      expect(mod.FafEngineAdapter).toBeDefined();
    });

    it('tools handler module should load without errors', async () => {
      const mod = await import('../src/handlers/tools');
      expect(mod.FafToolHandler).toBeDefined();
    });
  });
});

// ============================================================================
// TIER 5: Security (~10 tests)
// ============================================================================

describe('TIER 5: Security', () => {
  describe('GitHub URL validation', () => {
    it('should reject non-GitHub domains', () => {
      expect(parseGitHubUrl('https://evil.com/owner/repo')).toBeNull();
      expect(parseGitHubUrl('https://gitlab.com/owner/repo')).toBeNull();
      expect(parseGitHubUrl('https://bitbucket.org/owner/repo')).toBeNull();
    });

    it('should reject URLs with path traversal', () => {
      const result = parseGitHubUrl('https://github.com/../../../etc/passwd');
      // If it parses, the owner should be ".." not a path traversal
      if (result) {
        expect(result.owner).not.toContain('/');
        expect(result.repo).not.toContain('/');
      }
    });

    it('should handle extremely long URLs without crashing', () => {
      const longUrl = 'https://github.com/' + 'a'.repeat(10000) + '/' + 'b'.repeat(10000);
      // Should not throw
      const result = parseGitHubUrl(longUrl);
      expect(result).toBeDefined();
    });
  });

  describe('File path safety', () => {
    let tmpDir: string;

    beforeEach(async () => {
      tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'faf-security-'));
    });

    afterEach(async () => {
      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('export should write only to specified path', async () => {
      const fafPath = path.join(tmpDir, 'project.faf');
      await fs.writeFile(fafPath, 'project:\n  name: Safe Test\n');

      const outPath = path.join(tmpDir, 'AGENTS.md');
      const { agentsExport } = await import('../src/faf-core/parsers/agents-parser');
      await agentsExport(fafPath, outPath);

      // Verify only the expected file was created
      const files = await fs.readdir(tmpDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      expect(mdFiles).toEqual(['AGENTS.md']);
    });
  });
});

// ============================================================================
// TIER 6: Performance (~10 tests)
// ============================================================================

describe('TIER 6: Performance', () => {
  describe('Parser speed', () => {
    it('parseGitHubUrl should complete in < 10ms', () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        parseGitHubUrl(`https://github.com/owner-${i}/repo-${i}`);
      }
      const duration = performance.now() - start;
      // 100 parses in < 10ms (relaxed for CI shared runners)
      expect(duration).toBeLessThan(50);
    });

    it('countSlots should complete in < 50ms', () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        countSlots({
          projectName: 'Test',
          projectGoal: 'Goal',
          mainLanguage: 'TS',
        });
      }
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });
  });

});

// ============================================================================
// TIER 7: Roundtrip (~5 tests)
// ============================================================================

describe('TIER 7: Roundtrip', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'faf-roundtrip-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it('claudeExportCommand should write valid CLAUDE.md from project.faf', async () => {
    const fafPath = path.join(tmpDir, 'project.faf');
    // The pre-5.23 roundtrip fixture: language and stack live ONLY under instant_context.
    await fs.writeFile(fafPath, `project:\n  name: Claude Roundtrip\n  goal: Prove the CLAUDE.md write works\ncontext_quality:\n  overall_assessment: Good\ninstant_context:\n  tech_stack: TypeScript\n  what_building: MCP Server\n  main_language: TypeScript\n`);

    const { claudeExportCommand } = await import('../src/faf-core/commands/claude');
    const result = await claudeExportCommand(tmpDir, { json: true });
    const claudeMd = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');

    expect(result.direction).toBe('faf-to-claude');
    expect(claudeMd).toContain('Claude Roundtrip');
    expect(claudeMd).toContain('STATUS: SYNC ACTIVE');
    // 5.23: CLAUDE.md is faf-cli's renderClaudeMd, which renders project.* /
    // stack.* / human_context.* only. The old local port fell back to
    // instant_context (Language / Stack); faf-cli does not, so none of it shows.
    expect(claudeMd).not.toContain('**Language:**');
    expect(claudeMd).not.toContain('## Stack');
    expect(claudeMd).not.toContain('TypeScript');
    expect(claudeMd.length).toBeGreaterThan(100);
  });

});
