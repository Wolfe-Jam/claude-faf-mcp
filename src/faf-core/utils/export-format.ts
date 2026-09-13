/**
 * One AI-context file written from project.faf by faf-cli.
 *
 * AGENTS.md, .cursorrules, GEMINI.md and .github/copilot-instructions.md are
 * faf-cli's renders (renderAgentsMd, renderCursorrules, renderGeminiMd,
 * renderCopilotInstructions), written by faf-cli's own writers (writeAgentsMd,
 * writeCursorrules, writeGeminiMd, writeCopilotInstructions) — the same bytes
 * `faf export` writes, AGENTS.md and GEMINI.md enriched with faf-cli's
 * enrichFromRepo as `faf export` does. Each writer injects faf's managed block:
 * a file already there keeps every line outside the block. Before 6.0.0
 * claude-faf-mcp rendered these files itself (tag archive/cfm-v5-surface keeps
 * that code); its copies printed `slotignored` as a value, labelled the 6W
 * `where` as "Deployed:" and wrote a one-line GEMINI.md.
 *
 * The .faf is the one faf-cli's finder picks (the folder, then one level up)
 * and the file goes next to it, never in the home folder or the filesystem
 * root. A write that fails or is refused leaves the file as it was, and the
 * result says so.
 */
import * as fs from 'fs';
import * as path from 'path';
import { exportSource } from './export-source.js';
import { readFafMapping } from '../fix-once/yaml.js';
import { fafCli } from '../../utils/faf-cli-bridge.js';
import { notWritten } from '../../utils/write-outcome.js';

type FafCli = Awaited<typeof fafCli>;
/** faf-cli's FafData, as its writers take it. */
type FafData = Parameters<FafCli['writeAgentsMd']>[1];
type Writer = (cli: FafCli, dir: string, data: FafData) => void;

export interface ExportFormatResult {
  success: boolean;
  message: string;
  data?: { filePath: string };
  warnings?: string[];
}

/** The four formats faf-cli writes, by the file each one writes. */
export const FORMATS = {
  'AGENTS.md': {
    write: (cli: FafCli, dir: string, data: FafData) => cli.writeAgentsMd(dir, cli.enrichFromRepo(dir, data)),
  },
  '.cursorrules': {
    write: (cli: FafCli, dir: string, data: FafData) => cli.writeCursorrules(dir, data),
    markers: ['# faf:start', '# faf:end'] as [string, string],
  },
  'GEMINI.md': {
    write: (cli: FafCli, dir: string, data: FafData) => cli.writeGeminiMd(dir, cli.enrichFromRepo(dir, data)),
  },
  '.github/copilot-instructions.md': {
    write: (cli: FafCli, dir: string, data: FafData) => cli.writeCopilotInstructions(dir, data),
  },
} as const;

export type FormatFile = keyof typeof FORMATS;

/** Write `file` from the .faf in `projectPath` (or the folder above it). */
export async function exportFormat(projectPath: string, file: FormatFile): Promise<ExportFormatResult> {
  const source = await exportSource(projectPath, file);
  if (!source.ok) {
    return { success: false, message: source.message };
  }
  const { fafPath, dir } = source;
  const outputPath = path.join(dir, file);
  const format: { write: Writer; markers?: [string, string] } = FORMATS[file];
  let existed = false;
  try {
    const data = (await readFafMapping(fafPath)) as FafData;
    const cli = await fafCli;
    existed = fs.existsSync(outputPath);
    const note = cli.legacyStampNoteAt(outputPath, file, format.markers?.[0], format.markers?.[1], { root: dir });
    format.write(cli, dir, data);
    return {
      success: true,
      message: (existed
        ? `Wrote faf's block into ${outputPath} from ${fafPath}; every line outside the block is kept`
        : `Wrote ${outputPath} from ${fafPath}`) + (note ? `\n${note}` : ''),
      data: { filePath: outputPath },
      ...(note ? { warnings: [note] } : {}),
    };
  } catch (error) {
    return { success: false, message: notWritten(outputPath, error, existed) };
  }
}
