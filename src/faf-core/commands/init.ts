/**
 * faf init - Programmatic API (MCP-ready)
 * No console output, returns structured data
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { detectProjectType, fileExists } from '../utils/file-utils.js';
import { generateFafFromProject } from '../generators/faf-generator-championship.js';
import { createDefaultFafIgnore } from '../utils/fafignore-parser.js';
import { FafCompiler } from '../compiler/faf-compiler.js';

export interface InitOptions {
  force?: boolean;
  new?: boolean;
  choose?: boolean;
  template?: string;
  output?: string;
  quiet?: boolean;
}

export interface InitResult {
  success: boolean;
  outputPath?: string;
  projectType?: string;
  score?: number;
  duration?: number;
  error?: string;
  alreadyExists?: boolean;
}

/**
 * Initialize .faf file - programmatic API
 * Returns structured data, no console output
 */
export async function initFafFile(
  projectPath?: string,
  options: InitOptions = {}
): Promise<InitResult> {
  const startTime = Date.now();

  try {
    const projectRoot = projectPath || process.cwd();
    const homeDir = require('os').homedir();

    // CRITICAL: Prevent running in home or root directory
    if (!projectPath && (projectRoot === homeDir || projectRoot === '/')) {
      return {
        success: false,
        error: 'Cannot run in home or root directory for safety',
        duration: Date.now() - startTime
      };
    }

    // v3.0.0: ONLY supports project.faf (no legacy .faf)
    const outputPath = options.output || `${projectRoot}/project.faf`;

    // Check if project.faf file already exists
    if ((await fileExists(outputPath)) && !options.force && !options.new && !options.choose) {
      return {
        success: true,
        alreadyExists: true,
        outputPath,
        duration: Date.now() - startTime
      };
    }

    // Check for .fafignore
    const fafIgnorePath = path.join(projectRoot, '.fafignore');
    if (!(await fileExists(fafIgnorePath))) {
      await createDefaultFafIgnore(projectRoot);
    }

    // Detect project structure
    const projectType = options.template === 'auto'
      ? await detectProjectType(projectRoot)
      : options.template || (await detectProjectType(projectRoot));

    // Generate .faf content
    const fafContent = await generateFafFromProject({
      projectType,
      outputPath,
      projectRoot: projectRoot,
    });

    // Write .faf file
    await fs.writeFile(outputPath, fafContent, 'utf-8');

    // Score the newly created file
    const compiler = new FafCompiler();
    const scoreResult = await compiler.compile(outputPath);

    const duration = Date.now() - startTime;

    return {
      success: true,
      outputPath,
      projectType,
      score: scoreResult.score,
      duration
    };
  } catch (error: unknown) {
    const duration = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Init failed';

    return {
      success: false,
      error: errorMessage,
      duration
    };
  }
}
