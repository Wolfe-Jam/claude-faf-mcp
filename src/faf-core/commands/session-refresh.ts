/**
 * Session refresh — Trust Edition Pillar 5 (the hook action).
 *
 * What the Claude Code SessionStart hook runs: ONE cheap, deterministic action —
 * refresh CLAUDE.md's faf-managed block from project.faf, non-destructively
 * (faf-cli's renderClaudeMd, written through faf-cli's writeClaudeMd) —
 * then hand over the baton: a ONE-LINE heartbeat carrying the ✪-ladder seal and
 * score. The line is a relay — it proves the native integration is alive (a
 * silent hook is indistinguishable from a broken one) and it grounds the model
 * ("a current .faf exists, score N%, don't re-derive the project").
 *
 * Freshness gate: if CLAUDE.md already carries a current faf block (faf-cli's
 * "STATUS: SYNC ACTIVE" footer) and is at least as new as project.faf, nothing
 * is WRITTEN — no write, no mtime churn — but the heartbeat still speaks. A
 * block from an older writer (CFM ≤5.22 or faf-cli ≤7.12.0, footed "STATUS:
 * BI-SYNC ACTIVE") is stale and is rewritten once. Only non-faf directories
 * stay fully silent: the hook never talks where it has no business.
 *
 * Nothing is written from a project.faf that is not a YAML mapping (empty,
 * scalar, list or malformed): the hook returns 'error' and CLAUDE.md is kept.
 */
import * as path from 'path';
import { promises as fs } from 'fs';
import { parse as parseYAML } from 'yaml';
import { parse as parseFafYaml } from '../fix-once/yaml';
import { sealForScore } from '../../trust/receipt';

/** faf-cli's current CLAUDE.md footer. Not a substring of the old "STATUS: BI-SYNC ACTIVE". */
const CURRENT_FOOTER = 'STATUS: SYNC ACTIVE';

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

    // CLAUDE.md is faf-cli's own bytes: its renderer, its block finder, its injector.
    const { findFafBlock, readFaf, renderClaudeMd, writeClaudeMd } =
      await import('../../utils/faf-cli-bridge.js').then((m) => m.fafCli);

    // Freshness gate: a CURRENT faf block (faf-cli's footer) + CLAUDE.md at least
    // as new as project.faf → no WRITE (no mtime churn), but the heartbeat still
    // hands over the baton. An older writer's block is stale: rewritten once.
    const found = claudeContent !== null ? findFafBlock(claudeContent) : null;
    const current = found !== null && claudeContent !== null &&
      claudeContent.slice(found.start, found.end).includes(CURRENT_FOOTER);
    if (claudeStat && current && claudeStat.mtimeMs >= fafStat.mtimeMs) {
      return { action: 'fresh', message: `faf: context ${seal ? `${seal} — ` : ''}fresh${intentSuffix}`.replace('  ', ' ') };
    }

    // Unattended write: project.faf must be a YAML mapping. Empty / scalar / list /
    // malformed throws here → 'error', and CLAUDE.md is left exactly as it was.
    parseFafYaml(fafContent, { filepath: fafPath });

    writeClaudeMd(projectDir, renderClaudeMd(readFaf(fafPath)));

    return claudeStat === null
      ? { action: 'created', message: `faf: CLAUDE.md created${seal ? ` — ${seal}` : ''}${intentSuffix}` }
      : { action: 'refreshed', message: `faf: context refreshed${seal ? ` — ${seal}` : ''}${intentSuffix}` };
  } catch (error) {
    // Never break a session start. Quiet diagnostic on stderr is the caller's call:
    // one line, no colour codes (the parser's message is multi-line and coloured).
    const reason = (error instanceof Error ? error.message : String(error))
      // eslint-disable-next-line no-control-regex
      .replace(/\x1b\[[0-9;]*m/g, '')
      .split('\n')[0]
      .trim();
    return {
      action: 'error',
      message: `faf: session refresh skipped (${reason})`,
    };
  }
}
