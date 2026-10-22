/**
 * #142: `--version` and `--help` print and exit 0; they never start the MCP server.
 * stdin is closed, so if the server started instead it would exit with no output.
 */
import { describe, test, expect } from 'bun:test';
import { spawnSync } from 'child_process';
import * as path from 'path';
import { VERSION } from '../src/version.js';

const ENTRY = path.join(import.meta.dir, '..', 'src', 'index.ts');
const run = (...args: string[]) =>
  spawnSync(process.execPath, [ENTRY, ...args], { encoding: 'utf-8', input: '', timeout: 20_000 });

describe('#142 CLI flags', () => {
  for (const flag of ['--version', '-v']) {
    test(`${flag} prints the version and exits 0`, () => {
      const r = run(flag);
      expect(r.status).toBe(0);
      expect(r.stdout.trim()).toBe(`claude-faf-mcp ${VERSION}`);
    });
  }
  for (const flag of ['--help', '-h']) {
    test(`${flag} prints usage and exits 0`, () => {
      const r = run(flag);
      expect(r.status).toBe(0);
      expect(r.stdout).toContain('Usage:');
      expect(r.stdout).toContain('--session-refresh');
      expect(r.stdout).toContain(`claude-faf-mcp ${VERSION}`);
    });
  }
});
