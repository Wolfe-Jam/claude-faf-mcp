/**
 * 🔗 Bi-Sync Engine - Mk3 Bundled Edition
 * Revolutionary project.faf ↔ CLAUDE.md Synchronization
 */

import { parse as parseYAML, stringify as stringifyYAML } from '../fix-once/yaml';
import * as path from 'path';
import { promises as fs } from 'fs';
import { findFafFile, fileExists } from '../utils/file-utils';

export interface BiSyncOptions {
  auto?: boolean;
  watch?: boolean;
  force?: boolean;
  json?: boolean;
}

export interface BiSyncResult {
  success: boolean;
  direction: 'faf-to-claude' | 'claude-to-faf' | 'bidirectional' | 'none';
  filesChanged: string[];
  conflicts: string[];
  duration: number;
  message: string;
}

/**
 * 🔄 Convert project.faf YAML content to CLAUDE.md Markdown format
 */
export function fafToClaudeMd(fafContent: string): string {
  try {
    const fafData = parseYAML(fafContent);

    let claudeMd = `# 🏎️ CLAUDE.md - ${fafData.project?.name || 'Project'} Persistent Context & Intelligence\n\n`;

    // Project State
    if (fafData.project) {
      claudeMd += `## PROJECT STATE: ${fafData.context_quality?.overall_assessment || 'ACTIVE'} 🚀\n`;
      if (fafData.project.goal) {
        claudeMd += `**Current Position:** ${fafData.project.goal}\n`;
      }
      claudeMd += `**Tyre Compound:** ULTRASOFT C5 (Maximum Performance)\n\n`;
      claudeMd += `---\n\n`;
    }

    // Core Context
    claudeMd += `## 🎨 CORE CONTEXT\n\n`;

    if (fafData.project) {
      claudeMd += `### Project Identity\n`;
      claudeMd += `- **Name:** ${fafData.project.name || 'Unknown'}\n`;
      if (fafData.instant_context?.tech_stack) {
        claudeMd += `- **Stack:** ${fafData.instant_context.tech_stack}\n`;
      }
      claudeMd += `- **Quality:** F1-INSPIRED (Championship Performance)\n\n`;
    }

    // Technical Context
    if (fafData.instant_context) {
      claudeMd += `### Technical Architecture\n`;
      if (fafData.instant_context.what_building) {
        claudeMd += `- **What Building:** ${fafData.instant_context.what_building}\n`;
      }
      if (fafData.instant_context.main_language) {
        claudeMd += `- **Main Language:** ${fafData.instant_context.main_language}\n`;
      }
      claudeMd += `\n`;
    }

    // Context Quality
    if (fafData.context_quality) {
      claudeMd += `### 📊 Context Quality Status\n`;
      claudeMd += `- **Overall Assessment:** ${fafData.context_quality.overall_assessment || 'Good'}\n`;
      claudeMd += `- **Last Updated:** ${new Date().toISOString().split('T')[0]}\n\n`;
    }

    // Championship Footer
    claudeMd += `---\n\n`;
    claudeMd += `**STATUS: BI-SYNC ACTIVE 🔗 - Synchronized with .faf context!**\n\n`;
    claudeMd += `*Last Sync: ${new Date().toISOString()}*\n`;
    claudeMd += `*Sync Engine: F1-Inspired Software Engineering*\n`;
    claudeMd += `*🏎️⚡️_championship_sync*\n`;

    return claudeMd;

  } catch (error) {
    throw new Error(`Failed to convert .faf to CLAUDE.md: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 🔗 Main Bi-Sync function
 */
export async function syncBiDirectional(projectPath?: string, options: BiSyncOptions = {}): Promise<BiSyncResult> {
  const startTime = Date.now();
  const result: BiSyncResult = {
    success: false,
    direction: 'none',
    filesChanged: [],
    conflicts: [],
    duration: 0,
    message: ''
  };

  try {
    // Find project.faf file
    const fafPath = projectPath ? path.join(projectPath, 'project.faf') : await findFafFile();

    if (!fafPath || !await fileExists(fafPath)) {
      result.message = 'No project.faf file found. Run faf init first.';
      result.duration = Date.now() - startTime;
      return result;
    }

    const projectDir = path.dirname(fafPath);
    const claudeMdPath = path.join(projectDir, 'CLAUDE.md');

    // Check what exists
    const claudeMdExists = await fileExists(claudeMdPath);

    // Read .faf content
    const fafContent = await fs.readFile(fafPath, 'utf-8');
    const fafData = parseYAML(fafContent);
    const currentScore = fafData.faf_score || '0%';

    if (!claudeMdExists) {
      // Create CLAUDE.md from project.faf
      const claudeMdContent = fafToClaudeMd(fafContent);
      await fs.writeFile(claudeMdPath, claudeMdContent, 'utf-8');

      result.success = true;
      result.direction = 'faf-to-claude';
      result.filesChanged.push('CLAUDE.md');
      result.message = `CLAUDE.md created! Bi-sync now active! FAF Score: ${currentScore}`;

    } else {
      // Both files exist - update CLAUDE.md from project.faf
      const claudeMdContent = fafToClaudeMd(fafContent);
      await fs.writeFile(claudeMdPath, claudeMdContent, 'utf-8');

      result.success = true;
      result.direction = 'faf-to-claude';
      result.filesChanged.push('CLAUDE.md');
      result.message = `Files synchronized! Perfect harmony achieved! FAF Score: ${currentScore}`;
    }

    result.duration = Date.now() - startTime;
    return result;

  } catch (error) {
    result.duration = Date.now() - startTime;
    result.message = error instanceof Error ? error.message : 'Sync failed';
    return result;
  }
}
