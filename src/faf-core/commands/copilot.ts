/**
 * Copilot Command - Interop Edition
 *
 * Export project.faf to .github/copilot-instructions.md — GitHub Copilot's
 * repository-wide custom-instructions file, the WIDEST-supported instruction
 * surface (read by default across web chat, code review, VS Code, JetBrains,
 * Visual Studio, Eclipse, Xcode, Copilot CLI, and the coding agent).
 *
 * Emits Copilot-grade INSTRUCTIONS (not a metadata dump, not an AGENTS.md clone):
 * a prose overview, CFM's well-labelled tech stack, and a `## Build & run` command
 * section, with the "every request" framing GitHub's custom-instructions spec calls
 * for. Bundled command — no CLI dependency required.
 */

import path from 'path';
import { promises as fs } from 'fs';
import { findFafFile } from '../utils/file-utils.js';
import { parse as parseYAML } from '../fix-once/yaml.js';
import { injectFafBlock } from '../inject.js';

export interface CopilotCommandResult {
  success: boolean;
  action: 'export';
  message: string;
  data?: any;
  warnings?: string[];
}

/** A stack value that carries real content (not empty/slotignored/None). */
function filled(v: any): boolean {
  return typeof v === 'string' && v.trim() !== '' && v.trim() !== 'slotignored' && v.trim() !== 'None';
}

/**
 * Generate Copilot-grade `.github/copilot-instructions.md` content.
 *
 * Distinct from AGENTS.md (which it outranks in-repo): short, imperative
 * INSTRUCTIONS injected into every Copilot request — a prose overview, CFM's
 * existing well-labelled tech stack, and a `## Build & run` command section.
 * Per the FAF/WJTTC/TAF boundary, build/cicd come from FAF context; testing is
 * not a FAF slot, so no test command is sourced here.
 */
export function generateCopilotInstructions(fafContent: any): string {
  const lines: string[] = [];
  const name = fafContent.project?.name || fafContent.name || 'Project';
  const goal =
    fafContent.project?.goal ||
    fafContent.project?.description ||
    fafContent.instant_context?.what_building ||
    '';
  const stack = fafContent.stack || fafContent.project?.stack || {};

  lines.push(`# GitHub Copilot Instructions — ${name}`);
  lines.push('');
  lines.push(
    '> Generated from project.faf by claude-faf-mcp. Copilot reads these instructions on every request in this repository — keep them short and broadly applicable.',
  );
  lines.push('');

  // Overview — the goal as prose (not a bullet).
  if (goal && String(goal).trim()) {
    lines.push(String(goal).trim());
    lines.push('');
  }

  // Tech stack — CFM's existing labels; build/cicd handled as commands below.
  const tech: string[] = [];
  if (filled(stack.frontend)) tech.push(`- Frontend: ${stack.frontend}`);
  if (filled(stack.backend)) tech.push(`- Backend: ${stack.backend}`);
  if (filled(stack.runtime)) tech.push(`- Runtime: ${stack.runtime}`);
  if (filled(stack.database)) tech.push(`- Database: ${stack.database}`);
  if (filled(stack.package_manager)) tech.push(`- Package Manager: ${stack.package_manager}`);
  if (filled(stack.hosting)) tech.push(`- Hosting: ${stack.hosting}`);
  if (Array.isArray(stack.languages) && stack.languages.length > 0) tech.push(`- Languages: ${stack.languages.join(', ')}`);
  if (Array.isArray(stack.frameworks) && stack.frameworks.length > 0) tech.push(`- Frameworks: ${stack.frameworks.join(', ')}`);
  if (tech.length > 0) {
    lines.push('## Tech stack', '', ...tech, '');
  }

  // Build & run — imperative commands from FAF's build/cicd context.
  const cmds: string[] = [];
  if (filled(stack.build)) cmds.push(`- Build with \`${String(stack.build).trim()}\`.`);
  if (filled(stack.cicd)) cmds.push(`- CI runs on ${String(stack.cicd).trim()}.`);
  if (cmds.length > 0) {
    lines.push('## Build & run', '', ...cmds, '');
  }

  // Project context — the 6Ws when present.
  const hc = fafContent.human_context || fafContent.context || {};
  const sixW: [string, any][] = [
    ['Who', hc.who], ['What', hc.what], ['Why', hc.why],
    ['Where', hc.where], ['When', hc.when], ['How', hc.how],
  ];
  const ctx = sixW.filter(([, v]) => filled(v)).map(([k, v]) => `- **${k}:** ${String(v).trim()}`);
  if (ctx.length > 0) {
    lines.push('## Project context', '', ...ctx, '');
  }

  return lines.join('\n');
}

/**
 * Export project.faf to .github/copilot-instructions.md
 */
export async function copilotExportCommand(
  projectPath: string,
  options: { force?: boolean } = {}
): Promise<CopilotCommandResult> {
  // Check for existing .faf
  const fafPath = await findFafFile(projectPath);
  if (!fafPath) {
    return {
      success: false,
      action: 'export',
      message: 'No .faf file found. Run faf init first.',
    };
  }

  const githubDir = path.join(projectPath, '.github');
  const outputPath = path.join(githubDir, 'copilot-instructions.md');

  // Respect existing file unless force
  if (!options.force) {
    try {
      await fs.access(outputPath);
      return {
        success: false,
        action: 'export',
        message: '.github/copilot-instructions.md already exists. Use force: true to overwrite.',
      };
    } catch {
      // File doesn't exist, proceed
    }
  }

  // Copilot's instruction file is nested under .github/ — ensure it exists
  await fs.mkdir(githubDir, { recursive: true });

  // Read and parse .faf
  const fafContent = await fs.readFile(fafPath, 'utf-8');
  const fafData = parseYAML(fafContent);

  // Copilot-grade content — distinct from AGENTS.md, injected non-destructively.
  const content = generateCopilotInstructions(fafData);
  await injectFafBlock(outputPath, content);

  return {
    success: true,
    action: 'export',
    message: `Exported project.faf to .github/copilot-instructions.md`,
    data: { filePath: outputPath },
  };
}

/**
 * Sync .github/copilot-instructions.md <- project.faf (FAF is source of truth)
 */
export async function copilotSyncCommand(
  projectPath: string
): Promise<CopilotCommandResult> {
  return await copilotExportCommand(projectPath, { force: true });
}
