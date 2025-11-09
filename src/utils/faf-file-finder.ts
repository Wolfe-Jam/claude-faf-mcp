import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * FAF File Discovery Utility
 * v3.0.0 Specification: Prioritizes project.faf, supports legacy .faf with warnings
 *
 * READS both formats (with migration suggestion for .faf)
 * WRITES only project.faf (new files always use standard)
 */

export interface FafFileResult {
  /** Full path to the discovered FAF file */
  path: string;
  /** Filename (e.g., "project.faf", ".faf") */
  filename: string;
  /** Always true for project.faf, false for legacy .faf */
  isStandard: boolean;
  /** True if this is legacy .faf and should be migrated */
  needsMigration: boolean;
}

/**
 * Find FAF file in directory (v3.0.0)
 *
 * Priority:
 * 1. project.faf (standard - no warning)
 * 2. .faf (legacy - shows migration suggestion)
 *
 * @param directory - Directory to search (defaults to cwd)
 * @returns FafFileResult if found, null if no FAF file exists
 *
 * @example
 * const result = await findFafFile('/path/to/project');
 * if (result) {
 *   console.log(`Found: ${result.filename}`);
 *   if (result.needsMigration) {
 *     console.log('💡 Run "faf migrate" to upgrade to project.faf');
 *   }
 * }
 */
export async function findFafFile(directory?: string): Promise<FafFileResult | null> {
  const dir = directory || process.cwd();

  try {
    // Priority 1: project.faf (standard)
    const projectFafPath = path.join(dir, 'project.faf');
    try {
      await fs.access(projectFafPath);
      const stats = await fs.stat(projectFafPath);
      if (stats.isFile()) {
        return {
          path: projectFafPath,
          filename: 'project.faf',
          isStandard: true,
          needsMigration: false
        };
      }
    } catch {
      // Not found - check for legacy .faf
    }

    // Priority 2: .faf (legacy - still readable, but suggest migration)
    const legacyFafPath = path.join(dir, '.faf');
    try {
      await fs.access(legacyFafPath);
      const stats = await fs.stat(legacyFafPath);
      if (stats.isFile()) {
        return {
          path: legacyFafPath,
          filename: '.faf',
          isStandard: false,
          needsMigration: true
        };
      }
    } catch {
      // Not found
    }

    // No FAF file found
    return null;

  } catch {
    // Directory doesn't exist or permission error
    return null;
  }
}

/**
 * Get the path where a new FAF file should be created
 * v3.0.0: ALWAYS returns project.faf (never creates .faf)
 *
 * @param directory - Directory where FAF file will be created
 * @returns Full path to project.faf
 */
export function getNewFafFilePath(directory?: string): string {
  const dir = directory || process.cwd();
  return path.join(dir, 'project.faf');
}

/**
 * Check if a FAF file exists (either format)
 *
 * @param directory - Directory to check
 * @returns True if any FAF file exists
 */
export async function hasFafFile(directory?: string): Promise<boolean> {
  const result = await findFafFile(directory);
  return result !== null;
}

/**
 * Get migration suggestion message if needed
 *
 * @param result - Result from findFafFile()
 * @returns Migration message if applicable, null otherwise
 */
export function getMigrationSuggestion(result: FafFileResult | null): string | null {
  if (!result || !result.needsMigration) {
    return null;
  }

  return '\n💡 Using legacy .faf file. Run "faf migrate" to upgrade to project.faf (<1 second)\n';
}
