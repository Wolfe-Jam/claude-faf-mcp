/**
 * Conductor writer — renders project.faf as Google Conductor's conductor/
 * directory (product.md, tech-stack.md, workflow.md, product-guidelines.md).
 *
 * The conductor/ import into project.faf was retired in 6.0.0 (tag
 * archive/cfm-v5-surface keeps it).
 *
 * Ported from faf-cli for claude-faf-mcp v4.5.0
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface FafFromConductor {
  project: {
    name: string;
    description: string;
    type: string;
    goals: string[];
    stack: {
      languages: string[];
      frameworks: string[];
      databases: string[];
      infrastructure: string[];
    };
    rules: string[];
    guidelines: string[];
  };
  metadata: {
    source: string;
    imported: string;
    conductor_version?: string;
  };
}

export interface ExportResult {
  success: boolean;
  filesGenerated: string[];
  warnings: string[];
}

// ============================================================================
// Export: FAF -> Conductor
// ============================================================================

export async function conductorExport(
  faf: FafFromConductor,
  outputPath: string
): Promise<ExportResult> {
  const filesGenerated: string[] = [];
  const warnings: string[] = [];

  // Ensure output directory exists
  try {
    await fs.mkdir(outputPath, { recursive: true });
  } catch (err) {
    return {
      success: false,
      filesGenerated: [],
      warnings: [`Failed to create output directory: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  // Generate product.md
  const productContent = `# ${faf.project.name}

## Overview
${faf.project.description}

## Goals
${faf.project.goals.map(g => `- ${g}`).join('\n')}
`;
  await fs.writeFile(path.join(outputPath, 'product.md'), productContent);
  filesGenerated.push('product.md');

  // Generate tech-stack.md
  const techStackContent = `# Tech Stack

## Languages
${faf.project.stack.languages.map(l => `- ${l}`).join('\n')}

## Frameworks
${faf.project.stack.frameworks.map(f => `- ${f}`).join('\n')}

## Databases
${faf.project.stack.databases.map(d => `- ${d}`).join('\n')}

## Infrastructure
${faf.project.stack.infrastructure.map(i => `- ${i}`).join('\n')}
`;
  await fs.writeFile(path.join(outputPath, 'tech-stack.md'), techStackContent);
  filesGenerated.push('tech-stack.md');

  // Generate workflow.md
  const workflowContent = `# Workflow

## Rules
${faf.project.rules.map(r => `- ${r}`).join('\n')}
`;
  await fs.writeFile(path.join(outputPath, 'workflow.md'), workflowContent);
  filesGenerated.push('workflow.md');

  // Generate product-guidelines.md
  const guidelinesContent = `# Product Guidelines

## Guidelines
${faf.project.guidelines.map(g => `- ${g}`).join('\n')}
`;
  await fs.writeFile(path.join(outputPath, 'product-guidelines.md'), guidelinesContent);
  filesGenerated.push('product-guidelines.md');

  return {
    success: true,
    filesGenerated,
    warnings,
  };
}
