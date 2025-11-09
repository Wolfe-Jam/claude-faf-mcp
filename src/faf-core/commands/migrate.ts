/**
 * 🔄 faf migrate - Migrate legacy .faf to project.faf (Mk3 Bundled)
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { fileExists } from '../utils/file-utils';

export interface MigrateOptions {
  force?: boolean;
  json?: boolean;
}

export interface MigrateResult {
  success: boolean;
  migrated: boolean;
  from?: string;
  to?: string;
  message: string;
}

export async function migrateFafFile(projectPath?: string, options: MigrateOptions = {}): Promise<MigrateResult> {
  try {
    const projectRoot = projectPath || process.cwd();
    const legacyPath = path.join(projectRoot, '.faf');
    const newPath = path.join(projectRoot, 'project.faf');

    // Check if legacy file exists
    if (!await fileExists(legacyPath)) {
      return {
        success: true,
        migrated: false,
        message: 'No legacy .faf file found - nothing to migrate'
      };
    }

    // Check if new file already exists
    if (await fileExists(newPath) && !options.force) {
      return {
        success: false,
        migrated: false,
        message: 'project.faf already exists. Use --force to overwrite.'
      };
    }

    // Read legacy file
    const content = await fs.readFile(legacyPath, 'utf-8');

    // Write to new location
    await fs.writeFile(newPath, content, 'utf-8');

    // Delete legacy file (optional - could keep as backup)
    // await fs.unlink(legacyPath);

    return {
      success: true,
      migrated: true,
      from: legacyPath,
      to: newPath,
      message: 'Successfully migrated .faf to project.faf'
    };

  } catch (error) {
    return {
      success: false,
      migrated: false,
      message: error instanceof Error ? error.message : 'Migration failed'
    };
  }
}
