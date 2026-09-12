/**
 * faf_setup — the explicit installer of the SessionStart hook.
 *
 * It writes the PROJECT settings file, `<project>/.claude/settings.json`, and
 * only with the caller's confirm: true. Without it (install or remove) it
 * shows the exact settings it would write and writes nothing. It never writes
 * the user settings: a project folder that is the home folder (or the
 * filesystem root) is refused, because its `.claude/settings.json` is the user
 * settings, which apply to every project. Every message names the scope.
 *
 * settings.json is the user's file; faf owns one entry in it: the hook whose
 * command is exactly HOOK_COMMAND. Install appends that entry; remove takes
 * out only an entry whose command is exactly HOOK_COMMAND — a user's own hook
 * that merely mentions `claude-faf-mcp --session-refresh` stays. A `hooks`
 * value that is not an object, or a `SessionStart` that is not a list, is
 * refused rather than replaced.
 *
 * JSON has no comment markers for a managed block, and faf-cli exports no
 * text-preserving JSON editor, so faf rewrites settings.json only when the
 * file is laid out exactly as faf writes it — JSON.stringify(settings, null, 2),
 * LF or CRLF, with or without a final line break. Then the new text differs
 * from the old only by faf's entry. A file in any other layout is refused, and
 * the message gives the entry to add by hand. The write itself is faf-cli's
 * safe write: inside the project, atomic, and refused if the file changed on
 * disk after faf read it.
 */
import * as path from 'path';
import * as fs from 'fs';
import { fafCli } from '../../utils/faf-cli-bridge.js';

/** What a hook command of ours contains (for display; never used to remove). */
export const HOOK_FINGERPRINT = 'claude-faf-mcp --session-refresh';

/** The exact command faf's SessionStart hook runs. npx resolves a local or global install. */
export const HOOK_COMMAND = `npx -y ${HOOK_FINGERPRINT}`;

/** The one settings scope faf_setup writes, as every message names it. */
export const SETTINGS_SCOPE = 'project settings';

/** The exact entry faf appends to settings.hooks.SessionStart. */
export function buildHookEntry(): { hooks: Array<{ type: 'command'; command: string }> } {
  return { hooks: [{ type: 'command', command: HOOK_COMMAND }] };
}

export interface SetupHookResult {
  action: 'preview' | 'installed' | 'already-installed' | 'removed' | 'not-installed' | 'error';
  settingsPath: string;
  /** The full settings object as it would be / has been written (preview + writes). */
  settings?: Record<string, unknown>;
  message: string;
}

type Json = Record<string, unknown>;

function isObject(v: unknown): v is Json {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** faf's own hook item: a command hook whose command is exactly HOOK_COMMAND. */
function isOurItem(h: unknown): boolean {
  return isObject(h) && h.command === HOOK_COMMAND;
}

/** Why faf will not edit these settings' hooks, or null when it may. */
function shapeProblem(settings: Json): string | null {
  if (!('hooks' in settings)) {return null;}
  const hooks = settings.hooks;
  if (!isObject(hooks)) {return '`hooks` is not an object';}
  if (!('SessionStart' in hooks)) {return null;}
  if (!Array.isArray(hooks.SessionStart)) {return '`hooks.SessionStart` is not a list';}
  return null;
}

function hasOurHook(settings: Json): boolean {
  const sessionStart = isObject(settings.hooks) ? settings.hooks.SessionStart : undefined;
  if (!Array.isArray(sessionStart)) {return false;}
  return sessionStart.some((m) => isObject(m) && Array.isArray(m.hooks) && m.hooks.some(isOurItem));
}

/** Pure merge: existing settings + faf's entry appended (the input is not changed). */
export function mergeHookIntoSettings(existing: Json): Json {
  const hooks: Json = isObject(existing.hooks) ? { ...existing.hooks } : {};
  const sessionStart: unknown[] = Array.isArray(hooks.SessionStart) ? [...(hooks.SessionStart as unknown[])] : [];
  sessionStart.push(buildHookEntry());
  hooks.SessionStart = sessionStart;
  return { ...existing, hooks };
}

/**
 * Pure removal: takes out every hook item whose command is exactly
 * HOOK_COMMAND, and nothing else. A group left with no hooks is dropped only
 * when it holds nothing but `hooks` (the entry faf wrote); SessionStart and
 * hooks are dropped only when that removal emptied them.
 */
export function removeHookFromSettings(existing: Json): Json {
  if (!isObject(existing.hooks) || !Array.isArray(existing.hooks.SessionStart)) {return existing;}
  const hooks: Json = { ...existing.hooks };
  const kept: unknown[] = [];
  for (const m of hooks.SessionStart as unknown[]) {
    if (!isObject(m) || !Array.isArray(m.hooks) || !m.hooks.some(isOurItem)) {
      kept.push(m);
      continue;
    }
    const remaining = m.hooks.filter((h) => !isOurItem(h));
    const onlyHooks = Object.keys(m).every((k) => k === 'hooks');
    if (remaining.length === 0 && onlyHooks) {continue;}
    kept.push({ ...m, hooks: remaining });
  }
  const next: Json = { ...existing };
  if (kept.length > 0) {
    hooks.SessionStart = kept;
  } else {
    delete hooks.SessionStart;
  }
  if (Object.keys(hooks).length > 0) {
    next.hooks = hooks;
  } else {
    delete next.hooks;
  }
  return next;
}

/** The text faf writes for `settings`, laid out like `raw` — or null when raw
 *  is not in faf's layout (so faf cannot prove the rewrite keeps every other byte). */
function render(settings: Json, raw: string | null): string | null {
  if (raw === null) {return `${JSON.stringify(settings, null, 2)}\n`;}
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return null; }
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lay = (v: unknown): string => JSON.stringify(v, null, 2).split('\n').join(eol);
  const canon = lay(parsed);
  const tail = raw === canon ? '' : raw === canon + eol ? eol : null;
  return tail === null ? null : lay(settings) + tail;
}

