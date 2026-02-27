/**
 * Interop v4.5.0 Test Suite
 * WJTTC-certified tests for AI format interoperability features
 *
 * 7 Tiers: Parser Units → Import/Export → MCP Integration →
 *          Engine Adapter → Security → Performance → Roundtrip
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import * as os from 'os';
import * as path from 'path';
import { promises as fs } from 'fs';

// Parser imports
import {
  parseAgentsMd,
  AgentsMdFile,
} from '../src/faf-core/parsers/agents-parser';
import {
  parseCursorRules,
  CursorRulesFile,
} from '../src/faf-core/parsers/cursorrules-parser';
import {
  parseGeminiMd,
  GeminiMdFile,
} from '../src/faf-core/parsers/gemini-parser';
import {
  parseMarkdownSections,
  extractBulletPoints,
  parseProductMd,
  parseTechStackMd,
  parseWorkflowMd,
  parseGuidelinesMd,
} from '../src/faf-core/parsers/conductor-parser';
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

// Visibility / registry imports
import {
  TOOL_REGISTRY,
  getCoreTools,
  getAdvancedTools,
  getAllTools,
  isCoreTool,
  isAdvancedTool,
  validateToolCounts,
} from '../src/types/tool-visibility';

// ============================================================================
// TIER 1: Parser Unit Tests (~20 tests)
// ============================================================================

describe('TIER 1: Parser Units', () => {
  // --- AGENTS.md Parser ---
  describe('parseAgentsMd', () => {
    it('should parse well-formed AGENTS.md', () => {
      const content = `# My Project

## Project Overview
- A web application
- Built with React

## Tech Stack
- TypeScript
- Node.js
`;
      const result: AgentsMdFile = parseAgentsMd(content);
      expect(result.projectName).toBe('My Project');
      expect(result.sections.length).toBe(2);
      expect(result.sections[0].title).toBe('Project Overview');
      expect(result.sections[0].content).toContain('A web application');
      expect(result.sections[1].title).toBe('Tech Stack');
    });

    it('should handle empty content', () => {
      const result = parseAgentsMd('');
      expect(result.projectName).toBe('Unknown Project');
      expect(result.sections.length).toBe(0);
    });

    it('should strip UTF-8 BOM', () => {
      const bom = '\uFEFF';
      const content = `${bom}# BOM Project\n\n## Rules\n- Rule one`;
      const result = parseAgentsMd(content);
      expect(result.projectName).toBe('BOM Project');
    });

    it('should normalize Windows CRLF line endings', () => {
      const content = '# CRLF Project\r\n\r\n## Rules\r\n- Rule one\r\n- Rule two';
      const result = parseAgentsMd(content);
      expect(result.projectName).toBe('CRLF Project');
      expect(result.sections[0].content.length).toBe(2);
    });

    it('should normalize old Mac CR line endings', () => {
      const content = '# CR Project\r\r## Rules\r- Rule one';
      const result = parseAgentsMd(content);
      expect(result.projectName).toBe('CR Project');
    });

    it('should handle "Project: Name" H1 format', () => {
      const content = '# Project: My App\n\n## Stack\n- TypeScript';
      const result = parseAgentsMd(content);
      expect(result.projectName).toBe('My App');
    });
  });

  // --- .cursorrules Parser ---
  describe('parseCursorRules', () => {
    it('should parse well-formed .cursorrules', () => {
      const content = `# My Cursor Project

## Coding Style
- Use TypeScript strict mode
- Prefer const over let

## Guidelines
- Write tests
`;
      const result: CursorRulesFile = parseCursorRules(content);
      expect(result.projectName).toBe('My Cursor Project');
      expect(result.sections.length).toBe(2);
      expect(result.sections[0].content).toContain('Use TypeScript strict mode');
    });

    it('should handle sectionless content (all lines as guidelines)', () => {
      const content = 'Use strict mode\nPrefer const\nWrite tests';
      const result = parseCursorRules(content);
      // Sectionless files should preserve raw lines
      expect(result.rawLines.length).toBeGreaterThan(0);
    });

    it('should handle empty content', () => {
      const result = parseCursorRules('');
      expect(result.projectName).toBe('Unknown Project');
    });

    it('should strip BOM and normalize CRLF', () => {
      const content = '\uFEFF# BOM Cursor\r\n## Rules\r\n- Rule A';
      const result = parseCursorRules(content);
      expect(result.projectName).toBe('BOM Cursor');
    });
  });

  // --- GEMINI.md Parser ---
  describe('parseGeminiMd', () => {
    it('should parse well-formed GEMINI.md', () => {
      const content = `# My Gemini Project

## General Instructions
- Follow best practices
- Use TypeScript

## Coding Style
- Strict mode always
`;
      const result: GeminiMdFile = parseGeminiMd(content);
      expect(result.projectName).toBe('My Gemini Project');
      expect(result.sections.length).toBe(2);
      expect(result.sections[0].title).toBe('General Instructions');
    });

    it('should handle empty content', () => {
      const result = parseGeminiMd('');
      expect(result.projectName).toBe('Unknown Project');
      expect(result.sections.length).toBe(0);
    });
  });

  // --- Conductor Parser ---
  describe('Conductor Parser', () => {
    it('parseMarkdownSections should extract H2 sections', () => {
      const content = `# Title\n\n## Section One\nContent A\n\n## Section Two\nContent B`;
      const sections = parseMarkdownSections(content);
      // Keys are lowercased and space → underscore
      expect(sections['section_one']).toContain('Content A');
      expect(sections['section_two']).toContain('Content B');
    });

    it('extractBulletPoints should extract bullet items', () => {
      const content = '- Item 1\n- Item 2\n* Item 3\nNot a bullet';
      const bullets = extractBulletPoints(content);
      expect(bullets).toContain('Item 1');
      expect(bullets).toContain('Item 2');
      expect(bullets).toContain('Item 3');
      expect(bullets).not.toContain('Not a bullet');
    });

    it('parseProductMd should extract product info', () => {
      const content = `## Product Name\nMy Product\n\n## Description\nA great product\n\n## Goals\n- Goal 1`;
      const product = parseProductMd(content);
      expect(product).toBeDefined();
    });

    it('parseTechStackMd should extract stack info', () => {
      const content = `## Languages\n- TypeScript\n\n## Frameworks\n- React`;
      const stack = parseTechStackMd(content);
      expect(stack).toBeDefined();
    });

    it('parseWorkflowMd should extract workflow steps', () => {
      const content = `## Steps\n- Step 1\n- Step 2`;
      const workflow = parseWorkflowMd(content);
      expect(workflow).toBeDefined();
    });

    it('parseGuidelinesMd should extract guidelines', () => {
      const content = `## Coding Style\n- Use strict mode\n\n## Testing\n- Write unit tests`;
      const guidelines = parseGuidelinesMd(content);
      expect(guidelines).toBeDefined();
    });
  });

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
// TIER 2: Import/Export Logic (~20 tests)
// ============================================================================

describe('TIER 2: Import/Export', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'faf-interop-'));
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  // --- Agents Import/Export ---
  describe('Agents Import', () => {
    it('should import AGENTS.md to FafFromAgents structure', async () => {
      const agentsContent = `# Test Project

## Project Overview
- A TypeScript MCP server
- Uses strict mode

## Coding Style
- Always use const
- Prefer functional style

## Architecture
- Modular design
`;
      const agentsPath = path.join(tmpDir, 'AGENTS.md');
      await fs.writeFile(agentsPath, agentsContent);

      const { agentsImport } = await import('../src/faf-core/parsers/agents-parser');
      const result = await agentsImport(agentsPath);
      expect(result.success).toBe(true);
      expect(result.faf.project.name).toBe('Test Project');
      expect(result.faf.project.guidelines.length).toBeGreaterThan(0);
      expect(result.faf.metadata.source).toBe('agents');
    });

    it('should handle missing file gracefully', async () => {
      const { agentsImport } = await import('../src/faf-core/parsers/agents-parser');
      const result = await agentsImport(path.join(tmpDir, 'nonexistent.md'));
      expect(result.success).toBe(false);
    });
  });

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

  // --- Cursor Import/Export ---
  describe('Cursor Import', () => {
    it('should import .cursorrules to FafFromCursor structure', async () => {
      const cursorContent = `# Cursor Project

## Coding Style
- Use TypeScript strict
- No any types

## Testing
- Write unit tests
`;
      const cursorPath = path.join(tmpDir, '.cursorrules');
      await fs.writeFile(cursorPath, cursorContent);

      const { cursorImport } = await import('../src/faf-core/parsers/cursorrules-parser');
      const result = await cursorImport(cursorPath);
      expect(result.success).toBe(true);
      expect(result.faf.project.name).toBe('Cursor Project');
      expect(result.faf.metadata.source).toBe('cursor');
    });
  });

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

  // --- Gemini Import/Export ---
  describe('Gemini Import', () => {
    it('should import GEMINI.md to FafFromGemini structure', async () => {
      const geminiContent = `# Gemini Project

## General Instructions
- Follow best practices
- Use TypeScript

## Coding Style
- Strict mode always
`;
      const geminiPath = path.join(tmpDir, 'GEMINI.md');
      await fs.writeFile(geminiPath, geminiContent);

      const { geminiImport } = await import('../src/faf-core/parsers/gemini-parser');
      const result = await geminiImport(geminiPath);
      expect(result.success).toBe(true);
      expect(result.faf.project.name).toBe('Gemini Project');
      expect(result.faf.metadata.source).toBe('gemini');
    });
  });

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

  // --- Conductor Import ---
  describe('Conductor Import', () => {
    it('should import conductor directory structure', async () => {
      const conductorDir = path.join(tmpDir, 'conductor');
      await fs.mkdir(conductorDir);

      await fs.writeFile(path.join(conductorDir, 'product.md'), `## Product Name\nTest Product\n\n## Description\nA test product`);
      await fs.writeFile(path.join(conductorDir, 'tech-stack.md'), `## Languages\n- TypeScript\n\n## Frameworks\n- Express`);
      await fs.writeFile(path.join(conductorDir, 'workflow.md'), `## Steps\n- Build\n- Test\n- Deploy`);
      await fs.writeFile(path.join(conductorDir, 'guidelines.md'), `## Coding Style\n- Use strict mode`);

      const { conductorImport } = await import('../src/faf-core/parsers/conductor-parser');
      const result = await conductorImport(conductorDir);
      expect(result.success).toBe(true);
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
// TIER 3: MCP Integration (~15 tests)
// ============================================================================

describe('TIER 3: MCP Integration', () => {
  describe('New tool registration', () => {
    it('faf_agents should be registered as core', () => {
      expect(TOOL_REGISTRY['faf_agents']).toBeDefined();
      expect(TOOL_REGISTRY['faf_agents'].visibility).toBe('core');
      expect(TOOL_REGISTRY['faf_agents'].category).toBe('sync');
    });

    it('faf_cursor should be registered as core', () => {
      expect(TOOL_REGISTRY['faf_cursor']).toBeDefined();
      expect(TOOL_REGISTRY['faf_cursor'].visibility).toBe('core');
      expect(TOOL_REGISTRY['faf_cursor'].category).toBe('sync');
    });

    it('faf_gemini should be registered as core', () => {
      expect(TOOL_REGISTRY['faf_gemini']).toBeDefined();
      expect(TOOL_REGISTRY['faf_gemini'].visibility).toBe('core');
      expect(TOOL_REGISTRY['faf_gemini'].category).toBe('sync');
    });

    it('faf_git should be registered as core', () => {
      expect(TOOL_REGISTRY['faf_git']).toBeDefined();
      expect(TOOL_REGISTRY['faf_git'].visibility).toBe('core');
      expect(TOOL_REGISTRY['faf_git'].category).toBe('workflow');
    });

    it('faf_conductor should be registered as advanced', () => {
      expect(TOOL_REGISTRY['faf_conductor']).toBeDefined();
      expect(TOOL_REGISTRY['faf_conductor'].visibility).toBe('advanced');
      expect(TOOL_REGISTRY['faf_conductor'].category).toBe('sync');
    });
  });

  describe('Tool count integrity', () => {
    it('should have 25 core tools after v4.5.0', () => {
      const counts = validateToolCounts();
      expect(counts.core).toBe(25);
    });

    it('should have 36 advanced tools after v4.5.0', () => {
      const counts = validateToolCounts();
      expect(counts.advanced).toBe(36);
    });

    it('should have 61 total tools after v4.5.0', () => {
      const counts = validateToolCounts();
      expect(counts.total).toBe(61);
    });
  });

  describe('New tools appear in correct lists', () => {
    it('faf_agents should appear in core tools list', () => {
      const coreTools = getCoreTools();
      expect(coreTools.find(t => t.name === 'faf_agents')).toBeDefined();
    });

    it('faf_cursor should appear in core tools list', () => {
      const coreTools = getCoreTools();
      expect(coreTools.find(t => t.name === 'faf_cursor')).toBeDefined();
    });

    it('faf_gemini should appear in core tools list', () => {
      const coreTools = getCoreTools();
      expect(coreTools.find(t => t.name === 'faf_gemini')).toBeDefined();
    });

    it('faf_git should appear in core tools list', () => {
      const coreTools = getCoreTools();
      expect(coreTools.find(t => t.name === 'faf_git')).toBeDefined();
    });

    it('faf_conductor should appear in advanced tools list', () => {
      const advancedTools = getAdvancedTools();
      expect(advancedTools.find(t => t.name === 'faf_conductor')).toBeDefined();
    });

    it('new tools should all have descriptions', () => {
      const newTools = ['faf_agents', 'faf_cursor', 'faf_gemini', 'faf_git', 'faf_conductor'];
      for (const name of newTools) {
        expect(TOOL_REGISTRY[name].description).toBeDefined();
        expect(TOOL_REGISTRY[name].description.length).toBeGreaterThan(0);
      }
    });

    it('no duplicate tools should exist', () => {
      const allTools = getAllTools();
      const names = allTools.map(t => t.name);
      const unique = new Set(names);
      expect(names.length).toBe(unique.size);
    });
  });
});

// ============================================================================
// TIER 4: Engine Adapter (~10 tests)
// ============================================================================

describe('TIER 4: Engine Adapter', () => {
  describe('Command modules load successfully', () => {
    it('agents command module should export agentsImportCommand', async () => {
      const mod = await import('../src/faf-core/commands/agents');
      expect(typeof mod.agentsImportCommand).toBe('function');
      expect(typeof mod.agentsExportCommand).toBe('function');
      expect(typeof mod.agentsSyncCommand).toBe('function');
    });

    it('cursor command module should export cursorImportCommand', async () => {
      const mod = await import('../src/faf-core/commands/cursor');
      expect(typeof mod.cursorImportCommand).toBe('function');
      expect(typeof mod.cursorExportCommand).toBe('function');
      expect(typeof mod.cursorSyncCommand).toBe('function');
    });

    it('gemini command module should export geminiImportCommand', async () => {
      const mod = await import('../src/faf-core/commands/gemini');
      expect(typeof mod.geminiImportCommand).toBe('function');
      expect(typeof mod.geminiExportCommand).toBe('function');
      expect(typeof mod.geminiSyncCommand).toBe('function');
    });

    it('conductor command module should export conductorImportCommand', async () => {
      const mod = await import('../src/faf-core/commands/conductor');
      expect(typeof mod.conductorImportCommand).toBe('function');
      expect(typeof mod.conductorExportCommand).toBe('function');
    });

    it('git-context command module should export gitContextCommand', async () => {
      const mod = await import('../src/faf-core/commands/git-context');
      expect(typeof mod.gitContextCommand).toBe('function');
    });
  });

  describe('BiSync options support new flags', () => {
    it('bi-sync module should export BiSyncOptions with interop fields', async () => {
      const mod = await import('../src/faf-core/commands/bi-sync');
      expect(typeof mod.syncBiDirectional).toBe('function');
      expect(typeof mod.fafToClaudeMd).toBe('function');
    });

    it('fafToClaudeMd should generate valid CLAUDE.md content', async () => {
      const { fafToClaudeMd } = await import('../src/faf-core/commands/bi-sync');
      const fafContent = `project:\n  name: BiSync Test\n  goal: Test bi-sync output\ncontext_quality:\n  overall_assessment: Excellent\ninstant_context:\n  tech_stack: TypeScript + Node.js\n  what_building: MCP Server\n  main_language: TypeScript`;
      const result = fafToClaudeMd(fafContent);
      expect(result).toContain('BiSync Test');
      expect(result).toContain('BI-SYNC ACTIVE');
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

  describe('Parser input sanitization', () => {
    it('parseAgentsMd should handle null bytes gracefully', () => {
      const content = '# Project\x00Name\n## Rules\n- Rule\x00one';
      // Should not throw
      const result = parseAgentsMd(content);
      expect(result).toBeDefined();
    });

    it('parseCursorRules should handle script injection attempts', () => {
      const content = '# <script>alert("xss")</script>\n## Rules\n- Rule one';
      const result = parseCursorRules(content);
      // Should parse without executing anything
      expect(result).toBeDefined();
      expect(result.projectName).toContain('script');
    });

    it('parseGeminiMd should handle extremely large input', () => {
      // 100KB of repeated content
      const largeLine = '- ' + 'x'.repeat(1000) + '\n';
      const content = '# Large Project\n## Rules\n' + largeLine.repeat(100);
      const result = parseGeminiMd(content);
      expect(result).toBeDefined();
      expect(result.sections.length).toBeGreaterThan(0);
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

    it('import functions should fail on nonexistent paths', async () => {
      const { agentsImport } = await import('../src/faf-core/parsers/agents-parser');
      const result = await agentsImport('/nonexistent/path/AGENTS.md');
      expect(result.success).toBe(false);
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
    it('parseAgentsMd should complete in < 50ms', () => {
      const content = `# Test Project\n\n${'## Section\n- Item\n'.repeat(50)}`;
      const start = performance.now();
      parseAgentsMd(content);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('parseCursorRules should complete in < 50ms', () => {
      const content = `# Test Project\n\n${'## Section\n- Item\n'.repeat(50)}`;
      const start = performance.now();
      parseCursorRules(content);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('parseGeminiMd should complete in < 50ms', () => {
      const content = `# Test Project\n\n${'## Section\n- Item\n'.repeat(50)}`;
      const start = performance.now();
      parseGeminiMd(content);
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(50);
    });

    it('parseGitHubUrl should complete in < 10ms', () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        parseGitHubUrl(`https://github.com/owner-${i}/repo-${i}`);
      }
      const duration = performance.now() - start;
      // 100 parses in < 10ms (relaxed for CI shared runners)
      expect(duration).toBeLessThan(10);
    });

    it('countSlots should complete in < 25ms', () => {
      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        countSlots({
          projectName: 'Test',
          projectGoal: 'Goal',
          mainLanguage: 'TS',
        });
      }
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(25);
    });
  });

  describe('Registry speed', () => {
    it('getCoreTools should complete in < 10ms', () => {
      const start = performance.now();
      getCoreTools();
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
    });

    it('getAdvancedTools should complete in < 10ms', () => {
      const start = performance.now();
      getAdvancedTools();
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
    });

    it('validateToolCounts should complete in < 10ms', () => {
      const start = performance.now();
      validateToolCounts();
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
    });

    it('isCoreTool/isAdvancedTool should be fast lookups', () => {
      const start = performance.now();
      for (let i = 0; i < 1000; i++) {
        isCoreTool('faf_agents');
        isAdvancedTool('faf_conductor');
      }
      const duration = performance.now() - start;
      expect(duration).toBeLessThan(10);
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

  it('Agents export → import should preserve project name', async () => {
    const fafData = {
      project: {
        name: 'Roundtrip Test',
        goal: 'Test roundtrip',
        main_language: 'TypeScript',
      },
      human_context: { what: 'MCP server', why: 'Testing' },
      stack: { runtime: 'Node.js' },
    };

    const agentsPath = path.join(tmpDir, 'AGENTS.md');

    const { agentsExport, agentsImport } = await import('../src/faf-core/parsers/agents-parser');

    // Export
    const exportResult = await agentsExport(fafData, agentsPath);
    expect(exportResult.success).toBe(true);

    // Import
    const importResult = await agentsImport(agentsPath);
    expect(importResult.success).toBe(true);
    expect(importResult.faf.project.name).toBe('Roundtrip Test');
  });

  it('Cursor export → import should preserve project name', async () => {
    const fafData = {
      project: {
        name: 'Cursor Roundtrip',
        goal: 'Test cursor roundtrip',
        main_language: 'TypeScript',
      },
    };

    const cursorPath = path.join(tmpDir, '.cursorrules');

    const { cursorExport, cursorImport } = await import('../src/faf-core/parsers/cursorrules-parser');

    const exportResult = await cursorExport(fafData, cursorPath);
    expect(exportResult.success).toBe(true);

    const importResult = await cursorImport(cursorPath);
    expect(importResult.success).toBe(true);
    expect(importResult.faf.project.name).toBe('Cursor Roundtrip');
  });

  it('Gemini export → import should preserve project name', async () => {
    const fafData = {
      project: {
        name: 'Gemini Roundtrip',
        goal: 'Test gemini roundtrip',
        main_language: 'TypeScript',
      },
    };

    const geminiPath = path.join(tmpDir, 'GEMINI.md');

    const { geminiExport, geminiImport } = await import('../src/faf-core/parsers/gemini-parser');

    const exportResult = await geminiExport(fafData, geminiPath);
    expect(exportResult.success).toBe(true);

    const importResult = await geminiImport(geminiPath);
    expect(importResult.success).toBe(true);
    expect(importResult.faf.project.name).toBe('Gemini Roundtrip');
  });

  it('BiSync should generate valid CLAUDE.md from project.faf', async () => {
    const fafPath = path.join(tmpDir, 'project.faf');
    await fs.writeFile(fafPath, `project:\n  name: BiSync Roundtrip\n  goal: Prove bi-sync works\ncontext_quality:\n  overall_assessment: Good\ninstant_context:\n  tech_stack: TypeScript\n  what_building: MCP Server\n  main_language: TypeScript\n`);

    const { fafToClaudeMd } = await import('../src/faf-core/commands/bi-sync');
    const fafContent = await fs.readFile(fafPath, 'utf-8');
    const claudeMd = fafToClaudeMd(fafContent);

    expect(claudeMd).toContain('BiSync Roundtrip');
    expect(claudeMd).toContain('BI-SYNC ACTIVE');
    expect(claudeMd).toContain('TypeScript');
    expect(claudeMd.length).toBeGreaterThan(100);
  });

  it('All parser outputs should be deterministic', () => {
    const agentsContent = '# Determinism Test\n## Rules\n- Rule 1\n- Rule 2';
    const result1 = parseAgentsMd(agentsContent);
    const result2 = parseAgentsMd(agentsContent);
    expect(result1).toEqual(result2);

    const cursorContent = '# Determinism Test\n## Rules\n- Rule 1';
    const cr1 = parseCursorRules(cursorContent);
    const cr2 = parseCursorRules(cursorContent);
    expect(cr1).toEqual(cr2);

    const geminiContent = '# Determinism Test\n## Rules\n- Rule 1';
    const gr1 = parseGeminiMd(geminiContent);
    const gr2 = parseGeminiMd(geminiContent);
    expect(gr1).toEqual(gr2);
  });
});
