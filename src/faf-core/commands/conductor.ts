/**
 * Conductor command — writes project.faf into a conductor/ folder (Google
 * Conductor) as one faf-managed block per file. A file already there keeps
 * every line outside its block; there is no overwrite. The import into
 * project.faf was retired in 6.0.0. Bundled command — no CLI dependency required.
 */

import { findFafFile } from '../utils/file-utils.js';
import { readFafMapping } from '../fix-once/yaml.js';
import { conductorExport } from '../parsers/conductor-parser.js';

export interface ConductorCommandResult {
  success: boolean;
  action: 'export';
  message: string;
  data?: any;
  warnings?: string[];
}

/**
 * Write project.faf into the conductor/ folder.
 */
export async function conductorExportCommand(projectPath: string): Promise<ConductorCommandResult> {
  const fafPath = await findFafFile(projectPath);
  if (!fafPath) {
    return {
      success: false,
      action: 'export',
      message: 'No .faf file found. Run faf init first.',
    };
  }

  const fafData = await readFafMapping(fafPath);
  const result = await conductorExport(fafData, projectPath);

  return {
    success: result.success,
    action: 'export',
    message:
      `Wrote faf's block into conductor/ (${result.filesWritten.join(', ')}); every line outside each block is kept` +
      (result.warnings.length ? `\n${result.warnings.join('\n')}` : ''),
    data: { filesWritten: result.filesWritten },
    warnings: result.warnings,
  };
}
