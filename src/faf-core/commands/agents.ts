/**
 * Agents command — writes project.faf into AGENTS.md (OpenAI Codex and other
 * agents) as a faf-managed block: faf-cli's renderAgentsMd on the .faf
 * enriched from the repo, written by faf-cli's writeAgentsMd (the bytes
 * `faf export --agents` writes). export and sync are the same write; an
 * AGENTS.md already there keeps every line outside faf's block. The import
 * into project.faf was retired in 6.0.0.
 */
import { exportFormat, type ExportFormatResult } from '../utils/export-format.js';

export interface AgentsCommandResult extends ExportFormatResult {
  action: 'export' | 'sync';
}

/** Write project.faf into AGENTS.md as a faf-managed block. */
export async function agentsExportCommand(projectPath: string): Promise<AgentsCommandResult> {
  return { ...(await exportFormat(projectPath, 'AGENTS.md')), action: 'export' };
}

/** Sync project.faf → AGENTS.md: the same write as export (project.faf is the source of truth). */
export async function agentsSyncCommand(projectPath: string): Promise<AgentsCommandResult> {
  return { ...(await exportFormat(projectPath, 'AGENTS.md')), action: 'sync' };
}
