/**
 * The version of the faf-cli claude-faf-mcp runs on, for faf_debug, faf_about
 * and faf_doctor. Node's resolver finds the module the bridge imports
 * (require.resolve('faf-cli') → faf-cli/dist/index.js) and the package.json
 * beside it is read. Nothing is loaded or run; there is no directory walk.
 */
import * as fs from 'fs';
import * as path from 'path';

/** faf-cli's version, or null when its package.json cannot be read. */
export function bundledFafCliVersion(): string | null {
  try {
    const entry = require.resolve('faf-cli');
    const pkgPath = path.join(path.dirname(path.dirname(entry)), 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8')) as { name?: unknown; version?: unknown };
    return pkg.name === 'faf-cli' && typeof pkg.version === 'string' ? pkg.version : null;
  } catch {
    return null;
  }
}
