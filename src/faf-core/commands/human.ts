/**
 * Human Context Management - MCP Bundled Version
 * Non-interactive YAML merge for MCP context
 */

import { promises as fs } from 'fs';
import { parse as parseYAML, stringify as stringifyYAML } from 'yaml';
import * as path from 'path';

export interface HumanAddOptions {
  yaml?: string;  // YAML string to merge
  field?: string; // Single field to set
  value?: string; // Value for single field
  merge?: boolean; // Merge mode (default: true)
}

export interface HumanAddResult {
  success: boolean;
  message: string;
  fieldsUpdated?: string[];
  score?: number;
  error?: string;
}

/**
 * Find project.faf file
 */
async function findFafFile(startPath: string): Promise<string | null> {
  const possiblePaths = [
    path.join(startPath, 'project.faf'),
    path.join(startPath, '.faf'),
    path.join(startPath, 'faf.yml'),
    path.join(startPath, 'faf.yaml'),
  ];

  for (const fafPath of possiblePaths) {
    try {
      await fs.access(fafPath);
      return fafPath;
    } catch {
      // File doesn't exist, continue
    }
  }

  return null;
}

/**
 * Add or update human_context in project.faf
 * MCP-compatible non-interactive version
 */
export async function humanAddCommand(
  projectPath: string,
  options: HumanAddOptions = {}
): Promise<HumanAddResult> {
  try {
    // Find existing .faf file
    const fafPath = await findFafFile(projectPath);

    if (!fafPath) {
      // Create new project.faf if it doesn't exist
      const newFafPath = path.join(projectPath, 'project.faf');

      if (options.yaml) {
        // Parse the input YAML
        const inputData = parseYAML(options.yaml);

        // If input has human_context key, use it directly
        // Otherwise wrap the input as human_context
        const fafData = inputData.human_context
          ? inputData
          : { human_context: inputData };

        await fs.writeFile(newFafPath, stringifyYAML(fafData), 'utf-8');

        const fields = Object.keys(fafData.human_context || {});
        return {
          success: true,
          message: `Created ${newFafPath} with human_context`,
          fieldsUpdated: fields
        };
      } else if (options.field && options.value) {
        // Single field mode
        const fafData = {
          human_context: {
            [options.field]: options.value
          }
        };

        await fs.writeFile(newFafPath, stringifyYAML(fafData), 'utf-8');

        return {
          success: true,
          message: `Created ${newFafPath} with ${options.field}`,
          fieldsUpdated: [options.field]
        };
      } else {
        return {
          success: false,
          message: 'No .faf file found and no input provided',
          error: 'Run faf_init first or provide YAML/field input'
        };
      }
    }

    // Read existing .faf file
    const fafContent = await fs.readFile(fafPath, 'utf-8');
    const fafData = parseYAML(fafContent) || {};

    if (!fafData.human_context) {
      fafData.human_context = {};
    }

    const fieldsUpdated: string[] = [];

    // YAML merge mode
    if (options.yaml) {
      const inputData = parseYAML(options.yaml);

      // Extract human_context from input
      const humanContext = inputData.human_context || inputData;

      // Merge fields
      for (const [key, value] of Object.entries(humanContext)) {
        if (value !== null && value !== undefined && value !== '') {
          fafData.human_context[key] = value;
          fieldsUpdated.push(key);
        }
      }
    }

    // Single field mode
    if (options.field && options.value) {
      fafData.human_context[options.field] = options.value;
      fieldsUpdated.push(options.field);
    }

    // Save updated .faf
    if (fieldsUpdated.length > 0) {
      await fs.writeFile(fafPath, stringifyYAML(fafData), 'utf-8');

      return {
        success: true,
        message: `Updated ${fieldsUpdated.length} field(s) in ${fafPath}`,
        fieldsUpdated
      };
    } else {
      return {
        success: false,
        message: 'No fields to update',
        error: 'Provide yaml or field/value parameters'
      };
    }

  } catch (error) {
    return {
      success: false,
      message: 'Failed to add human context',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Set a single human_context field
 * Convenience wrapper for single field updates
 */
export async function humanSetCommand(
  projectPath: string,
  field: string,
  value: string
): Promise<HumanAddResult> {
  const validFields = ['who', 'what', 'where', 'why', 'when', 'how'];

  if (!validFields.includes(field.toLowerCase())) {
    return {
      success: false,
      message: `Invalid field: ${field}`,
      error: `Valid fields: ${validFields.join(', ')}`
    };
  }

  return humanAddCommand(projectPath, {
    field: field.toLowerCase(),
    value
  });
}
