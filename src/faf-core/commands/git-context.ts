/**
 * Git Context Command - v4.5.0 Interop Edition
 *
 * Author project.faf from a GitHub repository URL.
 * Fetches metadata, README, package.json — no cloning needed.
 * Bundled command — no CLI dependency required.
 */

import path from 'path';
import * as fs from 'fs';
import { fafCli } from '../../utils/faf-cli-bridge.js';
import { notWritten } from '../../utils/write-outcome.js';
import {
  parseGitHubUrl,
  fetchGitHubMetadata,
  fetchGitHubFileTree,
} from '../parsers/github-extractor.js';
import {
  generateEnhancedFaf,
  getScoreTier,
} from '../parsers/faf-git-generator.js';

export interface GitContextResult {
  success: boolean;
  message: string;
  data?: {
    owner: string;
    repo: string;
    score: number;
    tier: string;
    fafContent: string;
    filePath?: string;
  };
}

/**
 * Author project.faf from a GitHub URL
 */
export async function gitContextCommand(
  url: string,
  outputPath?: string
): Promise<GitContextResult> {
  // Parse the URL
  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    return {
      success: false,
      message: `Invalid GitHub URL: ${url}. Expected format: https://github.com/owner/repo or owner/repo`,
    };
  }

  const { owner, repo } = parsed;

  // faf_git writes only a new project.faf. One already there is the user's:
  // refused before anything is fetched, and left exactly as it is.
  const target = outputPath ? path.join(outputPath, 'project.faf') : undefined;
  if (target && present(target)) {
    return {
      success: false,
      message: `project.faf already exists at ${target}; faf_git writes only a new file, so it wrote nothing. faf_auto fills its empty slots from the repo (existing values kept).`,
    };
  }

  try {
    // Fetch metadata with file checks
    const metadata = await fetchGitHubMetadata(owner, repo, true);

    // Fetch file tree
    const files = await fetchGitHubFileTree(owner, repo, metadata.defaultBranch);

    // Generate .faf content
    const { content, score } = await generateEnhancedFaf(metadata, files);
    const tier = getScoreTier(score);

    // Write to file if output path provided — faf-cli's safe write: inside the
    // folder, atomic, and refused if a file appeared there meanwhile.
    let filePath: string | undefined;
    if (outputPath && target) {
      const { safeWriteFile } = await fafCli;
      try {
        safeWriteFile(target, content, { root: outputPath, expect: null });
      } catch (error) {
        return { success: false, message: notWritten(target, error, false) };
      }
      filePath = target;
    }

    return {
      success: true,
      message: filePath
        ? `Wrote project.faf for ${owner}/${repo} — Score: ${score}% (${tier})`
        : `Authored project.faf for ${owner}/${repo} (preview, not written) — Score: ${score}% (${tier})`,
      data: {
        owner,
        repo,
        score,
        tier,
        fafContent: content,
        filePath,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Failed to fetch GitHub metadata: ${errorMessage}`,
    };
  }
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
