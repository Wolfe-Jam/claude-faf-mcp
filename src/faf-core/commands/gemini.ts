/**
 * Gemini command — writes project.faf into GEMINI.md (Google Gemini CLI) as a
 * faf-managed block: faf-cli's renderGeminiMd on the .faf enriched from the
 * repo, written by faf-cli's writeGeminiMd (the bytes `faf export --gemini`
 * writes). export and sync are the same write; a GEMINI.md already there keeps
 * every line outside faf's block. The import into project.faf was retired in
 * 6.0.0.
 */
import { exportFormat, type ExportFormatResult } from '../utils/export-format.js';

export interface GeminiCommandResult extends ExportFormatResult {
  action: 'export' | 'sync';
}

/** Write project.faf into GEMINI.md as a faf-managed block. */
export async function geminiExportCommand(projectPath: string): Promise<GeminiCommandResult> {
  return { ...(await exportFormat(projectPath, 'GEMINI.md')), action: 'export' };
}

/** Sync project.faf → GEMINI.md: the same write as export (project.faf is the source of truth). */
export async function geminiSyncCommand(projectPath: string): Promise<GeminiCommandResult> {
  return { ...(await exportFormat(projectPath, 'GEMINI.md')), action: 'sync' };
}
