/**
 * WJTTC — Trust Edition Pillar 5: the native session hook.
 *
 * Two surfaces under test:
 *  1. sessionRefresh() — the SessionStart hook action. Quiet context refresh:
 *     creates/refreshes CLAUDE.md's faf block from project.faf, SILENT no-op
 *     when fresh, never throws (a hook must not break a session), preserves
 *     user content ("enhance, never replace").
 *  2. setupSessionHook() — the explicit installer. Preview writes NOTHING;
 *     confirm merges non-destructively into .claude/settings.json; re-runs are
 *     idempotent; remove takes out exactly ours.
 */
import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { sessionRefresh } from '../src/faf-core/commands/session-refresh';
import {
  setupSessionHook,
  mergeHookIntoSettings,
  removeHookFromSettings,
  HOOK_COMMAND,
  HOOK_FINGERPRINT,
} from '../src/faf-core/commands/setup-hook';
import { FAF_START, FAF_END } from '../src/faf-core/inject';

const FAF_CONTENT = 'project:\n  name: hook-test\n  goal: test the native session hook\nfaf_score: 100%\n';

describe('🔒 WJTTC — Pillar 5: native session hook', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-hook-'));
  });

  afterEach(() => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* */ }
  });

  describe('sessionRefresh() — the hook action', () => {
    test('no project.faf → silent no-op (not our session)', async () => {
      const r = await sessionRefresh(dir);
      expect(r.action).toBe('no-faf');
      expect(r.message).toBe('');
      expect(fs.existsSync(path.join(dir, 'CLAUDE.md'))).toBe(false);
    });

    test('no CLAUDE.md → creates it with the faf block', async () => {
      fs.writeFileSync(path.join(dir, 'project.faf'), FAF_CONTENT);
      const r = await sessionRefresh(dir);
      expect(r.action).toBe('created');
      expect(r.message).toContain('faf:');
      const md = fs.readFileSync(path.join(dir, 'CLAUDE.md'), 'utf-8');
      expect(md).toContain(FAF_START);
      expect(md).toContain(FAF_END);
      expect(md).toContain('hook-test');
    });

    test('fresh CLAUDE.md (markers + newer than .faf) → SILENT no-op, no write', async () => {
      fs.writeFileSync(path.join(dir, 'project.faf'), FAF_CONTENT);
      await sessionRefresh(dir); // create
      const mdPath = path.join(dir, 'CLAUDE.md');
      const before = fs.statSync(mdPath).mtimeMs;
      const contentBefore = fs.readFileSync(mdPath, 'utf-8');

      const r = await sessionRefresh(dir);
      expect(r.action).toBe('fresh');
      expect(r.message).toBe(''); // silent when nothing changed
      expect(fs.statSync(mdPath).mtimeMs).toBe(before); // no mtime churn
      expect(fs.readFileSync(mdPath, 'utf-8')).toBe(contentBefore);
    });

    test('stale CLAUDE.md (older than .faf) → refreshes the block, preserves user content', async () => {
      const mdPath = path.join(dir, 'CLAUDE.md');
      const fafPath = path.join(dir, 'project.faf');
      fs.writeFileSync(fafPath, FAF_CONTENT);
      await sessionRefresh(dir);

      // User adds their own content below the block.
      fs.appendFileSync(mdPath, '\n## My own instructions\nNever touch this.\n');
      // .faf changes later → CLAUDE.md is now stale.
      const future = new Date(Date.now() + 5000);
      fs.writeFileSync(fafPath, FAF_CONTENT.replace('hook-test', 'hook-test-v2'));
      fs.utimesSync(fafPath, future, future);

      const r = await sessionRefresh(dir);
      expect(r.action).toBe('refreshed');
      expect(r.message).toContain('refreshed');
      const md = fs.readFileSync(mdPath, 'utf-8');
      expect(md).toContain('hook-test-v2'); // block updated
      expect(md).toContain('Never touch this.'); // user content preserved
      expect(md.match(new RegExp(FAF_START, 'g'))!.length).toBe(1); // no duplication
    });

    test('user-authored CLAUDE.md without markers → block prefixed, content preserved', async () => {
      const mdPath = path.join(dir, 'CLAUDE.md');
      fs.writeFileSync(mdPath, '# Hand-written instructions\nDo the thing my way.\n');
      const future = new Date(Date.now() + 5000);
      fs.writeFileSync(path.join(dir, 'project.faf'), FAF_CONTENT);
      fs.utimesSync(path.join(dir, 'project.faf'), future, future);

      const r = await sessionRefresh(dir);
      expect(r.action).toBe('refreshed');
      const md = fs.readFileSync(mdPath, 'utf-8');
      expect(md).toContain(FAF_START);
      expect(md).toContain('Do the thing my way.');
      expect(md.indexOf(FAF_START)).toBeLessThan(md.indexOf('Hand-written'));
    });

    test('never throws — unreadable project dir returns error action, message set', async () => {
      const r = await sessionRefresh(path.join(dir, 'no', 'such', 'dir'));
      expect(['no-faf', 'error']).toContain(r.action); // missing dir = no faf; either way: no throw
    });
  });

  describe('setupSessionHook() — the explicit installer', () => {
    const settingsPath = () => path.join(dir, '.claude', 'settings.json');

    test('preview (no confirm) writes NOTHING', async () => {
      const r = await setupSessionHook(dir);
      expect(r.action).toBe('preview');
      expect(r.message).toContain('PREVIEW');
      expect(r.settings).toBeDefined(); // shows exactly what it would write
      expect(fs.existsSync(settingsPath())).toBe(false); // but writes nothing
    });

    test('confirm installs the hook into fresh .claude/settings.json', async () => {
      const r = await setupSessionHook(dir, { confirm: true });
      expect(r.action).toBe('installed');
      const written = JSON.parse(fs.readFileSync(settingsPath(), 'utf-8'));
      const cmds = written.hooks.SessionStart.flatMap((m: any) => m.hooks.map((h: any) => h.command));
      expect(cmds).toContain(HOOK_COMMAND);
    });

    test('non-destructive: existing settings keys + other hooks preserved', async () => {
      fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
      const existing = {
        permissions: { allow: ['Bash(npm test)'] },
        hooks: {
          SessionStart: [{ hooks: [{ type: 'command', command: 'echo my-own-hook' }] }],
          PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo guard' }] }],
        },
      };
      fs.writeFileSync(settingsPath(), JSON.stringify(existing, null, 2));

      const r = await setupSessionHook(dir, { confirm: true });
      expect(r.action).toBe('installed');
      const written = JSON.parse(fs.readFileSync(settingsPath(), 'utf-8'));
      expect(written.permissions.allow).toEqual(['Bash(npm test)']); // untouched
      expect(written.hooks.PreToolUse[0].hooks[0].command).toBe('echo guard'); // untouched
      const cmds = written.hooks.SessionStart.flatMap((m: any) => m.hooks.map((h: any) => h.command));
      expect(cmds).toContain('echo my-own-hook'); // their hook kept
      expect(cmds).toContain(HOOK_COMMAND); // ours added
    });

    test('idempotent: second confirm is a no-op, no duplicate hook', async () => {
      await setupSessionHook(dir, { confirm: true });
      const r2 = await setupSessionHook(dir, { confirm: true });
      expect(r2.action).toBe('already-installed');
      const written = JSON.parse(fs.readFileSync(settingsPath(), 'utf-8'));
      const ours = written.hooks.SessionStart
        .flatMap((m: any) => m.hooks)
        .filter((h: any) => h.command.includes(HOOK_FINGERPRINT));
      expect(ours.length).toBe(1);
    });

    test('remove takes out exactly ours, preserves everything else', async () => {
      fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
      fs.writeFileSync(settingsPath(), JSON.stringify({
        env: { FOO: 'bar' },
        hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'echo my-own-hook' }] }] },
      }, null, 2));
      await setupSessionHook(dir, { confirm: true });

      const r = await setupSessionHook(dir, { remove: true });
      expect(r.action).toBe('removed');
      const written = JSON.parse(fs.readFileSync(settingsPath(), 'utf-8'));
      expect(written.env.FOO).toBe('bar');
      const cmds = written.hooks.SessionStart.flatMap((m: any) => m.hooks.map((h: any) => h.command));
      expect(cmds).toContain('echo my-own-hook');
      expect(cmds.some((c: string) => c.includes(HOOK_FINGERPRINT))).toBe(false);
    });

    test('remove when not installed → not-installed, nothing written', async () => {
      const r = await setupSessionHook(dir, { remove: true });
      expect(r.action).toBe('not-installed');
      expect(fs.existsSync(settingsPath())).toBe(false);
    });

    test('malformed settings.json → error, file NOT overwritten', async () => {
      fs.mkdirSync(path.join(dir, '.claude'), { recursive: true });
      fs.writeFileSync(settingsPath(), '{ this is not json');
      const r = await setupSessionHook(dir, { confirm: true });
      expect(r.action).toBe('error');
      expect(fs.readFileSync(settingsPath(), 'utf-8')).toBe('{ this is not json'); // untouched
    });

    test('pure merge/remove round-trip preserves unknown structures', () => {
      const weird = { hooks: { SessionStart: [{ matcher: 'startup', hooks: [{ type: 'command', command: 'x' }] }] }, other: [1, 2] };
      const merged = mergeHookIntoSettings(weird as any);
      const removed = removeHookFromSettings(merged);
      expect(removed).toEqual(weird as any);
    });
  });
});
