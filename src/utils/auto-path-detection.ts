/**
 * 🎯 Auto-Path Detection from Dropped Files
 * Solves the "drop and done" workflow problem
 *
 * When files land in /mnt/user-data/uploads/, extract identifiers
 * and perform case-insensitive filesystem search to find real project path.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { execSync } from 'child_process';

export interface PathDetectionResult {
  found: boolean;
  path?: string;
  identifier?: string;
  error?: string;
}

/**
 * Extract project identifier from dropped file
 */
export function extractIdentifier(filePath: string): string | null {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const basename = path.basename(filePath);

    // package.json - use package name
    if (basename === 'package.json') {
      try {
        const pkg = JSON.parse(content);
        if (pkg.name) {
          return pkg.name; // "@blackhole/universe" or "hextra-api"
        }
      } catch {
        // Invalid JSON, continue to next strategy
      }
    }

    // README.md - extract from first heading
    if (basename === 'README.md') {
      const match = content.match(/^#\s+(.+)$/m);
      if (match) {
        // "💫 Black Hole Universe" → "black-hole-universe"
        return match[1]
          .replace(/[^\w\s-]/g, '') // Remove emojis/special chars
          .trim()
          .toLowerCase()
          .replace(/\s+/g, '-');
      }
    }

    // project.faf or .faf - extract name field
    if (basename === 'project.faf' || basename === '.faf') {
      const match = content.match(/^\s*name:\s*"?([^"\n]+)"?/m);
      if (match) {
        return match[1].trim();
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Find project path on user's filesystem (case-insensitive)
 */
export function findProjectPath(identifier: string): string | null {
  try {
    const username = os.userInfo().username;

    // Search roots in order of preference
    const searchRoots = [
      `/Users/${username}`,      // macOS
      `/home/${username}`,        // Linux
      `C:\\Users\\${username}`    // Windows
    ].filter(p => fs.existsSync(p));

    if (searchRoots.length === 0) {
      return null;
    }

    // Normalize identifier for search
    // Remove scope: @blackhole/universe → universe
    let searchTerm = identifier.replace(/^@[\w-]+\//, '').toLowerCase();

    // Try exact match first, then partial match
    for (const exact of [true, false]) {
      for (const root of searchRoots) {
        const pattern = exact ? searchTerm : `*${searchTerm}*`;

        // Case-insensitive find with exclusions
        const cmd = process.platform === 'win32'
          ? `dir /s /b /a:d "${root}\\${pattern}" 2>nul`
          : `find "${root}" -maxdepth 5 -type d -iname "${pattern}" \
             ! -path "*/node_modules/*" \
             ! -path "*/.git/*" \
             ! -path "*/dist/*" \
             ! -path "*/build/*" \
             ! -path "*/.next/*" \
             ! -path "*/coverage/*" \
             ! -path "*/.cache/*" \
             ! -path "*/venv/*" \
             ! -path "*/.venv/*" \
             2>/dev/null`;

        try {
          const result = execSync(cmd, {
            encoding: 'utf8',
            timeout: 10000,
            maxBuffer: 1024 * 1024 // 1MB buffer
          });

          const matches = result.split('\n').filter(Boolean);

          if (matches.length > 0) {
            // Rank matches: exact basename > partial, shorter > longer
            const ranked = matches.sort((a, b) => {
              const aBase = path.basename(a).toLowerCase();
              const bBase = path.basename(b).toLowerCase();
              const aExact = aBase === searchTerm;
              const bExact = bBase === searchTerm;

              if (aExact && !bExact) return -1;
              if (!aExact && bExact) return 1;
              return a.length - b.length; // Prefer shorter paths
            });

            return ranked[0];
          }
        } catch (error) {
          // Timeout or command failed, try next root
          continue;
        }
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * Auto-detect real project path from container upload path
 * Main entry point for all FAF commands
 */
export function autoDetectPath(inputPath: string): PathDetectionResult {
  // Check if this is a container upload path
  if (!inputPath.startsWith('/mnt/user-data/uploads/')) {
    return { found: false, path: inputPath };
  }

  // Extract identifier from dropped file
  const identifier = extractIdentifier(inputPath);

  if (!identifier) {
    return {
      found: false,
      error: 'Could not extract project identifier from dropped file. Please provide full path manually.'
    };
  }

  // Search filesystem for matching project
  const realPath = findProjectPath(identifier);

  if (!realPath) {
    return {
      found: false,
      identifier,
      error: `Project "${identifier}" not found on filesystem. Please provide full path manually.`
    };
  }

  // Success!
  return {
    found: true,
    path: realPath,
    identifier
  };
}
