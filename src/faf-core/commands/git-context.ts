/**
 * faf_git — a project.faf for a repository you name by URL, composed from
 * faf-cli's `faf git`.
 *
 * faf-cli's pure `faf git` helpers do the work: normalizeGitUrl checks the URL
 * (no shell characters, a strict allow-list) and authorFafFromRepo runs the
 * same pipeline `faf auto` runs (assembleFreshFaf) on the fetched folder. The
 * fetch is the one step faf-cli leaves to its consumer, and it is the only
 * network use in claude-faf-mcp: a shallow `git clone --depth 1` of the URL,
 * run without a shell, into a new temp folder that is removed afterwards.
 * Symbolic links in the repo are checked out as plain files, so a link in it
 * can never make faf read a file outside the clone. The score is faf-cli's
 * scoreFafYaml on the exact bytes written (or that would be written).
 *
 * faf_git writes only a new file: when the folder already has a project.faf
 * (or .faf) it refuses before anything is fetched, and points to faf_auto.
 */

import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { fafCli } from '../../utils/faf-cli-bridge.js';
import { notWritten, oneLine } from '../../utils/write-outcome.js';

const execFileAsync = promisify(execFile);

/** How long the clone may take before faf gives up on it. */
const CLONE_TIMEOUT_MS = 120_000;

export interface GitContextResult {
  success: boolean;
  message: string;
  data?: {
    repoUrl: string;
    score: number;
    tier: string;
    fafContent: string;
    filePath?: string;
  };
}

/** True when something is at `p` — a file, a folder or a link (dangling included). */
function present(p: string): boolean {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * The argv for the clone: shallow, quiet, symbolic links as plain files, and
 * `--` so the URL is never read as an option.
 */
export function cloneArgs(repoUrl: string, dir: string): string[] {
  return ['-c', 'core.symlinks=false', 'clone', '--depth', '1', '--quiet', '--', repoUrl, dir];
}

/**
 * Author project.faf from a repository URL. With `outputDir` it is written to
 * `<outputDir>/project.faf` (a new file only); without it nothing is written
 * and the content is returned.
 */
export async function gitContextCommand(url: string, outputDir?: string): Promise<GitContextResult> {
  const { normalizeGitUrl, authorFafFromRepo, serializeFaf, scoreFafYaml, scoreText, safeWriteFile } = await fafCli;

  let repoUrl: string;
  try {
    repoUrl = normalizeGitUrl(url);
  } catch (error) {
    return { success: false, message: `${oneLine(error)} Expected owner/repo or https://github.com/owner/repo.` };
  }

  // A new file only. One already there is the user's: refused before anything
  // is fetched, and left exactly as it is.
  const target = outputDir ? path.join(outputDir, 'project.faf') : undefined;
  if (outputDir && target) {
    const existing = [target, path.join(outputDir, '.faf')].find(present);
    if (existing) {
      return {
        success: false,
        message: `${existing} already exists; faf_git writes only a new project.faf, so it wrote nothing. faf_auto fills the file you have from the repo (existing values kept).`,
      };
    }
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-git-'));
  const cloneDir = path.join(tmp, 'repo');
  try {
    try {
      await execFileAsync('git', cloneArgs(repoUrl, cloneDir), {
        env: { ...process.env, GIT_TERMINAL_PROMPT: '0' },
        timeout: CLONE_TIMEOUT_MS,
        maxBuffer: 1024 * 1024,
        windowsHide: true,
      });
    } catch (error) {
      const err = error as NodeJS.ErrnoException & { stderr?: string; killed?: boolean };
      if (err.code === 'ENOENT') {
        return { success: false, message: `faf_git fetches the repo with git, and no git was found on PATH. Clone ${repoUrl} yourself and run faf_auto in it.` };
      }
      const reason = err.killed
        ? `the clone took longer than ${CLONE_TIMEOUT_MS / 1000}s`
        : (err.stderr ?? '').trim().split('\n').slice(-2).join(' ').trim() || oneLine(error);
      return { success: false, message: `Could not clone ${repoUrl}: ${reason}` };
    }

    // faf-cli's `faf git` pipeline on the clone: the same .faf `faf git` writes.
    const data = authorFafFromRepo(cloneDir, { repoUrl });
    const fafContent = serializeFaf(data);
    const score = scoreFafYaml(fafContent);

    let filePath: string | undefined;
    if (outputDir && target) {
      try {
        // faf-cli's safe write: inside the folder, atomic, and refused if a
        // file appeared there meanwhile.
        safeWriteFile(target, fafContent, { root: outputDir, expect: null });
        filePath = target;
      } catch (error) {
        return { success: false, message: notWritten(target, error, false) };
      }
    }

    return {
      success: true,
      message: filePath
        ? `Wrote ${filePath} for ${repoUrl} — faf-cli scores it ${scoreText(score)} (${score.tier.name})`
        : `Authored project.faf for ${repoUrl} (preview, nothing written) — faf-cli scores it ${scoreText(score)} (${score.tier.name})`,
      data: { repoUrl, score: score.score, tier: score.tier.name, fafContent, filePath },
    };
  } finally {
    // The temp folder is this call's own (mkdtemp); nothing else is in it.
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}
