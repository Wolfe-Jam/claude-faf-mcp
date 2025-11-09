/**
 * 🔍 faf validate - Validation Command (Mk3 Bundled)
 * Validates project.faf files with detailed feedback
 */

import { promises as fs } from 'fs';
import { parse as parseYAML } from '../fix-once/yaml';
import { findFafFile, fileExists } from '../utils/file-utils';

export interface ValidateOptions {
  verbose?: boolean;
  json?: boolean;
}

export interface ValidationError {
  message: string;
  path?: string;
  severity: 'error' | 'warning';
}

export interface ValidateResult {
  success: boolean;
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  message: string;
}

export async function validateFafFile(projectPath?: string, options: ValidateOptions = {}): Promise<ValidateResult> {
  try {
    const fafPath = projectPath ? `${projectPath}/project.faf` : await findFafFile();

    if (!fafPath || !await fileExists(fafPath)) {
      return {
        success: false,
        valid: false,
        errors: [{ message: 'No project.faf file found', severity: 'error' }],
        warnings: [],
        message: 'No project.faf file found. Run faf init first.'
      };
    }

    // Read and parse project.faf file
    const content = await fs.readFile(fafPath, 'utf-8');
    let fafData;

    try {
      fafData = parseYAML(content);
    } catch (parseError) {
      return {
        success: false,
        valid: false,
        errors: [{ message: 'Invalid YAML syntax', severity: 'error' }],
        warnings: [],
        message: 'project.faf contains invalid YAML'
      };
    }

    // Validate structure
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Check required top-level fields
    if (!fafData.faf_version) {
      errors.push({ message: 'Missing required field: faf_version', path: 'faf_version', severity: 'error' });
    }

    if (!fafData.project) {
      errors.push({ message: 'Missing required section: project', path: 'project', severity: 'error' });
    } else {
      if (!fafData.project.name) {
        errors.push({ message: 'Missing required field: project.name', path: 'project.name', severity: 'error' });
      }
      if (!fafData.project.goal) {
        warnings.push({ message: 'Missing recommended field: project.goal', path: 'project.goal', severity: 'warning' });
      }
    }

    if (!fafData.instant_context) {
      warnings.push({ message: 'Missing recommended section: instant_context', path: 'instant_context', severity: 'warning' });
    }

    if (!fafData.stack) {
      warnings.push({ message: 'Missing recommended section: stack', path: 'stack', severity: 'warning' });
    }

    const valid = errors.length === 0;

    return {
      success: true,
      valid,
      errors,
      warnings,
      message: valid ? 'Valid project.faf file' : `Invalid project.faf file (${errors.length} errors, ${warnings.length} warnings)`
    };

  } catch (error) {
    return {
      success: false,
      valid: false,
      errors: [{ message: error instanceof Error ? error.message : 'Validation failed', severity: 'error' }],
      warnings: [],
      message: 'Validation failed'
    };
  }
}
