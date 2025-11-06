/**
 * faf auto - Programmatic API (MCP-ready)
 * Simplified version without interactive prompts
 * No console output, returns structured data
 */

import { findFafFile } from '../utils/file-utils.js';
import { initFafFile, InitResult } from './init.js';
import { scoreFafFile, ScoreResult } from './score.js';

export interface AutoOptions {
  force?: boolean;
  skipAI?: boolean;
}

export interface AutoResult {
  success: boolean;
  phase: 'init' | 'score' | 'complete';
  initResult?: InitResult;
  scoreResult?: ScoreResult;
  duration?: number;
  error?: string;
}

/**
 * Auto command - programmatic API
 * Initializes if needed, then scores the file
 * Returns structured data, no console output
 */
export async function autoCommand(
  directory?: string,
  options: AutoOptions = {}
): Promise<AutoResult> {
  const startTime = Date.now();

  try {
    const targetDir = directory || process.cwd();
    const homeDir = require('os').homedir();

    // CRITICAL: Prevent running in home or root directory
    if (!directory && (targetDir === homeDir || targetDir === '/')) {
      return {
        success: false,
        phase: 'init',
        error: 'Cannot run in home or root directory for safety',
        duration: Date.now() - startTime
      };
    }

    // Step 1: Check if .faf file exists
    const existingFaf = await findFafFile(targetDir);

    let initResult: InitResult | undefined;
    let fafPath: string;

    if (!existingFaf || options.force) {
      // Initialize new .faf file
      initResult = await initFafFile(targetDir, { force: options.force });

      if (!initResult.success || !initResult.outputPath) {
        return {
          success: false,
          phase: 'init',
          initResult,
          error: initResult.error || 'Init failed',
          duration: Date.now() - startTime
        };
      }

      fafPath = initResult.outputPath;
    } else {
      fafPath = existingFaf;
    }

    // Step 2: Score the file
    const scoreResult = await scoreFafFile(fafPath, { json: true });

    const duration = Date.now() - startTime;

    return {
      success: true,
      phase: 'complete',
      initResult,
      scoreResult,
      duration
    };
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Auto command failed';

    return {
      success: false,
      phase: 'init',
      error: errorMessage,
      duration
    };
  }
}
