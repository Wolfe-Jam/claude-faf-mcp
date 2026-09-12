/**
 * The YAML read boundary: every project.faf claude-faf-mcp reads comes through
 * here, and the older `project: <name>` shape is lifted once, in this one place.
 *
 * claude-faf-mcp ≤5.22.1 wrote `project: <name>` as a plain value. faf-cli reads
 * the name, goal and language only from a `project` mapping, so a reader that
 * took the old shape as it is titled CLAUDE.md "Project", scored the name as
 * empty, and a writer that stepped into it replaced the name with `{}`. The
 * lift turns a string, number or boolean `project:` into `{ name: String(v) }`
 * — the name is kept. A list, a mapping or an empty value is left as it is.
 *
 * The data is lifted in place, so it still carries faf-cli's record of the
 * text it was read from: writeFaf refuses to write it back over a file that
 * changed meanwhile.
 */
import { fafCli } from './faf-cli-bridge.js';

/** A YAML mapping as JS: a plain object, not null, not a list. */
export function isMapping(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** True for the older `project: <name>` shape: a string, number or boolean. */
export function isScalarProject(project: unknown): project is string | number | boolean {
  return typeof project === 'string' || typeof project === 'number' || typeof project === 'boolean';
}

/**
 * Lift `project: <scalar>` to `{ name: String(value) }`, in place. Returns the
 * scalar's text when it lifted one, or null.
 */
export function liftScalarProject(data: Record<string, unknown>): string | null {
  const project = data.project;
  if (!isScalarProject(project)) {return null;}
  const name = String(project);
  data.project = { name };
  return name;
}

/** A project.faf read through the boundary. */
export interface FafRead {
  /** The file's data, `project:` lifted. */
  data: Record<string, unknown>;
  /** The name when the file holds the older `project: <name>` shape, else null. */
  legacyProject: string | null;
}

/**
 * Read a .faf through faf-cli's reader (the link rules, strict UTF-8, a
 * mapping — a scalar or list file is refused) and lift the older
 * `project: <name>` shape.
 */
export async function readFafData(fafPath: string): Promise<FafRead> {
  const { readFaf } = await fafCli;
  const data = readFaf(fafPath) as Record<string, unknown>;
  const legacyProject = liftScalarProject(data);
  return { data, legacyProject };
}

/** The line every tool that meets the older shape prints. */
export function legacyProjectHint(file: string, name: string): string {
  return `${file} still has the older \`project: ${name}\` shape, which faf-cli does not read as a name. faf_auto moves it to project.name (the name is kept) and fills the rest.`;
}
