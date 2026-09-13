/**
 * Cursor command — writes project.faf into .cursorrules (Cursor IDE) as a
 * faf-managed block (`# faf:start` / `# faf:end`): faf-cli's renderCursorrules,
 * written by faf-cli's writeCursorrules (the bytes `faf export --cursor`
 * writes). export and sync are the same write; a .cursorrules already there
 * keeps every line outside faf's block. The import into project.faf was
 * retired in 6.0.0.
 */
import { exportFormat, type ExportFormatResult } from '../utils/export-format.js';

export interface CursorCommandResult extends ExportFormatResult {
  action: 'export' | 'sync';
}

/** Write project.faf into .cursorrules as a faf-managed block. */
export async function cursorExportCommand(projectPath: string): Promise<CursorCommandResult> {
  return { ...(await exportFormat(projectPath, '.cursorrules')), action: 'export' };
}

/** Sync project.faf → .cursorrules: the same write as export (project.faf is the source of truth). */
export async function cursorSyncCommand(projectPath: string): Promise<CursorCommandResult> {
  return { ...(await exportFormat(projectPath, '.cursorrules')), action: 'sync' };
}
