/**
 * safe-path.ts — confinement for caller-supplied `path` arguments.
 *
 * Several MCP tools (`refresh_faf`, `faf_score`, `faf_get_orchestration_policy`,
 * `refresh_blend`, …) accept a `path` argument and read a `.faf` context file
 * from it. Historically that path flowed straight through `path.resolve()` into
 * `fs.readFileSync()` with no confinement, so an absolute path or `../` traversal
 * could read ANY file the server uid can read (CWE-22 / CWE-73 / CWE-200) and
 * have its contents echoed back — e.g. `refresh_faf({path:"~/.ssh/id_rsa"})`.
 *
 * This module is the single chokepoint that closes that. Two layers:
 *
 *   1. Context-file allow-list (ALWAYS ON) — this server's only job is reading
 *      `.faf` / `.fafm` context files. When a caller path resolves to a *file*,
 *      it must be one of those. That alone blocks the entire secret-disclosure
 *      surface — `/etc/passwd`, `~/.ssh/id_rsa`, `~/.aws/credentials`, `.env`,
 *      etc. are none of them `.faf` files — regardless of directory. A `.faf`
 *      is a public project-context format, so reading one anywhere discloses no
 *      secrets (a planted one only echoes what the attacker already wrote).
 *
 *   2. Root confinement (OPT-IN) — when `FAF_ALLOWED_ROOTS` is set (OS-path
 *      delimited), the resolved path must additionally stay within one of those
 *      roots. Off by default so legitimate `.faf` files outside $HOME (CI temp
 *      fixtures, /opt, /srv, monorepos) keep working; operators who want a hard
 *      directory boundary opt in.
 *
 * Layer 1 is the security boundary; layer 2 is defense-in-depth for locked-down
 * deployments. Either way, `..` traversal and absolute paths can never reach a
 * non-context file.
 *
 * The file tools (faf_read, faf_list) read any file type, so they get a hard
 * boundary of their own: the active session project plus FAF_ALLOWED_ROOTS —
 * never the home folder or the filesystem root, and no temp folders. The
 * caller works out those roots (it knows the session project) and passes them
 * in; relative paths resolve against the active project.
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export class PathConfinementError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PathConfinementError';
  }
}

/** True when `p`'s basename is a `.faf` / `.fafm` context file. */
export function isFafContextFile(p: string): boolean {
  const base = path.basename(p).toLowerCase();
  return base === '.faf' || base.endsWith('.faf') || base.endsWith('.fafm');
}

/** Expand a leading `~` / `~/` for the CURRENT user only. `~otheruser` is left
 *  literal (it will then fail the root check rather than reaching another home). */
export function expandTilde(p: string): string {
  if (p === '~') return os.homedir();
  if (p.startsWith('~/') || p.startsWith('~\\')) {
    return path.join(os.homedir(), p.slice(2));
  }
  return p;
}

/** Opt-in allowed roots from `FAF_ALLOWED_ROOTS` (OS-delimited). Empty when
 *  unset → root confinement is not enforced (the `.faf`-only rule still is). */
export function allowedRoots(): string[] {
  const env = process.env.FAF_ALLOWED_ROOTS;
  if (env && env.trim()) {
    return env
      .split(path.delimiter)
      .map((r) => r.trim())
      .filter(Boolean)
      .map((r) => path.resolve(expandTilde(r)));
  }
  return [];
}

/** True when `resolved` is `root` or inside it. Works for a root that ends in a
 *  separator (`/`, `C:\\`) too: the check is on the relative path, not a prefix. */
function withinRoots(resolved: string, roots: string[]): boolean {
  return roots.some((root) => {
    const rel = path.relative(root, resolved);
    return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
  });
}

/**
 * Symlink-canonical absolute path, tolerant of a not-yet-existing target
 * (a path that does not exist yet). Resolves the nearest EXISTING ancestor through
 * symlinks, then re-appends the missing tail — so a new file under /tmp matches
 * a /private/tmp root on macOS instead of slipping past the confinement check.
 */
