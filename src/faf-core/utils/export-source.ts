/**
 * Where an export reads project.faf, and where it writes.
 *
 * One finder for the whole server: faf-cli's findFafFile — project.faf, else
 * .faf, in the folder and then one level up (a link out of the project is
 * refused). An export writes its file next to the .faf it renders, so the
 * result names both paths. It never writes in the home folder or the
 * filesystem root (faf-cli's isNonProjectRoot: device and inode, not spelling).
 */
import * as path from 'path';
import { fafCli } from '../../utils/faf-cli-bridge.js';

export type ExportSource =
  | { ok: true; fafPath: string; dir: string }
  | { ok: false; message: string };

/**
 * The .faf an export in `projectPath` renders and the folder it writes `file`
 * into — or why it will not. Throws faf-cli's SafePathError for a .faf that is
 * a link out of its folder.
 */
export async function exportSource(projectPath: string, file: string): Promise<ExportSource> {
  const { findFafFile, isNonProjectRoot } = await fafCli;
  const fafPath = findFafFile(projectPath);
  if (!fafPath) {
    return { ok: false, message: `No project.faf (or .faf) in ${projectPath} or the folder above it, so ${file} was not written. Run faf_init first.` };
  }
  const dir = path.dirname(path.resolve(fafPath));
  if (isNonProjectRoot(dir)) {
    return {
      ok: false,
      message: `${fafPath} sits in your home folder (or the filesystem root), not a project, so faf writes no ${file} there. Pass the project folder as path.`,
    };
  }
  return { ok: true, fafPath, dir };
}
