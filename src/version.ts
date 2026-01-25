/**
 * Version information - Single source of truth
 * Imports from package.json to avoid hardcoding
 */
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

let cachedVersion: string = '';

/**
 * Get the current version from package.json
 * Caches the result for performance
 */
export function getVersion(): string {
  if (cachedVersion) {
    return cachedVersion;
  }

  // Try multiple possible locations for package.json
  // - From dist/src (production): ../../package.json
  // - From src (tests): ../package.json
  // - From cwd (fallback): ./package.json
  const possiblePaths = [
    join(__dirname, '..', '..', 'package.json'),
    join(__dirname, '..', 'package.json'),
    join(process.cwd(), 'package.json'),
  ];

  for (const packageJsonPath of possiblePaths) {
    try {
      if (existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        if (packageJson.version) {
          cachedVersion = packageJson.version;
          return cachedVersion;
        }
      }
    } catch {
      // Try next path
    }
  }

  // Fallback if all paths fail
  return 'unknown';
}

/**
 * Version constant for convenience
 */
export const VERSION = getVersion();
