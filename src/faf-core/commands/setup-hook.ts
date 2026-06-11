/**
 * faf_setup — Trust Edition Pillar 5 (the explicit installer).
 *
 * Installs the SessionStart refresh hook into the PROJECT's
 * `.claude/settings.json` — and only with the caller's explicit confirm.
 * The tool SHOWS the exact JSON it will write before it writes anything;
 * the merge is non-destructive ("enhance, never replace" applied to
 * settings): every existing key and every existing hook is preserved,
 * ours is appended once, and re-runs are idempotent. `remove` takes out
 * exactly ours and nothing else.
 *
 * JSON has no comment markers, so injectFafBlock cannot own a block here —
 * the structured merge below is the JSON equivalent: parse, preserve, append.
 */
import * as path from 'path';
import { promises as fs } from 'fs';

/** The fingerprint by which we recognise OUR hook (and only ours). */
export const HOOK_FINGERPRINT = 'claude-faf-mcp --session-refresh';

/** The command the SessionStart hook runs. npx resolves local or global installs. */
export const HOOK_COMMAND = `npx -y ${HOOK_FINGERPRINT}`;

/** The exact entry merged into settings.hooks.SessionStart. */
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

function hasOurHook(settings: Record<string, unknown>): boolean {
  const sessionStart = (settings as any)?.hooks?.SessionStart;
  if (!Array.isArray(sessionStart)) return false;
  return sessionStart.some(
    (m: any) => Array.isArray(m?.hooks) && m.hooks.some((h: any) => typeof h?.command === 'string' && h.command.includes(HOOK_FINGERPRINT)),
  );
}

async function readSettings(settingsPath: string): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(settingsPath, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('settings.json is not a JSON object');
    }
    return parsed as Record<string, unknown>;
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === 'ENOENT') return {};
    throw error; // malformed JSON etc. — surface it, never overwrite what we can't parse
  }
}

/** Pure merge: existing settings + our hook appended (no mutation of input). */
export function mergeHookIntoSettings(existing: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...existing };
  const hooks: Record<string, unknown> = { ...((existing as any).hooks ?? {}) };
  const sessionStart: unknown[] = Array.isArray((hooks as any).SessionStart) ? [...(hooks as any).SessionStart] : [];
  sessionStart.push(buildHookEntry());
  hooks.SessionStart = sessionStart;
  merged.hooks = hooks;
  return merged;
}

/** Pure removal: strips exactly OUR hook entries; prunes only what emptied. */
export function removeHookFromSettings(existing: Record<string, unknown>): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...existing };
  const hooks: Record<string, unknown> = { ...((existing as any).hooks ?? {}) };
  const sessionStart = Array.isArray((hooks as any).SessionStart) ? (hooks as any).SessionStart : [];

  const kept = sessionStart
    .map((m: any) => {
      if (!Array.isArray(m?.hooks)) return m;
      const remaining = m.hooks.filter(
        (h: any) => !(typeof h?.command === 'string' && h.command.includes(HOOK_FINGERPRINT)),
      );
      return remaining.length === m.hooks.length ? m : { ...m, hooks: remaining };
    })
    .filter((m: any) => !Array.isArray(m?.hooks) || m.hooks.length > 0);

  if (kept.length > 0) hooks.SessionStart = kept;
  else delete (hooks as any).SessionStart;

  if (Object.keys(hooks).length > 0) merged.hooks = hooks;
  else delete (merged as any).hooks;
  return merged;
}

/**
 * The faf_setup flow.
 *  - no flags        → PREVIEW: show the exact JSON, write NOTHING
 *  - confirm: true   → non-destructive merge into .claude/settings.json
 *  - remove: true    → take out exactly our hook
 */
export async function setupSessionHook(
  projectDir: string,
  opts: { confirm?: boolean; remove?: boolean } = {},
): Promise<SetupHookResult> {
  const settingsPath = path.join(projectDir, '.claude', 'settings.json');
  try {
    const existing = await readSettings(settingsPath);
    const installed = hasOurHook(existing);

    if (opts.remove) {
      if (!installed) {
        return { action: 'not-installed', settingsPath, message: 'No faf SessionStart hook found — nothing to remove.' };
      }
      const next = removeHookFromSettings(existing);
      await fs.writeFile(settingsPath, JSON.stringify(next, null, 2) + '\n', 'utf-8');
      return { action: 'removed', settingsPath, settings: next, message: 'faf SessionStart hook removed. Everything else in settings.json untouched.' };
    }

    if (installed) {
      return { action: 'already-installed', settingsPath, settings: existing, message: 'faf SessionStart hook already installed — nothing to do (idempotent).' };
    }

    const next = mergeHookIntoSettings(existing);

    if (!opts.confirm) {
      return {
        action: 'preview',
        settingsPath,
        settings: next,
        message:
          `PREVIEW — nothing written. This is exactly what ${settingsPath} would become. ` +
          `Run faf_setup again with confirm: true to install, or copy the hooks block in by hand.`,
      };
    }

    await fs.mkdir(path.dirname(settingsPath), { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(next, null, 2) + '\n', 'utf-8');
    return {
      action: 'installed',
      settingsPath,
      settings: next,
      message: 'faf SessionStart hook installed. Every Claude Code session in this project now starts with fresh context.',
    };
  } catch (error) {
    return {
      action: 'error',
      settingsPath,
      message: `faf_setup failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}
