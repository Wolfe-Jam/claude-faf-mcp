/**
 * Claude command — writes CLAUDE.md from project.faf, one direction.
 *
 * CLAUDE.md is faf-cli's render of project.faf (renderClaudeMd — the same
 * bytes `faf sync` pushes), written through faf-cli's injector (writeClaudeMd),
 * so content outside the faf-managed block survives. With agents / cursor /
 * gemini / copilot / all it also writes AGENTS.md, .cursorrules, GEMINI.md and
 * .github/copilot-instructions.md with faf-cli's writers (utils/export-format.ts);
 * a requested file that is not written is named in the result with its reason
 * (filesFailed), never dropped. Nothing here reads CLAUDE.md back into
 * project.faf. Named bi-sync before 5.23; the old name claimed a two-way sync
 * this code never did.
 *
 * The .faf is found with faf-cli's finder (the folder, then one level up —
 * project.faf, else .faf) and CLAUDE.md is written next to it. The older
 * `project: <name>` shape is lifted at the read boundary, so the title keeps
 * the project's name.
 */

import { parse as parseYAML } from '../fix-once/yaml';
import * as path from 'path';
import { fafCli } from '../../utils/faf-cli-bridge.js';
import { readFafData, isMapping, legacyProjectHint } from '../../utils/faf-read.js';
import { exportSource } from '../utils/export-source.js';
import { exportFormat, type FormatFile } from '../utils/export-format.js';

export interface ClaudeExportOptions {
  agents?: boolean;
  cursor?: boolean;
  gemini?: boolean;
  copilot?: boolean;
  all?: boolean;
}

export interface ClaudeExportResult {
  success: boolean;
  direction: 'faf-to-claude' | 'none';
  /** Files written, CLAUDE.md first. */
  filesChanged: string[];
  /** Requested formats that were not written, each with the reason. */
  filesFailed: Array<{ file: string; reason: string }>;
  /** The .faf the files were written from ('' when none was found). */
  fafPath: string;
  /** faf-cli's score of the .faf, as text: "85%" or "unknown (—)". */
  score: string;
  duration: number;
  message: string;
}

// ─── The CLAUDE.md claude-faf-mcp 4.5.0–5.22.1 wrote ────────────────────────
//
// faf_auto in those versions wrote this whole file, with no faf markers, when a
// project had no CLAUDE.md. faf-cli's injector never reclaims a file without
// markers, so after an upgrade the old text sat under faf's block: two titles,
// a stale mission and a retired "BI-SYNC ACTIVE" claim, every session. It is
// taken out only when faf can prove it wrote every line: the text outside
// faf's block is exactly this template, and each value in it is one the old
// writer would have put there from this project.faf (the name, the mission,
// the stack signature, or the template's own defaults). Anything else — one
// extra line, a value the .faf does not hold — is left as it is, and the reply
// says so in one line.

const LEGACY_TITLE = '# \u{1F3CE}\u{FE0F} CLAUDE.md - AI Telemetry Link';
const LEGACY_FOOTER = '**STATUS: BI-SYNC ACTIVE \u{1F517}**';
const LEGACY_TEMPLATE = new RegExp(
  '^' + [
    esc(LEGACY_TITLE),
    '',
    '## Project: (.*)',
    esc('**Championship-Grade Project DNA Foundation**'),
    '',
    esc('### \u{1F3AF} Project Mission'),
    '(.*)',
    '',
    esc('### \u{1F3D7}\u{FE0F} Architecture Overview'),
    '(.*)',
    '',
    '---',
    '',
    esc(LEGACY_FOOTER),
    '\\*Last Sync: \\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}Z\\*',
    esc('*Sync Engine: FAF Auto*'),
    '',
  ].join('\n') + '$',
  'u',
);

