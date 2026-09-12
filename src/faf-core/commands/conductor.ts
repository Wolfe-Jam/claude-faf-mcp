/**
 * Conductor Command - v4.5.0 Interop Edition
 *
 * Export project.faf to a conductor/ directory (the import into project.faf was retired in 6.0.0)
 * Bundled command — no CLI dependency required.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { findFafFile } from '../utils/file-utils.js';
import { parse as parseYAML } from '../fix-once/yaml.js';
import {
  conductorExport,
  type FafFromConductor,
} from '../parsers/conductor-parser.js';

export interface ConductorCommandResult {
  success: boolean;
  action: 'export';
  message: string;
  data?: any;
  warnings?: string[];
}

/**
 * Export project.faf to conductor/ directory
 */
export async function conductorExportCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<ConductorCommandResult> {
  const fafPath = await findFafFile(projectPath);
  if (!fafPath) {
    return {
      success: false,
      action: 'export',
      message: 'No .faf file found. Run faf init first.',
    };
  }

  const outputPath = path.join(projectPath, 'conductor');

  // Check if conductor/ already exists
  if (!options.force) {
    try {
      const stat = await fs.stat(outputPath);
      if (stat.isDirectory()) {
        return {
          success: false,
          action: 'export',
          message: 'conductor/ directory already exists. Use force: true to overwrite.',
        };
      }
    } catch {
      // Doesn't exist, proceed
    }
  }

  const fafContent = await fs.readFile(fafPath, 'utf-8');
  const fafData = parseYAML(fafContent);

  // Build the conductor-compatible structure
  const conductorFaf: FafFromConductor = {
    project: {
      name: fafData.project?.name || 'Unknown',
      description: fafData.project?.description || fafData.project?.goal || '',
      type: fafData.project?.type || 'application',
      goals: fafData.project?.goals || [],
      stack: {
        languages: fafData.stack?.languages || fafData.project?.stack?.languages || [],
        frameworks: fafData.stack?.frameworks || fafData.project?.stack?.frameworks || [],
        databases: fafData.stack?.databases || fafData.project?.stack?.databases || [],
        infrastructure: fafData.stack?.infrastructure || fafData.project?.stack?.infrastructure || [],
      },
      rules: fafData.project?.rules || [],
      guidelines: fafData.project?.guidelines || [],
    },
    metadata: {
      source: 'faf',
      imported: new Date().toISOString(),
    },
  };

  const result = await conductorExport(conductorFaf, outputPath);

  return {
    success: result.success,
    action: 'export',
    message: result.success
      ? `Exported project.faf to conductor/ (${result.filesGenerated.length} files)`
      : 'Export failed',
    data: { filesGenerated: result.filesGenerated },
    warnings: result.warnings,
  };
}
