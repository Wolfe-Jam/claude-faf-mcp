/**
 * Agents Command - v4.5.0 Interop Edition
 *
 * Export/Sync project.faf to AGENTS.md (the import into project.faf was retired in 6.0.0)
 * Bundled command — no CLI dependency required.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { findFafFile } from '../utils/file-utils.js';
import { parse as parseYAML } from '../fix-once/yaml.js';
import {
  agentsExport,
} from '../parsers/agents-parser.js';

export interface AgentsCommandResult {
  success: boolean;
  action: 'export' | 'sync';
  message: string;
  data?: any;
  warnings?: string[];
}

/**
 * Export project.faf to AGENTS.md
 */
export async function agentsExportCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<AgentsCommandResult> {
  // Check for existing .faf
  const fafPath = await findFafFile(projectPath);
  if (!fafPath) {
    return {
      success: false,
      action: 'export',
      message: 'No .faf file found. Run faf init first.',
    };
  }

  // Check if AGENTS.md already exists
  const outputPath = path.join(projectPath, 'AGENTS.md');
  if (!options.force) {
    try {
      await fs.access(outputPath);
      return {
        success: false,
        action: 'export',
        message: 'AGENTS.md already exists. Use force: true to overwrite.',
      };
    } catch {
      // File doesn't exist, proceed
    }
  }

  // Read and parse .faf
  const fafContent = await fs.readFile(fafPath, 'utf-8');
  const fafData = parseYAML(fafContent);

  // Export
  const result = await agentsExport(fafData, outputPath);

  return {
    success: result.success,
    action: 'export',
    message: result.success
      ? `Exported project.faf to AGENTS.md`
      : 'Export failed',
    data: { filePath: result.filePath },
    warnings: result.warnings,
  };
}

/**
 * Sync project.faf → AGENTS.md — the same as export with force; project.faf is the source of truth.
 */
export async function agentsSyncCommand(
  projectPath: string
): Promise<AgentsCommandResult> {
  // FAF is always source of truth in MCP context
  return await agentsExportCommand(projectPath, { force: true });
}
