/**
 * Interop v4.5.0 Test Suite
 * WJTTC-certified tests for AI format interoperability features
 *
 * Tiers: Parser Units → Export → Engine Adapter → Security → Performance →
 *        Roundtrip. 6.0.0 retired the AGENTS.md / .cursorrules / GEMINI.md /
 *        conductor imports into project.faf and the dead tool-visibility
 *        registry, and their tests with them. faf_git composes faf-cli's
 *        `faf git` helpers now: the v4.5 GitHub-API port (github-extractor,
 *        faf-git-generator, slot-counter) and its tests are gone.
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import * as os from 'os';
import * as path from 'path';
import { promises as fs } from 'fs';

import { fafCli } from '../src/utils/faf-cli-bridge.js';
import { cloneArgs } from '../src/faf-core/commands/git-context';

const { normalizeGitUrl, repoNameFromUrl } = await fafCli;

// ============================================================================
// TIER 1: Parser Unit Tests (~20 tests)
// ============================================================================

describe('TIER 1: Parser Units', () => {
  // --- AGENTS.md Parser ---
  // --- .cursorrules Parser ---
  // --- GEMINI.md Parser ---
  // --- Conductor Parser ---
  // --- GitHub URL Parser ---
  // --- Repo URL (faf-cli's normalizeGitUrl, the gate faf_git composes) ---
  describe('normalizeGitUrl', () => {
    it('should normalise the forms faf_git accepts to one clone URL', () => {
      for (const input of [
        'https://github.com/Wolfe-Jam/claude-faf-mcp',
        'github.com/Wolfe-Jam/claude-faf-mcp',
        'Wolfe-Jam/claude-faf-mcp',
        'https://github.com/Wolfe-Jam/claude-faf-mcp.git',
      ]) {
        expect(normalizeGitUrl(input)).toBe('https://github.com/Wolfe-Jam/claude-faf-mcp.git');
      }
    });

    it('repoNameFromUrl names the repo', () => {
      expect(repoNameFromUrl(normalizeGitUrl('Wolfe-Jam/claude-faf-mcp'))).toBe('claude-faf-mcp');
    });

    it('should refuse empty input, a bare word and shell characters', () => {
      expect(() => normalizeGitUrl('')).toThrow();
      expect(() => normalizeGitUrl('just-a-word')).toThrow();
      expect(() => normalizeGitUrl('owner/repo; rm -rf /')).toThrow();
      expect(() => normalizeGitUrl('https://github.com/owner/repo?tab=readme#section')).toThrow();
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

  // 6.0.0 (#33): the exports are faf-cli's renders, written by faf-cli's
  // writers from project.faf (AGENTS.md and GEMINI.md enriched from the repo,
  // as `faf export` does). The local renderers are gone.
  const writeFaf = async (data: object): Promise<string> => {
    const { stringify } = await import('yaml');
    const p = path.join(tmpDir, 'project.faf');
    await fs.writeFile(p, stringify(data));
    return p;
  };
  const block = (text: string, start = '<!-- faf:start -->', end = '<!-- faf:end -->'): string =>
    text.slice(text.indexOf(start) + start.length, text.indexOf(end)).trim();

  // --- Agents ---
  describe('Agents Export', () => {
    it('should export FAF data to AGENTS.md — faf-cli\'s render, enriched from the repo', async () => {
      const fafPath = await writeFaf({
        faf_version: '3.0',
        project: { name: 'Export Test', goal: 'Test the export', main_language: 'TypeScript' },
        human_context: { what: 'MCP tools', where: 'npm' },
        stack: { runtime: 'Node.js', frontend: 'slotignored' },
      });
      const { agentsExportCommand } = await import('../src/faf-core/commands/agents');
      const result = await agentsExportCommand(tmpDir);
      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(tmpDir, 'AGENTS.md'), 'utf-8');
      const { renderAgentsMd, enrichFromRepo, readFaf } = await fafCli;
      expect(block(content)).toBe(renderAgentsMd(enrichFromRepo(tmpDir, readFaf(fafPath))).trim());
      expect(content).toContain('Export Test');
      expect(content).not.toContain('slotignored');
      expect(content).not.toContain('Deployed:');
    });
  });

  // --- Cursor ---
  describe('Cursor Export', () => {
    it('should export FAF data to .cursorrules — faf-cli\'s render', async () => {
      const fafPath = await writeFaf({
        faf_version: '3.0',
        project: { name: 'Cursor Test', goal: 'Test cursor export', main_language: 'TypeScript' },
        stack: { backend: 'Express', frontend: 'slotignored' },
      });
      const { cursorExportCommand } = await import('../src/faf-core/commands/cursor');
      const result = await cursorExportCommand(tmpDir);
      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(tmpDir, '.cursorrules'), 'utf-8');
      const { renderCursorrules, readFaf } = await fafCli;
      expect(block(content, '# faf:start', '# faf:end')).toBe(renderCursorrules(readFaf(fafPath)).trim());
      expect(content).toContain('Cursor Test');
      expect(content).not.toContain('slotignored');
    });
  });

  // --- Gemini ---
  describe('Gemini Export', () => {
    it('should export FAF data to GEMINI.md — faf-cli\'s render, not a one-line title', async () => {
      const fafPath = await writeFaf({
        faf_version: '3.0',
        project: { name: 'Gemini Test', goal: 'Test gemini export', main_language: 'TypeScript' },
      });
      const { geminiExportCommand } = await import('../src/faf-core/commands/gemini');
      const result = await geminiExportCommand(tmpDir);
      expect(result.success).toBe(true);

      const content = await fs.readFile(path.join(tmpDir, 'GEMINI.md'), 'utf-8');
      const { renderGeminiMd, enrichFromRepo, readFaf } = await fafCli;
      expect(block(content)).toBe(renderGeminiMd(enrichFromRepo(tmpDir, readFaf(fafPath))).trim());
      expect(content).toContain('Gemini Test');
      expect(block(content).split('\n').length).toBeGreaterThan(3);
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
  describe('faf_git clone argv', () => {
    it('never lets the URL be read as an option, and checks links out as plain files', () => {
      const dest = path.join(os.tmpdir(), 'never-created', 'repo'); // argv only: nothing is cloned or made
      const args = cloneArgs('https://github.com/owner/repo.git', dest);
      expect(args.slice(-3)).toEqual(['--', 'https://github.com/owner/repo.git', dest]);
      expect(args).toContain('core.symlinks=false');
      expect(args).toContain('--depth');
    });

    it('faf-cli refuses a URL that would reach git as an option or a command', () => {
      expect(() => normalizeGitUrl('--upload-pack=touch /tmp/pwned')).toThrow();
      expect(() => normalizeGitUrl('$(whoami)/repo')).toThrow();
    });

    it('should handle extremely long URLs without crashing', () => {
      const longUrl = 'https://github.com/' + 'a'.repeat(10000) + '/' + 'b'.repeat(10000);
      expect(normalizeGitUrl(longUrl)).toBe(`${longUrl}.git`);
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

      const { agentsExportCommand } = await import('../src/faf-core/commands/agents');
      expect((await agentsExportCommand(tmpDir)).success).toBe(true);

      // Verify only the expected file was created
      const files = await fs.readdir(tmpDir);
      const mdFiles = files.filter(f => f.endsWith('.md'));
      expect(mdFiles).toEqual(['AGENTS.md']);
    });
  });
});

// TIER 6 (Performance) lives in tests/performance.test.ts: wall-clock limits
// on shared runners are observability, not a gate.

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
