import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * FAF File Discovery Utility
 * Implements v1.2.0 Specification: The Visibility Revolution
 *
 * Priority Order:
 * 1. project.faf (standard visible file)
 * 2. *.faf (any .faf file in directory)
 * 3. .faf (legacy hidden file)
 */

export interface FafFileResult {
  /** Full path to the discovered FAF file */
  path: string;
  /** Filename (e.g., "project.faf", ".faf", "custom.faf") */
  filename: string;
  /** Discovery tier: 1 (project.faf), 2 (*.faf), 3 (.faf) */
  tier: 1 | 2 | 3;
  /** True if this is the new standard (project.faf) */
  isStandard: boolean;
  /** True if this is legacy format (.faf) and migration recommended */
  needsMigration: boolean;
}

/**
 * Find FAF file in directory following v1.2.0 priority
 *
 * @param directory - Directory to search (defaults to cwd)
 * @returns FafFileResult if found, null if no FAF file exists
 *
 * @example
 * const result = await findFafFile('/path/to/project');
 * if (result) {
 *   console.log(`Found: ${result.filename} (tier ${result.tier})`);
 *   if (result.needsMigration) {
 *     console.log('Consider migrating to project.faf');
 *   }
 * }
 */
export async function findFafFile(directory?: string): Promise<FafFileResult | null> {
  const dir = directory || process.cwd();

  try {
    // Priority 1: project.faf (standard visible file)
    const projectFafPath = path.join(dir, 'project.faf');
    try {
      await fs.access(projectFafPath);
      const stats = await fs.stat(projectFafPath);
      if (stats.isFile()) {
        return {
          path: projectFafPath,
          filename: 'project.faf',
          tier: 1,
          isStandard: true,
          needsMigration: false
        };
      }
    } catch {
      // Not found, continue to next priority
    }

    // Priority 2: *.faf (any .faf file in directory, excluding .faf itself)
    try {
      const files = await fs.readdir(dir);
      const fafFiles = files.filter(f =>
        f.endsWith('.faf') &&
        f !== '.faf' &&
        f !== 'project.faf' && // Exclude project.faf (already checked)
        !f.startsWith('.faf.backup-') // Exclude backup files
      );

      if (fafFiles.length > 0) {
        // If multiple *.faf files, prefer alphabetically first
        const filename = fafFiles.sort()[0];
        const fafPath = path.join(dir, filename);
        const stats = await fs.stat(fafPath);

        if (stats.isFile()) {
          return {
            path: fafPath,
            filename,
            tier: 2,
            isStandard: false,
            needsMigration: true
          };
        }
      }
    } catch {
      // Directory read failed, continue to next priority
    }

    // Priority 3: .faf (legacy hidden file)
    const dotFafPath = path.join(dir, '.faf');
    try {
      await fs.access(dotFafPath);
      const stats = await fs.stat(dotFafPath);
      if (stats.isFile()) {
        return {
          path: dotFafPath,
          filename: '.faf',
          tier: 3,
          isStandard: false,
          needsMigration: true
        };
      }
    } catch {
      // Not found
    }

    // No FAF file found at any priority level
    return null;

  } catch (error) {
    // Directory doesn't exist or permission error
    return null;
  }
}

/**
 * Get the path where a new FAF file should be created
 * Always returns project.faf (v1.2.0 standard)
 *
 * @param directory - Directory where FAF file will be created
 * @returns Full path to project.faf
 */
export function getNewFafFilePath(directory?: string): string {
  const dir = directory || process.cwd();
  return path.join(dir, 'project.faf');
}

/**
 * Check if a FAF file exists (any priority level)
 *
 * @param directory - Directory to check
 * @returns True if any FAF file exists
 */
export async function hasFafFile(directory?: string): Promise<boolean> {
  const result = await findFafFile(directory);
  return result !== null;
}

/**
 * Get deprecation warning for legacy FAF files
 *
 * @param result - Result from findFafFile()
 * @returns Deprecation message if applicable, null otherwise
 */
export function getDeprecationWarning(result: FafFileResult | null): string | null {
  if (!result || !result.needsMigration) {
    return null;
  }

  return `⚠️  Using ${result.filename} (tier ${result.tier})
💡 Migrate to project.faf for better visibility:
   faf migrate`;
}