function esc(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** The text of a slot value the old template printed with `${…}`. */
function printed(v: unknown): string | null {
  return typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? String(v) : null;
}

/**
 * True when `text` is exactly the CLAUDE.md claude-faf-mcp 4.5.0–5.22.1 wrote
 * for this project: the template line for line, with the name, mission and
 * architecture each a value the old writer took from project.faf (or its own
 * default).
 */
export function isOldClaudeMd(text: string, data: Record<string, unknown>, legacyProject: string | null, dir: string): boolean {
  const m = LEGACY_TEMPLATE.exec(text);
  if (!m) {return false;}
  const [, name, mission, architecture] = m;
  const project = isMapping(data.project) ? data.project : {};
  const hc = isMapping(data.human_context) ? data.human_context : {};
  const names = [legacyProject, printed(project.name), path.basename(dir), '[object Object]'];
  const missions = [printed(hc.why), printed(project.goal), 'AI-ready project context'];
  const architectures = [printed(data.stack_signature), 'Auto-detected stack'];
  return names.includes(name) && missions.includes(mission) && architectures.includes(architecture);
}

/** True when `text` carries the old template's title or footer line. */
function looksOld(text: string): boolean {
  return text.split(/\r?\n/).some((line) => line === LEGACY_TITLE || line === LEGACY_FOOTER);
}

export interface ClaudeWrite {
  /** CLAUDE.md before the write (null: there was none). */
  before: string | null;
  /** CLAUDE.md after the write. */
  after: string | null;
  /** One line each: faf-cli's legacy-stamp note, the old-template outcome. */
  notes: string[];
}

/**
 * Write faf's block into `dir`/CLAUDE.md from .faf data (already through the
 * read boundary), with faf-cli's render and injector. Then, when the text
 * outside faf's block is exactly the CLAUDE.md claude-faf-mcp ≤5.22.1 wrote for
 * this project, take that old text out; when it only looks like it, say so and
 * leave it. Every write is faf-cli's safe write.
 */
export async function writeClaudeFromFaf(
  dir: string,
  data: Record<string, unknown>,
  legacyProject: string | null,
): Promise<ClaudeWrite> {
  const { readClaudeMd, renderClaudeMd, writeClaudeMd, legacyStampNoteAt, findFafBlock, safeWriteFile } = await fafCli;
  const claudePath = path.join(dir, 'CLAUDE.md');
  const before = readClaudeMd(dir);
  const notes: string[] = [];
  const stamp = legacyStampNoteAt(claudePath, 'CLAUDE.md');
  if (stamp) {notes.push(stamp);}

  writeClaudeMd(dir, renderClaudeMd(data as any));
  let after = readClaudeMd(dir);

  if (after !== null && looksOld(after)) {
    const found = findFafBlock(after);
    const head = found ? after.slice(0, found.start) : after;
    const tail = found ? after.slice(found.end) : '';
    // faf's block is on top (nothing above it), and below it — after the one
    // blank line the injector puts there — is the old file, whole.
    const old = found && head === '' && tail.startsWith('\n\n') ? tail.slice(2) : null;
    if (found && old !== null && isOldClaudeMd(old, data, legacyProject, dir)) {
      safeWriteFile(claudePath, `${after.slice(0, found.end)}\n`, { root: dir, expect: after });
      after = readClaudeMd(dir);
      notes.push("CLAUDE.md: took out the text claude-faf-mcp 5.22.1 or older wrote below faf's block (\"AI Telemetry Link … STATUS: BI-SYNC ACTIVE\"); faf wrote every line of it.");
    } else {
      notes.push("CLAUDE.md: the older claude-faf-mcp text below faf's block (\"AI Telemetry Link … STATUS: BI-SYNC ACTIVE\") has lines faf cannot prove it wrote, so it is left as you have it — delete it by hand if you no longer want it.");
    }
  }
  return { before, after, notes };
}

/**
 * Write CLAUDE.md (and any requested AI formats) from the .faf in
 * `projectPath` (or the folder above it).
 */
export async function claudeExportCommand(projectPath: string, options: ClaudeExportOptions = {}): Promise<ClaudeExportResult> {
  const startTime = Date.now();
  const result: ClaudeExportResult = {
    success: false,
    direction: 'none',
    filesChanged: [],
    filesFailed: [],
    fafPath: '',
    score: 'unknown (—)',
    duration: 0,
    message: ''
  };

  try {
    // faf-cli's finder: the .faf readers accept (project.faf, else .faf; the
    // folder, then one level up). CLAUDE.md goes next to it.
    const source = await exportSource(projectPath, 'CLAUDE.md');
    if (!source.ok) {
      result.message = source.message;
      result.duration = Date.now() - startTime;
      return result;
    }
    const { fafPath, dir: projectDir } = source;
    result.fafPath = fafPath;
    const { scoreFafYaml, readFafRaw, scoreText } = await fafCli;

    // Read .faf content through faf-cli's reader (a link out of the project is
    // refused, never read) — validate the YAML before anything is written.
    const fafContent = readFafRaw(fafPath);
    parseYAML(fafContent, { filepath: fafPath });
    const { data, legacyProject } = await readFafData(fafPath);
    // The score in the message is faf-cli's scorer on the bytes read, not a
    // `faf_score` key nothing writes. Unscorable → say so, never invent one.
    try {
      result.score = scoreText(scoreFafYaml(fafContent));
    } catch {
      /* the kernel could not read it: the score stays unknown */
    }

    // CLAUDE.md is faf-cli's render of project.faf, injected with faf-cli's
    // injector: only the faf-managed block changes, the rest of the file is kept.
    const claudePath = path.join(projectDir, 'CLAUDE.md');
    const written = await writeClaudeFromFaf(projectDir, data, legacyProject);

    result.success = true;
    result.direction = 'faf-to-claude';
    result.filesChanged.push(claudePath);
    result.message = written.before !== null
      ? `CLAUDE.md refreshed from ${fafPath}. FAF Score: ${result.score}`
      : `CLAUDE.md written from ${fafPath}. FAF Score: ${result.score}`;
    for (const note of written.notes) {result.message += `\n${note}`;}
    if (legacyProject !== null) {result.message += `\n${legacyProjectHint(path.basename(fafPath), legacyProject)}`;}

    // Each requested format is faf-cli's writer. A format that is not written
    // is reported with its reason — never dropped from the reply.
    const requested: FormatFile[] = [
      ...(options.agents || options.all ? ['AGENTS.md' as const] : []),
      ...(options.cursor || options.all ? ['.cursorrules' as const] : []),
      ...(options.gemini || options.all ? ['GEMINI.md' as const] : []),
      ...(options.copilot || options.all ? ['.github/copilot-instructions.md' as const] : []),
    ];
    for (const file of requested) {
      const r = await exportFormat(projectDir, file);
      if (r.success) {
        result.filesChanged.push(path.join(projectDir, file));
      } else {
        result.filesFailed.push({ file: path.join(projectDir, file), reason: r.message });
      }
    }

    if (result.filesChanged.length > 1) {
      result.message += ` | Also synced: ${result.filesChanged.slice(1).map((f) => path.relative(projectDir, f)).join(', ')}`;
    }
    for (const failed of result.filesFailed) {
      result.message += `\nNot written: ${path.relative(projectDir, failed.file)} — ${failed.reason}`;
    }

    result.duration = Date.now() - startTime;
    return result;

  } catch (error) {
    result.duration = Date.now() - startTime;
    result.message = error instanceof Error ? error.message : 'CLAUDE.md write failed';
    return result;
  }
}
