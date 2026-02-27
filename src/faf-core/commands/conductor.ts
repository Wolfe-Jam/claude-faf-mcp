/**
 * Conductor Command - v4.5.0 Interop Edition
 *
 * Import/Export between conductor/ directory and project.faf
 * Bundled command — no CLI dependency required.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { findFafFile } from '../utils/file-utils.js';
import { parse as parseYAML, stringify as stringifyYAML } from '../fix-once/yaml.js';
import {
  conductorImport,
  conductorExport,
  detectConductor,
  type FafFromConductor,
} from '../parsers/conductor-parser.js';

export interface ConductorCommandResult {
  success: boolean;
  action: 'import' | 'export';
  message: string;
  data?: any;
  warnings?: string[];
}

/**
 * Import conductor/ directory into project.faf
 */
export async function conductorImportCommand(
  projectPath: string,
  options: { merge?: boolean } = {}
): Promise<ConductorCommandResult> {
  const hasConductor = await detectConductor(projectPath);

  if (!hasConductor) {
    return {
      success: false,
      action: 'import',
      message: 'No conductor/ directory found in project',
    };
  }

  const conductorPath = path.join(projectPath, 'conductor');
  const result = await conductorImport(conductorPath);

  if (!result.success) {
    return {
      success: false,
      action: 'import',
      message: result.warnings.join(', '),
      warnings: result.warnings,
    };
  }

  if (options.merge) {
    const fafPath = await findFafFile(projectPath);
    if (fafPath) {
      try {
        const existingContent = await fs.readFile(fafPath, 'utf-8');
        const existingFaf = parseYAML(existingContent);

        const merged = {
          ...existingFaf,
          project: {
            ...(existingFaf.project || {}),
            name: result.faf.project.name || existingFaf.project?.name,
            description: result.faf.project.description || existingFaf.project?.description,
            goals: [
              ...(existingFaf.project?.goals || []),
              ...result.faf.project.goals,
            ],
            stack: {
              ...(existingFaf.project?.stack || {}),
              ...result.faf.project.stack,
            },
            rules: [
              ...(existingFaf.project?.rules || []),
              ...result.faf.project.rules,
            ],
            guidelines: [
              ...(existingFaf.project?.guidelines || []),
              ...result.faf.project.guidelines,
            ],
          },
        };

        const yamlContent = stringifyYAML(merged);
        await fs.writeFile(fafPath, yamlContent);

        return {
          success: true,
          action: 'import',
          message: `Merged conductor/ into existing .faf (${result.filesProcessed.length} files)`,
          data: { filesProcessed: result.filesProcessed, merged: true },
          warnings: result.warnings,
        };
      } catch {
        // Fall through
      }
    }
  }

  return {
    success: true,
    action: 'import',
    message: `Imported conductor/ (${result.filesProcessed.length} files processed)`,
    data: { faf: result.faf, filesProcessed: result.filesProcessed },
    warnings: result.warnings,
  };
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
