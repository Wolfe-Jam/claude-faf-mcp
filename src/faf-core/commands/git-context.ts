/**
 * Git Context Command - v4.5.0 Interop Edition
 *
 * Generate project.faf from a GitHub repository URL.
 * Fetches metadata, README, package.json — no cloning needed.
 * Bundled command — no CLI dependency required.
 */

import path from 'path';
import { promises as fs } from 'fs';
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
 * Generate project.faf from a GitHub URL
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

  try {
    // Fetch metadata with file checks
    const metadata = await fetchGitHubMetadata(owner, repo, true);

    // Fetch file tree
    const files = await fetchGitHubFileTree(owner, repo, metadata.defaultBranch);

    // Generate .faf content
    const { content, score } = await generateEnhancedFaf(metadata, files);
    const tier = getScoreTier(score);

    // Write to file if output path provided
    let filePath: string | undefined;
    if (outputPath) {
      filePath = path.join(outputPath, 'project.faf');
      await fs.writeFile(filePath, content, 'utf-8');
    }

    return {
      success: true,
      message: `Generated project.faf for ${owner}/${repo} — Score: ${score}% (${tier})`,
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
