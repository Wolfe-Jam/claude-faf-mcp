import { createHash } from 'crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, relative, sep } from 'path';
import { parse as parseYaml } from 'yaml';
import { McpError, ErrorCode, type Resource } from '@modelcontextprotocol/sdk/types.js';

/**
 * Skills over MCP — the io.modelcontextprotocol/skills extension (SEP-2640).
 *
 * The skills this server ships live in the package's skills/ folder, one
 * directory per skill, each with a SKILL.md. Every file is served as a
 * resource at skill://<skill-name>/<file-path>; skills/list and skills/get
 * return each skill's verbatim frontmatter and every file's sha256 digest and
 * size, so a host can verify what it reads and bind an approval to it.
 *
 * The catalog is read once, at construction: files are fixed for the life of
 * the process, so the listing, the digests and the bytes served never disagree.
 * The folder is found next to the package's own package.json — never the
 * working directory, which is the user's project.
 */

export const SKILLS_EXTENSION = 'io.modelcontextprotocol/skills';
export const SKILL_SCHEME = 'skill://';
export const DIRECTORY_MIME = 'inode/directory';

/** SEP-2640 per-skill limits. */
export const MAX_RESOURCES_PER_SKILL = 512;
export const MAX_BYTES_PER_SKILL = 16 * 1024 * 1024;

export interface SkillFile {
  uri: string;
  digest: string;
  size: number;
}

export interface SkillEntry {
  uri: string;
  frontmatter: Record<string, unknown>;
  resources: SkillFile[];
}

interface ServedFile extends SkillFile {
  bytes: Buffer;
  mimeType: string;
}

const MIME_BY_EXT: Record<string, string> = {
  '.md': 'text/markdown',
  '.txt': 'text/plain',
  '.json': 'application/json',
  '.yaml': 'application/yaml',
  '.yml': 'application/yaml',
  '.faf': 'application/vnd.faf+yaml',
  '.py': 'text/x-python',
  '.sh': 'text/x-shellscript',
  '.js': 'text/javascript',
  '.ts': 'text/x-typescript',
};

const NAME_RULE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function mimeFor(file: string): string {
  const dot = file.lastIndexOf('.');
  return (dot >= 0 && MIME_BY_EXT[file.slice(dot).toLowerCase()]) || 'application/octet-stream';
}

function isText(mimeType: string): boolean {
  return mimeType.startsWith('text/') || mimeType.startsWith('application/json')
    || mimeType.includes('yaml');
}

/** The YAML between the opening and closing --- of a SKILL.md. */
export function readFrontmatter(markdown: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/.exec(markdown);
  if (!match) {
    throw new Error('SKILL.md must begin with YAML frontmatter between --- lines');
  }
  const data: unknown = parseYaml(match[1]);
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('SKILL.md frontmatter must be a YAML mapping');
  }
  return data as Record<string, unknown>;
}

/** The package's skills/ folder: beside the package.json named claude-faf-mcp. */
export function findSkillsRoot(): string | null {
  // src/handlers (bun, tests) → two up; dist/src/handlers (built) → three up.
  for (const root of [join(__dirname, '..', '..'), join(__dirname, '..', '..', '..')]) {
    const pkg = join(root, 'package.json');
    const dir = join(root, 'skills');
    try {
      if (existsSync(pkg) && existsSync(dir)
        && (JSON.parse(readFileSync(pkg, 'utf-8')) as { name?: unknown }).name === 'claude-faf-mcp') {
        return dir;
      }
    } catch {
      // try the next candidate
    }
  }
  return null;
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir).sort()) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {out.push(...walk(full));}
    else if (st.isFile()) {out.push(full);}
  }
  return out;
}

export class FafSkillsHandler {
  private readonly entries: SkillEntry[] = [];
  private readonly files = new Map<string, ServedFile>();
  /** Directory URI → direct children (files and subdirectories). */
  private readonly directories = new Map<string, Resource[]>();
  /**
   * Skills that failed to load, with why. A bad skill is skipped, not fatal:
   * the tools still serve. The WJTTC suite holds this list empty for the
   * skills the package ships.
   */
  readonly problems: string[] = [];

  constructor(root: string | null = findSkillsRoot()) {
    if (!root || !existsSync(root)) {return;}
    for (const name of readdirSync(root).sort()) {
      const skillDir = join(root, name);
      if (!statSync(skillDir).isDirectory()) {continue;}
      try {
        this.load(name, skillDir);
      } catch (error) {
        this.problems.push(error instanceof Error ? error.message : String(error));
      }
    }
  }

