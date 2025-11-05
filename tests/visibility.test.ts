/**
 * 🏎️ Tool Visibility System Tests - v2.8.0
 * Championship-grade testing for core vs advanced tool filtering
 */

import { describe, it, expect, afterEach } from '@jest/globals';
import {
  TOOL_REGISTRY,
  getCoreTools,
  getAdvancedTools,
  getAllTools,
  isCoreTool,
  isAdvancedTool,
  validateToolCounts,
} from '../src/types/tool-visibility';
import { getVisibilityConfig } from '../src/config/visibility';
import { filterTools, shouldShowTool } from '../src/handlers/tool-registry';
import { Tool } from '@modelcontextprotocol/sdk/types.js';

describe('🏎️ Tool Visibility System', () => {
  describe('Tool Registry', () => {
    it('should have exactly 56 total tools defined (current implementation)', () => {
      const counts = validateToolCounts();
      expect(counts.total).toBe(56);
    });

    it('should have exactly 21 core tools (current implementation)', () => {
      const counts = validateToolCounts();
      expect(counts.core).toBe(21);
    });

    it('should have exactly 35 advanced tools (current implementation)', () => {
      const counts = validateToolCounts();
      expect(counts.advanced).toBe(35);
    });

    it('should correctly identify core tools', () => {
      expect(isCoreTool('faf')).toBe(true);
      expect(isCoreTool('faf_auto')).toBe(true);
      expect(isCoreTool('faf_init')).toBe(true);
      expect(isCoreTool('faf_score')).toBe(true);
      expect(isCoreTool('faf_about')).toBe(true);
    });

    it('should correctly identify advanced tools', () => {
      expect(isAdvancedTool('faf_display')).toBe(true);
      expect(isAdvancedTool('faf_trust')).toBe(true);
      expect(isAdvancedTool('faf_read')).toBe(true);
      expect(isAdvancedTool('faf_write')).toBe(true);
      expect(isAdvancedTool('faf_delete')).toBe(true);
    });

    it('should have all core tools in TOOL_REGISTRY', () => {
      const coreTools = getCoreTools();
      expect(coreTools.length).toBe(21);

      const expectedCore = [
        'faf',
        'faf_auto',
        'faf_init',
        'faf_innit',
        'faf_status',
        'faf_score',
        'faf_validate',
        'faf_doctor',
        'faf_audit',
        'faf_formats',
        'faf_stacks',
        'faf_skills',
        'faf_sync',
        'faf_bi_sync',
        'faf_update',
        'faf_migrate',
        'faf_chat',
        'faf_enhance',
        'faf_index',
        'faf_faq',
        'faf_about',
      ];

      expectedCore.forEach((toolName) => {
        const tool = coreTools.find((t) => t.name === toolName);
        expect(tool).toBeDefined();
        expect(tool?.visibility).toBe('core');
      });
    });

    it('should categorize tools correctly', () => {
      const faf = TOOL_REGISTRY['faf'];
      expect(faf.category).toBe('workflow');

      const faf_score = TOOL_REGISTRY['faf_score'];
      expect(faf_score.category).toBe('quality');

      const faf_formats = TOOL_REGISTRY['faf_formats'];
      expect(faf_formats.category).toBe('intelligence');

      const faf_sync = TOOL_REGISTRY['faf_sync'];
      expect(faf_sync.category).toBe('sync');

      const faf_enhance = TOOL_REGISTRY['faf_enhance'];
      expect(faf_enhance.category).toBe('ai');

      const faf_about = TOOL_REGISTRY['faf_about'];
      expect(faf_about.category).toBe('help');
    });
  });

  describe('Visibility Configuration', () => {
    // Save original env var
    const originalEnv = process.env.FAF_MCP_SHOW_ADVANCED;

    afterEach(() => {
      // Restore original env var
      if (originalEnv) {
        process.env.FAF_MCP_SHOW_ADVANCED = originalEnv;
      } else {
        delete process.env.FAF_MCP_SHOW_ADVANCED;
      }
    });

    it('should default to core only (showAdvanced: false)', () => {
      delete process.env.FAF_MCP_SHOW_ADVANCED;
      const config = getVisibilityConfig();
      expect(config.showAdvanced).toBe(false);
      expect(config.source).toBe('default');
    });

    it('should respect FAF_MCP_SHOW_ADVANCED env var', () => {
      process.env.FAF_MCP_SHOW_ADVANCED = 'true';
      const config = getVisibilityConfig();
      expect(config.showAdvanced).toBe(true);
      expect(config.source).toBe('env');
    });

    it('should ignore env var if not "true"', () => {
      process.env.FAF_MCP_SHOW_ADVANCED = 'false';
      const config = getVisibilityConfig();
      expect(config.showAdvanced).toBe(false);
    });
  });

  describe('Tool Filtering', () => {
    const mockTools: Tool[] = [
      {
        name: 'faf',
        description: 'Core tool',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'faf_auto',
        description: 'Core tool',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'faf_read',
        description: 'Advanced tool',
        inputSchema: { type: 'object', properties: {} },
      },
      {
        name: 'faf_write',
        description: 'Advanced tool',
        inputSchema: { type: 'object', properties: {} },
      },
    ];

    it('should show only core tools when showAdvanced is false', () => {
      const filtered = filterTools(mockTools, false);
      expect(filtered.length).toBe(2);
      expect(filtered.find((t) => t.name === 'faf')).toBeDefined();
      expect(filtered.find((t) => t.name === 'faf_auto')).toBeDefined();
      expect(filtered.find((t) => t.name === 'faf_read')).toBeUndefined();
      expect(filtered.find((t) => t.name === 'faf_write')).toBeUndefined();
    });

    it('should show all tools when showAdvanced is true', () => {
      const filtered = filterTools(mockTools, true);
      expect(filtered.length).toBe(4);
    });

    it('should add metadata to filtered tools', () => {
      const filtered = filterTools(mockTools, true);
      const fafTool = filtered.find((t) => t.name === 'faf');

      expect(fafTool?.metadata).toBeDefined();
      expect(fafTool?.metadata?.visibility).toBe('core');
      expect(fafTool?.metadata?.category).toBe('workflow');
    });

    it('shouldShowTool returns correct values', () => {
      // Core tools should always show
      expect(shouldShowTool('faf', false)).toBe(true);
      expect(shouldShowTool('faf', true)).toBe(true);

      // Advanced tools should only show when showAdvanced is true
      expect(shouldShowTool('faf_read', false)).toBe(false);
      expect(shouldShowTool('faf_read', true)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle unknown tools gracefully', () => {
      const result = shouldShowTool('unknown_tool', false);
      // Unknown tools default to visible for backward compatibility
      expect(result).toBe(true);
    });

    it('should not have duplicate tool names', () => {
      const allTools = getAllTools();
      const names = allTools.map((t) => t.name);
      const uniqueNames = new Set(names);
      expect(names.length).toBe(uniqueNames.size);
    });

    it('should have valid categories for all tools', () => {
      const validCategories = [
        'workflow',
        'quality',
        'intelligence',
        'sync',
        'ai',
        'help',
        'trust',
        'file',
        'utility',
        'display',
      ];

      const allTools = getAllTools();
      allTools.forEach((tool) => {
        expect(validCategories).toContain(tool.category);
      });
    });
  });

  describe('Performance', () => {
    it('should filter tools quickly (< 10ms for 56 tools)', () => {
      const mockTools: Tool[] = Array.from({ length: 56 }, (_, i) => ({
        name: `tool_${i}`,
        description: 'Test tool',
        inputSchema: { type: 'object', properties: {} },
      }));

      const start = Date.now();
      filterTools(mockTools, false);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10);
    });
  });
});

describe('🏁 WJTTC Certification Tests', () => {
  it('Tier 1: Critical - Tool count integrity (current implementation: 21+35=56)', () => {
    const counts = validateToolCounts();
    expect(counts.core).toBe(21);
    expect(counts.advanced).toBe(35);
    expect(counts.total).toBe(56);
  });

  it('Tier 1: Critical - No duplicate tools', () => {
    const allTools = getAllTools();
    const names = allTools.map((t) => t.name);
    const uniqueNames = new Set(names);
    expect(names.length).toBe(uniqueNames.size);
  });

  it('Tier 2: Performance - Filtering performance', () => {
    const start = Date.now();
    getCoreTools();
    getAdvancedTools();
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(50); // Sub-50ms championship target
  });

  it('Tier 3: Polish - All tools have descriptions', () => {
    const allTools = getAllTools();
    allTools.forEach((tool) => {
      expect(tool.description).toBeDefined();
      expect(tool.description.length).toBeGreaterThan(0);
    });
  });
});
