/**
 * ⚡ FAF Enhance - MCP-native interactive enhancement
 * Combines auto-detection with intelligent MCP questionnaire
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { parse as parseYAML, stringify as stringifyYAML } from '../fix-once/yaml';
import { fileExists } from '../utils/file-utils';
import { scoreFafFile } from './score';

export interface EnhanceOptions {
  autoFill?: boolean;
  targetScore?: number;
  interactive?: boolean;
  json?: boolean;
}

export interface EnhanceResult {
  success: boolean;
  initialScore: number;
  finalScore: number;
  improvements: string[];
  questionsNeeded?: Question[];
  message: string;
}

export interface Question {
  id: string;
  question: string;
  header: string;
  description: string;
  defaultValue?: string;
  required: boolean;
}

export interface EnhanceAnswers {
  who?: string;
  what?: string;
  why?: string;
  where?: string;
  when?: string;
  how?: string;
  frontend?: string;
  backend?: string;
  database?: string;
  hosting?: string;
}

/**
 * Auto-detect improvements from project files
 */
async function autoDetectImprovements(projectPath: string, fafData: any): Promise<{ improvements: string[], updates: any }> {
  const improvements: string[] = [];
  const updates: any = {};

  // Check for package.json
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (await fileExists(packageJsonPath)) {
    const pkgContent = await fs.readFile(packageJsonPath, 'utf-8');
    const pkg = JSON.parse(pkgContent);

    // Detect version
    if (pkg.version && !fafData.project?.version) {
      updates['project.version'] = pkg.version;
      improvements.push('version');
    }

    // Detect testing
    if (pkg.scripts?.test && !fafData.stack?.testing) {
      updates['stack.testing'] = 'jest/vitest';
      improvements.push('testing');
    }

    // Detect dependencies for framework detection
    if (pkg.dependencies || pkg.devDependencies) {
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

      // Frontend frameworks
      if (allDeps.react && !fafData.stack?.frontend) {
        updates['stack.frontend'] = 'React';
        improvements.push('frontend');
      } else if (allDeps.vue && !fafData.stack?.frontend) {
        updates['stack.frontend'] = 'Vue';
        improvements.push('frontend');
      } else if (allDeps.svelte && !fafData.stack?.frontend) {
        updates['stack.frontend'] = 'Svelte';
        improvements.push('frontend');
      }

      // Backend
      if (allDeps.express && !fafData.stack?.backend) {
        updates['stack.backend'] = 'Express';
        improvements.push('backend');
      }

      // Database
      if (allDeps.mongoose && !fafData.stack?.database) {
        updates['stack.database'] = 'MongoDB';
        improvements.push('database');
      } else if (allDeps.pg && !fafData.stack?.database) {
        updates['stack.database'] = 'PostgreSQL';
        improvements.push('database');
      }
    }
  }

  // Detect main language from files
  if (!fafData.project?.main_language) {
    const hasTS = await fileExists(path.join(projectPath, 'tsconfig.json'));
    const hasPy = await fileExists(path.join(projectPath, 'requirements.txt')) ||
                  await fileExists(path.join(projectPath, 'setup.py'));

    if (hasTS) {
      updates['project.main_language'] = 'TypeScript';
      improvements.push('mainLanguage');
    } else if (hasPy) {
      updates['project.main_language'] = 'Python';
      improvements.push('mainLanguage');
    }
  }

  return { improvements, updates };
}

/**
 * Generate questions for missing 6 W's
 */
function generateQuestions(fafData: any): Question[] {
  const questions: Question[] = [];

  if (!fafData.human_context?.who) {
    questions.push({
      id: 'who',
      question: 'WHO will use this project?',
      header: 'Target Users',
      description: 'Specify your target audience (developers, data scientists, designers, end users, etc.)',
      defaultValue: 'developers',
      required: true
    });
  }

  if (!fafData.human_context?.what) {
    questions.push({
      id: 'what',
      question: 'WHAT problem does this project solve?',
      header: 'Core Problem',
      description: 'Describe the specific problem or need this project addresses',
      required: true
    });
  }

  if (!fafData.human_context?.why) {
    questions.push({
      id: 'why',
      question: 'WHY is this project important?',
      header: 'Value/Impact',
      description: 'Explain the value or impact this project creates',
      required: true
    });
  }

  if (!fafData.human_context?.where) {
    questions.push({
      id: 'where',
      question: 'WHERE will this project be deployed/used?',
      header: 'Environment',
      description: 'Specify the deployment context (cloud, browser, mobile, on-premise, etc.)',
      defaultValue: 'cloud',
      required: false
    });
  }

  if (!fafData.human_context?.when) {
    questions.push({
      id: 'when',
      question: 'WHEN do you need this completed?',
      header: 'Timeline',
      description: 'Specify the timeline or urgency (now, Q1 2025, ongoing, etc.)',
      defaultValue: 'ongoing',
      required: false
    });
  }

  if (!fafData.human_context?.how) {
    questions.push({
      id: 'how',
      question: 'HOW will you build this?',
      header: 'Approach',
      description: 'Describe your development methodology (agile, iterative, waterfall, etc.)',
      defaultValue: 'agile',
      required: false
    });
  }

  return questions;
}

/**
 * Apply answers to project.faf
 */