  private load(name: string, skillDir: string): void {
    const skillMd = join(skillDir, 'SKILL.md');
    if (!existsSync(skillMd)) {
      throw new Error(`skills/${name}: no SKILL.md`);
    }
    const frontmatter = readFrontmatter(readFileSync(skillMd, 'utf-8'));
    if (frontmatter.name !== name) {
      throw new Error(`skills/${name}: frontmatter name "${String(frontmatter.name)}" must equal the directory name`);
    }
    if (!NAME_RULE.test(name) || name.length > 64) {
      throw new Error(`skills/${name}: name must be 1-64 lowercase letters, digits and single hyphens`);
    }
    if (typeof frontmatter.description !== 'string' || !frontmatter.description.trim()) {
      throw new Error(`skills/${name}: frontmatter needs a description`);
    }

    const base = `${SKILL_SCHEME}${name}`;
    const resources: SkillFile[] = [];
    const served: Array<{ rel: string; file: ServedFile }> = [];
    let total = 0;
    for (const full of walk(skillDir)) {
      const rel = relative(skillDir, full).split(sep).join('/');
      const bytes = readFileSync(full);
      const file: ServedFile = {
        uri: `${base}/${rel}`,
        digest: `sha256:${createHash('sha256').update(bytes).digest('hex')}`,
        size: bytes.length,
        bytes,
        mimeType: mimeFor(rel),
      };
      total += file.size;
      resources.push({ uri: file.uri, digest: file.digest, size: file.size });
      served.push({ rel, file });
    }
    if (resources.length > MAX_RESOURCES_PER_SKILL || total > MAX_BYTES_PER_SKILL) {
      throw new Error(`skills/${name}: over the SEP-2640 limits (${resources.length} files, ${total} bytes)`);
    }
    for (const { rel, file } of served) {
      this.files.set(file.uri, file);
      this.addToDirectories(base, rel, file);
    }
    this.entries.push({ uri: `${base}/SKILL.md`, frontmatter, resources });
  }

  private addToDirectories(base: string, rel: string, file: ServedFile): void {
    const parts = rel.split('/');
    let dir = base;
    if (!this.directories.has(dir)) {this.directories.set(dir, []);}
    for (let i = 0; i < parts.length - 1; i++) {
      const child = `${dir}/${parts[i]}`;
      if (!this.directories.has(child)) {
        this.directories.set(child, []);
        this.directories.get(dir)!.push({ uri: child, name: parts[i], mimeType: DIRECTORY_MIME });
      }
      dir = child;
    }
    this.directories.get(dir)!.push({ uri: file.uri, name: parts[parts.length - 1], mimeType: file.mimeType });
  }

  /** True when the package ships at least one skill; the extension is declared only then. */
  hasSkills(): boolean {
    return this.entries.length > 0;
  }

  listSkills(): { skills: SkillEntry[] } {
    return { skills: this.entries };
  }

  getSkill(uri: string): { skill: SkillEntry } {
    const skill = this.entries.find((e) => e.uri === uri);
    if (!skill) {
      throw new McpError(ErrorCode.InvalidParams, `Not a skill this server serves: ${uri}`);
    }
    return { skill };
  }

  /** Each SKILL.md as a resource, with name and description from its frontmatter. */
  listResources(): Resource[] {
    return this.entries.map((e) => ({
      uri: e.uri,
      name: String(e.frontmatter.name),
      description: String(e.frontmatter.description),
      mimeType: 'text/markdown',
    }));
  }

  owns(uri: string): boolean {
    return uri.startsWith(SKILL_SCHEME);
  }

  readResource(uri: string) {
    const file = this.files.get(uri);
    if (!file) {
      throw new McpError(-32002, `Resource not found: ${uri}`);
    }
    return {
      contents: [isText(file.mimeType)
        ? { uri, mimeType: file.mimeType, text: file.bytes.toString('utf-8') }
        : { uri, mimeType: file.mimeType, blob: file.bytes.toString('base64') }],
    };
  }

  readDirectory(uri: string): { resources: Resource[] } {
    const children = this.directories.get(uri);
    if (!children) {
      throw new McpError(ErrorCode.InvalidParams, `Not a directory resource: ${uri}`);
    }
    return { resources: children };
  }
}
