/**
 * 🔄 faf sync - Sync Command (Mk3 Bundled)
 * Sync project.faf file with project changes (package.json, git, etc.)
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { parse as parseYAML, stringify as stringifyYAML } from '../fix-once/yaml';
import { findFafFile, findPackageJson, fileExists } from '../utils/file-utils';

export interface SyncOptions {
  auto?: boolean;
  dryRun?: boolean;
  json?: boolean;
}

export interface SyncResult {
  success: boolean;
  changesDetected: number;
  changesApplied: number;
  message: string;
}

interface ProjectChange {
  path: string;
  description: string;
  oldValue: any;
  newValue: any;
  confidence: 'high' | 'medium' | 'low';
}

export async function syncFafFile(projectPath?: string, options: SyncOptions = {}): Promise<SyncResult> {
  try {
    const fafPath = projectPath ? path.join(projectPath, 'project.faf') : await findFafFile();

    if (!fafPath || !await fileExists(fafPath)) {
      return {
        success: false,
        changesDetected: 0,
        changesApplied: 0,
        message: 'No project.faf file found. Run faf init first.'
      };
    }

    // Read current .faf file
    const content = await fs.readFile(fafPath, 'utf-8');
    const fafData = parseYAML(content);

    // Detect changes
    const changes = await detectProjectChanges(fafData, path.dirname(fafPath));

    if (changes.length === 0) {
      return {
        success: true,
        changesDetected: 0,
        changesApplied: 0,
        message: 'project.faf file is up to date'
      };
    }

    if (options.dryRun) {
      return {
        success: true,
        changesDetected: changes.length,
        changesApplied: 0,
        message: `Found ${changes.length} potential updates (dry run - no changes applied)`
      };
    }

    // Apply changes if auto mode
    if (options.auto) {
      applyChanges(fafData, changes);

      // Update generated timestamp
      if (!fafData.meta) fafData.meta = {};
      fafData.meta.last_sync = new Date().toISOString();

      // Write updated .faf file
      const updatedContent = stringifyYAML(fafData);
      await fs.writeFile(fafPath, updatedContent, 'utf-8');

      return {
        success: true,
        changesDetected: changes.length,
        changesApplied: changes.length,
        message: `Applied ${changes.length} changes to project.faf`
      };
    }

    return {
      success: true,
      changesDetected: changes.length,
      changesApplied: 0,
      message: `Found ${changes.length} potential updates. Run with --auto to apply.`
    };

  } catch (error: unknown) {
    return {
      success: false,
      changesDetected: 0,
      changesApplied: 0,
      message: error instanceof Error ? error.message : 'Sync failed'
    };
  }
}

async function detectProjectChanges(fafData: any, projectRoot: string): Promise<ProjectChange[]> {
  const changes: ProjectChange[] = [];

  try {
    // Check package.json changes
    const packageJsonPath = path.join(projectRoot, 'package.json');
    if (await fileExists(packageJsonPath)) {
      const packageContent = await fs.readFile(packageJsonPath, 'utf-8');
      const packageData = JSON.parse(packageContent);

      // Project name change
      if (packageData.name && packageData.name !== fafData.project?.name) {
        changes.push({
          path: 'project.name',
          description: 'Project name changed in package.json',
          oldValue: fafData.project?.name || 'undefined',
          newValue: packageData.name,
          confidence: 'high'
        });
      }

      // Description/goal change
      if (packageData.description && packageData.description !== fafData.project?.goal) {
        changes.push({
          path: 'project.goal',
          description: 'Project description changed in package.json',
          oldValue: fafData.project?.goal || 'undefined',
          newValue: packageData.description,
          confidence: 'medium'
        });
      }

      // Dependencies changes - detect frameworks
      const deps = {
        ...packageData.dependencies,
        ...packageData.devDependencies
      };

      // Check for framework changes
      if (deps.svelte && !fafData.stack?.frontend?.includes('Svelte')) {
        changes.push({
          path: 'stack.frontend',
          description: 'Svelte dependency detected',
          oldValue: fafData.stack?.frontend || '',
          newValue: 'Svelte',
          confidence: 'high'
        });
      }

      if (deps.react && !fafData.stack?.frontend?.includes('React')) {
        changes.push({
          path: 'stack.frontend',
          description: 'React dependency detected',
          oldValue: fafData.stack?.frontend || '',
          newValue: 'React',
          confidence: 'high'
        });
      }

      if (deps.vue && !fafData.stack?.frontend?.includes('Vue')) {
        changes.push({
          path: 'stack.frontend',
          description: 'Vue dependency detected',
          oldValue: fafData.stack?.frontend || '',
          newValue: 'Vue',
          confidence: 'high'
        });
      }
    }

    // Check if generated timestamp is very old (30+ days)
    if (fafData.meta?.generated) {
      const generatedDate = new Date(fafData.meta.generated);
      const daysSince = Math.abs(Date.now() - generatedDate.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSince > 30) {
        changes.push({
          path: 'meta.generated',
          description: `Generated timestamp is ${Math.round(daysSince)} days old`,
          oldValue: fafData.meta.generated,
          newValue: new Date().toISOString(),
          confidence: 'high'
        });
      }
    }
  } catch {
    // Continue with what we have
  }

  return changes;
}

function applyChanges(fafData: any, changes: ProjectChange[]): void {
  changes.forEach(change => {
    if (change.confidence === 'high' || change.confidence === 'medium') {
      setNestedValue(fafData, change.path, change.newValue);
    }
  });
}

function setNestedValue(obj: any, path: string, value: any): void {
  const parts = path.split('.');
  let current = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    if (!current[parts[i]]) {
      current[parts[i]] = {};
    }
    current = current[parts[i]];
  }

  current[parts[parts.length - 1]] = value;
}
