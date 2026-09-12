/**
 * GEMINI.md writer — renders project.faf as GEMINI.md and writes it as a faf-managed block
 * through faf-cli's injector (content outside the block is kept).
 *
 * The GEMINI.md import into project.faf was retired in 6.0.0 (tag
 * archive/cfm-v5-surface keeps it).
 *
 * Ported from faf-cli for claude-faf-mcp v4.5.0
 */

import { fafCli } from '../../utils/faf-cli-bridge.js';

export interface GeminiExportResult {
  success: boolean;
  filePath: string;
  warnings: string[];
}

// ============================================================================
// Export: FAF -> GEMINI.md
// ============================================================================

export async function geminiExport(
  fafContent: any,
  outputPath: string
): Promise<GeminiExportResult> {
  const warnings: string[] = [];

  // Build GEMINI.md content
  const lines: string[] = [];

  // Project header
  const projectName = fafContent.project?.name || fafContent.name || 'My Project';
  lines.push(`# Project: ${projectName}`);
  lines.push('');

  // Description as intro paragraph if exists
  const description = fafContent.project?.description || fafContent.description;
  if (description) {
    lines.push(description);
    lines.push('');
  }

  // General Instructions section
  const guidelineItems = fafContent.project?.guidelines || fafContent.guidelines || [];
  const ruleItems = fafContent.project?.rules || fafContent.rules || [];
  const generalInstructions = [...guidelineItems, ...ruleItems];

  if (generalInstructions.length > 0) {
    lines.push('## General Instructions');
    lines.push('');
    for (const item of generalInstructions) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  // Coding Style section
  const codingStyleItems = fafContent.project?.codingStyle || fafContent.codingStyle || [];
  const stack = fafContent.project?.stack || {};

  // Add languages/frameworks to coding style context
  const styleItems = [...codingStyleItems];
  if (stack.languages?.length > 0) {
    styleItems.push(`Languages: ${stack.languages.join(', ')}`);
  }
  if (stack.frameworks?.length > 0) {
    styleItems.push(`Frameworks: ${stack.frameworks.join(', ')}`);
  }

  if (styleItems.length > 0) {
    lines.push('## Coding Style');
    lines.push('');
    for (const item of styleItems) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  // Tech Stack section (if detailed)
  if (stack.databases?.length > 0 || stack.infrastructure?.length > 0) {
    lines.push('## Tech Stack');
    lines.push('');
    if (stack.databases?.length > 0) {
      lines.push(`- Databases: ${stack.databases.join(', ')}`);
    }
    if (stack.infrastructure?.length > 0) {
      lines.push(`- Infrastructure: ${stack.infrastructure.join(', ')}`);
    }
    lines.push('');
  }

  // Goals section
  const goals = fafContent.project?.goals || [];
  if (goals.length > 0) {
    lines.push('## Project Goals');
    lines.push('');
    for (const goal of goals) {
      lines.push(`- ${goal}`);
    }
    lines.push('');
  }

  // Write file — non-destructive: inject/update the faf block, preserve the rest.
  const content = lines.join('\n');
  const { injectFafBlock } = await fafCli;
  injectFafBlock(outputPath, content);

  return {
    success: true,
    filePath: outputPath,
    warnings,
  };
}
