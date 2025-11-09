/**
 * 📦 faf update - Update project.faf metadata (Mk3 Bundled)
 */

import { promises as fs } from 'fs';
import { parse as parseYAML, stringify as stringifyYAML } from '../fix-once/yaml';
import { findFafFile, fileExists } from '../utils/file-utils';

export interface UpdateOptions {
  json?: boolean;
}

export interface UpdateResult {
  success: boolean;
  updated: boolean;
  message: string;
}

export async function updateFafFile(projectPath?: string, options: UpdateOptions = {}): Promise<UpdateResult> {
  try {
    const fafPath = projectPath ? `${projectPath}/project.faf` : await findFafFile();

    if (!fafPath || !await fileExists(fafPath)) {
      return {
        success: false,
        updated: false,
        message: 'No project.faf file found'
      };
    }

    // Read current file
    const content = await fs.readFile(fafPath, 'utf-8');
    const fafData = parseYAML(content);

    // Update metadata
    if (!fafData.meta) {
      fafData.meta = {};
    }

    fafData.meta.last_updated = new Date().toISOString();
    fafData.meta.updated_by = 'faf-update-command';

    // Write updated file
    const updatedContent = stringifyYAML(fafData);
    await fs.writeFile(fafPath, updatedContent, 'utf-8');

    return {
      success: true,
      updated: true,
      message: 'project.faf metadata updated successfully'
    };

  } catch (error) {
    return {
      success: false,
      updated: false,
      message: error instanceof Error ? error.message : 'Update failed'
    };
  }
}