/** The hand-edit instructions when faf will not rewrite the file. */
function byHand(settingsPath: string, why: string, action: 'install' | 'remove'): string {
  const entry = JSON.stringify(buildHookEntry(), null, 2);
  return action === 'install'
    ? `${settingsPath} (${SETTINGS_SCOPE}) was not written: ${why}. faf changes only its own hook entry, so the file is left exactly as it is. ` +
      `To install by hand, add this entry to the "hooks" → "SessionStart" list:\n${entry}`
    : `${settingsPath} (${SETTINGS_SCOPE}) was not written: ${why}. faf changes only its own hook entry, so the file is left exactly as it is. ` +
      `To remove by hand, delete the SessionStart hook whose command is exactly "${HOOK_COMMAND}".`;
}

/**
 * The faf_setup flow.
 *  - no flags            → PREVIEW of the install; writes nothing
 *  - confirm: true       → adds faf's entry to the project settings
 *  - remove: true        → PREVIEW of the removal; writes nothing
 *  - remove + confirm    → takes out faf's entry and nothing else
 */
export async function setupSessionHook(
  projectDir: string,
  opts: { confirm?: boolean; remove?: boolean } = {},
): Promise<SetupHookResult> {
  const settingsPath = path.join(projectDir, '.claude', 'settings.json');
  const error = (message: string): SetupHookResult => ({ action: 'error', settingsPath, message });
  try {
    const { isNonProjectRoot, resolveInside, readUtf8, safeWriteFile, makeDirInside } = await fafCli;

    if (isNonProjectRoot(projectDir)) {
      return error(
        `${projectDir} is your home folder (or the filesystem root), not a project: its .claude/settings.json is your user settings, ` +
        `which apply to every project. faf_setup writes only ${SETTINGS_SCOPE}. Pass the project path.`,
      );
    }

    // Read the settings through faf-cli's resolver: a .claude folder or a
    // settings.json that is a link out of the project is refused, not followed.
    let raw: string | null = null;
    if (fs.existsSync(path.join(projectDir, '.claude'))) {
      const real = resolveInside(projectDir, settingsPath);
      try {
        raw = readUtf8(real);
      } catch (e) {
        if ((e as NodeJS.ErrnoException)?.code !== 'ENOENT') {throw e;}
      }
    }
    let existing: Json = {};
    if (raw !== null) {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (e) {
        return error(`${settingsPath} (${SETTINGS_SCOPE}) is not valid JSON (${e instanceof Error ? e.message : String(e)}). Nothing was written; fix it by hand first.`);
      }
      if (!isObject(parsed)) {
        return error(`${settingsPath} (${SETTINGS_SCOPE}) is not a JSON object. Nothing was written.`);
      }
      existing = parsed;
    }

    const installed = hasOurHook(existing);
    const action = opts.remove ? 'remove' : 'install';

    if (action === 'remove' && !installed) {
      return { action: 'not-installed', settingsPath, message: `No faf SessionStart hook in the ${SETTINGS_SCOPE} (${settingsPath}); nothing to remove.` };
    }
    if (action === 'install' && installed) {
      return { action: 'already-installed', settingsPath, settings: existing, message: `The faf SessionStart hook is already in the ${SETTINGS_SCOPE} (${settingsPath}); nothing to do.` };
    }

    const problem = shapeProblem(existing);
    if (problem) {return error(byHand(settingsPath, problem, action));}

    const next = action === 'remove' ? removeHookFromSettings(existing) : mergeHookIntoSettings(existing);
    const text = render(next, raw);

    if (!opts.confirm) {
      const verb = action === 'remove' ? 'remove the faf SessionStart hook from' : 'add the faf SessionStart hook to';
      const also = text === null
        ? ` Note: ${settingsPath} is not laid out the way faf writes JSON (2-space indent), so faf_setup will not rewrite it; the confirm call returns the entry to change by hand.`
        : '';
      return {
        action: 'preview',
        settingsPath,
        settings: next,
        message:
          `PREVIEW — nothing written. faf_setup would ${verb} the ${SETTINGS_SCOPE} (${settingsPath}); this is exactly what that file would hold.${also} ` +
          `Run faf_setup again with confirm: true${action === 'remove' ? ' and remove: true' : ''} to write it, or edit the file by hand.`,
      };
    }

    if (text === null) {
      return error(byHand(settingsPath, 'it is not laid out the way faf writes JSON (2-space indent), so faf cannot rewrite it without changing your formatting', action));
    }

    if (raw === null) {makeDirInside(projectDir, path.join(projectDir, '.claude'));}
    safeWriteFile(settingsPath, text, { root: projectDir, expect: raw });

    return action === 'remove'
      ? { action: 'removed', settingsPath, settings: next, message: `faf SessionStart hook removed from the ${SETTINGS_SCOPE} (${settingsPath}). Every other key and hook in the file is as it was.` }
      : {
        action: 'installed',
        settingsPath,
        settings: next,
        message: `faf SessionStart hook installed in the ${SETTINGS_SCOPE} (${settingsPath}). Every Claude Code session in this project now starts with fresh context. Every other key and hook in the file is as it was.`,
      };
  } catch (e) {
    return error(`faf_setup (${SETTINGS_SCOPE}, ${settingsPath}): ${e instanceof Error ? e.message : String(e)}`);
  }
}
