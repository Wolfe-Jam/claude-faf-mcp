/**
 * Claude command — writes CLAUDE.md from project.faf, one direction.
 *
 * CLAUDE.md is faf-cli's render of project.faf (renderClaudeMd — the same
 * bytes `faf sync` pushes), written through faf-cli's injector (writeClaudeMd),
 * so content outside the faf-managed block survives. With agents / cursor /
 * gemini / copilot / all it also writes AGENTS.md, .cursorrules, GEMINI.md and
 * .github/copilot-instructions.md. Nothing here reads CLAUDE.md back into
 * project.faf. Named bi-sync before 5.23; the old name claimed a two-way sync
 * this code never did.
 */

import { parse as parseYAML } from '../fix-once/yaml';
import * as path from 'path';
import { promises as fs } from 'fs';
import { findFafFile, fileExists } from '../utils/file-utils';
import { agentsExportCommand } from './agents.js';
import { cursorExportCommand } from './cursor.js';
import { geminiExportCommand } from './gemini.js';
import { copilotExportCommand } from './copilot.js';
import { fafCli } from '../../utils/faf-cli-bridge.js';

export interface ClaudeExportOptions {
  json?: boolean;
  agents?: boolean;
  cursor?: boolean;
  gemini?: boolean;
  copilot?: boolean;
  all?: boolean;
}

export interface ClaudeExportResult {
  success: boolean;
  direction: 'faf-to-claude' | 'none';
  filesChanged: string[];
  duration: number;
  message: string;
}

/**
 * Write CLAUDE.md (and any requested AI formats) from project.faf.
 */
export async function claudeExportCommand(projectPath?: string, options: ClaudeExportOptions = {}): Promise<ClaudeExportResult> {
  const startTime = Date.now();
  const result: ClaudeExportResult = {
    success: false,
    direction: 'none',
    filesChanged: [],
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
    const claudeMdExists = await fileExists(path.join(projectDir, 'CLAUDE.md'));

    // Read .faf content — validate the YAML before anything is written.
    const fafContent = await fs.readFile(fafPath, 'utf-8');
    parseYAML(fafContent, { filepath: fafPath });

    const { scoreFafYaml, readFaf, renderClaudeMd, writeClaudeMd } = await fafCli;
    // The score in the message is faf-cli's scorer on the bytes read, not a
    // `faf_score` key nothing writes. Unscorable → say so, never invent one.
    let currentScore = 'unknown';
    try {
      const score = scoreFafYaml(fafContent).score;
      if (score >= 0) {currentScore = `${Math.round(score)}%`;}
    } catch {
      /* scorer unavailable */
    }

    // CLAUDE.md is faf-cli's render of project.faf, injected with faf-cli's
    // injector: only the faf-managed block changes, the rest of the file is kept.
    writeClaudeMd(projectDir, renderClaudeMd(readFaf(fafPath)));

    result.success = true;
    result.direction = 'faf-to-claude';
    result.filesChanged.push('CLAUDE.md');
    result.message = claudeMdExists
      ? `CLAUDE.md refreshed from project.faf. FAF Score: ${currentScore}`
      : `CLAUDE.md written from project.faf. FAF Score: ${currentScore}`;

    // v4.5.0: Chain additional format exports if requested
    const doAgents = options.agents || options.all;
    const doCursor = options.cursor || options.all;
    const doGemini = options.gemini || options.all;
    const doCopilot = options.copilot || options.all;

    if (doAgents) {
      try {
        const agentsResult = await agentsExportCommand(projectDir, { force: true });
        if (agentsResult.success) {
          result.filesChanged.push('AGENTS.md');
        }
      } catch {
        // Non-fatal — the CLAUDE.md write already succeeded
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

    if (doCopilot) {
      try {
        const copilotResult = await copilotExportCommand(projectDir, { force: true });
        if (copilotResult.success) {
          result.filesChanged.push('.github/copilot-instructions.md');
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
    result.message = error instanceof Error ? error.message : 'CLAUDE.md write failed';
    return result;
  }
}
