/**
 * .cursorrules writer — renders project.faf as .cursorrules and writes it as a faf-managed block
 * through faf-cli's injector (content outside the block is kept).
 *
 * The .cursorrules import into project.faf was retired in 6.0.0 (tag
 * archive/cfm-v5-surface keeps it).
 *
 * Ported from faf-cli for claude-faf-mcp v4.5.0
 */

import { fafCli } from '../../utils/faf-cli-bridge.js';

export interface CursorExportResult {
  success: boolean;
  filePath: string;
  warnings: string[];
}

// ============================================================================
// Export: FAF -> .cursorrules
// ============================================================================

export async function cursorExport(
  fafContent: any,
  outputPath: string
): Promise<CursorExportResult> {
  const warnings: string[] = [];

  // Build .cursorrules content
  const lines: string[] = [];

  // Project header
  const projectName = fafContent.project?.name || fafContent.name || 'My Project';
  const projectGoal = fafContent.project?.goal || fafContent.project?.description || fafContent.ai_tldr?.project || '';
  lines.push(`# ${projectName}`);
  lines.push('');
  if (projectGoal) {
    lines.push(projectGoal);
    lines.push('');
  }

  // Tech Stack section
  const stack = fafContent.stack || fafContent.project?.stack || {};
  const hasStack = stack.frontend || stack.backend || stack.build || stack.runtime;
  if (hasStack) {
    lines.push('## Tech Stack');
    lines.push('');
    if (stack.frontend) lines.push(`- Frontend: ${stack.frontend}`);
    if (stack.backend) lines.push(`- Backend: ${stack.backend}`);
    if (stack.runtime) lines.push(`- Runtime: ${stack.runtime}`);
    if (stack.build) lines.push(`- Build: ${stack.build}`);
    if (stack.package_manager) lines.push(`- Package Manager: ${stack.package_manager}`);
    if (stack.languages?.length > 0) {
      lines.push(`- Languages: ${stack.languages.join(', ')}`);
    }
    if (stack.frameworks?.length > 0) {
      lines.push(`- Frameworks: ${stack.frameworks.join(', ')}`);
    }
    lines.push('');
  }

  // Coding Standards section
  const warnings_list = fafContent.ai_instructions?.warnings || [];
  const workingStyle = fafContent.ai_instructions?.working_style || {};
  const codingStyleItems = fafContent.project?.codingStyle || [];
  const styleItems = [...codingStyleItems, ...warnings_list];

  if (workingStyle.quality_bar) styleItems.push(`Quality bar: ${workingStyle.quality_bar}`);
  if (workingStyle.testing) styleItems.push(`Testing: ${workingStyle.testing}`);

  if (styleItems.length > 0) {
    lines.push('## Coding Standards');
    lines.push('');
    for (const item of styleItems) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  // Preferences section
  const preferences = fafContent.preferences || {};
  const prefItems: string[] = [];
  if (preferences.quality_bar) prefItems.push(`Quality bar: ${preferences.quality_bar}`);
  if (preferences.commit_style) prefItems.push(`Commit style: ${preferences.commit_style}`);
  if (preferences.response_style) prefItems.push(`Response style: ${preferences.response_style}`);
  if (preferences.testing) prefItems.push(`Testing: ${preferences.testing}`);
  if (preferences.documentation) prefItems.push(`Documentation: ${preferences.documentation}`);

  if (prefItems.length > 0) {
    lines.push('## Preferences');
    lines.push('');
    for (const item of prefItems) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  // Build Commands section
  const howContext = fafContent.human_context?.how || fafContent.context?.how;
  if (howContext) {
    lines.push('## Build Commands');
    lines.push('');
    lines.push(`- ${howContext}`);
    lines.push('');
  }

  // General Instructions (rules + guidelines)
  const ruleItems = fafContent.project?.rules || [];
  const guidelineItems = fafContent.project?.guidelines || [];
  const generalInstructions = [...ruleItems, ...guidelineItems];

  if (generalInstructions.length > 0) {
    lines.push('## General Instructions');
    lines.push('');
    for (const item of generalInstructions) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  // Footer
  lines.push('---');
  lines.push(`Written from project.faf by claude-faf-mcp — ${new Date().toISOString().split('T')[0]}`);
  lines.push('');

  // Write file — non-destructive: inject/update the faf block (hash-comment markers), preserve the rest.
  const content = lines.join('\n');
  const { injectFafBlock } = await fafCli;
  injectFafBlock(outputPath, content, '# faf:start', '# faf:end');

  return {
    success: true,
    filePath: outputPath,
    warnings,
  };
}
