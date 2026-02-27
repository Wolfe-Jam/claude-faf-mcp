/**
 * Gemini Command - v4.5.0 Interop Edition
 *
 * Import/Export/Sync between GEMINI.md and project.faf
 * Bundled command — no CLI dependency required.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { findFafFile } from '../utils/file-utils.js';
import { parse as parseYAML, stringify as stringifyYAML } from '../fix-once/yaml.js';
import {
  geminiImport,
  geminiExport,
  detectGeminiMd,
} from '../parsers/gemini-parser.js';

export interface GeminiCommandResult {
  success: boolean;
  action: 'import' | 'export' | 'sync';
  message: string;
  data?: any;
  warnings?: string[];
}

/**
 * Import GEMINI.md into project.faf
 */
export async function geminiImportCommand(
  projectPath: string,
  options: { merge?: boolean } = {}
): Promise<GeminiCommandResult> {
  const geminiPath = await detectGeminiMd(projectPath);

  if (!geminiPath) {
    return {
      success: false,
      action: 'import',
      message: 'No GEMINI.md found in project directory',
    };
  }

  const result = await geminiImport(geminiPath);

  if (!result.success) {
    return {
      success: false,
      action: 'import',
      message: result.warnings.join(', '),
      warnings: result.warnings,
    };
  }

  if (options.merge) {
    const fafPath = await findFafFile(projectPath);
    if (fafPath) {
      try {
        const existingContent = await fs.readFile(fafPath, 'utf-8');
        const existingFaf = parseYAML(existingContent);

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
          message: `Merged GEMINI.md into existing .faf (${result.sectionsFound.length} sections)`,
          data: { sectionsFound: result.sectionsFound, merged: true },
          warnings: result.warnings,
        };
      } catch {
        // Fall through
      }
    }
  }

  return {
    success: true,
    action: 'import',
    message: `Imported GEMINI.md (${result.sectionsFound.length} sections found)`,
    data: { faf: result.faf, sectionsFound: result.sectionsFound },
    warnings: result.warnings,
  };
}

/**
 * Export project.faf to GEMINI.md
 */
export async function geminiExportCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<GeminiCommandResult> {
  const fafPath = await findFafFile(projectPath);
  if (!fafPath) {
    return {
      success: false,
      action: 'export',
      message: 'No .faf file found. Run faf init first.',
    };
  }

  const outputPath = path.join(projectPath, 'GEMINI.md');
  if (!options.force) {
    try {
      await fs.access(outputPath);
      return {
        success: false,
        action: 'export',
        message: 'GEMINI.md already exists. Use force: true to overwrite.',
      };
    } catch {
      // File doesn't exist, proceed
    }
  }

  const fafContent = await fs.readFile(fafPath, 'utf-8');
  const fafData = parseYAML(fafContent);

  const result = await geminiExport(fafData, outputPath);

  return {
    success: result.success,
    action: 'export',
    message: result.success
      ? `Exported project.faf to GEMINI.md`
      : 'Export failed',
    data: { filePath: result.filePath },
    warnings: result.warnings,
  };
}

/**
 * Sync GEMINI.md <-> project.faf
 */
export async function geminiSyncCommand(
  projectPath: string
): Promise<GeminiCommandResult> {
  return await geminiExportCommand(projectPath, { force: true });
}
