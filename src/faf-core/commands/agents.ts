/**
 * Agents Command - v4.5.0 Interop Edition
 *
 * Import/Export/Sync between AGENTS.md and project.faf
 * Bundled command — no CLI dependency required.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { findFafFile } from '../utils/file-utils.js';
import { parse as parseYAML, stringify as stringifyYAML } from '../fix-once/yaml.js';
import {
  agentsImport,
  agentsExport,
  detectAgentsMd,
} from '../parsers/agents-parser.js';

export interface AgentsCommandResult {
  success: boolean;
  action: 'import' | 'export' | 'sync';
  message: string;
  data?: any;
  warnings?: string[];
}

/**
 * Import AGENTS.md into project.faf
 */
export async function agentsImportCommand(
  projectPath: string,
  options: { merge?: boolean } = {}
): Promise<AgentsCommandResult> {
  const agentsPath = await detectAgentsMd(projectPath);

  if (!agentsPath) {
    return {
      success: false,
      action: 'import',
      message: 'No AGENTS.md found in project directory',
    };
  }

  const result = await agentsImport(agentsPath);

  if (!result.success) {
    return {
      success: false,
      action: 'import',
      message: result.warnings.join(', '),
      warnings: result.warnings,
    };
  }

  // If merge mode, read existing .faf and merge
  if (options.merge) {
    const fafPath = await findFafFile(projectPath);
    if (fafPath) {
      try {
        const existingContent = await fs.readFile(fafPath, 'utf-8');
        const existingFaf = parseYAML(existingContent);

        // Merge: spread existing + overlay imported fields
        const merged = {
          ...existingFaf,
          project: {
            ...(existingFaf.project || {}),
            rules: [
              ...(existingFaf.project?.rules || []),
              ...result.faf.project.rules,
            ],
            guidelines: [
              ...(existingFaf.project?.guidelines || []),
              ...result.faf.project.guidelines,
            ],
            codingStyle: [
              ...(existingFaf.project?.codingStyle || []),
              ...result.faf.project.codingStyle,
            ],
          },
        };

        const yamlContent = stringifyYAML(merged);
        await fs.writeFile(fafPath, yamlContent);

        return {
          success: true,
          action: 'import',
          message: `Merged AGENTS.md into existing .faf (${result.sectionsFound.length} sections)`,
          data: { sectionsFound: result.sectionsFound, merged: true },
          warnings: result.warnings,
        };
      } catch {
        // Fall through to create new
      }
    }
  }

  return {
    success: true,
    action: 'import',
    message: `Imported AGENTS.md (${result.sectionsFound.length} sections found)`,
    data: { faf: result.faf, sectionsFound: result.sectionsFound },
    warnings: result.warnings,
  };
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
 * Sync AGENTS.md <-> project.faf (FAF is source of truth by default)
 */
export async function agentsSyncCommand(
  projectPath: string
): Promise<AgentsCommandResult> {
  // FAF is always source of truth in MCP context
  return await agentsExportCommand(projectPath, { force: true });
}
