/**
 * The words claude-faf-mcp uses for a write that did not happen.
 *
 * Every write goes through faf-cli's safe write (resolve inside the project,
 * temp file, fsync, rename): a write that fails or is refused leaves the file
 * on disk exactly as it was. faf-cli's own failure already says so ("<file>:
 * not written; original kept (EACCES)"); a refusal (a link out of the
 * project, a file that changed meanwhile, YAML faf cannot read) or any other
 * error gets the same words here, so every failed write reads the same way.
 */

/** One line, without colour codes. */
export function oneLine(error: unknown): string {
  return (error instanceof Error ? error.message : String(error))
    // eslint-disable-next-line no-control-regex
    .replace(/\x1b\[[0-9;]*m/g, '')
    .split('\n')[0]
    .trim();
}

/**
 * "<file>: not written; original kept (<why>)" — or "<file>: not written
 * (<why>)" when there was no file. A message that already says it is kept as is.
 */
export function notWritten(file: string, error: unknown, existed = true): string {
  const why = oneLine(error);
  if (why.includes('not written')) {return why;}
  return `${file}: not written${existed ? '; original kept' : ''} (${why})`;
}
