/**
 * 🔍 faf audit - Comprehensive Quality Audit (Mk3 Bundled)
 * Audit project.faf quality and completeness
 */

import { promises as fs } from 'fs';
import { parse as parseYAML } from '../fix-once/yaml';
import { findFafFile, fileExists } from '../utils/file-utils';
import { FafCompiler } from '../compiler/faf-compiler';

export interface AuditOptions {
  json?: boolean;
  verbose?: boolean;
}

export interface AuditResult {
  success: boolean;
  score: number;
  grade: string;
  issues: Array<{
    severity: 'high' | 'medium' | 'low';
    message: string;
    fix?: string;
  }>;
  strengths: string[];
  message: string;
}

export async function auditFafFile(projectPath?: string, options: AuditOptions = {}): Promise<AuditResult> {
  try {
    const fafPath = projectPath ? `${projectPath}/project.faf` : await findFafFile();

    if (!fafPath || !await fileExists(fafPath)) {
      return {
        success: false,
        score: 0,
        grade: 'F',
        issues: [{ severity: 'high', message: 'No project.faf file found', fix: 'Run faf init' }],
        strengths: [],
        message: 'No project.faf file found'
      };
    }

    // Read and parse
    const content = await fs.readFile(fafPath, 'utf-8');
    const fafData = parseYAML(content);

    // Run compiler scoring
    const compiler = new FafCompiler();
    const scoreResult = await compiler.compile(fafPath);

    const issues: AuditResult['issues'] = [];
    const strengths: string[] = [];

    // Audit checks
    if (!fafData.project?.name) {
      issues.push({ severity: 'high', message: 'Missing project name', fix: 'Add project.name field' });
    } else {
      strengths.push('Project name defined');
    }

    if (!fafData.project?.goal) {
      issues.push({ severity: 'medium', message: 'Missing project goal', fix: 'Add project.goal field' });
    } else {
      strengths.push('Project goal defined');
    }

    if (!fafData.stack?.frontend && !fafData.stack?.backend) {
      issues.push({ severity: 'medium', message: 'Stack information incomplete', fix: 'Add stack details' });
    } else {
      strengths.push('Stack information present');
    }

    if (!fafData.instant_context?.what_building) {
      issues.push({ severity: 'low', message: 'Missing instant context', fix: 'Add what_building description' });
    } else {
      strengths.push('Instant context defined');
    }

    // Determine grade
    const grade = scoreResult.score >= 90 ? 'A' :
                  scoreResult.score >= 80 ? 'B' :
                  scoreResult.score >= 70 ? 'C' :
                  scoreResult.score >= 60 ? 'D' : 'F';

    return {
      success: true,
      score: scoreResult.score,
      grade,
      issues,
      strengths,
      message: `Audit complete - Score: ${scoreResult.score}% (Grade: ${grade})`
    };

  } catch (error) {
    return {
      success: false,
      score: 0,
      grade: 'F',
      issues: [{ severity: 'high', message: error instanceof Error ? error.message : 'Audit failed' }],
      strengths: [],
      message: 'Audit failed'
    };
  }
}