function canonicalize(input: string): string {
  let cur = path.resolve(input);
  const tail: string[] = [];
  for (;;) {
    try {
      const real = fs.realpathSync(cur);
      return tail.length ? path.join(real, ...tail.reverse()) : real;
    } catch {
      const parent = path.dirname(cur);
      if (parent === cur) return path.resolve(input); // hit filesystem root
      tail.push(path.basename(cur));
      cur = parent;
    }
  }
}

/**
 * Confine a path for the file tools (faf_read, faf_list): any file type, but it
 * must stay within `roots` — the active session project plus FAF_ALLOWED_ROOTS,
 * never the home folder or the filesystem root (the caller filters those out).
 * A relative path resolves against `base`, the active project. With no roots
 * at all nothing is allowed. Throws PathConfinementError on violation; returns
 * the symlink-canonical path.
 */
export function confineFileOp(input: unknown, opts: { roots: string[]; base: string }): string {
  if (opts.roots.length === 0) {
    throw new PathConfinementError(
      'the file tools read only inside the active project (and FAF_ALLOWED_ROOTS), and there is none: ' +
        'the active project is your home folder or the filesystem root. Set the project with faf_context, or list a folder in FAF_ALLOWED_ROOTS.',
    );
  }
  if (typeof input !== 'string' || input.length === 0) {
    throw new PathConfinementError('path must be a non-empty string');
  }
  return confinePath(path.resolve(opts.base, expandTilde(input)), { requireFafFile: false, roots: opts.roots });
}

export interface ConfineOptions {
  /** Override allowed roots (resolved internally). Defaults to allowedRoots()
   *  (the opt-in `FAF_ALLOWED_ROOTS`). Empty = root confinement not enforced. */
  roots?: string[];
  /** When the resolved path is an existing file, require it be a `.faf`/`.fafm`
   *  context file. Use for sinks that read the path verbatim. Default true. */
  requireFafFile?: boolean;
}

/**
 * Resolve and confine a caller-supplied path. Returns the safe absolute path,
 * or throws PathConfinementError. Never reaches the filesystem read itself —
 * callers do that with the returned value.
 */
export function confinePath(input: unknown, opts: ConfineOptions = {}): string {
  if (typeof input !== 'string' || input.length === 0) {
    throw new PathConfinementError('path must be a non-empty string');
  }
  if (input.includes('\0')) {
    throw new PathConfinementError('path contains a null byte');
  }

  // Canonicalize THROUGH symlinks when the target exists. This closes the
  // symlink bypass: a file named `project.faf` that is actually a symlink to
  // `/etc/passwd` would pass a lexical name check but read the secret. We check
  // the real target's name instead. Missing paths stay lexical (nothing to read
  // yet — a directory walk or a downstream ENOENT handles them).
  const resolved = canonicalize(expandTilde(input));
  let isFile = false;
  try {
    isFile = fs.statSync(resolved).isFile();
  } catch {
    isFile = false;
  }

  const roots = (opts.roots ?? allowedRoots()).map(canonicalize);

  // Layer 2 (opt-in): enforce root confinement only when roots are configured.
  if (roots.length > 0 && !withinRoots(resolved, roots)) {
    throw new PathConfinementError(
      opts.roots
        ? `path is outside the active project and FAF_ALLOWED_ROOTS: "${input}".`
        : `path escapes FAF_ALLOWED_ROOTS: "${input}".`,
    );
  }

  // Layer 1 (always on): a resolved *file* must be a `.faf`/`.fafm` context file.
  const requireFaf = opts.requireFafFile ?? true;
  if (requireFaf && isFile && !isFafContextFile(resolved)) {
    throw new PathConfinementError(
      `refusing to read a non-context file via \`path\`: "${input}". ` +
        `Only .faf / .fafm files (or a directory containing one) are allowed.`,
    );
  }

  return resolved;
}
