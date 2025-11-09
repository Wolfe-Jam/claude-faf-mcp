/**
 * 🏆 faf formats - TURBO-CAT Format Discovery Command (Mk3 Bundled)
 * Lists all discovered formats in the project
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileExists } from '../utils/file-utils';

export interface FormatsOptions {
  export?: boolean;
  json?: boolean;
  category?: boolean;
}

export interface FormatsResult {
  success: boolean;
  totalFormats: number;
  stackSignature: string;
  intelligenceScore: number;
  formats: Array<{
    fileName: string;
    category: string;
    confidence: string;
  }>;
  message: string;
}

export async function formatsCommand(projectPath?: string, options: FormatsOptions = {}): Promise<FormatsResult> {
  try {
    const projectRoot = projectPath || process.cwd();
    const startTime = Date.now();

    // Simple format detection - check for common files
    const commonFormats = [
      'package.json',
      'tsconfig.json',
      'README.md',
      '.gitignore',
      'vite.config.ts',
      'svelte.config.js',
      'tailwind.config.js',
      'Dockerfile',
      '.env',
      'project.faf',
      '.faf'
    ];

    const foundFormats: Array<{ fileName: string; category: string; confidence: string }> = [];

    for (const format of commonFormats) {
      const filePath = path.join(projectRoot, format);
      if (await fileExists(filePath)) {
        foundFormats.push({
          fileName: format,
          category: categorizeFormat(format),
          confidence: 'confirmed'
        });
      }
    }

    const elapsedTime = Date.now() - startTime;

    return {
      success: true,
      totalFormats: foundFormats.length,
      stackSignature: 'Detected',
      intelligenceScore: foundFormats.length * 5,
      formats: foundFormats,
      message: `Found ${foundFormats.length} formats in ${elapsedTime}ms`
    };

  } catch (error) {
    return {
      success: false,
      totalFormats: 0,
      stackSignature: 'Unknown',
      intelligenceScore: 0,
      formats: [],
      message: error instanceof Error ? error.message : 'Format discovery failed'
    };
  }
}

function categorizeFormat(fileName: string): string {
  if (fileName.includes('json') || fileName.includes('yaml') || fileName.includes('toml')) {
    return 'Config';
  } else if (fileName.includes('.ts') || fileName.includes('.js') || fileName.includes('.py')) {
    return 'Code';
  } else if (fileName.includes('.md') || fileName.includes('README')) {
    return 'Documentation';
  } else if (fileName.includes('test') || fileName.includes('spec')) {
    return 'Testing';
  } else if (fileName.includes('workflow') || fileName.includes('jenkins')) {
    return 'CI/CD';
  } else if (fileName.includes('docker') || fileName.includes('compose')) {
    return 'Container';
  } else if (fileName.includes('.sql') || fileName.includes('migration')) {
    return 'Database';
  }
  return 'Other';
}
