/**
 * 🔗 Bi-Sync Engine - Mk3 Bundled Edition
 * Revolutionary project.faf ↔ CLAUDE.md Synchronization
 * v4.5.0: Added agents/cursor/gemini/all flags for multi-format sync
 */

import { parse as parseYAML } from '../fix-once/yaml';
import * as path from 'path';
import { promises as fs } from 'fs';
import { findFafFile, fileExists } from '../utils/file-utils';
import { agentsExportCommand } from './agents.js';
import { injectFafBlock } from '../inject';
import { cursorExportCommand } from './cursor.js';
import { geminiExportCommand } from './gemini.js';

export interface BiSyncOptions {
  auto?: boolean;
  watch?: boolean;
  force?: boolean;
  json?: boolean;
  agents?: boolean;
  cursor?: boolean;
  gemini?: boolean;
  all?: boolean;
}

export interface BiSyncResult {
  success: boolean;
  direction: 'faf-to-claude' | 'claude-to-faf' | 'bidirectional' | 'none';
  filesChanged: string[];
  conflicts: string[];
  duration: number;
  message: string;
}

/** A slot value that carries real content (not empty, not slotignored). */
function filled(v: unknown): v is string {
  return typeof v === 'string' && v.trim() !== '' && v.trim() !== 'slotignored';
}

/** snake_case slot key → Title Case label (main_language → Main Language). */
function labelOf(key: string): string {
  return key.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

/**
 * Convert project.faf YAML content to CLAUDE.md Markdown — QUIET format
 * (Trust Edition P1 applied to the generated artifact, not just tool output).
 *
 * The block this renders is injected into the file Claude READS every session,
 * so it is plain, parseable context: no emoji, no brand voice (that lives in
 * marketing), nothing the consuming model has to skip over. Mirrors the
 * canonical faf-cli CLAUDE.md export shape: What This Is / Stack / Context.
 */
export function fafToClaudeMd(fafContent: string): string {
  try {
    const fafData = parseYAML(fafContent);

    const name = fafData.project?.name || 'Project';
    const lines: string[] = [`# CLAUDE.md — ${name}`, ''];

    // What This Is — the one-line identity.
    const what = fafData.project?.goal || fafData.instant_context?.what_building;
    if (filled(what)) {
      lines.push('## What This Is', '', what, '');
    }

    // Stack — every filled slot, slotignored stays invisible (the What-Not).
    const stackEntries: string[] = [];
    if (filled(fafData.project?.main_language)) {
      stackEntries.push(`- **Language:** ${fafData.project.main_language}`);
    } else if (filled(fafData.instant_context?.main_language)) {
      stackEntries.push(`- **Language:** ${fafData.instant_context.main_language}`);
    }
    if (fafData.stack && typeof fafData.stack === 'object') {
      for (const [key, value] of Object.entries(fafData.stack)) {
        if (filled(value)) stackEntries.push(`- **${labelOf(key)}:** ${value}`);
      }
    }
    if (stackEntries.length === 0 && filled(fafData.instant_context?.tech_stack)) {
      stackEntries.push(`- **Stack:** ${fafData.instant_context.tech_stack}`);
    }
    if (stackEntries.length > 0) {
      lines.push('## Stack', '', ...stackEntries, '');
    }

    // Context — the 6Ws, exactly as authored.
    const sixWs = ['who', 'what', 'why', 'where', 'when', 'how'] as const;
    const contextEntries = sixWs
      .filter((w) => filled(fafData.human_context?.[w]))
      .map((w) => `- **${labelOf(w)}:** ${fafData.human_context[w]}`);
    if (contextEntries.length > 0) {
      lines.push('## Context', '', ...contextEntries, '');
    }

    lines.push('---', '', `*STATUS: BI-SYNC ACTIVE — ${new Date().toISOString()}*`, '');

    return lines.join('\n');
  } catch (error) {
    throw new Error(`Failed to convert .faf to CLAUDE.md: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * 🔗 Main Bi-Sync function
 */
export async function syncBiDirectional(projectPath?: string, _options: BiSyncOptions = {}): Promise<BiSyncResult> {
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
      await injectFafBlock(claudeMdPath, claudeMdContent);

      result.success = true;
      result.direction = 'faf-to-claude';
      result.filesChanged.push('CLAUDE.md');
      result.message = `CLAUDE.md created! Bi-sync now active! FAF Score: ${currentScore}`;

    } else {
      // Both files exist - update CLAUDE.md from project.faf
      const claudeMdContent = fafToClaudeMd(fafContent);
      await injectFafBlock(claudeMdPath, claudeMdContent);

      result.success = true;
      result.direction = 'faf-to-claude';
      result.filesChanged.push('CLAUDE.md');
      result.message = `Files synchronized! Perfect harmony achieved! FAF Score: ${currentScore}`;
    }

    // v4.5.0: Chain additional format exports if requested
    const doAgents = _options.agents || _options.all;
    const doCursor = _options.cursor || _options.all;
    const doGemini = _options.gemini || _options.all;

    if (doAgents) {
      try {
        const agentsResult = await agentsExportCommand(projectDir, { force: true });
        if (agentsResult.success) {
          result.filesChanged.push('AGENTS.md');
        }
      } catch {
        // Non-fatal — CLAUDE.md sync already succeeded
      }
    }

    if (doCursor) {
      try {
        const cursorResult = await cursorExportCommand(projectDir, { force: true });
        if (cursorResult.success) {
          result.filesChanged.push('.cursorrules');
        }
      } catch {
        // Non-fatal
      }
    }

    if (doGemini) {
      try {
        const geminiResult = await geminiExportCommand(projectDir, { force: true });
        if (geminiResult.success) {
          result.filesChanged.push('GEMINI.md');
        }
      } catch {
        // Non-fatal
      }
    }

    if (result.filesChanged.length > 1) {
      result.message += ` | Also synced: ${result.filesChanged.filter(f => f !== 'CLAUDE.md').join(', ')}`;
    }

    result.duration = Date.now() - startTime;
    return result;

  } catch (error) {
    result.duration = Date.now() - startTime;
    result.message = error instanceof Error ? error.message : 'Sync failed';
    return result;
  }
}
