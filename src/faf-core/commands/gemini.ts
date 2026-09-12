/**
 * Gemini Command - v4.5.0 Interop Edition
 *
 * Export/Sync project.faf to GEMINI.md (the import into project.faf was retired in 6.0.0)
 * Bundled command — no CLI dependency required.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { findFafFile } from '../utils/file-utils.js';
import { parse as parseYAML } from '../fix-once/yaml.js';
import {
  geminiExport,
} from '../parsers/gemini-parser.js';

export interface GeminiCommandResult {
  success: boolean;
  action: 'export' | 'sync';
  message: string;
  data?: any;
  warnings?: string[];
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
 * Sync project.faf → GEMINI.md — the same as export with force; project.faf is the source of truth.
 */
export async function geminiSyncCommand(
  projectPath: string
): Promise<GeminiCommandResult> {
  return await geminiExportCommand(projectPath, { force: true });
}
