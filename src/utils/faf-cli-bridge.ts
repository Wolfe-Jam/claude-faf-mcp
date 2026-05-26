/**
 * faf-cli bridge — single re-export point for faf-cli's typed public API.
 *
 * Why this file exists (three coupled problems):
 *   1. faf-cli 6.7.1's `exports` map sets a `bun` condition pointing at a
 *      non-shipped `src/index.ts`. Bun's resolver always picks the `bun`
 *      condition first (verified: `--conditions=node` ADDS to the set,
 *      doesn't replace), so `from 'faf-cli'` blows up at module-load in
 *      bun-test. Subpath imports (`faf-cli/dist/index.js`) are ALSO blocked
 *      because faf-cli's exports map only exports `.`.
 *   2. Static relative paths don't survive tsc compilation: a literal
 *      `../../node_modules/...` written in `src/utils/` resolves to the
 *      wrong place when the compiled file lands at `dist/src/utils/` (one
 *      level deeper, so the relative escape comes up short).
 *   3. faf-cli's dist is ESM (`"type": "module"`). Node 18 rejects sync
 *      `require()` of ESM (`ERR_REQUIRE_ESM`); Node 20 allows it. faf-mcp
 *      supports Node 18+ per `engines`, so we must use dynamic `import()`.
 *
 * How this bridge works:
 *   At runtime, walk upward from `__dirname` (which is `src/utils/` when
 *   bun loads TS source and `dist/src/utils/` when Node loads compiled
 *   CJS) until we find `node_modules/faf-cli/dist/index.js`. Then load it
 *   via dynamic `import()` of an absolute `file://` URL — which:
 *     - bypasses the exports map (no package specifier, no condition picked)
 *     - handles ESM-from-CJS correctly on Node 18+ AND in bun
 *     - resolves the same module regardless of source-vs-compiled __dirname
 *
 *   The type info comes via `import type` — purely compile-time, esbuild
 *   strips it at load time, so the `bun` condition never fires for types.
 *
 *   Export shape: `fafCli` is a Promise<typeof FafCli>. Consumers
 *   destructure with `const { ... } = await fafCli` inside async handlers.
 *   Module evaluation is one-shot — the Promise is created at module load
 *   and cached forever.
 *
 *   This is intentionally a TEMPORARY workaround tied to faf-cli's bun
 *   exports bug. Once faf-cli ships `src/` OR drops the `bun` condition,
 *   this whole file becomes `export * from 'faf-cli'` and consumers go
 *   back to bare specifiers. Tracked alongside the AERO test's matching
 *   workaround comment in tests/wjttc-bun.test.ts.
 *
 *   Doctrine: silent-drift = fail = forbidden. The bridge is loud and
 *   localized — one file, fully commented — not scattered ts-ignores or
 *   silent type-casts.
 */

import * as path from 'path';
import * as fs from 'fs';
import { pathToFileURL } from 'url';
import type * as FafCli from 'faf-cli';

function findFafCliDist(startDir: string): string {
  let dir = startDir;
  while (dir !== path.dirname(dir)) {
    const candidate = path.join(dir, 'node_modules', 'faf-cli', 'dist', 'index.js');
    if (fs.existsSync(candidate)) return candidate;
    dir = path.dirname(dir);
  }
  throw new Error(
    `faf-cli/dist/index.js not found in any ancestor node_modules of ${startDir}. ` +
      `faf-mcp requires faf-cli as a direct dependency — check installation.`,
  );
}

// Cached promise — module evaluation happens once.
export const fafCli: Promise<typeof FafCli> = (async () => {
  const distPath = findFafCliDist(__dirname);
  return (await import(pathToFileURL(distPath).href)) as typeof FafCli;
})();