function applyAnswers(fafData: any, answers: EnhanceAnswers): string[] {
  const applied: string[] = [];

  if (!fafData.human_context) {
    fafData.human_context = {};
  }

  if (answers.who) {
    fafData.human_context.who = answers.who;
    applied.push('who');
  }

  if (answers.what) {
    fafData.human_context.what = answers.what;
    applied.push('what');
  }

  if (answers.why) {
    fafData.human_context.why = answers.why;
    applied.push('why');
  }

  if (answers.where) {
    fafData.human_context.where = answers.where;
    applied.push('where');
  }

  if (answers.when) {
    fafData.human_context.when = answers.when;
    applied.push('when');
  }

  if (answers.how) {
    fafData.human_context.how = answers.how;
    applied.push('how');
  }

  // Apply stack improvements
  if (!fafData.stack) {
    fafData.stack = {};
  }

  if (answers.frontend && !fafData.stack.frontend) {
    fafData.stack.frontend = answers.frontend;
    applied.push('frontend');
  }

  if (answers.backend && !fafData.stack.backend) {
    fafData.stack.backend = answers.backend;
    applied.push('backend');
  }

  if (answers.database && !fafData.stack.database) {
    fafData.stack.database = answers.database;
    applied.push('database');
  }

  if (answers.hosting && !fafData.stack.hosting) {
    fafData.stack.hosting = answers.hosting;
    applied.push('hosting');
  }

  return applied;
}

/**
 * Calculate score using real FafCompiler
 */
async function calculateScore(projectPath: string): Promise<number> {
  const fafPath = path.join(projectPath, 'project.faf');
  const result = await scoreFafFile(fafPath);
  return result.score;
}

/**
 * Main enhance command - auto-detect mode
 */
export async function enhanceCommand(
  projectPath: string,
  options: EnhanceOptions = {}
): Promise<EnhanceResult> {
  try {
    // Find project.faf
    const fafPath = path.join(projectPath, 'project.faf');

    if (!(await fileExists(fafPath))) {
      return {
        success: false,
        initialScore: 0,
        finalScore: 0,
        improvements: [],
        message: 'No project.faf found. Run faf_init first.'
      };
    }

    // Read and parse
    const content = await fs.readFile(fafPath, 'utf-8');
    const fafData = parseYAML(content);

    const initialScore = await calculateScore(projectPath);

    // Auto-detect improvements
    const { improvements, updates } = await autoDetectImprovements(projectPath, fafData);

    // Apply auto-detected updates
    for (const [key, value] of Object.entries(updates)) {
      const keys = key.split('.');
      let target: any = fafData;

      for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) {
          target[keys[i]] = {};
        }
        target = target[keys[i]];
      }

      target[keys[keys.length - 1]] = value;
    }

    // Check if questions needed
    const questions = generateQuestions(fafData);

    // If auto-fill only or no questions, finish here
    if (options.autoFill || questions.length === 0 || !options.interactive) {
      // Update metadata
      if (!fafData.meta) {
        fafData.meta = {};
      }
      fafData.meta.last_enhanced = new Date().toISOString();
      fafData.meta.enhanced_by = 'faf-enhance-auto';

      // Write back
      const yamlContent = stringifyYAML(fafData);
      await fs.writeFile(fafPath, yamlContent, 'utf-8');

      const finalScore = await calculateScore(projectPath);

      return {
        success: true,
        initialScore,
        finalScore,
        improvements,
        message: improvements.length > 0
          ? `Auto-enhanced: ${improvements.join(', ')}. Score: ${initialScore}% → ${finalScore}%`
          : `Already optimized. Score: ${finalScore}%`
      };
    }

    // Return with questions for interactive mode
    return {
      success: true,
      initialScore,
      finalScore: initialScore,
      improvements,
      questionsNeeded: questions,
      message: `Auto-detected ${improvements.length} improvements. ${questions.length} questions needed for full enhancement.`
    };

  } catch (error: unknown) {
    return {
      success: false,
      initialScore: 0,
      finalScore: 0,
      improvements: [],
      message: error instanceof Error ? error.message : 'Enhancement failed'
    };
  }
}

/**
 * Apply interactive answers and finalize enhancement
 */
export async function enhanceWithAnswers(
  projectPath: string,
  answers: EnhanceAnswers
): Promise<EnhanceResult> {
  try {
    const fafPath = path.join(projectPath, 'project.faf');
    const content = await fs.readFile(fafPath, 'utf-8');
    const fafData = parseYAML(content);

    const initialScore = await calculateScore(projectPath);

    // Apply answers
    const applied = applyAnswers(fafData, answers);

    // Update metadata
    if (!fafData.meta) {
      fafData.meta = {};
    }
    fafData.meta.last_enhanced = new Date().toISOString();
    fafData.meta.enhanced_by = 'faf-enhance-interactive';

    // Write back
    const yamlContent = stringifyYAML(fafData);
    await fs.writeFile(fafPath, yamlContent, 'utf-8');

    const finalScore = await calculateScore(projectPath);

    return {
      success: true,
      initialScore,
      finalScore,
      improvements: applied,
      message: `Enhanced with ${applied.length} answers. Score: ${initialScore}% → ${finalScore}%`
    };

  } catch (error: unknown) {
    return {
      success: false,
      initialScore: 0,
      finalScore: 0,
      improvements: [],
      message: error instanceof Error ? error.message : 'Enhancement failed'
    };
  }
}
