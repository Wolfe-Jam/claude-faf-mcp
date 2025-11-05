/**
 * 🏎️ MCP Tool Type Extensions - v2.8.0
 * Extended tool schema with visibility metadata
 * Championship-grade type safety
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { ToolVisibility, ToolCategory } from './tool-visibility.js';

/**
 * Extended MCP tool with FAF visibility metadata
 */
export interface FafMcpTool extends Tool {
  /**
   * Optional metadata for tool categorization and filtering
   */
  metadata?: {
    /**
     * Tool visibility level
     */
    visibility: ToolVisibility;

    /**
     * Tool category for organization
     */
    category: ToolCategory;

    /**
     * Priority for sorting within category
     */
    priority?: number;

    /**
     * Additional custom metadata
     */
    [key: string]: unknown;
  };
}

/**
 * Type guard to check if a tool has FAF metadata
 */
export function hasFafMetadata(tool: Tool): tool is FafMcpTool {
  return 'metadata' in tool && typeof tool.metadata === 'object' && tool.metadata !== null;
}

/**
 * Type guard to check if a tool is a core tool
 */
export function isCoreMcpTool(tool: Tool): boolean {
  if (!hasFafMetadata(tool)) return false;
  return tool.metadata?.visibility === 'core';
}

/**
 * Type guard to check if a tool is an advanced tool
 */
export function isAdvancedMcpTool(tool: Tool): boolean {
  if (!hasFafMetadata(tool)) return false;
  return tool.metadata?.visibility === 'advanced';
}

/**
 * Filter tools by visibility level
 */
export function filterToolsByVisibility(
  tools: FafMcpTool[],
  showAdvanced: boolean
): FafMcpTool[] {
  if (showAdvanced) {
    return tools;
  }

  return tools.filter((tool) => {
    if (!hasFafMetadata(tool)) return true; // Include tools without metadata for backward compatibility
    return tool.metadata?.visibility === 'core';
  });
}

/**
 * Sort tools by category and priority
 */
export function sortTools(tools: FafMcpTool[]): FafMcpTool[] {
  return tools.sort((a, b) => {
    // First sort by category
    const categoryOrder: Record<ToolCategory, number> = {
      workflow: 1,
      quality: 2,
      intelligence: 3,
      sync: 4,
      ai: 5,
      help: 6,
      trust: 7,
      file: 8,
      utility: 9,
      display: 10,
    };

    const aCat = a.metadata?.category || 'utility';
    const bCat = b.metadata?.category || 'utility';

    const catDiff = categoryOrder[aCat] - categoryOrder[bCat];
    if (catDiff !== 0) return catDiff;

    // Then sort by priority within category
    const aPriority = a.metadata?.priority || 999;
    const bPriority = b.metadata?.priority || 999;

    return aPriority - bPriority;
  });
}
