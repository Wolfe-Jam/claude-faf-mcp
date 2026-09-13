/**
 * Conductor writer — renders project.faf into Google Conductor's conductor/
 * folder: product.md, tech-stack.md, workflow.md and product-guidelines.md.
 *
 * Each file gets one faf-managed block through faf-cli's injector: a file
 * already there keeps every line outside the block, and later runs update the
 * block in place. The folder is made inside the project (a conductor/ that is
 * a link out of it is refused), and each write is resolved against the project
 * folder. The content comes from faf-cli's keys: project.name / goal /
 * main_language, the filled stack.* slots, commands and the 6Ws — empty,
 * slotignored and placeholder values are left out.
 *
 * The conductor/ import into project.faf was retired in 6.0.0 (tag
 * archive/cfm-v5-surface keeps it).
 */

import path from 'path';
import { fafCli } from '../../utils/faf-cli-bridge.js';

export interface ConductorExportResult {
  success: boolean;
  /** The conductor/ files written, by name. */
  filesWritten: string[];
  warnings: string[];
}

type Json = Record<string, unknown>;

function isMapping(v: unknown): v is Json {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** The four conductor/ files and their block bodies, from .faf data. */
export async function renderConductor(faf: Json, projectDir: string): Promise<Record<string, string>> {
  const { isPlaceholder, SLOTIGNORED } = await fafCli;
  const filled = (v: unknown): v is string | number | boolean =>
    typeof v === 'number' || typeof v === 'boolean' ||
    (typeof v === 'string' && v.trim() !== '' && v.trim() !== SLOTIGNORED && !isPlaceholder(v));

  const project = isMapping(faf.project) ? faf.project : {};
  const stack = isMapping(faf.stack) ? faf.stack : {};
  const hc = isMapping(faf.human_context) ? faf.human_context : {};
  const commands = isMapping(faf.commands) ? faf.commands : {};
  const name = filled(project.name) ? String(project.name) : path.basename(projectDir);
  const w = (key: string, label: string): string[] => (filled(hc[key]) ? [`- **${label}:** ${String(hc[key])}`] : []);
  const section = (title: string, items: string[]): string[] => (items.length ? ['', `## ${title}`, ...items] : []);

  return {
    'product.md': [
      `# ${name}`,
      ...section('Overview', filled(project.goal) ? [String(project.goal)] : []),
      ...section('Context', [...w('who', 'Who'), ...w('what', 'What'), ...w('why', 'Why')]),
      '',
    ].join('\n'),
    'tech-stack.md': [
      '# Tech Stack',
      ...section('Language', filled(project.main_language) ? [`- ${String(project.main_language)}`] : []),
      ...section('Stack', Object.entries(stack).filter(([, v]) => filled(v)).map(([k, v]) => `- ${k}: ${String(v)}`)),
      '',
    ].join('\n'),
    'workflow.md': [
      '# Workflow',
      ...section('Commands', Object.entries(commands).filter(([, v]) => filled(v)).map(([k, v]) => `- ${k}: \`${String(v)}\``)),
      ...section('How', w('how', 'How')),
      '',
    ].join('\n'),
    'product-guidelines.md': [
      '# Product Guidelines',
      ...section('Context', [...w('where', 'Where'), ...w('when', 'When')]),
      '',
    ].join('\n'),
  };
}

// ============================================================================
// Export: FAF -> Conductor
// ============================================================================

export async function conductorExport(faf: Json, projectDir: string): Promise<ConductorExportResult> {
  const { injectFafBlock, makeDirInside, legacyStampNoteAt } = await fafCli;
  const dir = path.join(projectDir, 'conductor');
  makeDirInside(projectDir, dir);

  const filesWritten: string[] = [];
  const warnings: string[] = [];
  for (const [file, body] of Object.entries(await renderConductor(faf, projectDir))) {
    const target = path.join(dir, file);
    const note = legacyStampNoteAt(target, `conductor/${file}`, undefined, undefined, { root: projectDir });
    if (note) {warnings.push(note);}
    injectFafBlock(target, body, undefined, undefined, { root: projectDir });
    filesWritten.push(file);
  }

  return { success: true, filesWritten, warnings };
}
