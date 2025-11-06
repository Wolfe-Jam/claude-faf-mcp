/**
 * faf score - Programmatic API (MCP-ready)
 * No console output, returns structured data
 */

import { FafCompiler, CompilationResult } from '../compiler/faf-compiler.js';
import { findFafFile } from '../utils/file-utils.js';

export interface ScoreOptions {
  json?: boolean;
  trace?: boolean;
  verify?: boolean;
  breakdown?: boolean;
  checksum?: string;
}

export interface ScoreResult {
  score: number;
  filled: number;
  total: number;
  breakdown: {
    project: {
      filled: number;
      total: number;
      percentage: number;
    };
    stack: {
      filled: number;
      total: number;
      percentage: number;
    };
    human: {
      filled: number;
      total: number;
      percentage: number;
    };
    discovery: {
      filled: number;
      total: number;
      percentage: number;
    };
  };
  trace?: CompilationResult['trace'];
  diagnostics?: CompilationResult['diagnostics'];
  checksum?: string;
}

/**
 * Score a .faf file - programmatic API
 * Returns structured data, no console output
 */
export async function scoreFafFile(file?: string, options: ScoreOptions = {}): Promise<ScoreResult> {
  // Find .faf file
  const fafPath = file || await findFafFile(process.cwd());

  if (!fafPath) {
    throw new Error('No .faf file found');
  }

  // Create compiler
  const compiler = new FafCompiler();

  // Compile with or without trace
  const result = options.trace
    ? await compiler.compileWithTrace(fafPath)
    : await compiler.compile(fafPath);

  // Verify checksum if provided
  if (options.checksum && result.checksum !== options.checksum) {
    throw new Error(`Checksum mismatch: expected ${options.checksum}, got ${result.checksum}`);
  }

  // Return structured data
  const scoreResult: ScoreResult = {
    score: result.score,
    filled: result.filled,
    total: result.total,
    breakdown: result.breakdown,
  };

  // Add optional fields
  if (options.trace) {
    scoreResult.trace = result.trace;
  }

  if (options.breakdown && result.diagnostics.length > 0) {
    scoreResult.diagnostics = result.diagnostics;
  }

  if (options.checksum || options.verify) {
    scoreResult.checksum = result.checksum;
  }

  return scoreResult;
}
