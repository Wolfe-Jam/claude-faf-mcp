/**
 * Cursor Command - v4.5.0 Interop Edition
 *
 * Import/Export/Sync between .cursorrules and project.faf
 * Bundled command — no CLI dependency required.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { findFafFile } from '../utils/file-utils.js';
import { parse as parseYAML, stringify as stringifyYAML } from '../fix-once/yaml.js';
import {
  cursorImport,
  cursorExport,
  detectCursorRules,
} from '../parsers/cursorrules-parser.js';

export interface CursorCommandResult {
  success: boolean;
  action: 'import' | 'export' | 'sync';
  message: string;
  data?: any;
  warnings?: string[];
}

/**
 * Import .cursorrules into project.faf
 */
export async function cursorImportCommand(
  projectPath: string,
  options: { merge?: boolean } = {}
): Promise<CursorCommandResult> {
  const cursorPath = await detectCursorRules(projectPath);

  if (!cursorPath) {
    return {
      success: false,
      action: 'import',
      message: 'No .cursorrules found in project directory',
    };
  }

  const result = await cursorImport(cursorPath);

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
          message: `Merged .cursorrules into existing .faf (${result.sectionsFound.length} sections)`,
          data: { sectionsFound: result.sectionsFound, merged: true },
          warnings: result.warnings,
        };
      } catch {
        // Fall through to return import data
      }
    }
  }

  return {
    success: true,
    action: 'import',
    message: `Imported .cursorrules (${result.sectionsFound.length} sections found)`,
    data: { faf: result.faf, sectionsFound: result.sectionsFound },
    warnings: result.warnings,
  };
}

/**
 * Export project.faf to .cursorrules
 */
export async function cursorExportCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<CursorCommandResult> {
  const fafPath = await findFafFile(projectPath);
  if (!fafPath) {
    return {
      success: false,
      action: 'export',
      message: 'No .faf file found. Run faf init first.',
    };
  }

  const outputPath = path.join(projectPath, '.cursorrules');
  if (!options.force) {
    try {
      await fs.access(outputPath);
      return {
        success: false,
        action: 'export',
        message: '.cursorrules already exists. Use force: true to overwrite.',
      };
    } catch {
      // File doesn't exist, proceed
    }
  }

  const fafContent = await fs.readFile(fafPath, 'utf-8');
  const fafData = parseYAML(fafContent);

  const result = await cursorExport(fafData, outputPath);

  return {
    success: result.success,
    action: 'export',
    message: result.success
      ? `Exported project.faf to .cursorrules`
      : 'Export failed',
    data: { filePath: result.filePath },
    warnings: result.warnings,
  };
}

/**
 * Sync .cursorrules <-> project.faf
 */
export async function cursorSyncCommand(
  projectPath: string
): Promise<CursorCommandResult> {
  return await cursorExportCommand(projectPath, { force: true });
}
