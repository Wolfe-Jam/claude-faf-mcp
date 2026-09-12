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
    const { scoreFafYaml, readFaf, readFafRaw, readClaudeMd, renderClaudeMd, writeClaudeMd, legacyStampNoteAt } = await fafCli;

    // Read .faf content through faf-cli's reader (a link out of the project is
    // refused, never read) — validate the YAML before anything is written.
    const fafContent = readFafRaw(fafPath);
    parseYAML(fafContent, { filepath: fafPath });
    const claudeBefore = readClaudeMd(projectDir);
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
    const note = legacyStampNoteAt(path.join(projectDir, 'CLAUDE.md'), 'CLAUDE.md');
    writeClaudeMd(projectDir, renderClaudeMd(readFaf(fafPath)));

    result.success = true;
    result.direction = 'faf-to-claude';
    result.filesChanged.push('CLAUDE.md');
    result.message = claudeBefore !== null
      ? `CLAUDE.md refreshed from project.faf. FAF Score: ${currentScore}`
      : `CLAUDE.md written from project.faf. FAF Score: ${currentScore}`;
    if (note) {result.message += `\n${note}`;}

    // v4.5.0: Chain additional format exports if requested
    const doAgents = options.agents || options.all;
    const doCursor = options.cursor || options.all;
    const doGemini = options.gemini || options.all;
    const doCopilot = options.copilot || options.all;

    if (doAgents) {
      try {
        const agentsResult = await agentsExportCommand(projectDir);
        if (agentsResult.success) {
          result.filesChanged.push('AGENTS.md');
        }
      } catch {
        // Non-fatal — the CLAUDE.md write already succeeded
      }
    }

    if (doCursor) {
      try {
        const cursorResult = await cursorExportCommand(projectDir);
        if (cursorResult.success) {
          result.filesChanged.push('.cursorrules');
        }
      } catch {
        // Non-fatal
      }
    }

    if (doGemini) {
      try {
        const geminiResult = await geminiExportCommand(projectDir);
        if (geminiResult.success) {
          result.filesChanged.push('GEMINI.md');
        }
      } catch {
        // Non-fatal
      }
    }

    if (doCopilot) {
      try {
        const copilotResult = await copilotExportCommand(projectDir);
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
