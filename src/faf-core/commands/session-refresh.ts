/**
 * Session refresh — Trust Edition Pillar 5 (the hook action).
 *
 * What the Claude Code SessionStart hook runs: ONE cheap, deterministic action —
 * refresh CLAUDE.md's faf-managed block from project.faf, non-destructively —
 * then hand over the baton: a ONE-LINE heartbeat carrying the ✪-ladder seal and
 * score. The line is a relay — it proves the native integration is alive (a
 * silent hook is indistinguishable from a broken one) and it grounds the model
 * ("a current .faf exists, score N%, don't re-derive the project").
 *
 * Freshness gate: if CLAUDE.md already carries the faf markers and is at least
 * as new as project.faf, nothing is WRITTEN — no write, no mtime churn — but
 * the heartbeat still speaks. Only non-faf directories stay fully silent: the
 * hook never talks where it has no business.
 */
import * as path from 'path';
import { promises as fs } from 'fs';
import { parse as parseYAML } from 'yaml';
import { injectFafBlock, FAF_START } from '../inject';
import { fafToClaudeMd } from './bi-sync';
import { sealForScore } from '../../trust/receipt';

export type SessionRefreshAction = 'fresh' | 'refreshed' | 'created' | 'no-faf' | 'error';

export interface SessionRefreshResult {
  action: SessionRefreshAction;
  /** The one-line heartbeat for SessionStart stdout (joins session context) — '' only for no-faf. */
  message: string;
}

/**
 * The INTENT the code can't carry: project.goal + the populated human_context 6Ws.
 * This is the structural floor of what faf_bench measures live — the delta IS the
 * product. Surfacing it in the heartbeat makes the .faf's worth visible EVERY
 * session, passively: not a claimed model benchmark, just the count of intent
 * slots no manifest can derive (you can't grep "why this exists" from package.json).
 * Returns 0 when there's nothing to claim → the suffix is omitted (no nag, no lie).
 */
function intentCount(fafContent: string): number {
  try {
    const doc = parseYAML(fafContent) as Record<string, unknown> | null;
    if (!doc || typeof doc !== 'object') {return 0;}
    const filled = (v: unknown): boolean =>
      typeof v === 'string' && v.trim() !== '' && v.trim().toLowerCase() !== 'slotignored';
    const project = doc.project as Record<string, unknown> | undefined;
    let n = filled(project?.goal) ? 1 : 0;
    const hc = doc.human_context as Record<string, unknown> | undefined;
    if (hc && typeof hc === 'object') {
      for (const k of ['who', 'what', 'why', 'where', 'when', 'how']) {
        if (filled(hc[k])) {n++;}
      }
    }
    return n;
  } catch {
    return 0; // a malformed .faf must never break the heartbeat
  }
}

/** Score the .faf via the truthful single-source kernel; '' when unscorable (heartbeat survives). */
async function scoreLine(fafContent: string): Promise<string> {
  try {
    const { scoreFafYaml } = await import('../../utils/faf-cli-bridge.js').then((m) => m.fafCli);
    const result = scoreFafYaml(fafContent);
    const score = Math.round(result.score);
    return `${sealForScore(score)} ${score}%`;
  } catch {
    return ''; // no kernel, no score — the heartbeat still beats
  }
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

    const fafContent = await fs.readFile(fafPath, 'utf-8');
    const seal = await scoreLine(fafContent);
    const intent = intentCount(fafContent);
    const intentSuffix = intent > 0 ? ` · +${intent} intent the code can't carry` : '';

    // Freshness gate: markers present + CLAUDE.md at least as new as project.faf
    // → no WRITE (no mtime churn), but the heartbeat still hands over the baton.
    if (claudeStat && claudeContent !== null && claudeContent.includes(FAF_START) && claudeStat.mtimeMs >= fafStat.mtimeMs) {
      return { action: 'fresh', message: `faf: context ${seal ? `${seal} — ` : ''}fresh${intentSuffix}`.replace('  ', ' ') };
    }

    const block = fafToClaudeMd(fafContent);
    await injectFafBlock(claudeMdPath, block);

    return claudeStat === null
      ? { action: 'created', message: `faf: CLAUDE.md created${seal ? ` — ${seal}` : ''}${intentSuffix}` }
      : { action: 'refreshed', message: `faf: context refreshed${seal ? ` — ${seal}` : ''}${intentSuffix}` };
  } catch (error) {
    // Never break a session start. Quiet diagnostic on stderr is the caller's call.
    return {
      action: 'error',
      message: `faf: session refresh skipped (${error instanceof Error ? error.message : String(error)})`,
    };
  }
}
