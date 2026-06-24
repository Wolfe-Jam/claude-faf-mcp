/**
 * Copilot Command - Interop Edition
 *
 * Export project.faf to .github/copilot-instructions.md — GitHub Copilot's
 * repository-wide custom-instructions file, the WIDEST-supported instruction
 * surface (read by default across web chat, code review, VS Code, JetBrains,
 * Visual Studio, Eclipse, Xcode, Copilot CLI, and the coding agent).
 *
 * Reuses the shared AGENTS.md content generator (generic project context with a
 * `# ProjectName` header — valid Copilot instructions) written to Copilot's
 * canonical nested path. Bundled command — no CLI dependency required.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { findFafFile } from '../utils/file-utils.js';
import { parse as parseYAML } from '../fix-once/yaml.js';
import { agentsExport } from '../parsers/agents-parser.js';

export interface CopilotCommandResult {
  success: boolean;
  action: 'export';
  message: string;
  data?: any;
  warnings?: string[];
}

/**
 * Export project.faf to .github/copilot-instructions.md
 */
export async function copilotExportCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<CopilotCommandResult> {
  // Check for existing .faf
  const fafPath = await findFafFile(projectPath);
  if (!fafPath) {
    return {
      success: false,
      action: 'export',
      message: 'No .faf file found. Run faf init first.',
    };
  }

  const githubDir = path.join(projectPath, '.github');
  const outputPath = path.join(githubDir, 'copilot-instructions.md');

  // Respect existing file unless force
  if (!options.force) {
    try {
      await fs.access(outputPath);
      return {
        success: false,
        action: 'export',
        message: '.github/copilot-instructions.md already exists. Use force: true to overwrite.',
      };
    } catch {
      // File doesn't exist, proceed
    }
  }

  // Copilot's instruction file is nested under .github/ — ensure it exists
  await fs.mkdir(githubDir, { recursive: true });

  // Read and parse .faf
  const fafContent = await fs.readFile(fafPath, 'utf-8');
  const fafData = parseYAML(fafContent);

  // Export (reuses the shared AGENTS.md body generator → Copilot's path)
  const result = await agentsExport(fafData, outputPath);

  return {
    success: result.success,
    action: 'export',
    message: result.success
      ? `Exported project.faf to .github/copilot-instructions.md`
      : 'Export failed',
    data: { filePath: result.filePath },
    warnings: result.warnings,
  };
}

/**
 * Sync .github/copilot-instructions.md <- project.faf (FAF is source of truth)
 */
export async function copilotSyncCommand(
  projectPath: string
): Promise<CopilotCommandResult> {
  return await copilotExportCommand(projectPath, { force: true });
}
