/**
 * 🏎️ FAF MCP Tool Registry with Visibility Support - v2.8.0
 * Central registry for all MCP tools with metadata
 * Championship-grade organization
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';
import { TOOL_REGISTRY, getToolMetadata } from '../types/tool-visibility.js';
import { FafMcpTool } from '../types/mcp-tools.js';

/**
 * Check if a tool should be visible based on configuration
 */
export function shouldShowTool(toolName: string, showAdvanced: boolean): boolean {
  const metadata = getToolMetadata(toolName);

  // If no metadata found, show by default for backward compatibility
  if (!metadata) {
    return true;
  }

  // If showAdvanced is true, show all tools
  if (showAdvanced) {
    return true;
  }

  // Otherwise, only show core tools
  return metadata.visibility === 'core';
}

/**
 * Add metadata to a tool definition
 */
export function enrichToolWithMetadata(tool: Tool): FafMcpTool {
  const metadata = getToolMetadata(tool.name);

  if (!metadata) {
    // Return tool as-is if no metadata found
    return tool as FafMcpTool;
  }

  return {
    ...tool,
    metadata: {
      visibility: metadata.visibility,
      category: metadata.category,
      priority: metadata.priority,
    },
  };
}

/**
 * Filter tools based on visibility configuration
 */
export function filterTools(tools: Tool[], showAdvanced: boolean): FafMcpTool[] {
  return tools
    .filter((tool) => shouldShowTool(tool.name, showAdvanced))
    .map((tool) => enrichToolWithMetadata(tool));
}

/**
 * Get tool count summary
 */
export function getToolCountSummary(showAdvanced: boolean): string {
  const coreCount = Object.values(TOOL_REGISTRY).filter((t) => t.visibility === 'core').length;
  const totalCount = Object.values(TOOL_REGISTRY).length;

  if (showAdvanced) {
    return `${totalCount} tools (${coreCount} core + ${totalCount - coreCount} advanced)`;
  } else {
    return `${coreCount} core tools`;
  }
}
