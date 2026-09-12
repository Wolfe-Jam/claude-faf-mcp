/**
 * Cursor command — writes project.faf into .cursorrules (Cursor IDE) as a faf-managed
 * block. export and sync are the same write: faf-cli's injector changes only
 * faf's block, and a .cursorrules already there keeps every line outside it (faf
 * never refuses, reclaims or replaces the file). The import into project.faf
 * was retired in 6.0.0. Bundled command — no CLI dependency required.
 */

import path from 'path';
import * as fs from 'fs';
import { exportSource } from '../utils/export-source.js';
import { readFafMapping } from '../fix-once/yaml.js';
import {
  cursorExport,
} from '../parsers/cursorrules-parser.js';
import { fafCli } from '../../utils/faf-cli-bridge.js';

export interface CursorCommandResult {
  success: boolean;
  action: 'export' | 'sync';
  message: string;
  data?: any;
  warnings?: string[];
}

/**
 * Write project.faf into .cursorrules as a faf-managed block.
 */
export async function cursorExportCommand(
  projectPath: string
): Promise<CursorCommandResult> {
  // faf-cli's finder (the folder, then one level up); .cursorrules goes next to
  // the .faf it renders, never in the home folder or the filesystem root.
  const source = await exportSource(projectPath, '.cursorrules');
  if (!source.ok) {
    return { success: false, action: 'export', message: source.message };
  }
  const { fafPath, dir } = source;

  const outputPath = path.join(dir, '.cursorrules');
  const fafData = await readFafMapping(fafPath);
  const existed = fs.existsSync(outputPath);
  const { legacyStampNoteAt } = await fafCli;
  const note = legacyStampNoteAt(outputPath, '.cursorrules', '# faf:start', '# faf:end');

  const result = await cursorExport(fafData, outputPath);
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
 * Sync project.faf → .cursorrules: the same write as export (project.faf is the source of truth).
 */
export async function cursorSyncCommand(
  projectPath: string
): Promise<CursorCommandResult> {
  return { ...(await cursorExportCommand(projectPath)), action: 'sync' };
}
