/**
 * AGENTS.md writer — renders project.faf as AGENTS.md and writes it as a faf-managed block
 * through faf-cli's injector (content outside the block is kept).
 *
 * The AGENTS.md import into project.faf was retired in 6.0.0 (tag
 * archive/cfm-v5-surface keeps it).
 *
 * Ported from faf-cli for claude-faf-mcp v4.5.0
 */

import { fafCli } from '../../utils/faf-cli-bridge.js';

export interface AgentsExportResult {
  success: boolean;
  filePath: string;
  warnings: string[];
}

// ============================================================================
// Export: FAF -> AGENTS.md
// ============================================================================

export async function agentsExport(
  fafContent: any,
  outputPath: string
): Promise<AgentsExportResult> {
  const warnings: string[] = [];

  // Build AGENTS.md content
  const lines: string[] = [];

  // Project header
  const projectName = fafContent.project?.name || fafContent.name || 'My Project';
  const projectGoal = fafContent.project?.goal || fafContent.project?.description || fafContent.ai_tldr?.project || '';
  lines.push(`# ${projectName}`);
  lines.push('');

  // Project Overview section
  lines.push('## Project Overview');
  lines.push('');
  if (projectGoal) {
    lines.push(`- ${projectGoal}`);
  }
  if (fafContent.instant_context?.what_building) {
    lines.push(`- ${fafContent.instant_context.what_building}`);
  }
  lines.push('');

  // Tech Stack section
  const stack = fafContent.stack || fafContent.project?.stack || {};
  const hasStack = stack.frontend || stack.backend || stack.build || stack.runtime || stack.database;
  if (hasStack) {
    lines.push('## Tech Stack');
    lines.push('');
    if (stack.frontend) lines.push(`- Frontend: ${stack.frontend}`);
    if (stack.backend) lines.push(`- Backend: ${stack.backend}`);
    if (stack.runtime) lines.push(`- Runtime: ${stack.runtime}`);
    if (stack.build) lines.push(`- Build: ${stack.build}`);
    if (stack.database && stack.database !== 'None') lines.push(`- Database: ${stack.database}`);
    if (stack.package_manager) lines.push(`- Package Manager: ${stack.package_manager}`);
    if (stack.hosting) lines.push(`- Hosting: ${stack.hosting}`);
    if (stack.cicd) lines.push(`- CI/CD: ${stack.cicd}`);
    if (stack.languages?.length > 0) {
      lines.push(`- Languages: ${stack.languages.join(', ')}`);
    }
    if (stack.frameworks?.length > 0) {
      lines.push(`- Frameworks: ${stack.frameworks.join(', ')}`);
    }
    lines.push('');
  }

  // Code Style Guidelines section
  const warnings_list = fafContent.ai_instructions?.warnings || [];
  const codingStyleItems = fafContent.project?.codingStyle || [];
  const preferences = fafContent.preferences || {};
  const styleItems = [...codingStyleItems, ...warnings_list];

  if (preferences.quality_bar) styleItems.push(`Quality bar: ${preferences.quality_bar}`);
  if (preferences.commit_style) styleItems.push(`Commit style: ${preferences.commit_style}`);
  if (preferences.testing) styleItems.push(`Testing: ${preferences.testing}`);

  if (styleItems.length > 0) {
    lines.push('## Code Style Guidelines');
    lines.push('');
    for (const item of styleItems) {
      lines.push(`- ${item}`);
    }
    lines.push('');
  }

  // Build and Test Commands section
  const howContext = fafContent.human_context?.how || fafContent.context?.how;
  const buildCommands = fafContent.project?.buildCommands || [];
  if (howContext || buildCommands.length > 0) {
    lines.push('## Build and Test Commands');
    lines.push('');
    if (howContext) lines.push(`- ${howContext}`);
    for (const cmd of buildCommands) {
      lines.push(`- ${cmd}`);
    }
    lines.push('');
  }

  // Architecture section
  const humanContext = fafContent.human_context || {};
  const architectureItems = fafContent.project?.architecture || [];
  const archItems = [...architectureItems];
  if (humanContext.what) archItems.push(humanContext.what);
  if (humanContext.where) archItems.push(`Deployed: ${humanContext.where}`);

  if (archItems.length > 0) {
    lines.push('## Architecture');
    lines.push('');
    for (const item of archItems) {
      lines.push(`- ${item}`);
    }
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
  lines.push(`*Written from project.faf by claude-faf-mcp — ${new Date().toISOString().split('T')[0]}*`);
  lines.push('');

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
