/**
 * 🏁 WJTTC — working-directory resolution (the cwd path-check)
 *
 * Regression for the "FORCE ~/Projects as universal default" bug (shared across
 * faf-mcp / grok-faf-mcp / claude-faf-mcp): the engine adapter resolved the
 * working directory to ~/Projects ABOVE the caller's cwd, so every no-path tool
 * call (faf_score, …) operated on ~/Projects instead of the project the user
 * had open. claude-faf-mcp is actively affected (getProjectPath → getWorkingDirectory).
 *
 * The fix: the caller's actual cwd wins. Prefer a real FAF project (cwd has a
 * project.faf — the path-check), else the cwd itself when usable + non-root;
 * ~/Projects is a fallback ONLY when there's no usable workspace (cwd is root) —
 * which preserves the Claude-Desktop-launched-at-root landing.
 */
import { test, expect, describe, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FafEngineAdapter } from '../src/handlers/engine-adapter';

let tmp: string;
let origCwd: string;

beforeEach(() => {
  origCwd = process.cwd();
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cwd-resolve-'));
});
afterEach(() => {
  process.chdir(origCwd);
  try { fs.rmSync(tmp, { recursive: true, force: true }); } catch { /* best-effort */ }
});

describe('AERO — cwd path-check wins over the ~/Projects convention', () => {
  test('cwd containing a project.faf is the working directory (not ~/Projects)', () => {
    fs.writeFileSync(path.join(tmp, 'project.faf'), 'faf_version: "3.0"\nproject:\n  name: t\n');
    process.chdir(tmp);
    const adapter = new FafEngineAdapter();
    // fs.realpath to dodge /var↔/private symlink noise on macOS tmp.
    expect(fs.realpathSync(adapter.getWorkingDirectory())).toBe(fs.realpathSync(tmp));
  });

  test('a usable non-root cwd WITHOUT a .faf is still preferred over ~/Projects', () => {
    process.chdir(tmp);
    const adapter = new FafEngineAdapter();
    expect(fs.realpathSync(adapter.getWorkingDirectory())).toBe(fs.realpathSync(tmp));
  });

  test('explicit FAF_WORKING_DIR still overrides everything (priority 1 intact)', () => {
    const override = fs.mkdtempSync(path.join(os.tmpdir(), 'cwd-override-'));
    process.chdir(tmp);
    const prev = process.env.FAF_WORKING_DIR;
    process.env.FAF_WORKING_DIR = override;
    try {
      const adapter = new FafEngineAdapter();
      expect(fs.realpathSync(adapter.getWorkingDirectory())).toBe(fs.realpathSync(override));
    } finally {
      if (prev === undefined) delete process.env.FAF_WORKING_DIR;
      else process.env.FAF_WORKING_DIR = prev;
      fs.rmSync(override, { recursive: true, force: true });
    }
  });
});
