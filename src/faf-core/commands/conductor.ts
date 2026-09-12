/**
 * Conductor command — writes project.faf into a conductor/ folder (Google
 * Conductor) as one faf-managed block per file. A file already there keeps
 * every line outside its block; there is no overwrite. The import into
 * project.faf was retired in 6.0.0. Bundled command — no CLI dependency required.
 */

import * as path from 'path';
import { exportSource } from '../utils/export-source.js';
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
  // faf-cli's finder (the folder, then one level up); conductor/ goes next to
  // the .faf it renders, never in the home folder or the filesystem root.
  const source = await exportSource(projectPath, 'conductor/');
  if (!source.ok) {
    return { success: false, action: 'export', message: source.message };
  }
  const { fafPath, dir } = source;

  const fafData = await readFafMapping(fafPath);
  const result = await conductorExport(fafData, dir);

  return {
    success: result.success,
    action: 'export',
    message:
      `Wrote faf's block into ${path.join(dir, 'conductor')}/ (${result.filesWritten.join(', ')}) from ${fafPath}; every line outside each block is kept` +
      (result.warnings.length ? `\n${result.warnings.join('\n')}` : ''),
    data: { filesWritten: result.filesWritten },
    warnings: result.warnings,
  };
}
