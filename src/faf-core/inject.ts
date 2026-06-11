import { promises as fs } from 'fs';

/**
 * Block markers for the faf-managed front section. Markdown files use HTML
 * comments; non-markdown files (.cursorrules) pass hash-comment markers.
 */
export const FAF_START = '<!-- faf:start -->';
export const FAF_END = '<!-- faf:end -->';

/**
 * faf's own metastamp fingerprint. Every faf-generated file begins with it and a
 * user never hand-writes it — so a markerless file led by it is legacy faf output
 * we can safely reclaim, never genuine user content.
 */
const FAF_METASTAMP = '<!-- faf:';

/**
 * Non-destructively write a faf-managed block into a file.
 *
 *   - no file                                 -> create it with just the block
 *   - markers present                         -> replace ONLY between them (update in place)
 *   - legacy faf file (metastamp, no markers) -> reclaim in place (no duplication)
 *   - genuine user file                       -> prefix the block; preserve everything below
 *
 * Idempotent: re-runs update the block, never duplicate or destroy user content.
 * faf owns what's between the markers; the user owns everything else.
 * Enhance, never replace.
 */
export async function injectFafBlock(
  path: string,
  block: string,
  start: string = FAF_START,
  end: string = FAF_END,
): Promise<void> {
  const wrapped = `${start}\n${block.trim()}\n${end}`;

  let existing: string | null = null;
  try {
    existing = await fs.readFile(path, 'utf-8');
  } catch {
    existing = null; // file does not exist yet
  }

  if (existing === null) {
    await fs.writeFile(path, `${wrapped}\n`, 'utf-8');
    return;
  }

  const s = existing.indexOf(start);
  const e = existing.indexOf(end);
  if (s !== -1 && e !== -1 && e > s) {
    await fs.writeFile(path, existing.slice(0, s) + wrapped + existing.slice(e + end.length), 'utf-8');
    return;
  }

  if (existing.trimStart().startsWith(FAF_METASTAMP)) {
    // Legacy faf output — reclaim in place, no duplication.
    await fs.writeFile(path, `${wrapped}\n`, 'utf-8');
    return;
  }

  // Genuine user file — prefix the block, preserve everything.
  await fs.writeFile(path, `${wrapped}\n\n${existing}`, 'utf-8');
}
