/**
 * Cursor Command - v4.5.0 Interop Edition
 *
 * Export/Sync project.faf to .cursorrules (the import into project.faf was retired in 6.0.0)
 * Bundled command — no CLI dependency required.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { findFafFile } from '../utils/file-utils.js';
import { parse as parseYAML } from '../fix-once/yaml.js';
import {
  cursorExport,
} from '../parsers/cursorrules-parser.js';

export interface CursorCommandResult {
  success: boolean;
  action: 'export' | 'sync';
  message: string;
  data?: any;
  warnings?: string[];
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
 * Sync project.faf → .cursorrules — the same as export with force; project.faf is the source of truth.
 */
export async function cursorSyncCommand(
  projectPath: string
): Promise<CursorCommandResult> {
  return await cursorExportCommand(projectPath, { force: true });
}
