/**
 * 📁 File Utilities
 * The .faf finder the interop exports use, and fileExists.
 *
 * 6.0.0 removed the 23 functions no live code called (project-type, Python,
 * TypeScript and n8n/Make/Opal/OpenAI detectors); tag archive/cfm-v5-surface
 * keeps them.
 */

import { promises as fs } from "fs";
import path from "path";

/**
 * Find project.faf file in current directory or parent directories
 *
 * v3.0.0: ONLY supports project.faf (no legacy .faf support)
 */
export async function findFafFile(
  startDir: string = process.cwd(),
): Promise<string | null> {
  let currentDir = path.resolve(startDir);

  // Check up to 10 parent directories to avoid infinite loops
  for (let i = 0; i < 10; i++) {
    try {
      const projectFafPath = path.join(currentDir, 'project.faf');

      // Check if project.faf exists and is a file
      if (await fileExists(projectFafPath)) {
        const stats = await fs.stat(projectFafPath);
        if (stats.isFile()) {
          return projectFafPath;
        }
      }

      // v3.0.0: Support legacy .faf with migration suggestion
      const legacyFafPath = path.join(currentDir, '.faf');
      if (await fileExists(legacyFafPath)) {
        const stats = await fs.stat(legacyFafPath);
        if (stats.isFile()) {
          console.warn('\n💡 Using legacy .faf file. Run "faf migrate" to upgrade to project.faf (<1 second)\n');
          return legacyFafPath;
        }
      }

      // Move to parent directory
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        // Reached filesystem root
        break;
      }
      currentDir = parentDir;
    } catch {
      // Skip this directory if we can't read it
      const parentDir = path.dirname(currentDir);
      if (parentDir === currentDir) {
        break;
      }
      currentDir = parentDir;
    }
  }

  return null;
}

/**
 * Check if file exists and is readable
 */
export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fs.constants.F_OK | fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
