/**
 * Agents command — writes project.faf into AGENTS.md (OpenAI Codex and other agents) as a faf-managed
 * block. export and sync are the same write: faf-cli's injector changes only
 * faf's block, and a AGENTS.md already there keeps every line outside it (faf
 * never refuses, reclaims or replaces the file). The import into project.faf
 * was retired in 6.0.0. Bundled command — no CLI dependency required.
 */

import path from 'path';
import * as fs from 'fs';
import { findFafFile } from '../utils/file-utils.js';
import { readFafMapping } from '../fix-once/yaml.js';
import {
  agentsExport,
} from '../parsers/agents-parser.js';
import { fafCli } from '../../utils/faf-cli-bridge.js';

export interface AgentsCommandResult {
  success: boolean;
  action: 'export' | 'sync';
  message: string;
  data?: any;
  warnings?: string[];
}

/**
 * Write project.faf into AGENTS.md as a faf-managed block.
 */
export async function agentsExportCommand(
  projectPath: string
): Promise<AgentsCommandResult> {
  const fafPath = await findFafFile(projectPath);
  if (!fafPath) {
    return {
      success: false,
      action: 'export',
      message: 'No .faf file found. Run faf init first.',
    };
  }

  const outputPath = path.join(projectPath, 'AGENTS.md');
  const fafData = await readFafMapping(fafPath);
  const existed = fs.existsSync(outputPath);
  const { legacyStampNoteAt } = await fafCli;
  const note = legacyStampNoteAt(outputPath, 'AGENTS.md');

  const result = await agentsExport(fafData, outputPath);
  const warnings = [...result.warnings, ...(note ? [note] : [])];

  return {
    success: result.success,
    action: 'export',
    message: (existed
      ? `Wrote faf's block into AGENTS.md from project.faf; every line outside the block is kept`
      : `Wrote AGENTS.md from project.faf`) + (note ? `\n${note}` : ''),
    data: { filePath: result.filePath },
    warnings,
  };
}

/**
 * Sync project.faf → AGENTS.md: the same write as export (project.faf is the source of truth).
 */
export async function agentsSyncCommand(
  projectPath: string
): Promise<AgentsCommandResult> {
  return { ...(await agentsExportCommand(projectPath)), action: 'sync' };
}
