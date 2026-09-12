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
import * as fs from 'fs';
import { exportSource } from '../utils/export-source.js';
import { readFafMapping } from '../fix-once/yaml.js';
import { fafCli } from '../../utils/faf-cli-bridge.js';

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
    '> Written from project.faf by claude-faf-mcp. Copilot reads these instructions on every request in this repository — keep them short and broadly applicable.',
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
 * Write project.faf into .github/copilot-instructions.md as a faf-managed
 * block. A file already there keeps every line outside the block. The .github
 * folder is made inside the project (a .github that is a link out of it is
 * refused), and the write is resolved against the project folder, so it can
 * never land outside it.
 */
export async function copilotExportCommand(
  projectPath: string
): Promise<CopilotCommandResult> {
  // faf-cli's finder (the folder, then one level up); the file goes next to
  // the .faf it renders, never in the home folder or the filesystem root.
  const source = await exportSource(projectPath, '.github/copilot-instructions.md');
  if (!source.ok) {
    return { success: false, action: 'export', message: source.message };
  }
  const { fafPath, dir } = source;

  const fafData = await readFafMapping(fafPath);
  const { injectFafBlock, makeDirInside, legacyStampNoteAt } = await fafCli;
  const outputPath = path.join(dir, '.github', 'copilot-instructions.md');
  makeDirInside(dir, path.join(dir, '.github'));
  const existed = fs.existsSync(outputPath);
  const note = legacyStampNoteAt(outputPath, '.github/copilot-instructions.md', undefined, undefined, { root: dir });

  // Copilot-grade content — distinct from AGENTS.md, injected non-destructively.
  const content = generateCopilotInstructions(fafData);
  injectFafBlock(outputPath, content, undefined, undefined, { root: dir });

  return {
    success: true,
    action: 'export',
    message: (existed
      ? `Wrote faf's block into ${outputPath} from ${fafPath}; every line outside the block is kept`
      : `Wrote ${outputPath} from ${fafPath}`) + (note ? `\n${note}` : ''),
    data: { filePath: outputPath },
    ...(note ? { warnings: [note] } : {}),
  };
}

/**
 * Sync .github/copilot-instructions.md <- project.faf (FAF is source of truth)
 */
export async function copilotSyncCommand(
  projectPath: string
): Promise<CopilotCommandResult> {
  return await copilotExportCommand(projectPath);
}
