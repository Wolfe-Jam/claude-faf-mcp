/**
 * Version information - Single source of truth
 * Imports from package.json to avoid hardcoding
 */
import { readFileSync } from 'fs';
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

  try {
    // __dirname in compiled code is dist/src, so we need to go up two levels to reach package.json
    const packageJsonPath = join(__dirname, '..', '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    cachedVersion = packageJson.version;
    return cachedVersion;
  } catch (error) {
    // Fallback if package.json read fails (should never happen in production)
    console.error('Failed to read version from package.json:', error);
    return 'unknown';
  }
}

/**
 * Version constant for convenience
 */
export const VERSION = getVersion();
