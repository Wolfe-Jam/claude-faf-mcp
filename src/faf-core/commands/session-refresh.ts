/**
 * Session refresh — Trust Edition Pillar 5 (the hook action).
 *
 * What the Claude Code SessionStart hook runs: ONE cheap, deterministic action —
 * refresh CLAUDE.md's faf-managed block from project.faf, non-destructively,
 * and stay SILENT when nothing changed. The hook earns "native"; it doesn't
 * need to do everything.
 *
 * Freshness gate: if CLAUDE.md already carries the faf markers and is at least
 * as new as project.faf, there is nothing to do — no write, no output, no mtime
 * churn. Only a stale (or missing / never-injected) CLAUDE.md gets the block
 * re-injected, via injectFafBlock ("enhance, never replace").
 */
import * as path from 'path';
import { promises as fs } from 'fs';
import { injectFafBlock, FAF_START } from '../inject';
import { fafToClaudeMd } from './bi-sync';

export type SessionRefreshAction = 'fresh' | 'refreshed' | 'created' | 'no-faf' | 'error';

export interface SessionRefreshResult {
  action: SessionRefreshAction;
  /** One quiet line for SessionStart stdout (added to session context) — '' when fresh/no-faf. */
  message: string;
}

/**
 * Refresh CLAUDE.md from project.faf in `projectDir` (defaults to cwd — Claude
 * Code runs hooks with cwd at the project root). Never throws: a hook must not
 * break a session. No deep search — the hook is fast and predictable or it is
 * nothing.
 */
export async function sessionRefresh(projectDir: string = process.cwd()): Promise<SessionRefreshResult> {
  try {
    const fafPath = path.join(projectDir, 'project.faf');
    let fafStat;
    try {
      fafStat = await fs.stat(fafPath);
    } catch {
      return { action: 'no-faf', message: '' }; // not a .faf project — silently not our session
    }

    const claudeMdPath = path.join(projectDir, 'CLAUDE.md');
    let claudeStat = null;
    let claudeContent: string | null = null;
    try {
      claudeStat = await fs.stat(claudeMdPath);
      claudeContent = await fs.readFile(claudeMdPath, 'utf-8');
    } catch {
      /* CLAUDE.md does not exist yet */
    }

    // Freshness gate: markers present + CLAUDE.md at least as new as project.faf → silent no-op.
    if (claudeStat && claudeContent !== null && claudeContent.includes(FAF_START) && claudeStat.mtimeMs >= fafStat.mtimeMs) {
      return { action: 'fresh', message: '' };
    }

    const fafContent = await fs.readFile(fafPath, 'utf-8');
    const block = fafToClaudeMd(fafContent);
    await injectFafBlock(claudeMdPath, block);

    return claudeStat === null
      ? { action: 'created', message: 'faf: CLAUDE.md created from project.faf' }
      : { action: 'refreshed', message: 'faf: context refreshed (CLAUDE.md <- project.faf)' };
  } catch (error) {
    // Never break a session start. Quiet diagnostic on stderr is the caller's call.
    return {
      action: 'error',
      message: `faf: session refresh skipped (${error instanceof Error ? error.message : String(error)})`,
    };
  }
}
