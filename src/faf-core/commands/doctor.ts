/**
 * 🏥 FAF Doctor - Diagnose and fix common issues (Mk3 Bundled)
 * Health check for your project.faf setup
 */

import { promises as fs } from 'fs';
import * as path from 'path';
import { parse as parseYAML } from '../fix-once/yaml';
import { findFafFile, fileExists } from '../utils/file-utils';
import { FafCompiler } from '../compiler/faf-compiler';

interface DiagnosticResult {
  status: 'ok' | 'warning' | 'error';
  message: string;
  fix?: string;
}

export interface DoctorResult {
  success: boolean;
  health: 'perfect' | 'good' | 'issues';
  diagnostics: DiagnosticResult[];
  message: string;
}

export async function doctorCommand(projectPath?: string): Promise<DoctorResult> {
  const results: DiagnosticResult[] = [];
  const projectRoot = projectPath || process.cwd();

  try {
    // Check 1: project.faf file exists
    const fafPath = await findFafFile(projectRoot);

    if (!fafPath) {
      results.push({
        status: 'error',
        message: 'No project.faf file found',
        fix: 'Run: faf init, faf quick, or faf chat to create one'
      });
    } else {
      results.push({
        status: 'ok',
        message: `Found project.faf at: ${fafPath}`
      });

      // Check 2: project.faf file validity
      try {
        const content = await fs.readFile(fafPath, 'utf-8');
        const fafData = parseYAML(content);

        if (!fafData) {
          results.push({
            status: 'error',
            message: 'project.faf file is empty',
            fix: 'Run: faf init --force to regenerate'
          });
        } else {
          // Check for required fields
          const missingFields = [];
          if (!fafData.project?.name) missingFields.push('project.name');
          if (!fafData.project?.goal) missingFields.push('project.goal');

          if (missingFields.length > 0) {
            results.push({
              status: 'warning',
              message: `Missing important fields: ${missingFields.join(', ')}`,
              fix: 'Run: faf enhance or faf chat to add missing info'
            });
          } else {
            results.push({
              status: 'ok',
              message: 'project.faf structure is valid'
            });
          }

          // Check 3: Score
          const compiler = new FafCompiler();
          const scoreResult = await compiler.compile(fafPath);

          if (scoreResult.score < 30) {
            results.push({
              status: 'error',
              message: `Score too low: ${scoreResult.score}%`,
              fix: 'Run: faf enhance to improve, or faf chat to add context'
            });
          } else if (scoreResult.score < 70) {
            results.push({
              status: 'warning',
              message: `Score could be better: ${scoreResult.score}%`,
              fix: 'Target 70%+ for championship AI context'
            });
          } else {
            results.push({
              status: 'ok',
              message: `Great score: ${scoreResult.score}%`
            });
          }
        }
      } catch (error) {
        results.push({
          status: 'error',
          message: 'project.faf file is corrupted or invalid YAML',
          fix: 'Run: faf recover or faf init --force'
        });
      }
    }

    // Check 4: .fafignore exists
    const fafIgnorePath = path.join(projectRoot, '.fafignore');
    if (!await fileExists(fafIgnorePath)) {
      results.push({
        status: 'warning',
        message: 'No .fafignore file',
        fix: '.fafignore helps exclude unnecessary files'
      });
    } else {
      results.push({
        status: 'ok',
        message: '.fafignore found'
      });
    }

    // Check 5: Project detection
    const packageJsonPath = path.join(projectRoot, 'package.json');
    const requirementsPath = path.join(projectRoot, 'requirements.txt');
    const goModPath = path.join(projectRoot, 'go.mod');

    if (await fileExists(packageJsonPath)) {
      results.push({
        status: 'ok',
        message: 'Node.js/JavaScript project detected'
      });
    } else if (await fileExists(requirementsPath)) {
      results.push({
        status: 'ok',
        message: 'Python project detected'
      });
    } else if (await fileExists(goModPath)) {
      results.push({
        status: 'ok',
        message: 'Go project detected'
      });
    } else {
      results.push({
        status: 'warning',
        message: 'No standard project files detected',
        fix: 'FAF works best with package.json, requirements.txt, or go.mod'
      });
    }

    // Determine overall health
    const hasErrors = results.some(r => r.status === 'error');
    const hasWarnings = results.some(r => r.status === 'warning');

    const health = !hasErrors && !hasWarnings ? 'perfect' : !hasErrors ? 'good' : 'issues';

    const message = health === 'perfect' ? 'Perfect health! Your FAF setup is championship-ready!' :
                    health === 'good' ? 'Good health with minor improvements suggested.' :
                    'Issues detected. Follow the fixes above.';

    return {
      success: true,
      health,
      diagnostics: results,
      message
    };

  } catch (error) {
    return {
      success: false,
      health: 'issues',
      diagnostics: [{
        status: 'error',
        message: error instanceof Error ? error.message : 'Health check failed'
      }],
      message: 'Health check failed'
    };
  }
}
