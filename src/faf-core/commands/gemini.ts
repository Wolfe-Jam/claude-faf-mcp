/**
 * Gemini command — writes project.faf into GEMINI.md (Google Gemini CLI) as a faf-managed
 * block. export and sync are the same write: faf-cli's injector changes only
 * faf's block, and a GEMINI.md already there keeps every line outside it (faf
 * never refuses, reclaims or replaces the file). The import into project.faf
 * was retired in 6.0.0. Bundled command — no CLI dependency required.
 */

import path from 'path';
import * as fs from 'fs';
import { exportSource } from '../utils/export-source.js';
import { readFafMapping } from '../fix-once/yaml.js';
import {
  geminiExport,
} from '../parsers/gemini-parser.js';
import { fafCli } from '../../utils/faf-cli-bridge.js';

export interface GeminiCommandResult {
  success: boolean;
  action: 'export' | 'sync';
  message: string;
  data?: any;
  warnings?: string[];
}

/**
 * Write project.faf into GEMINI.md as a faf-managed block.
 */
export async function geminiExportCommand(
  projectPath: string
): Promise<GeminiCommandResult> {
  // faf-cli's finder (the folder, then one level up); GEMINI.md goes next to
  // the .faf it renders, never in the home folder or the filesystem root.
  const source = await exportSource(projectPath, 'GEMINI.md');
  if (!source.ok) {
    return { success: false, action: 'export', message: source.message };
  }
  const { fafPath, dir } = source;

  const outputPath = path.join(dir, 'GEMINI.md');
  const fafData = await readFafMapping(fafPath);
  const existed = fs.existsSync(outputPath);
  const { legacyStampNoteAt } = await fafCli;
  const note = legacyStampNoteAt(outputPath, 'GEMINI.md');

  const result = await geminiExport(fafData, outputPath);
  const warnings = [...result.warnings, ...(note ? [note] : [])];

  return {
    success: result.success,
    action: 'export',
    message: (existed
      ? `Wrote faf's block into ${outputPath} from ${fafPath}; every line outside the block is kept`
      : `Wrote ${outputPath} from ${fafPath}`) + (note ? `\n${note}` : ''),
    data: { filePath: result.filePath },
    warnings,
  };
}

/**
 * Sync project.faf → GEMINI.md: the same write as export (project.faf is the source of truth).
 */
export async function geminiSyncCommand(
  projectPath: string
): Promise<GeminiCommandResult> {
  return { ...(await geminiExportCommand(projectPath)), action: 'sync' };
}
