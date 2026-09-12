import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { ErrorCode, McpError } from '@modelcontextprotocol/sdk/types.js';
import { AjvJsonSchemaValidator } from '@modelcontextprotocol/sdk/validation/ajv';
import type { Document } from 'yaml';
import { isMap, isScalar } from 'yaml';
import { FafEngineAdapter } from './engine-adapter';
import { handleFafRead, type FileOpContext } from './fileHandler';
import * as fs from 'fs';
import * as pathModule from 'path';
import { confinePath, confineFileOp, allowedRoots, expandTilde, isFafContextFile, PathConfinementError } from '../utils/safe-path';
import { VERSION } from '../version';
import { resolveProjectPath, formatPathConfirmation } from '../utils/path-resolver';
// Truthful single-source FAF score wiring — faf-cli, loaded through
// src/utils/faf-cli-bridge.ts (ESM from CommonJS via import()).
import { fafCli } from '../utils/faf-cli-bridge.js';
import { bundledFafCliVersion } from '../utils/faf-cli-version.js';
import { readFafData, isMapping, isScalarProject, legacyProjectHint } from '../utils/faf-read.js';
import { computeParity } from '../trust/parity.js';
import { buildReceipt, renderReceipt, sealForScore } from '../trust/receipt.js';
import { composedTurboCat } from '../faf-core/extract/turbocat-bridge.js';
import { setupSessionHook, HOOK_COMMAND, SETTINGS_SCOPE, homeRefusal } from '../faf-core/commands/setup-hook.js';
import { writeClaudeFromFaf } from '../faf-core/commands/claude.js';
import { gitContextCommand } from '../faf-core/commands/git-context.js';
import { notWritten, oneLine } from '../utils/write-outcome.js';
import { yamlFixHint, yamlErrorAt, NO_KEYS_FIX } from '../faf-core/fix-once/yaml.js';

/**
 * The Core tier — the 14 distinct, well-described tools advertised by default.
 * Everything else is Extended: still callable by name (the dispatch in callTool
 * is unchanged), but advertised only when FAF_TOOLS=all. Glama (and any client)
 * runs the server and scores the default tools/list, so a tight, non-overlapping
 * Core is what earns the coherence grade. See
 * PLANET-FAF/strategy/claude-faf-mcp-core-tier-glama-a-2026-06-17.md.
 *
 * faf_bench leads on the default surface (added 5.12.0): the in-session proof
 * tool — "see the delta yourself" — is the value-prop made callable, so it
 * belongs where newcomers meet it, not behind FAF_TOOLS=all.
 *
 * 6.0.0 (owner decision Q3): faf_setup and faf_tri_sync join the Core, so the
 * faf prompt's steps (faf_sync, faf_tri_sync, faf_setup), the README
 * onboarding and the .mcpb manifest name only tools a default install lists.
 */
const CORE_TOOLS = new Set<string>([
  'faf_init', 'faf_auto', 'faf_go', 'faf_bench',
  'faf_score', 'faf_doctor', 'faf_sync', 'faf_context',
  'faf_trust', 'faf_about', 'faf_etch', 'faf_recall',
  'faf_setup', 'faf_tri_sync',
]);

/** The default tools/list, by name — what a host without FAF_TOOLS=all sees. */
export const CORE_TOOL_NAMES: readonly string[] = [...CORE_TOOLS];

/**
 * Retired tools. None is listed in tools/list; a call by name gets isError and
 * one plain line: when it was retired and what to use instead. Their code is
 * gone from the tree (tag archive/cfm-v5-surface keeps it).
 */
const RETIRED_TOOLS = new Map<string, string>([
  ['faf_clear', 'faf_clear was retired in 6.0.0: claude-faf-mcp keeps no cache or state, so there is nothing to clear.'],
  ['faf_friday', 'faf_friday was retired in 6.0.0: use faf_auto to detect the stack from your files.'],
  ['faf_guide', 'faf_guide was retired in 6.0.0: every tool describes itself in tools/list; start with faf_context, then faf_score.'],
  ['faf_write', 'faf_write was retired in 6.0.0: claude-faf-mcp writes only its own context files (faf_init, faf_auto, faf_go, faf_sync); write other files with your host\'s own tools.'],
  ['faf_chat', 'faf_chat was retired in 5.7.0: your host is the chat. Use faf_go to build context by question and answer.'],
]);

/** The interop imports into project.faf (retired in 6.0.0): tool → [file, what remains]. */
const RETIRED_IMPORTS: Record<string, [string, string]> = {
  faf_agents: ['AGENTS.md', 'export or sync'],
  faf_cursor: ['.cursorrules', 'export or sync'],
  faf_gemini: ['GEMINI.md', 'export or sync'],
  faf_conductor: ['conductor/', 'export'],
};

/**
 * Arguments that were retired: the one plain line a call with one gets, before
 * the arguments are checked against the schema (which no longer lists them).
 */
function retiredArgument(tool: string, args: Record<string, unknown>): string | null {
  if (tool === 'faf_check' && (args.protect !== undefined || args.unlock !== undefined)) {
    return 'faf_check protect/unlock was retired in 6.0.0: faf has no field lock, so nothing was locked or unlocked. faf_check only reports.';
  }
  const imported = Object.hasOwn(RETIRED_IMPORTS, tool) ? RETIRED_IMPORTS[tool] : undefined;
  if (imported && args.action === 'import') {
    return `${tool} import was retired in 6.0.0: claude-faf-mcp no longer merges ${imported[0]} into project.faf. Use ${imported[1]}; faf_auto and faf_go fill project.faf.`;
  }
  return null;
}

/** The SDK's JSON Schema validator (Ajv): every call's arguments are checked
 *  against the tool's inputSchema before its handler runs. */
const schemaValidator = new AjvJsonSchemaValidator();

/** The value at a dotted argument path, for an error message. */
function argAt(args: Record<string, unknown>, at: string): unknown {
  let cur: unknown = args;
  for (const part of at.split('.')) {
    cur = isMapping(cur) && Object.hasOwn(cur, part) ? cur[part] : Array.isArray(cur) ? cur[Number(part)] : undefined;
  }
  return cur;
}

/**
 * Ajv's error text ("data/action must be equal to one of the allowed values,
 * data must NOT have additional properties") in plain words, with the names
 * and the allowed values from the schema.
 */
function describeInvalid(schema: Tool['inputSchema'], args: Record<string, unknown>, errorText: string): string {
  const props = (isMapping(schema.properties) ? schema.properties : {}) as Record<string, { enum?: unknown[] }>;
  const parts: string[] = [];
  for (const raw of errorText.split(', ')) {
    const m = /^data(?:\/(\S+))? (.+)$/.exec(raw.trim());
    if (!m) {
      if (raw.trim()) {parts.push(raw.trim());}
      continue;
    }
    const at = m[1] ? m[1].split('/').join('.') : '';
    const msg = m[2];
    const required = /^must have required property '(.+)'$/.exec(msg);
    if (!at && msg === 'must NOT have additional properties') {
      const extra = Object.keys(args).filter((k) => !Object.hasOwn(props, k));
      const takes = Object.keys(props);
      parts.push(`unknown argument${extra.length === 1 ? '' : 's'} ${extra.join(', ')} (it takes ${takes.length ? takes.join(', ') : 'no arguments'})`);
    } else if (msg === 'must be equal to one of the allowed values') {
      const allowed = props[at.split('.')[0]]?.enum;
      parts.push(`${at} must be ${Array.isArray(allowed) ? `one of ${allowed.map((v) => JSON.stringify(v)).join(', ')}` : 'one of the allowed values'} (got ${JSON.stringify(argAt(args, at))})`);
    } else if (required) {
      parts.push(`${at ? `${at}.` : ''}${required[1]} is required`);
    } else {
      parts.push(`${at || 'the arguments'} ${msg}`);
    }
  }
  return `invalid arguments — ${[...new Set(parts)].join('; ')}.`;
}

/**
 * The call's arguments as an object with no prototype, holding only the
 * caller's own keys. A flag or a path the caller did not send reads as
 * undefined, whatever Object.prototype holds.
 */
function argsOf(args: unknown): Record<string, any> {
  const own: Record<string, any> = Object.create(null);
  if (isMapping(args)) {
    for (const key of Object.keys(args)) {own[key] = args[key];}
  }
  return own;
}

/** A tool's title, set on the tool and in its annotations, and its hints —
 *  each one what the handler does: readOnly only if it never writes a file,
 *  destructive where it can replace what is there, idempotent where a repeat
 *  call with the same arguments changes nothing more. */
function hints(
  title: string,
  h: { readOnly: boolean; destructive?: boolean; idempotent: boolean; openWorld?: boolean },
): { title: string; annotations: Tool['annotations'] } {
  return {
    title,
    annotations: {
      title,
      readOnlyHint: h.readOnly,
      destructiveHint: h.destructive ?? false,
      idempotentHint: h.idempotent,
      openWorldHint: h.openWorld ?? false,
    },
  };
}

/** The parity receipt's schema, shared by faf_score and faf_trust. */
const PARITY_SCHEMA = {
  type: 'object',
  description: 'faf-parity/v1 — claude-faf-mcp\'s own spec (no other engine computes it yet): sha256 over a canonical projection of faf-cli\'s score for these exact bytes. Check it yourself: sha256(projection) === parityHash.',
  properties: {
    spec: { type: 'string', description: 'Parity spec id: faf-parity/v1' },
    algo: { type: 'string', description: 'Hash algorithm (sha256)' },
    scorer: { type: 'string', description: 'The single deterministic source the score comes from (faf-cli)' },
    producedBy: { type: 'string', description: 'The server that emitted this receipt (metadata, not hashed)' },
    sourceSha256: { type: 'string', description: 'SHA-256 of the raw .faf bytes' },
    parityHash: { type: 'string', description: 'sha256(projection)' },
    projection: { type: 'string', description: 'The exact canonical string that was hashed (for verification)' }
  },
  required: ['spec', 'parityHash', 'sourceSha256', 'projection']
};

/** True when something is at `p` — a file, a folder or a link (dangling included). */
function present(p: string): boolean {
  try {
    fs.lstatSync(p);
    return true;
  } catch {
    return false;
  }
}

/** A folder a handler works in, or why it will not. */
type Resolved =
  | { ok: true; dir: string; explicit: boolean }
  | { ok: false; message: string; dir?: string };

/** The .faf a reader found (faf-cli's findFafFile: the folder, then one level up). */
interface FoundFaf {
  path: string;
  filename: string;
  /** The folder the file sits in. */
  dir: string;
  /** True when it was found one level above the folder asked about. */
  above: boolean;
}

/** How a reply names the file a reader found. */
function where(found: FoundFaf): string {
  return found.above ? `${found.path} (one level up)` : found.path;
}

/** Keys faf never walks into, at any depth of an answer's path. */
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/** Leaf values of .faf data by dotted path (lists compared whole). `_meta` is
 *  faf's runtime hint, never a slot, and is skipped. */
function leaves(data: unknown, prefix = '', out = new Map<string, unknown>()): Map<string, unknown> {
  if (isMapping(data)) {
    for (const [k, v] of Object.entries(data)) {
      if (!prefix && k === '_meta') {continue;}
      leaves(v, prefix ? `${prefix}.${k}` : k, out);
    }
  } else if (prefix) {
    out.set(prefix, data);
  }
  return out;
}

function isBlank(v: unknown): boolean {
  return v === undefined || v === null || (typeof v === 'string' && v.trim() === '') ||
    (Array.isArray(v) && v.length === 0) || (isMapping(v) && Object.keys(v).length === 0);
}

/** What a fill did to .faf data: the empty slots it filled, and every value
 *  the file already held that it changed ("path: old → new"). */
function slotChanges(before: unknown, after: unknown): { filledPaths: string[]; ignoredPaths: string[]; changedValues: string[] } {
  const was = leaves(before);
  const filledPaths: string[] = [];
  const ignoredPaths: string[] = [];
  const changedValues: string[] = [];
  for (const [p, v] of leaves(after)) {
    const old = was.get(p);
    if (JSON.stringify(old) === JSON.stringify(v)) {continue;}
    if (isBlank(old)) {
      if (v === 'slotignored') {ignoredPaths.push(p);} else if (!isBlank(v)) {filledPaths.push(p);}
    } else {
      changedValues.push(`${p}: ${JSON.stringify(old)} → ${JSON.stringify(v)}`);
    }
  }
  return { filledPaths, ignoredPaths, changedValues };
}

/**
 * Every tool this server answers, Core and Extended — a fresh list on each
 * call (listTools hands it to quietToolList, which edits descriptions in
 * place). Each description says what the handler does, when to use it and
 * what it returns; each input property is one the handler reads
 * (tests/wjttc-600-tool-schema-truth.test.ts).
 */
function toolList(): Tool[] {
  return [
    {
      name: 'faf',
      ...hints('Start Here', { readOnly: true, idempotent: true }),
      description: 'Start here: names the project and the .faf faf-cli finds for it (the folder, then one level up), with faf-cli\'s score, and returns the steps that take it to 100% — faf_auto, faf_score, faf_go, faf_trust, faf_sync. Reads only; it runs none of the steps itself.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Project path (optional — the active project if omitted)' }
        },
        additionalProperties: false
      }
    },
    {
      name: 'faf_about',
      ...hints('About .faf', { readOnly: true, idempotent: true }),
      description: 'Explain what the .faf format is — project context for AI, IANA-registered as application/vnd.faf+yaml — and how this server uses it. Returns a short plain-text overview with this server\'s version. Reads nothing and writes nothing. Use it when someone asks what FAF is.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: 'faf_status',
      ...hints('.faf Status', { readOnly: true, idempotent: true }),
      description: 'Say whether the project has a .faf (faf-cli\'s finder: the folder, then one level up) and show its first 20 lines. Reads only. For the score use faf_score; for what to fix, faf_doctor.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
        },
        additionalProperties: false
      },
      outputSchema: {
        type: 'object',
        description: 'Whether the project has a project.faf and where it lives.',
        properties: {
          hasFaf: { type: 'boolean', description: 'Whether a project.faf (or .faf) was found' },
          filename: { type: ['string', 'null'], description: 'The .faf filename, if found' },
          path: { type: ['string', 'null'], description: 'Absolute path to the .faf file, if found' },
          directory: { type: 'string', description: 'Directory that was checked' }
        },
        required: ['hasFaf', 'directory'],
        additionalProperties: true
      }
    },
    {
      name: 'faf_score',
      ...hints('Score .faf', { readOnly: true, idempotent: true }),
      description: 'Score the project\'s .faf with faf-cli\'s scorer — the one score every faf tool reports: 0–100%, the tier, populated/active slots, and a faf-parity/v1 hash of the result. details: true lists every slot as populated, empty or slotignored. Reads only. Use faf_doctor for what to fix.',
      inputSchema: {
        type: 'object',
        properties: {
          details: { type: 'boolean', description: 'List every slot as populated, empty or slotignored, and the tools that fill the empty ones' },
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
        },
        additionalProperties: false
      },
      outputSchema: {
        type: 'object',
        description: 'Structured AI-readiness score, single-sourced from faf-cli.',
        properties: {
          score: { type: 'number', description: 'AI-readiness score, 0-100 (-1 only together with unknown: true)' },
          unknown: { type: 'boolean', description: 'True when the score is not known: an About repo with no about.source_score. Shown as "unknown (—)", never as a number.' },
          tier: { type: 'string', description: 'Tier name for this score (e.g. BRONZE, TROPHY)' },
          populated: { type: 'number', description: 'Active slots that are filled' },
          empty: { type: 'number', description: 'Active slots still empty' },
          ignored: { type: 'number', description: 'Slots marked slotignored (inactive for this app_type)' },
          active: { type: 'number', description: 'Slots active for this app_type' },
          total: { type: 'number', description: 'Total slots' },
          nextTier: {
            type: ['object', 'null'],
            description: 'Next tier above the current score, or null at top tier',
            properties: {
              name: { type: 'string' },
              threshold: { type: 'number' }
            }
          },
          inherited: { type: 'boolean', description: 'True if the score is attested from a source repo (an about: block)' },
          hasFaf: { type: 'boolean', description: 'Whether a readable, valid project.faf was scored' },
          path: { type: 'string', description: 'Path that was scored' },
          slots: {
            type: 'object',
            description: 'Slot paths by state',
            properties: {
              populated: { type: 'array', items: { type: 'string' } },
              empty: { type: 'array', items: { type: 'string' } },
              ignored: { type: 'array', items: { type: 'string' } }
            }
          },
          parity: PARITY_SCHEMA
        },
        required: ['score', 'tier', 'hasFaf'],
        additionalProperties: true
      }
    },
    {
      name: 'faf_init',
      ...hints('Create project.faf', { readOnly: false, destructive: true, idempotent: false }),
      description: 'Create a new project.faf for a folder: faf-cli detects its name, language and stack, and the reply gives the file path, faf-cli\'s starting score and the birth .faf-dna. An existing project.faf is left as it is — use faf_auto to fill its empty slots from your manifests, or faf_go for the human 6Ws. force: true replaces an existing project.faf with a fresh one, after copying the old file to a backup beside it.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Project path or name. Smart resolution: "my-app" finds ~/Projects/my-app OR ~/Code/my-app. Full paths like ~/Projects/app or /Users/me/code/app work too; ".", "..", "./app" are relative to the active project. Omit to create ~/Projects/unnamed-project; pass the workspace path to init it. Your home folder and the filesystem root are refused.'
          },
          force: { type: 'boolean', description: 'Replace an existing project.faf with a fresh one: every value and comment in it is replaced. The old file is copied to project.faf.bak-<time> first.' }
        },
        additionalProperties: false
      }
    },
    {
      name: 'faf_trust',
      ...hints('Trust Receipt', { readOnly: true, idempotent: true }),
      description: 'Attest the project\'s .faf: faf-cli\'s validateFaf, faf-cli\'s score, and a faf-parity/v1 hash (claude-faf-mcp\'s own spec) of that score that anyone can check with sha256(projection) === parityHash. Returns a trust receipt whose subject is the project. An invalid .faf, or a score that is unknown, gets no receipt (isError). Reads only.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
        },
        additionalProperties: false
      },
      outputSchema: {
        type: 'object',
        description: 'Trust attestation: faf-cli\'s validity and score, and a faf-parity/v1 receipt.',
        properties: {
          valid: { type: 'boolean', description: 'Whether faf-cli\'s validateFaf accepts the .faf' },
          errors: { type: 'array', items: { type: 'string' }, description: 'faf-cli\'s validateFaf errors, when valid is false' },
          hasFaf: { type: 'boolean', description: 'Whether a project.faf was found' },
          subject: { type: 'string', description: 'The project the receipt attests: project.name, else its folder name' },
          score: { type: 'number', description: 'AI-readiness score, 0-100' },
          tier: { type: 'string', description: 'Tier name for this score' },
          path: { type: 'string', description: 'Path that was attested' },
          sourceSha256: { type: 'string', description: 'SHA-256 of the raw .faf bytes' },
          reason: { type: 'string', description: 'Why no receipt was issued' },
          parity: PARITY_SCHEMA,
          receipt: {
            type: 'object',
            description: 'The trust receipt — render-identical, self-verifying score + parity.',
            properties: {
              spec: { type: 'string' },
              seal: { type: 'string', description: 'Quiet-ladder glyph for this score (✪ only at 100)' },
              subject: { type: 'string', description: 'The project: project.name, else its folder name' },
              score: { type: 'number' },
              tier: { type: 'string' },
              tests: { type: ['object', 'null'], description: 'Optional test attestation' },
              issued: { type: ['string', 'null'] }
            },
            required: ['spec', 'seal', 'subject', 'score']
          }
        },
        required: ['valid', 'hasFaf'],
        additionalProperties: true
      }
    },
    {
      name: 'faf_setup',
      ...hints('Session Hook Setup', { readOnly: false, idempotent: true }),
      description: 'Install the native SessionStart hook in the project settings (<project>/.claude/settings.json) — every Claude Code session in this project starts with fresh .faf context. Shows the exact settings first (preview); writes only with confirm: true, install or remove. faf changes only its own hook entry; every other key and hook stays as written. remove: true takes out only the hook whose command is exactly the faf hook command. Never writes the user settings: the home folder is refused.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Project path. Defaults to the current project context.' },
          confirm: { type: 'boolean', description: 'Write the change to the project settings (.claude/settings.json). Without it, faf_setup only previews — install and remove alike.' },
          remove: { type: 'boolean', description: 'Remove the faf SessionStart hook (and only it) from the project settings. Previews unless confirm: true.' }
        },
        additionalProperties: false
      },
      outputSchema: {
        type: 'object',
        description: 'Setup result: what happened (or would happen) to .claude/settings.json.',
        properties: {
          action: { type: 'string', enum: ['preview', 'installed', 'already-installed', 'removed', 'not-installed', 'error'], description: 'What faf_setup did' },
          settingsPath: { type: 'string', description: 'The settings file involved' },
          hookCommand: { type: 'string', description: 'The command the SessionStart hook runs' },
          settings: { type: 'object', description: 'The full settings object as written (or as it would be written in preview)', additionalProperties: true },
          message: { type: 'string', description: 'Human-readable summary' }
        },
        required: ['action', 'settingsPath', 'message'],
        additionalProperties: false
      }
    },
    {
      name: 'faf_sync',
      ...hints('Sync .faf to CLAUDE.md', { readOnly: false, idempotent: true }),
      description: 'Write project.faf into CLAUDE.md as a faf-managed block (faf-cli\'s render and injector), and on request into AGENTS.md (agents), .cursorrules (cursor), GEMINI.md (gemini) and .github/copilot-instructions.md (copilot) — or all of them (all) — with faf-cli\'s writers. Each file keeps every line outside faf\'s block. Returns the files written and any requested file that could not be written, with the reason (then isError). Use it after editing project.faf.',
      inputSchema: {
        type: 'object',
        properties: {
          agents: { type: 'boolean', description: 'Also write AGENTS.md (OpenAI Codex and other agents)' },
          cursor: { type: 'boolean', description: 'Also write .cursorrules (Cursor IDE)' },
          gemini: { type: 'boolean', description: 'Also write GEMINI.md (Google Gemini CLI)' },
          copilot: { type: 'boolean', description: 'Also write .github/copilot-instructions.md (GitHub Copilot)' },
          all: { type: 'boolean', description: 'Write every format: CLAUDE.md + AGENTS.md + .cursorrules + GEMINI.md + .github/copilot-instructions.md' },
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
        },
        additionalProperties: false
      },
      outputSchema: {
        type: 'object',
        description: 'The files faf_sync wrote, and each requested file it could not write.',
        properties: {
          fafPath: { type: 'string', description: 'The .faf the files were written from' },
          score: { type: 'string', description: 'faf-cli\'s score of that .faf, as text ("85%" or "unknown (—)")' },
          filesWritten: { type: 'array', items: { type: 'string' }, description: 'Files written, CLAUDE.md first' },
          filesFailed: {
            type: 'array',
            description: 'Requested files that were not written',
            items: {
              type: 'object',
              properties: { file: { type: 'string' }, reason: { type: 'string' } },
              required: ['file', 'reason']
            }
          }
        },
        required: ['filesWritten', 'filesFailed'],
        additionalProperties: true
      }
    },
    {
      name: 'faf_debug',
      ...hints('Debug Info', { readOnly: true, idempotent: true }),
      description: 'Show this server\'s environment: the active project folder and whether it can be written, the bundled faf-cli version every tool runs on, and the .faf faf-cli finds there. Reads only; it never runs a faf found on PATH.',
      inputSchema: {
        type: 'object',
        properties: {},
        additionalProperties: false
      }
    },
    {
      name: 'faf_read',
      ...hints('Read Project File', { readOnly: true, idempotent: true }),
      description: 'Read a file inside the active project (the one faf_context shows) or a folder listed in FAF_ALLOWED_ROOTS, and return its text. A relative path resolves against the active project. Anything else — your home folder, the filesystem root, a temp folder, ../ out of the project — is refused.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File to read: absolute, or relative to the active project'
          }
        },
        required: ['path'],
        additionalProperties: false
      }
    },
    {
      name: 'faf_list',
      ...hints('List Project Folders', { readOnly: true, idempotent: true }),
      description: 'List a folder inside the active project (or a folder listed in FAF_ALLOWED_ROOTS) and flag the subfolders that hold a project.faf. Links are listed, never followed. Reads only.',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Folder to list, inside the active project or FAF_ALLOWED_ROOTS; a relative path resolves against the active project'
          },
          filter: {
            type: 'string',
            enum: ['faf', 'dirs', 'all'],
            description: 'Filter: "faf" (only dirs with project.faf), "dirs" (all directories), "all" (dirs and files). Default: "dirs"'
          },
          depth: {
            type: 'number',
            enum: [1, 2],
            description: 'Directory depth to scan: 1 (immediate children) or 2 (one level deeper). Default: 1'
          },
          showHidden: {
            type: 'boolean',
            description: 'Show hidden files/directories (starting with .). Default: false'
          }
        },
        required: ['path'],
        additionalProperties: false
      },
      outputSchema: {
        type: 'object',
        description: 'Directory entries, with project.faf discovery flagged per entry.',
        properties: {
          directory: { type: 'string', description: 'Absolute path that was scanned' },
          filter: { type: 'string', description: 'Filter applied: faf | dirs | all' },
          total: { type: 'number', description: 'Number of entries returned' },
          fafProjects: { type: 'number', description: 'How many entries contain a project.faf' },
          entries: {
            type: 'array',
            description: 'The listed entries',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                path: { type: 'string' },
                hasFaf: { type: 'boolean' },
                isDir: { type: 'boolean' },
                isLink: { type: 'boolean', description: 'A link: listed, never followed' }
              },
              required: ['name', 'path', 'hasFaf', 'isDir']
            }
          }
        },
        required: ['directory', 'total', 'entries'],
        additionalProperties: true
      }
    },
    {
      name: 'faf_readme',
      ...hints('6Ws from README', { readOnly: false, idempotent: true }),
      description: 'Read the 6 Ws (Who/What/Why/Where/When/How) from README.md and package.json with faf-cli\'s sourced extractor. Previews by default; apply: true fills only the empty human_context slots in project.faf — a value you wrote is never replaced — and lists the slots it filled.',
      inputSchema: {
        type: 'object',
        properties: {
          apply: { type: 'boolean', description: 'Fill the empty human_context slots in project.faf (default: preview only). Slots that hold a value are left as written.' },
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
        },
        additionalProperties: false
      }
    },
    {
      name: 'faf_human_add',
      ...hints('Set a 6W Slot', { readOnly: false, destructive: true, idempotent: true }),
      description: 'Set one human_context slot (who, what, why, where, when or how) in <folder>/project.faf to the text you give, in place: a value already in that slot is replaced; every other line, comment and value is kept. Returns the file written. faf_go asks for all of them at once.',
      inputSchema: {
        type: 'object',
        properties: {
          field: {
            type: 'string',
            enum: ['who', 'what', 'why', 'where', 'when', 'how'],
            description: 'The 6 W field to set'
          },
          value: { type: 'string', description: 'The value to set for the field' },
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
        },
        required: ['field', 'value'],
        additionalProperties: false
      }
    },
    {
      name: 'faf_check',
      ...hints('Check .faf', { readOnly: true, idempotent: true }),
      description: 'Check the project\'s .faf with faf-cli: validateFaf (required fields such as faf_version and project.name, and the about-block rules) and the scorer\'s state for every slot — populated, empty or slotignored — with the 6Ws listed one by one. Returns valid, the errors and the slot states. Reads only; writes nothing.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
        },
        additionalProperties: false
      },
      outputSchema: {
        type: 'object',
        description: 'faf-cli\'s validity and slot states for the .faf.',
        properties: {
          path: { type: 'string', description: 'The .faf that was checked' },
          valid: { type: 'boolean', description: 'Whether faf-cli\'s validateFaf accepts it' },
          errors: { type: 'array', items: { type: 'string' }, description: 'faf-cli\'s validateFaf errors' },
          score: { type: 'number', description: 'faf-cli\'s score, 0-100 (-1 only with unknown: true)' },
          unknown: { type: 'boolean', description: 'True when the score is not known (an About repo with no about.source_score)' },
          tier: { type: 'string' },
          populated: { type: 'number' },
          empty: { type: 'number' },
          ignored: { type: 'number' },
          active: { type: 'number' },
          slots: {
            type: 'object',
            description: 'Slot paths by state',
            properties: {
              populated: { type: 'array', items: { type: 'string' } },
              empty: { type: 'array', items: { type: 'string' } },
              ignored: { type: 'array', items: { type: 'string' } }
            }
          },
          humanContext: {
            type: 'object',
            description: 'The state of each 6W slot: populated | empty | slotignored',
            additionalProperties: { type: 'string' }
          }
        },
        required: ['path', 'valid', 'errors'],
        additionalProperties: true
      }
    },
    {
      name: 'faf_context',
      ...hints('Active Project', { readOnly: true, idempotent: true }),
      description: 'Show the active project — the folder every faf_* call without a path uses — and the .faf there; pass path to make another folder the active project (your home folder and the filesystem root are refused). detail: true also returns the .faf\'s text. Writes no file. Call it once at the start of a session.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Set active project path. If omitted, shows current context.' },
          detail: { type: 'boolean', description: 'Also return the text of the .faf (read with faf-cli\'s reader), for reading project.faf in one call' }
        },
        additionalProperties: false
      },
      outputSchema: {
        type: 'object',
        description: 'The active project context and whether a project.faf lives there.',
        properties: {
          active: { type: 'string', description: 'Absolute path of the active project' },
          hasFaf: { type: 'boolean', description: 'Whether a project.faf (or .faf) was found there or one level up' },
          filename: { type: ['string', 'null'], description: 'The .faf filename, if found' },
          path: { type: ['string', 'null'], description: 'The .faf file readers use (faf-cli\'s finder: the folder, then one level up), if found' },
          changed: { type: 'boolean', description: 'True if this call set a new context, false if it only reported' },
          content: { type: 'string', description: 'detail: true — the text of the .faf' }
        },
        required: ['active', 'hasFaf', 'changed'],
        additionalProperties: true
      }
    },
    {
      name: 'faf_go',
      ...hints('Guided Interview', { readOnly: false, destructive: true, idempotent: false }),
      description: 'The human half of project.faf. Without answers it returns the Table-of-8 — project name, goal and the 6Ws (who, what, why, where, when, how) — each filled, seeded from the goal, or empty, with faf-cli\'s score and whether the repo can still fill slots (then run faf_auto). With answers (slot path → text) it writes them into <folder>/project.faf in place and returns the new score; a value already in a slot you answer is replaced. With no project.faf yet it runs faf_init and faf_auto first. faf_auto does the stack.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' },
          answers: {
            type: 'object',
            description: 'Answers to apply: a slot path (e.g. "project.goal", "human_context.why", "stack.database") → the answer text. Any other key, or an answer that is not text, is refused and nothing is written. If provided, applies the answers and returns the new score.',
            additionalProperties: { type: 'string' }
          }
        },
        additionalProperties: false
      }
    },
    {
      name: 'faf_auto',
      ...hints('Fill from the Repo', { readOnly: false, idempotent: true }),
      description: 'Create <folder>/project.faf, or fill the empty slots of the one there, with faf-cli\'s detection over the repo\'s own files (package.json, Cargo.toml, pyproject.toml, go.mod…) — no hardcoded defaults. Values already there are kept (a typed None in a tech slot takes a repo fact), and every value it changes is listed. Then writes CLAUDE.md\'s faf-managed block. Returns what was filled and faf-cli\'s score before and after. faf_go does the human 6Ws.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
        },
        additionalProperties: false
      }
    },
    {
      name: 'faf_bench',
      ...hints('Grounding Benchmark', { readOnly: true, idempotent: true }),
      description: 'Prove the .faf earns its place — measure how much the context is worth, on THIS repo, falsifiably. Questions derive from the project.faf\'s own populated slots (the .faf is the answer key), so grading is mechanical — no judge, no rubric. action=questions returns the answer-key-safe question set; action=grade takes your answers WITHOUT the .faf (cold) and WITH it (faf), grades both, and returns the cold→with-faf lift with a receipt hash. The delta is the product; the cold number belongs to the absence of context, never to FAF. Reads only.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Project path (optional — the active project if omitted).' },
          action: {
            type: 'string',
            enum: ['questions', 'grade'],
            description: 'questions = get the answer-key-safe question set to answer; grade = submit cold + with-faf answers to score the delta. Default: questions.'
          },
          cold: {
            type: 'object',
            description: 'action=grade: answers produced WITHOUT the .faf (general repo knowledge only). Map of question number → answer string.',
            additionalProperties: { type: 'string' }
          },
          faf: {
            type: 'object',
            description: 'action=grade: answers produced WITH the project.faf in context. Map of question number → answer string.',
            additionalProperties: { type: 'string' }
          },
          coldTokens: { type: 'number', description: 'action=grade (optional): tokens spent answering cold.' },
          fafTokens: { type: 'number', description: 'action=grade (optional): tokens spent answering with the .faf.' },
          model: { type: 'string', description: 'action=grade (optional): the model that produced the answers.' }
        },
        additionalProperties: false
      },
      outputSchema: {
        type: 'object',
        description: 'Question set (action=questions) or the cold→with-faf grading and its receipt (action=grade).',
        properties: {
          action: { type: 'string' },
          version: { type: 'string' },
          qsetHash: { type: 'string', description: 'Hash of the question set — rides the receipt; same .faf reproduces it.' },
          protocol: { type: 'string', description: 'in-session — answers are self-reported by the agent under test.' },
          total: { type: 'number', description: 'Number of questions in the set.' },
          questions: {
            type: 'array',
            description: 'action=questions only — NEVER includes the answer key.',
            items: {
              type: 'object',
              properties: {
                n: { type: 'number' },
                path: { type: 'string', description: 'The .faf slot this question probes.' },
                question: { type: 'string' }
              }
            }
          },
          cold: {
            type: 'object',
            description: 'action=grade — score WITHOUT context (absence baseline).',
            properties: {
              correct: { type: 'number' },
              total: { type: 'number' },
              misses: { type: 'array', items: { type: 'string' }, description: 'Slots missed (paths only — no answer key).' }
            }
          },
          faf: {
            type: 'object',
            description: 'action=grade — score WITH the .faf.',
            properties: {
              correct: { type: 'number' },
              total: { type: 'number' },
              misses: { type: 'array', items: { type: 'string' } }
            }
          },
          delta: { type: 'number', description: 'with-faf minus cold — the product.' },
          receipt: {
            type: 'object',
            description: 'faf-cli\'s bench receipt — sha256 over the canonical projection; third-party verifiable.',
            properties: {
              projection: { type: 'string' },
              hash: { type: 'string' }
            }
          }
        }
      }
    },
    {
      name: 'faf_dna',
      ...hints('Project DNA', { readOnly: true, idempotent: true }),
      description: 'Show the project\'s .faf-dna lineage, read with faf-cli: the birth score faf_init recorded, every score since (faf_auto and faf_go add them) and the journey line. Reads only; writes nothing.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
        },
        additionalProperties: false
      },
      outputSchema: {
        type: 'object',
        description: 'The project\'s score history: birth DNA, current score, growth, and milestones.',
        properties: {
          hasFaf: { type: 'boolean', description: 'Whether a project.faf (or .faf) was found' },
          hasDna: { type: 'boolean', description: 'Whether a .faf-dna lineage is there' },
          path: { type: 'string', description: 'The .faf-dna file read' },
          birthScore: { type: 'number', description: 'Score at birth' },
          currentScore: { type: 'number', description: 'Current score' },
          totalGrowth: { type: 'number', description: 'currentScore - birthScore' },
          daysActive: { type: 'number', description: 'Days active, as the lineage records it' },
          born: { type: 'string', description: 'When the lineage began' },
          certificate: { type: ['string', 'null'], description: 'Birth certificate ID' },
          journey: { type: 'string', description: 'The one-line journey, e.g. "22% → 85% → 99%"' },
          versions: { type: 'number', description: 'Scores recorded' },
          readOnly: { type: ['string', 'null'], description: 'Why faf will not add to this .faf-dna (another tool\'s shape, hand edits), or null' },
          milestones: {
            type: 'array',
            description: 'Recorded milestones',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string' },
                score: { type: 'number' },
                date: { type: 'string' },
                version: { type: 'string' }
              }
            }
          }
        },
        required: ['hasFaf', 'hasDna'],
        additionalProperties: true
      }
    },
    {
      name: 'faf_formats',
      ...hints('Formats Found', { readOnly: true, idempotent: true }),
      description: 'Show the file formats faf-cli finds in the project folder (never above it) and what faf_auto would write into project.faf from them — a dry run. Reads only; writes nothing.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' },
          json: { type: 'boolean', description: 'Return results as JSON' }
        },
        additionalProperties: false
      },
      outputSchema: {
        type: 'object',
        description: 'Formats faf-cli found in the project folder, and a dry run of what faf_auto would write.',
        properties: {
          directory: { type: 'string', description: 'Directory that was scanned' },
          count: { type: 'number', description: 'Number of known formats discovered' },
          elapsedMs: { type: 'number', description: 'Discovery time in milliseconds' },
          stackSignature: { type: 'string', description: 'faf-cli\'s stack signature' },
          formats: {
            type: 'array',
            description: 'Discovered formats, each with the file it came from',
            items: {
              type: 'object',
              properties: {
                fileName: { type: 'string' },
                path: { type: 'string', description: 'The file the format was found in' },
                category: { type: 'string' },
                priority: { type: 'number' }
              },
              required: ['fileName']
            }
          },
          target: { type: 'string', description: 'The project.faf faf_auto writes' },
          creates: { type: 'boolean', description: 'True when faf_auto would create project.faf' },
          wouldFill: {
            type: 'object',
            description: 'Empty slots faf_auto would fill → the value it would write',
            additionalProperties: true
          },
          wouldIgnore: { type: 'array', items: { type: 'string' }, description: 'Empty slots faf_auto would mark slotignored (the app-type leaves them out)' },
          wouldChange: { type: 'array', items: { type: 'string' }, description: 'Values the file holds that faf_auto would change ("path: old → new")' }
        },
        required: ['directory', 'count', 'formats'],
        additionalProperties: true
      }
    },
    {
      name: 'faf_quick',
      ...hints('Quick Create', { readOnly: false, idempotent: true }),
      description: 'Create a new project.faf from one line: "name, goal, language, framework, hosting" (name and goal required). faf-cli detects the rest from the folder; each word you give goes in the slot it names, and a framework faf cannot place is reported, not guessed. Returns the file and faf-cli\'s score. Only creates: when a project.faf (or .faf) is already there it writes nothing — use faf_auto to fill it.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' },
          input: { type: 'string', description: 'Quick input: "project-name, goal, language, framework, hosting" (minimum: name, goal)' }
        },
        required: ['input'],
        additionalProperties: false
      }
    },
    {
      name: 'faf_doctor',
      ...hints('Diagnose .faf', { readOnly: true, idempotent: true }),
      description: 'Diagnose the project\'s .faf: faf-cli\'s validateFaf errors, faf-cli\'s score with every empty slot and the tool that fills it (faf_auto from the repo, faf_go for the 6Ws), whether CLAUDE.md is there, and the formats faf-cli finds in the folder. Returns a checklist of findings, each with its fix. Reads only. Use it when faf_score is below 100%.',
      inputSchema: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
        },
        additionalProperties: false
      },
      outputSchema: {
        type: 'object',
        description: 'Health check: an overall verdict plus per-check diagnostics with fixes.',
        properties: {
          health: { type: 'string', description: 'Overall verdict: ok | warning | error' },
          checks: { type: 'number', description: 'Number of checks run' },
          errors: { type: 'number', description: 'Count of error-level findings' },
          warnings: { type: 'number', description: 'Count of warning-level findings' },
          valid: { type: ['boolean', 'null'], description: 'faf-cli\'s validateFaf verdict, or null when no .faf could be read' },
          score: { type: ['number', 'null'], description: 'faf-cli\'s score (-1 only with unknown: true), or null when not scored' },
          unknown: { type: 'boolean', description: 'True when the score is not known (an About repo with no about.source_score)' },
          diagnostics: {
            type: 'array',
            description: 'Per-check results',
            items: {
              type: 'object',
              properties: {
                status: { type: 'string', description: 'ok | warning | error' },
                message: { type: 'string' },
                fix: { type: 'string', description: 'Suggested fix, if any' }
              },
              required: ['status', 'message']
            }
          }
        },
        required: ['health', 'checks', 'diagnostics'],
        additionalProperties: true
      }
    },
    // ============================================================================
    // Interop exports — faf-cli's renders and writers (conductor/ is local)
    // ============================================================================
    {
      name: 'faf_agents',
      ...hints('Write AGENTS.md', { readOnly: false, idempotent: true }),
      description: 'Write project.faf into AGENTS.md (OpenAI Codex and other agents) as a faf-managed block: faf-cli\'s render, enriched from the repo, written by faf-cli (the bytes faf-cli\'s own export writes). A file already there keeps every line outside the block; the block is updated in place on later runs.',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['export', 'sync'], description: 'Action: export (.faf -> AGENTS.md), sync (same as export — project.faf is the source of truth)' },
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
        },
        required: ['action'],
        additionalProperties: false
      }
    },
    {
      name: 'faf_cursor',
      ...hints('Write .cursorrules', { readOnly: false, idempotent: true }),
      description: 'Write project.faf into .cursorrules (Cursor IDE) as a faf-managed block: faf-cli\'s render, written by faf-cli. A file already there keeps every line outside the block; the block is updated in place on later runs.',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['export', 'sync'], description: 'Action: export (.faf -> .cursorrules), sync (same as export — project.faf is the source of truth)' },
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
        },
        required: ['action'],
        additionalProperties: false
      }
    },
    {
      name: 'faf_gemini',
      ...hints('Write GEMINI.md', { readOnly: false, idempotent: true }),
      description: 'Write project.faf into GEMINI.md (Google Gemini CLI) as a faf-managed block: faf-cli\'s render, enriched from the repo, written by faf-cli. A file already there keeps every line outside the block; the block is updated in place on later runs.',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['export', 'sync'], description: 'Action: export (.faf -> GEMINI.md), sync (same as export — project.faf is the source of truth)' },
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
        },
        required: ['action'],
        additionalProperties: false
      }
    },
    {
      name: 'faf_conductor',
      ...hints('Write Conductor Files', { readOnly: false, idempotent: true }),
      description: 'Write project.faf into Google Conductor\'s conductor/ folder — product.md, tech-stack.md, workflow.md and product-guidelines.md — as one faf-managed block per file, from faf-cli\'s keys (empty, placeholder and slotignored values left out). A file already there keeps every line outside the block.',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['export'], description: 'Action: export (.faf -> conductor/)' },
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
        },
        required: ['action'],
        additionalProperties: false
      }
    },
    {
      name: 'faf_git',
      ...hints('Author from a Git Repo', { readOnly: false, idempotent: false, openWorld: true }),
      description: 'Author a project.faf for a repository by URL. Uses the network: faf clones the repo with git (a shallow `git clone`, into a temp folder it removes afterwards), runs faf-cli\'s detection on it and reports faf-cli\'s score. With path, writes <path>/project.faf only when that folder has none (faf_auto fills an existing one); without path, writes nothing and returns the .faf.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Repository URL: owner/repo (GitHub) or https://github.com/owner/repo' },
          path: { type: 'string', description: 'An existing project folder to write project.faf into (a new file only). If omitted, returns the content without writing.' }
        },
        required: ['url'],
        additionalProperties: false
      }
    },
    {
      name: 'faf_tri_sync',
      ...hints('Tri-Sync to MEMORY.md', { readOnly: false, idempotent: true }),
      description: 'Write project.faf as a faf-managed block into the MEMORY.md Claude Code loads for this project (~/.claude/projects/<project-id>/memory/MEMORY.md, or under CLAUDE_CONFIG_DIR). Only the block changes; every note of Claude\'s is kept, and the reply says so only after reading the file back. action: status reads only. faf_sync writes CLAUDE.md.',
      inputSchema: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: ['export', 'status'],
            description: 'export = write faf\'s block into MEMORY.md (default), status = show what MEMORY.md holds (reads only)'
          },
          path: {
            type: 'string',
            description: 'Project path. Sets session context for subsequent calls.'
          }
        },
        additionalProperties: false
      }
    },
    {
      name: 'faf_etch',
      ...hints('Etch Memory', { readOnly: false, idempotent: false }),
      description: 'Remember a decision, gotcha, or win across sessions by writing it to the project soul (soul.fafm) with faf-cli\'s Soul. Returns the stored memory and the soul\'s size. Re-etching an id updates that memory in place. Use it to persist something an AI should recall later; faf_recall reads them back.',
      inputSchema: {
        type: 'object',
        properties: {
          text: { type: 'string', description: 'The memory to remember — capture the why (decision/gotcha/win)' },
          id: { type: 'string', description: 'Stable id — re-etching the same id updates in place (dedup)' },
          type: { type: 'string', enum: ['project', 'reference', 'user', 'feedback'], description: 'Memory category' },
          priority: { type: 'string', enum: ['ephemeral', 'standard', 'high', 'critical'], description: 'Recall ranks by priority then recency' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Tags (e.g. decision, gotcha, win) for filtering + recall coupling' },
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
        },
        required: ['text'],
        additionalProperties: false
      },
      outputSchema: {
        type: 'object',
        description: 'The etched fact + soul state.',
        properties: {
          etched: {
            type: 'object',
            properties: {
              text: { type: 'string' }, id: { type: ['string', 'null'] }, type: { type: ['string', 'null'] },
              priority: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, timestamp: { type: 'string' }
            }
          },
          soul: { type: 'string', description: 'Path to soul.fafm' },
          total: { type: 'number', description: 'Total memories in the soul' },
          namepoint: { type: 'string' }
        },
        required: ['etched', 'soul'],
        additionalProperties: true
      }
    },
    {
      name: 'faf_recall',
      ...hints('Recall Memory', { readOnly: true, idempotent: true }),
      description: 'Recall memories from the project soul (soul.fafm), ranked by priority then recency, filtered by query/tags/type. Returns the matching entries. Reads only. Use it to surface past decisions; faf_etch adds new ones.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Case-insensitive substring match on memory text (optional)' },
          tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tag intersection' },
          type: { type: 'string', description: 'Filter by memory type' },
          minPriority: { type: 'string', enum: ['ephemeral', 'standard', 'high', 'critical'], description: 'Priority floor (default ephemeral)' },
          limit: { type: 'number', description: 'Max memories to return' },
          path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
        },
        additionalProperties: false
      },
      outputSchema: {
        type: 'object',
        description: 'Ranked memories from the soul.',
        properties: {
          memories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' }, id: { type: ['string', 'null'] }, type: { type: ['string', 'null'] },
                priority: { type: 'string' }, tags: { type: 'array', items: { type: 'string' } }, timestamp: { type: ['string', 'null'] }
              }
            }
          },
          total: { type: 'number', description: 'Number returned' },
          soulTotal: { type: 'number', description: 'Total memories in the soul' },
          soul: { type: 'string' }
        },
        required: ['memories', 'total'],
        additionalProperties: true
      }
    }
  ] as Tool[];
}

/** Every tool by name, Core and Extended, and its compiled argument check —
 *  built once, when the module loads. */
const TOOL_DEFS = new Map(toolList().map((t) => [t.name, t]));
const VALIDATORS = new Map(
  [...TOOL_DEFS].map(([name, t]) => [name, schemaValidator.getValidator(t.inputSchema as Parameters<AjvJsonSchemaValidator['getValidator']>[0])]),
);

/** A copy of JSON-shaped arguments in which every object has no prototype, so
 *  a check reads only the caller's own keys at every depth. */
function ownCopy(v: unknown): unknown {
  if (Array.isArray(v)) {return v.map(ownCopy);}
  if (isMapping(v)) {
    const out: Record<string, unknown> = Object.create(null);
    for (const k of Object.keys(v)) {out[k] = ownCopy(v[k]);}
    return out;
  }
  return v;
}

/** The call's arguments checked against the tool's inputSchema (Ajv): null
 *  when they fit, else the one plain line of what is wrong. */
function invalidArguments(def: Tool, args: unknown): string | null {
  if (!isMapping(args)) {
    return `${def.name}: invalid arguments — they must be an object (name → value). Nothing was run.`;
  }
  const validate = VALIDATORS.get(def.name);
  if (!validate) {return null;}
  const result = validate(ownCopy(args));
  return result.valid ? null : `${def.name}: ${describeInvalid(def.inputSchema, args, result.errorMessage ?? '')} Nothing was run.`;
}

export class FafToolHandler {
  constructor(private engineAdapter: FafEngineAdapter) {}

  /**
   * The one session-path resolver: every handler gets its folder here.
   *
   *  - No path: the active session project.
   *  - A path: `~` and `~/…` are your home folder; any other relative path
   *    ('.', '..', './x', 'x') resolves against the active session project —
   *    never against the folder the server started in, never ~/Projects. It is
   *    confined (FAF_ALLOWED_ROOTS when set; a file must be a .faf/.fafm, and
   *    stands for its folder).
   *  - The folder must exist, unless the tool creates it (faf_init).
   *  - A writer refuses your home folder and the filesystem root: faf-cli's
   *    isNonProjectRoot compares device and inode, so no other spelling of
   *    home (case, a link) gets past it.
   *  - Only then does a path become the session project, and never home or the
   *    filesystem root: a refused call leaves the session where it was.
   * A path that escapes FAF_ALLOWED_ROOTS throws PathConfinementError, caught
   * centrally in callTool() (CWE-22/73/200) — before the session moves.
   */
  private async resolveDir(
    tool: string,
    input: unknown,
    opts: { write?: boolean; create?: boolean; homeRefusal?: (dir: string) => string } = {},
  ): Promise<Resolved> {
    const session = this.engineAdapter.getWorkingDirectory();
    const explicit = input !== undefined && input !== null && input !== '';
    if (explicit && typeof input !== 'string') {
      return { ok: false, message: `${tool}: path must be text.` };
    }

    let dir = session;
    if (explicit && typeof input === 'string') {
      const resolved = confinePath(pathModule.resolve(session, expandTilde(input)));
      let isFile = false;
      try { isFile = fs.statSync(resolved).isFile(); } catch { /* missing: checked below */ }
      dir = isFile ? pathModule.dirname(resolved) : resolved;
    }

    let isDir: boolean | null = null; // null: nothing there
    try { isDir = fs.statSync(dir).isDirectory(); } catch { isDir = null; }
    if (isDir === false) {
      return { ok: false, dir, message: `${tool}: ${dir} is not a folder. Nothing was changed.` };
    }
    if (isDir === null && !opts.create) {
      return {
        ok: false,
        dir,
        message: explicit
          ? `${tool}: path not found: ${String(input)} (${dir}). Nothing was changed; the active project is still ${session}.`
          : `${tool}: the active project ${dir} is not there any more. Pass path, or set the project with faf_context.`,
      };
    }

    const { isNonProjectRoot } = await fafCli;
    const nonProject = isNonProjectRoot(dir);
    if (nonProject && opts.write) {
      const why = opts.homeRefusal
        ? opts.homeRefusal(dir)
        : `${dir} is your home folder (or the filesystem root), not a project, so ${tool} writes nothing there.`;
      return {
        ok: false,
        dir,
        message: explicit
          ? `${tool}: ${why} Nothing was changed; the active project is still ${session}.`
          : `${tool}: the active project is ${dir} (the folder the server started in). ${why} Pass path, or set the project with faf_context.`,
      };
    }

    if (explicit && isDir && !nonProject) {
      this.engineAdapter.setWorkingDirectory(dir);
    }
    return { ok: true, dir, explicit };
  }

  /** A resolver refusal as a tool result. */
  private refused(r: { message: string }): CallToolResult {
    return { content: [{ type: 'text', text: r.message }], isError: true };
  }

  /**
   * The one .faf finder for readers: faf-cli's findFafFile (project.faf, else
   * .faf; the folder, then one level up). A .faf that is a link out of its
   * folder throws faf-cli's SafePathError. Writers never use it to pick their
   * target: they write <folder>/project.faf exactly.
   */
  private async findFaf(dir: string): Promise<FoundFaf | null> {
    const { findFafFile } = await fafCli;
    const found = findFafFile(dir);
    if (!found) {return null;}
    const fafDir = pathModule.dirname(pathModule.resolve(found));
    return { path: found, filename: pathModule.basename(found), dir: fafDir, above: fafDir !== pathModule.resolve(dir) };
  }

  /**
   * The project.faf a filling writer edits: <dir>/project.faf exactly, never a
   * .faf found above the folder. When it is not there, the refusal names the
   * .faf the readers use, if there is one.
   */
  private async targetFaf(tool: string, dir: string): Promise<{ ok: true; path: string } | { ok: false; message: string }> {
    const target = pathModule.join(dir, 'project.faf');
    if (present(target)) {return { ok: true, path: target };}
    let nearest: FoundFaf | null = null;
    try { nearest = await this.findFaf(dir); } catch { /* faf_status names a refused file */ }
    const also = !nearest ? ''
      : nearest.above
        ? ` The .faf the readers use is ${where(nearest)}; pass ${nearest.dir} as path to fill that one.`
        : ` ${nearest.path} is the older file name: faf_auto writes project.faf from it (the .faf is kept).`;
    return { ok: false, message: `${tool}: no project.faf in ${dir}, so nothing was written.${also} faf_init creates one here.` };
  }

  /** Where faf_read and faf_list may look: the active session project plus
   *  FAF_ALLOWED_ROOTS — never the home folder or the filesystem root, and no
   *  temp folders. Relative paths resolve against the active project. */
  private async fileOpContext(): Promise<FileOpContext> {
    const { isNonProjectRoot } = await fafCli;
    const base = this.engineAdapter.getWorkingDirectory();
    const roots = [base, ...allowedRoots()].filter((r) => !isNonProjectRoot(r));
    return { roots, base };
  }

  /** Record a new score on the .faf-dna lineage, when faf wrote one (faf-cli's
   *  FafDNAManager). Returns one line for the reply, or null. */
  private async recordGrowth(dir: string, score: number, change: string): Promise<string | null> {
    try {
      const { FafDNAManager } = await fafCli;
      const dna = new FafDNAManager(dir);
      if (!dna.exists()) {return null;}
      const before = dna.load()?.versions.length ?? 0;
      const grown = dna.recordGrowth(score, [change]);
      const why = dna.readOnlyReason();
      if (why) {return `.faf-dna left as it is: ${why}`;}
      return grown && grown.versions.length > before ? `.faf-dna: ${dna.getJourney()}` : null;
    } catch (error) {
      return `.faf-dna not written: ${oneLine(error)}`;
    }
  }

  async listTools() {
    const allTools = toolList();
    // Core-tier gate: advertise only the Core by default; FAF_TOOLS=all (or
    // FAF_EXTENDED=1) exposes the full set. Dispatch in callTool keeps every
    // case, so Extended tools stay callable by name even when un-advertised.
    const showAll = process.env.FAF_TOOLS === 'all' || process.env.FAF_EXTENDED === '1';
    return { tools: showAll ? allTools : allTools.filter((t) => CORE_TOOLS.has(t.name)) };
  }

  /**
   * One tool call. A name that is no tool is refused with McpError
   * InvalidParams (-32602); a retired tool or argument gets its one line; the
   * arguments are checked against the tool's inputSchema before its handler
   * runs, so a wrong type, a missing required argument, an unknown argument or
   * an action outside the enum is isError and runs nothing. Every failure
   * after that comes back as an isError result with a readable line — never a
   * JSON-RPC -32603.
   */
  async callTool(name: string, rawArgs: unknown): Promise<CallToolResult> {
    if (!name || typeof name !== 'string') {
      throw new McpError(ErrorCode.InvalidParams, 'Tool name must be a non-empty string');
    }

    const retired = RETIRED_TOOLS.get(name);
    if (retired) {
      return { content: [{ type: 'text', text: retired }], isError: true };
    }

    const def = TOOL_DEFS.get(name);
    if (!def) {
      throw new McpError(ErrorCode.InvalidParams, `Unknown tool: ${name}. tools/list names every tool (FAF_TOOLS=all lists the Extended ones too).`);
    }

    // Only the caller's own keys: a flag or path the caller did not send reads
    // as undefined, whatever Object.prototype holds.
    const given = rawArgs === undefined || rawArgs === null ? {} : rawArgs;
    const args = argsOf(given);
    const retiredArg = retiredArgument(name, args);
    if (retiredArg) {
      return { content: [{ type: 'text', text: retiredArg }], isError: true };
    }
    let invalid: string | null;
    try {
      invalid = invalidArguments(def, given);
    } catch (err) {
      invalid = `${name}: the arguments could not be checked (${oneLine(err)}). Nothing was run.`;
    }
    if (invalid) {
      return { content: [{ type: 'text', text: invalid }], isError: true };
    }

    try {
    switch (name) {
      case 'faf':
        return await this.handleFaf(args);
      case 'faf_status':
        return await this.handleFafStatus(args);
      case 'faf_score':
        return await this.handleFafScore(args);
      case 'faf_init':
        return await this.handleFafInit(args);
      case 'faf_trust':
        return await this.handleFafTrust(args);
      case 'faf_setup':
        return await this.handleFafSetup(args);
      case 'faf_sync':
        return await this.handleFafSync(args);
      case 'faf_debug':
        return await this.handleFafDebug(args);
      case 'faf_about':
        return await this.handleFafAbout(args);
      case 'faf_read':
        return await this.handleFafReadTool(args);
      case 'faf_list':
        return await this.handleFafList(args);
      case 'faf_readme':
        return await this.handleFafReadme(args);
      case 'faf_human_add':
        return await this.handleFafHumanAdd(args);
      case 'faf_check':
        return await this.handleFafCheck(args);
      case 'faf_context':
        return await this.handleFafContext(args);
      case 'faf_go':
        return await this.handleFafGo(args);
      case 'faf_bench':
        return await this.handleFafBench(args);
      case 'faf_auto':
        return await this.handleFafAuto(args);
      case 'faf_dna':
        return await this.handleFafDna(args);
      case 'faf_formats':
        return await this.handleFafFormats(args);
      case 'faf_quick':
        return await this.handleFafQuick(args);
      case 'faf_doctor':
        return await this.handleFafDoctor(args);
      // Interop exports
      case 'faf_agents':
        return await this.handleFafAgents(args);
      case 'faf_cursor':
        return await this.handleFafCursor(args);
      case 'faf_gemini':
        return await this.handleFafGemini(args);
      case 'faf_conductor':
        return await this.handleFafConductor(args);
      case 'faf_git':
        return await this.handleFafGit(args);
      case 'faf_tri_sync':
        return await this.handleFafTriSync(args);
      case 'faf_etch':
        return await this.handleFafEtch(args);
      case 'faf_recall':
        return await this.handleFafRecall(args);
      default:
        throw new Error(`no handler is wired for ${name}`);
    }
    } catch (err) {
      // Path-confinement violations from resolveDir() (CWE-22/73/200) are
      // raised before the session moves. Every other failure is one readable
      // line in an isError result, so the model can read it and recover.
      if (err instanceof PathConfinementError) {
        return { content: [{ type: 'text', text: `PATH DENIED\n\n${err.message}` }], isError: true };
      }
      return { content: [{ type: 'text', text: `${name} failed: ${oneLine(err)}` }], isError: true };
    }
  }

  /**
   * `faf` — the start: which project, which .faf, faf-cli's score, and the
   * steps. The name comes from the .faf (project.name, the older `project:`
   * lifted) or, with no .faf yet, from faf-cli's detection (assembleFreshFaf,
   * nothing written). Reads only.
   */
  private async handleFaf(args: any): Promise<CallToolResult> {
    const r = await this.resolveDir('faf', args.path);
    if (!r.ok) {return this.refused(r);}
    const dir = r.dir;
    const { assembleFreshFaf, readFafRaw, scoreFafYaml, scoreText, isNonProjectRoot } = await fafCli;
    if (isNonProjectRoot(dir)) {
      return {
        content: [{ type: 'text', text: `The active project is ${dir}: your home folder (or the filesystem root), not a project. Pass the project folder as path (faf { path: "…" }), or set it with faf_context.` }],
      };
    }

    let found: FoundFaf | null = null;
    let refusal: string | null = null;
    try { found = await this.findFaf(dir); } catch (error) { refusal = oneLine(error); }

    let name: string | null = null;
    let score: string | null = null;
    if (found) {
      try {
        const project = (await readFafData(found.path)).data.project;
        if (isMapping(project) && typeof project.name === 'string' && project.name.trim()) {name = project.name.trim();}
      } catch { /* faf_doctor says what is wrong with the file */ }
      try { score = scoreText(scoreFafYaml(readFafRaw(found.path))); } catch { /* ditto */ }
    }
    if (!name && !found) {
      try {
        const project = assembleFreshFaf(dir).project;
        if (isMapping(project) && typeof project.name === 'string' && project.name.trim()) {name = project.name.trim();}
      } catch { /* detection is a nicety here */ }
    }

    const fafLine = found
      ? `.faf: ${where(found)}${score ? ` — ${score} (faf-cli)` : ''}`
      : refusal ? `.faf: refused — ${refusal}` : '.faf: none yet';
    const text = [
      `Project: ${name ?? pathModule.basename(dir)}`,
      `Folder: ${dir}`,
      fafLine,
      '',
      'Confirm this is the project (or pass its path), then run:',
      `1. faf_auto — ${found ? 'fills the empty slots of this project.faf from the repo (values already there are kept)' : 'creates project.faf from the repo'}.`,
      '2. faf_score (details: true) — the score, and every slot still empty.',
      '3. faf_go — the goal and the 6Ws only a person can give; repeat until faf_score says 100%.',
      '4. faf_trust — the receipt for that score.',
      '5. faf_sync and faf_tri_sync — CLAUDE.md and MEMORY.md from project.faf.',
    ].join('\n');
    return { content: [{ type: 'text', text }] };
  }

  /** faf_read: inside the active project (or FAF_ALLOWED_ROOTS) only; a
   *  relative path resolves against the active project. Reading a .faf makes
   *  its folder the session project (never home or '/'). */
  private async handleFafReadTool(args: any): Promise<CallToolResult> {
    const ctx = await this.fileOpContext();
    const readResult = await handleFafRead(args, ctx);
    if (!readResult.isError && typeof args.path === 'string' && isFafContextFile(args.path)) {
      try {
        await this.resolveDir('faf_read', pathModule.resolve(ctx.base, expandTilde(args.path)));
      } catch {
        // Outside FAF_ALLOWED_ROOTS for the .faf tools: the session stays.
      }
    }
    return readResult;
  }

  private async handleFafStatus(args: any): Promise<CallToolResult> {
    // Native implementation - no CLI needed!
    const r = await this.resolveDir('faf_status', args.path);
    if (!r.ok) {return this.refused(r);}
    const cwd = r.dir;

    try {
      // faf-cli's finder (the folder, then one level up): a .faf that is a link
      // out of its folder is refused and never read into the reply.
      const fafResult = await this.findFaf(cwd);

      if (!fafResult) {
        return {
          content: [{
            type: 'text',
            text: `🤖 Claude FAF Project Status:\n\n❌ No project.faf (or .faf) in ${cwd} or the folder above it\n💡 Run faf_init to create project.faf`
          }],
          structuredContent: { hasFaf: false, filename: null, path: null, directory: cwd }
        };
      }

      const { readFafRaw } = await fafCli;
      const fafContent = readFafRaw(fafResult.path);
      const lines = fafContent.split('\n').slice(0, 20);

      return {
        content: [{
          type: 'text',
          text: `🤖 Claude FAF Project Status:\n\n✅ ${where(fafResult)}\n\nContent preview:\n${lines.join('\n')}`
        }],
        structuredContent: { hasFaf: true, filename: fafResult.filename, path: fafResult.path, directory: cwd }
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `🤖 Claude FAF Project Status:\n\n❌ Error: ${error.message}`
        }],
        structuredContent: { hasFaf: false, filename: null, path: null, directory: cwd },
        isError: true
      };
    }
  }

  // ── FAFm Memory layer ── etch/recall over the project soul (.fafm), composed
  // from faf-cli's Soul (the one `faf memory etch` uses). Loading and saving
  // through it keeps what a soul carries beyond its facts: comments, key order,
  // the version, a hand-kept index, facts or sessions in a shape faf does not
  // model (a change that would rewrite one is refused), unknown keys. Re-etching
  // an id merges into that fact (links, source, tags and extra fields kept; a
  // priority is never lowered unless one is passed). The save is faf-cli's safe
  // write: inside the project, atomic, never through a link out of it.
  private async handleFafEtch(args: any): Promise<CallToolResult> {
    // The folder must exist (faf_etch creates no folders) and be a project.
    const r = await this.resolveDir('faf_etch', args.path, { write: true });
    if (!r.ok) {return this.refused({ message: `${r.message} soul.fafm was not written; faf_etch creates no folders.` });}
    const cwd = r.dir;
    const soulPath = pathModule.join(cwd, 'soul.fafm');
    const namepoint = `@claude-code:${pathModule.basename(cwd)}`;
    const existed = fs.existsSync(soulPath);
    try {
      const { FafmSoul } = await fafCli;
      const soul = existed
        ? FafmSoul.load(soulPath)
        : new FafmSoul(namepoint, { profile: 'knowledge' });
      const fact = soul.etch(args.text, { id: args.id, type: args.type, priority: args.priority, tags: args.tags });
      soul.save(soulPath);
      const tagStr = fact.tags.length ? ', ' + fact.tags.join('/') : '';
      return {
        content: [{ type: 'text', text:
          `Etched to soul.fafm: "${fact.text}"${fact.id ? ` [${fact.id}]` : ''} (${fact.priority}${tagStr})\n` +
          `${soul.facts.length} ${soul.facts.length === 1 ? 'memory' : 'memories'} in the soul.` }],
        structuredContent: {
          etched: { text: fact.text, id: fact.id ?? null, type: fact.type ?? null, priority: fact.priority, tags: fact.tags, timestamp: fact.timestamp },
          soul: soulPath, total: soul.facts.length, namepoint: soul.namepoint
        }
      };
    } catch (error: any) {
      return { content: [{ type: 'text', text: `faf_etch: ${notWritten(soulPath, error, existed)}` }], isError: true };
    }
  }

  private async handleFafRecall(args: any): Promise<CallToolResult> {
    const r = await this.resolveDir('faf_recall', args.path);
    if (!r.ok) {return this.refused(r);}
    const cwd = r.dir;
    const soulPath = pathModule.join(cwd, 'soul.fafm');
    if (!fs.existsSync(soulPath)) {
      return {
        content: [{ type: 'text', text: `No soul.fafm in ${cwd}. Use faf_etch to remember the first thing.` }],
        structuredContent: { memories: [], total: 0, soulTotal: 0, soul: soulPath }
      };
    }
    try {
      // faf-cli's Soul reads a bare-string fact as a fact with that text.
      const { FafmSoul } = await fafCli;
      const soul = FafmSoul.load(soulPath);
      const hits = soul.recall({ query: args.query, tags: args.tags, type: args.type, minPriority: args.minPriority, limit: args.limit });
      const lines = hits.map((f) => `- [${f.priority}] ${f.text}${f.tags.length ? ` (${f.tags.join('/')})` : ''}${f.id ? ` {${f.id}}` : ''}`);
      return {
        content: [{ type: 'text', text: hits.length
          ? `${hits.length} ${hits.length === 1 ? 'memory' : 'memories'} recalled:\n${lines.join('\n')}`
          : `No memories matched (${soul.facts.length} in the soul).` }],
        structuredContent: {
          memories: hits.map((f) => ({ text: f.text, id: f.id ?? null, type: f.type ?? null, priority: f.priority, tags: f.tags, timestamp: f.timestamp ?? null })),
          total: hits.length, soulTotal: soul.facts.length, soul: soulPath
        }
      };
    } catch (error: any) {
      return { content: [{ type: 'text', text: `faf_recall failed: ${error?.message ?? String(error)}` }], isError: true };
    }
  }

  /** Slot paths by state, from faf-cli's score. */
  private slotLists(result: { slots: Record<string, string> }): { populated: string[]; empty: string[]; ignored: string[] } {
    const entries = Object.entries(result.slots);
    return {
      populated: entries.filter(([, s]) => s === 'populated').map(([k]) => k),
      empty: entries.filter(([, s]) => s === 'empty').map(([k]) => k),
      ignored: entries.filter(([, s]) => s === 'slotignored').map(([k]) => k),
    };
  }

  /** The line naming which tool fills each empty slot: faf_auto for what the
   *  repo can hold, faf_go for the goal and the 6Ws (faf-cli's isHumanSlot). */
  private async fillHint(empty: string[]): Promise<string | null> {
    if (empty.length === 0) {return null;}
    const { isHumanSlot } = await fafCli;
    const human = empty.filter((p) => isHumanSlot(p));
    const sourced = empty.filter((p) => !isHumanSlot(p));
    const parts = [
      ...(sourced.length ? [`faf_auto fills what the repo holds (${sourced.join(', ')})`] : []),
      ...(human.length ? [`faf_go asks for ${human.join(', ')}`] : []),
    ];
    return `To fill the empty slots: ${parts.join('; ')}.`;
  }

  private async handleFafScore(args: any): Promise<CallToolResult> {
    // One score: faf-cli's scoreFafYaml — the number `faf score`, faf_init,
    // faf_auto, faf_go, faf_doctor, faf_trust and the session hook all report.
    // The headline carries both `FAF SCORE: <n>/100` and `(<n>%)`. The slot
    // count is populated/active, as faf-cli prints it (slotignored slots are
    // not active: 17/17 on a Trophy, never 17/21). A score faf-cli marks
    // unknown (an About repo with no about.source_score) is "unknown (—)",
    // never -1. The ✪ seal appears only at 100 (sealForScore).
    const r = await this.resolveDir('faf_score', args.path);
    if (!r.ok) {return this.refused(r);}
    const cwd = r.dir;
    const { readFafRaw, scoreFafYaml, getNextTier, scoreText } = await fafCli;

    const found = await this.findFaf(cwd);
    const fafPath = found?.path;
    if (!found || !fafPath) {
      return {
        content: [
          {
            type: 'text',
            text:
              `FAF SCORE: 0/100 (0%)  ♡ no .faf\n\n` +
              `No \`.faf\` found in \`${cwd}\` or the folder above it.\n` +
              `Run \`faf_init\` to create one — then \`faf_score\` reports the real score.`,
          },
        ],
        structuredContent: {
          score: 0, tier: 'No .faf', hasFaf: false,
          populated: 0, empty: 0, ignored: 0, active: 0, total: 0,
          nextTier: null, inherited: false, path: cwd,
        },
      };
    }

    let raw: string;
    try {
      raw = readFafRaw(fafPath);
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text:
              `FAF SCORE: 0/100 (0%)  ○ UNREADABLE\n\n` +
              `Could not read \`${fafPath}\`: ${error?.message ?? String(error)}`,
          },
        ],
        structuredContent: {
          score: 0, tier: 'Unreadable', hasFaf: false,
          populated: 0, empty: 0, ignored: 0, active: 0, total: 0,
          nextTier: null, inherited: false, path: fafPath,
        },
        isError: true,
      };
    }

    // Read as every faf reader reads it (faf-cli's readFaf, as `faf score`
    // does), then scored: text that is not valid YAML, or that is a scalar or a
    // list, is refused in one line — never a 0% score from the kernel.
    let result: ReturnType<Awaited<typeof fafCli>['scoreFafYaml']>;
    let legacyProject: string | null = null;
    try {
      legacyProject = (await readFafData(fafPath)).legacyProject;
      result = scoreFafYaml(raw);
    } catch (error: any) {
      const parseError = yamlErrorAt(raw);
      return {
        content: [
          {
            type: 'text',
            text:
              `FAF SCORE: 0/100 (0%)  ○ INVALID\n\n` +
              `\`${fafPath}\` couldn't be read as a .faf:\n` +
              `  ${oneLine(error)}\n\n` +
              `Fix: ${parseError ? yamlFixHint(raw, fafPath) : `edit ${fafPath} by hand into key: value pairs; faf changes nothing until it is a mapping of keys.`}`,
          },
        ],
        structuredContent: {
          score: 0, tier: 'Invalid', hasFaf: false,
          populated: 0, empty: 0, ignored: 0, active: 0, total: 0,
          nextTier: null, inherited: false, path: fafPath,
        },
        isError: true,
      };
    }

    const lists = this.slotLists(result);

    if (result.unknown) {
      const output =
        `FAF SCORE: ${scoreText(result)}  — an About repo${result.represents ? ` for ${result.represents}` : ''} with no about.source_score\n\n` +
        `File: ${where(found)}\n` +
        `faf-cli scores an About repo from about.source_score (0-100). With none there is no score to report, so none is shown and no receipt is issued. Add about.source_score by hand to set it.`;
      return {
        content: [{ type: 'text', text: output }],
        structuredContent: {
          score: result.score, unknown: true, tier: 'unknown', hasFaf: true,
          populated: result.populated, empty: result.empty, ignored: result.ignored, active: result.active, total: result.total,
          nextTier: null, inherited: result.inherited ?? false, path: fafPath,
          slots: lists,
        },
      };
    }

    const score = result.score;
    const next = getNextTier(score);
    const nextTierDisplay = next ? `${next.name} (${next.threshold}%)` : null;

    // Progress bar: 24 cells.
    const barWidth = 24;
    const filled = Math.max(0, Math.min(barWidth, Math.round((score / 100) * barWidth)));
    const progressBar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

    // Headline carries both `/100` AND `(%)` so multiple matchers stay happy.
    let output =
      `FAF SCORE: ${score}/100 (${score}%)  ${sealForScore(score)} ${result.tier.name}\n` +
      `${progressBar} ${score}%\n` +
      `${result.populated}/${result.active} slots populated` +
      (result.ignored ? ` · ${result.ignored} slotignored` : '') +
      (nextTierDisplay ? `  ·  next: ${nextTierDisplay}` : '  ·  top tier') +
      `\n\n` +
      `File: ${where(found)}\n` +
      `Scored by faf-cli — the same context your AI reads.`;

    if (legacyProject !== null) {
      output += `\n${legacyProjectHint(found.filename, legacyProject)}`;
    }

    if (args.details === true) {
      output += `\n\n--- Slot breakdown ---\n`;
      output += `Populated (${lists.populated.length}): ${lists.populated.join(', ') || '(none)'}\n`;
      output += `Empty (${lists.empty.length}): ${lists.empty.join(', ') || '(none)'}\n`;
      output += `Slotignored (${lists.ignored.length}): ${lists.ignored.join(', ') || '(none)'}`;
      const hint = await this.fillHint(lists.empty);
      if (score < 100 && hint) {
        output += `\n\n${hint}`;
      }
    }

    const parity = computeParity(
      raw,
      {
        score,
        tier: result.tier.name,
        active: result.active,
        populated: result.populated,
        empty: result.empty,
        ignored: result.ignored,
        total: result.total,
        slots: result.slots as Record<string, string>,
      },
      { producedBy: `claude-faf-mcp@${VERSION}` },
    );
    return {
      content: [
        {
          type: 'text',
          text: output,
        },
      ],
      structuredContent: {
        score,
        tier: result.tier.name,
        populated: result.populated,
        empty: result.empty,
        ignored: result.ignored,
        active: result.active,
        total: result.total,
        nextTier: next ? { name: next.name, threshold: next.threshold } : null,
        inherited: result.inherited ?? false,
        hasFaf: true,
        path: fafPath,
        ...(legacyProject !== null ? { legacyProject: true } : {}),
        slots: lists,
        parity,
      },
    };
  }

  private async handleFafInit(args: any): Promise<CallToolResult> {
    // faf_init writes project.faf the way `faf init` does: faf-cli's
    // assembleFreshFaf detects the folder, faf-cli's writeFaf writes the bytes,
    // faf-cli's scoreFafYaml scores them, and faf-cli's FafDNAManager writes
    // the birth certificate (.faf-dna) when there is none. Before 5.23 it wrote
    // a legacy template (`project:` as a plain string, no format version) that
    // faf-cli scored 0%, that faf_go could not apply answers to, and that
    // renderClaudeMd could only title "Project".
    try {
      if (args.path !== undefined && args.path !== null && typeof args.path !== 'string') {
        return this.refused({ message: 'faf_init: path must be text.' });
      }
      // Smart path resolution ("my-app", "~/Projects/my-app", "/full/path"); a
      // relative path ('.', '..', './x') is relative to the active project.
      const userInput: string | undefined = args.path || undefined;
      const resolution = resolveProjectPath(userInput, undefined, this.engineAdapter.getWorkingDirectory());

      // The shared resolver: confined, home and '/' refused before anything is
      // written or the session moves. faf_init may create the folder.
      const r = await this.resolveDir('faf_init', resolution.projectPath, { write: true, create: true });
      if (!r.ok) {return this.refused(r);}
      const targetDir = r.dir;
      const fafPath = pathModule.join(targetDir, 'project.faf');
      const legacyPath = pathModule.join(targetDir, '.faf');
      const force = args.force === true;

      // An existing file is the user's. writeFaf merges into a file that is
      // there — the fresh render's values over the file's — so without force
      // faf_init writes nothing. force is the explicit overwrite (`faf init
      // --force`: writeFaf { replace: true }), after the old bytes are kept as a backup.
      const existing = present(fafPath) ? fafPath : present(legacyPath) ? legacyPath : null;
      if (existing && !force) {
        // The user named this project: it becomes the session project, as on a write.
        this.engineAdapter.setWorkingDirectory(targetDir);
        const name = pathModule.basename(existing);
        let hint = existing === legacyPath
          ? `💡 faf_auto writes project.faf from ${name} (kept as it is) and fills the empty slots from the repo; faf_go asks for the 6Ws.`
          : '💡 faf_auto fills its empty slots from the repo (existing values kept); faf_go asks for the 6Ws.';
        try {
          const { legacyProject } = await readFafData(existing);
          if (legacyProject !== null) {hint = `💡 ${legacyProjectHint(name, legacyProject)}`;}
        } catch { /* faf_score and faf_doctor say what is wrong with the file */ }
        return {
          content: [{
            type: 'text',
            text: `🚀 Claude FAF Initialization:\n\n⚠️ ${existing} already exists; faf_init left it as it is.\n${hint}`
          }]
        };
      }

      // The folder faf_init was asked to create (an explicit writer call).
      if (!present(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const { assembleFreshFaf, writeFaf, readFafRaw, scoreFafYaml, resolveInside, safeWriteFile, FafDNAManager } = await fafCli;
      let backup: string | null = null;
      if (force && present(fafPath)) {
        const original = fs.readFileSync(resolveInside(targetDir, fafPath, { read: true }));
        backup = `${fafPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
        safeWriteFile(backup, original, { root: targetDir, expect: null });
      }
      writeFaf(fafPath, assembleFreshFaf(targetDir) as any, { replace: force });
      const score = scoreFafYaml(readFafRaw(fafPath));

      // Birth DNA — faf-cli's lineage file, only when there is none: faf never
      // replaces a .faf-dna, force or not.
      let dnaLine: string;
      try {
        const dna = new FafDNAManager(targetDir);
        if (!dna.exists() && !present(pathModule.join(targetDir, '.faf-dna'))) {
          dna.birth(score.score);
          dnaLine = `🧬 Birth DNA ${score.score}% written to .faf-dna (faf_dna shows the journey)`;
        } else {
          dnaLine = '🧬 .faf-dna is already there and was left as it is';
        }
      } catch (error) {
        dnaLine = `🧬 .faf-dna not written: ${oneLine(error)}`;
      }

      // The new project becomes the session project, so the next steps printed
      // below (faf_score, faf_sync, faf_go) act on it without a path.
      this.engineAdapter.setWorkingDirectory(targetDir);

      // Pomelli-style success confirmation with path resolution info
      const pathConfirmation = formatPathConfirmation({ ...resolution, projectPath: targetDir });
      const sourceExplanation = resolution.source === 'user-name'
        ? `\n\n💡 Smart resolution: "${userInput}" → ${targetDir}`
        : '';

      return {
        content: [{
          type: 'text',
          text: `🚀 Claude FAF Initialization:\n\n✅ ${backup ? `Replaced ${fafPath} with a fresh one (force). The previous file is kept at ${backup}` : `Created ${fafPath}`}${existing === legacyPath ? `\nℹ️ .faf is left as it was; faf reads project.faf first from now on.` : ''}\n📊 ${score.score}/100 (${score.populated}/${score.active} slots populated) — ${score.tier.name}\n${dnaLine}\n\n${pathConfirmation}${sourceExplanation}\n\n🍊 Vitamin Context activated!\n⚡ FAFFLESS AI ready!\n\n🏁 Next steps:\n  • Run faf_score for AI-readiness score\n  • Run faf_sync to create CLAUDE.md\n  • Run faf_go for human 6Ws`
        }]
      };
    } catch (error: any) {
      if (error instanceof PathConfinementError) {throw error;}
      return {
        content: [{
          type: 'text',
          text: `🚀 Claude FAF Initialization:\n\n❌ Error: ${error.message}`
        }],
        isError: true
      };
    }
  }

  private async handleFafTrust(args: any): Promise<CallToolResult> {
    // The trust receipt, composed from faf-cli: its reader (a scalar, a list or
    // invalid YAML is refused), validateFaf (the checks `faf check` runs) and
    // scoreFafYaml, then the faf-parity/v1 hash (claude-faf-mcp's own spec).
    // No receipt for a .faf faf-cli calls invalid, or for a score faf-cli
    // marks unknown. The subject is the project; this server is producedBy.
    const r = await this.resolveDir('faf_trust', args.path);
    if (!r.ok) {return this.refused(r);}
    const cwd = r.dir;
    const { readFaf, readFafRaw, scoreFafYaml, validateFaf, scoreText } = await fafCli;

    const found = await this.findFaf(cwd);
    const fafPath = found?.path;
    if (!found || !fafPath) {
      return {
        content: [{
          type: 'text',
          text: `FAF Trust: no .faf found in ${cwd} or the folder above it\nRun faf_init first, then faf_trust attests the real score.`
        }],
        structuredContent: { valid: false, hasFaf: false, reason: 'no .faf found', path: cwd },
        isError: true
      };
    }

    let raw: string;
    let data: Record<string, unknown>;
    try {
      raw = readFafRaw(fafPath);
      data = readFaf(fafPath) as Record<string, unknown>;
    } catch (error) {
      return {
        content: [{ type: 'text', text: `FAF Trust: no receipt — faf-cli could not read ${fafPath} as a .faf: ${oneLine(error)}` }],
        structuredContent: { valid: false, hasFaf: true, reason: oneLine(error), path: fafPath },
        isError: true
      };
    }

    const validation = validateFaf(data);
    if (!validation.valid) {
      const legacy = isScalarProject(data.project) ? `\n${legacyProjectHint(found.filename, String(data.project))}` : '';
      return {
        content: [{
          type: 'text',
          text: `FAF Trust: no receipt — faf-cli's validateFaf rejects ${fafPath}:\n${validation.errors.map((e) => `  • ${e}`).join('\n')}${legacy}\nfaf_check lists every slot; faf_auto adds what the repo can fill.`
        }],
        structuredContent: { valid: false, hasFaf: true, errors: validation.errors, reason: 'invalid', path: fafPath },
        isError: true
      };
    }

    let result: ReturnType<Awaited<typeof fafCli>['scoreFafYaml']>;
    try {
      result = scoreFafYaml(raw);
    } catch (error) {
      return {
        content: [{ type: 'text', text: `FAF Trust: no receipt — faf-cli's scorer could not read ${fafPath}: ${oneLine(error)}` }],
        structuredContent: { valid: false, hasFaf: true, reason: oneLine(error), path: fafPath },
        isError: true
      };
    }

    if (result.unknown) {
      return {
        content: [{
          type: 'text',
          text: `FAF Trust: no receipt — the score of ${fafPath} is ${scoreText(result)}: an About repo${result.represents ? ` for ${result.represents}` : ''} with no about.source_score. faf attests only a known score.`
        }],
        structuredContent: { valid: true, hasFaf: true, errors: [], reason: 'score unknown', path: fafPath },
        isError: true
      };
    }

    // The subject is the project: its name, else the folder the .faf sits in.
    const project = isMapping(data.project) ? data.project : {};
    const subject = typeof project.name === 'string' && project.name.trim() ? project.name.trim() : pathModule.basename(found.dir);

    const parity = computeParity(
      raw,
      {
        score: result.score,
        tier: result.tier.name,
        active: result.active,
        populated: result.populated,
        empty: result.empty,
        ignored: result.ignored,
        total: result.total,
        slots: result.slots as Record<string, string>,
      },
      { producedBy: `claude-faf-mcp@${VERSION}` },
    );

    const receipt = buildReceipt({
      subject,
      score: result.score,
      tier: result.tier.name,
      parity,
    });

    const text =
      `${renderReceipt(receipt)}\n\n` +
      `File: ${where(found)}\n` +
      `Valid: faf-cli's validateFaf accepts it. The parity hash is faf-parity/v1, claude-faf-mcp's own spec (no other engine computes it yet): recompute sha256(projection) and compare it with parityHash.`;

    return {
      content: [{ type: 'text', text }],
      structuredContent: {
        valid: true,
        hasFaf: true,
        errors: [],
        subject,
        score: result.score,
        tier: result.tier.name,
        path: fafPath,
        sourceSha256: parity.sourceSha256,
        parity,
        receipt,
      }
    };
  }

  /**
   * Trust Edition Pillar 5 — faf_setup: the explicit native-hook installer.
   * Preview by default; writes .claude/settings.json only on confirm: true.
   * Non-destructive merge — "enhance, never replace" applied to settings.
   */
  private async handleFafSetup(args: any): Promise<CallToolResult> {
    // The shared resolver, with faf_setup's refusal: home's .claude/settings.json
    // is the user settings. Every message names the settings scope.
    const r = await this.resolveDir('faf_setup', args.path, { write: true, homeRefusal });
    if (!r.ok) {
      const settingsPath = pathModule.join(r.dir ?? this.engineAdapter.getWorkingDirectory(), '.claude', 'settings.json');
      const message = r.message.includes(SETTINGS_SCOPE) ? r.message : `${r.message} (faf_setup writes only ${SETTINGS_SCOPE}.)`;
      return {
        content: [{ type: 'text', text: `faf_setup — error\n\n${message}` }],
        structuredContent: { action: 'error', settingsPath, hookCommand: HOOK_COMMAND, message },
        isError: true,
      };
    }
    const projectDir = r.dir;
    const result = await setupSessionHook(projectDir, {
      confirm: args.confirm === true,
      remove: args.remove === true,
    });

    const lines: string[] = [`faf_setup — ${result.action}`, '', result.message];
    if (result.settings && (result.action === 'preview' || result.action === 'installed' || result.action === 'removed')) {
      lines.push('', `${result.settingsPath} (${SETTINGS_SCOPE}):`, '```json', JSON.stringify(result.settings, null, 2), '```');
    }
    if (result.action === 'preview') {
      const confirmCall = args.remove === true ? 'faf_setup { remove: true, confirm: true }' : 'faf_setup { confirm: true }';
      lines.push('', `Hook command: ${HOOK_COMMAND}`, `Nothing has been written. To write the ${SETTINGS_SCOPE}: ${confirmCall}`);
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: {
        action: result.action,
        settingsPath: result.settingsPath,
        hookCommand: HOOK_COMMAND,
        ...(result.settings ? { settings: result.settings } : {}),
        message: result.message,
      },
      ...(result.action === 'error' ? { isError: true } : {}),
    };
  }

  private async handleFafSync(args: any): Promise<CallToolResult> {
    // The project to write: the given path (confined; it becomes the session
    // project when it exists) or the session project — never home or '/'. The
    // resolved directory is handed to the engine, so a path that does not exist
    // can never fall back to the previous project's CLAUDE.md. The .faf is the
    // one readers find (the folder, then one level up), and CLAUDE.md is
    // written next to it.
    const r = await this.resolveDir('faf_sync', args.path, { write: true });
    if (!r.ok) {return this.refused(r);}
    const dir = r.dir;

    // One direction: project.faf → CLAUDE.md (faf-cli's render + injector). Each
    // format flag also writes that format. A bare faf_sync writes CLAUDE.md only —
    // before 5.23 it ran the manifest-drift `sync` command and wrote no CLAUDE.md.
    const formatArgs: string[] = [];
    if (args.agents === true) formatArgs.push('--agents');
    if (args.cursor === true) formatArgs.push('--cursor');
    if (args.gemini === true) formatArgs.push('--gemini');
    if (args.copilot === true) formatArgs.push('--copilot');
    if (args.all === true) formatArgs.push('--all');

    const result = await this.engineAdapter.callEngine('claude', [dir, ...formatArgs]);

    if (!result.success) {
      return {
        content: [{
          type: 'text',
          text: `Claude FAF Sync:\n\nNot written: ${result.error ?? result.data?.message ?? 'unknown error'}`
        }],
        isError: true
      };
    }

    // The command's message (it carries "FAF Score: N%"), then every file
    // written and every requested file that was not, each with its reason.
    const data = result.data as { message?: string; fafPath?: string; filesChanged?: string[]; filesFailed?: Array<{ file: string; reason: string }>; score?: string };
    const filesWritten = Array.isArray(data.filesChanged) ? data.filesChanged : [];
    const filesFailed = Array.isArray(data.filesFailed) ? data.filesFailed : [];
    const lines = [
      'Claude FAF Sync:',
      '',
      (data.message ?? '').split('\n').filter((l) => !l.startsWith('Not written: ')).join('\n'),
      '',
      'Files written:',
      ...filesWritten.map((f) => `• ${f}`),
      ...(filesFailed.length ? ['', 'Not written:', ...filesFailed.map((f) => `• ${f.file} — ${f.reason}`)] : []),
    ];

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: {
        fafPath: data.fafPath ?? '',
        score: data.score ?? 'unknown (—)',
        filesWritten,
        filesFailed,
      },
      ...(filesFailed.length ? { isError: true } : {}),
    };
  }

  private async handleFafAbout(_args: any): Promise<CallToolResult> {  // ✅ FIXED: Prefixed unused args
    // Stop FAFfing about and get the facts!
    const packageInfo = {
      name: 'claude-faf-mcp',
      version: VERSION,
      description: 'We ARE the C in MCP. I⚡🍊 - The formula that changes everything.',
      author: 'FAF Team (team@faf.one)',
      website: 'https://faf.one',
      npm: 'https://www.npmjs.com/package/claude-faf-mcp'
    };

    const aboutText = `well seeing as you clearly have time to burn, faf is about saving your AI time, how is that working out...

faff about (v., Brit.) — what your AI does for 20 minutes relearning your project, every session.
.faf (n.) — what stops it. Same four letters, opposite outcomes.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 .faf = project DNA for AI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT IS .FAF?
• .faf = Foundational AI-context Format
• One file captures your project DNA for any AI
• The dot (.) means it's a file format!

🧡 Trust: IANA-registered format (application/vnd.faf+yaml)
⚡️ Speed: authored in <29ms

claude-faf-mcp ${packageInfo.version} · faf-cli ${bundledFafCliVersion() ?? '(not found)'} (bundled)

Your project's DNA — persistent context
that works across Claude, Gemini, Grok, Cursor, and any AI tool.

HOW IT WORKS:
1. Drop a file or paste the path
2. Create .faf (Foundational AI-context Format)
3. Ask Claude to run faf_sync
4. You're done⚡

🩵 You just made Claude Happy
🧡⚡️ Persistent context. Zero drift.`;

    return {
      content: [{
        type: 'text',
        text: aboutText
      }]
    };
  }


  private async handleFafDebug(_args: any): Promise<CallToolResult> {
    // Reads only: an access check (never a probe file), the bundled faf-cli's
    // version (every tool runs on it; nothing is run from PATH) and faf-cli's
    // finder. Before 6.0.0 this reported whatever `which faf` found on PATH —
    // on some machines a different tool — as "FAF CLI".
    try {
      const cwd = this.engineAdapter.getWorkingDirectory();
      let canWrite = false;
      let writeError: string | null = null;
      try {
        fs.accessSync(cwd, fs.constants.W_OK);
        canWrite = true;
      } catch (error) {
        writeError = oneLine(error);
      }
      const fafCliVersion = bundledFafCliVersion();

      // The .faf readers use: faf-cli's finder (the folder, then one level up).
      let fafResult: FoundFaf | null = null;
      let fafError: string | null = null;
      try { fafResult = await this.findFaf(cwd); } catch (error) { fafError = oneLine(error); }

      const debugOutput = [
        'Claude FAF MCP Server Debug Information:',
        '',
        `Working Directory: ${cwd}`,
        `Write Permissions: ${canWrite ? 'Yes' : 'No'}${writeError ? ` (${writeError})` : ''}`,
        `FAF Engine: faf-cli ${fafCliVersion ? `v${fafCliVersion}` : '(not found in node_modules — reinstall claude-faf-mcp)'}, bundled with claude-faf-mcp ${VERSION}. No faf on PATH is ever run.`,
        `FAF File: ${fafResult ? where(fafResult) : fafError ? `refused — ${fafError}` : 'not found (faf_init creates one)'}`,
        '',
        'Quick Start:',
        '   1. If the .faf is missing: faf_init or faf_auto',
        '   2. To check AI-readiness: faf_score',
        '   3. For the human context: faf_go',
      ].join('\n');

      return {
        content: [{
          type: 'text',
          text: debugOutput
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Claude FAF Debug Failed: ${oneLine(error)}`
        }],
        isError: true
      };
    }
  }

  private async handleFafList(args: any): Promise<CallToolResult> {
    try {
      const path = await import('path');

      // Parse arguments
      const filter = args.filter === 'faf' || args.filter === 'all' ? args.filter : 'dirs';
      const depth = args.depth === 2 ? 2 : 1;
      const showHidden = args.showHidden === true;

      // Confined like faf_read: the active project plus FAF_ALLOWED_ROOTS, never
      // home or '/', no temp folders; a relative path resolves against the
      // active project (the default).
      const ctx = await this.fileOpContext();
      let resolvedPath: string;
      try {
        resolvedPath = confineFileOp(args.path ?? ctx.base, ctx);
      } catch (err) {
        if (err instanceof PathConfinementError) {
          return { content: [{ type: 'text', text: `❌ Security error: ${err.message}` }], isError: true };
        }
        throw err;
      }

      // Check if directory exists
      if (!fs.existsSync(resolvedPath)) {
        return {
          content: [{
            type: 'text',
            text: `❌ Directory not found: ${resolvedPath}`
          }],
          isError: true
        };
      }

      // Check if it's actually a directory
      const stats = fs.statSync(resolvedPath);
      if (!stats.isDirectory()) {
        return {
          content: [{
            type: 'text',
            text: `❌ Not a directory: ${resolvedPath}`
          }],
          isError: true
        };
      }

      // Scan directory. A link is listed as what it is and never followed, so
      // a link inside the project cannot list a folder outside it.
      const results: Array<{name: string; path: string; hasFaf: boolean; isDir: boolean; isLink: boolean}> = [];

      const scanDir = (dirPath: string, currentDepth: number) => {
        if (currentDepth > depth) return;

        const entries = fs.readdirSync(dirPath);

        for (const entry of entries) {
          // Skip hidden files unless requested
          if (!showHidden && entry.startsWith('.')) continue;

          const fullPath = path.join(dirPath, entry);
          const entryStats = fs.lstatSync(fullPath);
          const isLink = entryStats.isSymbolicLink();
          const isDir = !isLink && entryStats.isDirectory();

          // Check for project.faf
          const hasFaf = isDir && present(path.join(fullPath, 'project.faf'));

          // Apply filter
          if (filter === 'faf' && !hasFaf) continue;
          if (filter === 'dirs' && !isDir) continue;

          results.push({
            name: entry,
            path: fullPath,
            hasFaf,
            isDir,
            isLink
          });

          // Recurse if needed
          if (isDir && currentDepth < depth) {
            scanDir(fullPath, currentDepth + 1);
          }
        }
      };

      scanDir(resolvedPath, 1);

      // Sort: FAF projects first, then alphabetically
      results.sort((a, b) => {
        if (a.hasFaf && !b.hasFaf) return -1;
        if (!a.hasFaf && b.hasFaf) return 1;
        return a.name.localeCompare(b.name);
      });

      // Format output
      let output = `📁 ${resolvedPath}\n\n`;

      if (results.length === 0) {
        output += '(empty)\n';
      } else {
        for (const item of results) {
          const indent = item.path.split('/').length - resolvedPath.split('/').length - 1;
          const prefix = '  '.repeat(indent);
          const icon = item.isDir ? '📁' : item.isLink ? '🔗' : '📄';
          const status = item.hasFaf ? '✅ project.faf' : '';

          output += `${prefix}${icon} ${item.name}`;
          if (status) output += ` ${status}`;
          output += '\n';
        }
      }

      output += `\nTotal: ${results.length} items`;
      const fafCount = results.filter(r => r.hasFaf).length;
      if (filter === 'faf') {
        output += ` (${fafCount} with project.faf)`;
      }

      return {
        content: [{
          type: 'text',
          text: output
        }],
        structuredContent: {
          directory: resolvedPath,
          filter,
          total: results.length,
          fafProjects: fafCount,
          entries: results
        }
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to list directory: ${errorMessage}`
        }],
        isError: true
      };
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NEW: Human Context Tools (v3.2.0 parity)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private async handleFafReadme(args: any): Promise<CallToolResult> {
    try {
      const path = await import('path');
      const apply = args.apply === true;
      const r = await this.resolveDir('faf_readme', args.path, { write: apply });
      if (!r.ok) {return this.refused(r);}
      const cwd = r.dir;

      // Find README.md
      const readmePath = path.join(cwd, 'README.md');
      if (!fs.existsSync(readmePath)) {
        return {
          content: [{
            type: 'text',
            text: `📖 FAF README Extraction:\n\n❌ No README.md found in ${cwd}\n💡 Create a README.md first`
          }],
          isError: true
        };
      }

      // Preview: the .faf the readers use. Apply: <cwd>/project.faf exactly.
      let fafResult: { path: string; filename: string } | null = null;
      if (apply) {
        const t = await this.targetFaf('faf_readme', cwd);
        if (!t.ok) {return this.refused({ message: `📖 FAF README Extraction:\n\n❌ ${t.message}` });}
        fafResult = { path: t.path, filename: pathModule.basename(t.path) };
      } else {
        fafResult = await this.findFaf(cwd);
      }
      if (!fafResult) {
        return {
          content: [{
            type: 'text',
            text: `📖 FAF README Extraction:\n\n❌ No project.faf found in ${cwd} or the folder above it\n💡 Run faf_init first`
          }],
          isError: true
        };
      }

      // Extract 6 Ws — composed from faf-cli's canonical sourced extractor
      // (README + package, no-guess). Single source; no local fork.
      const { relentlessContext } = await fafCli;
      const extracted = relentlessContext(cwd);

      if (!apply) {
        // Preview mode
        let output = `📖 FAF Context Extraction (Preview)\n\n`;
        output += `Sourced from README + package.json:\n`;
        for (const [field, value] of Object.entries(extracted)) {
          if (value) {
            output += `  ${field.toUpperCase()}: ${value}\n`;
          }
        }
        output += `\nThe .faf here: ${fafResult.path}`;
        output += `\n💡 Use apply: true to fill the empty human_context slots of ${path.join(cwd, 'project.faf')}`;
        return { content: [{ type: 'text', text: output }] };
      }

      // Apply: faf-cli's fillEmpties — only an empty slot is filled; a value
      // the file holds (a typed none in a 6W included: the person's words) is
      // kept. writeFaf edits the file in place (comments, key order and exact
      // scalars kept) and writes nothing when nothing changed.
      const { fillEmpties, writeFaf } = await fafCli;
      const { data } = await readFafData(fafResult.path);
      const filled = fillEmpties(data, { human_context: extracted } as Record<string, unknown>);
      const hcBefore = isMapping(data.human_context) ? data.human_context : {};
      const hcAfter = isMapping(filled.human_context) ? filled.human_context : {};
      const changed = Object.keys(hcAfter).filter((k) => {
        const v = hcAfter[k];
        return typeof v === 'string' && v.trim() !== '' && v !== hcBefore[k];
      });
      let written = false;
      if (changed.length > 0 && (isMapping(data.human_context) || data.human_context == null)) {
        // Only the slots fillEmpties filled are added; `data` is the object
        // readFaf returned, so a file edited meanwhile is refused, not written over.
        data.human_context = { ...hcBefore, ...Object.fromEntries(changed.map((k) => [k, hcAfter[k]])) };
        try {
          written = writeFaf(fafResult.path, data as any);
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `📖 FAF README Extraction:\n\n❌ ${notWritten(fafResult.path, error)}` }],
            isError: true
          };
        }
      }

      return {
        content: [{
          type: 'text',
          text: written
            ? `📖 FAF README Extraction:\n\n✅ Filled ${changed.length} empty human_context slot(s): ${changed.join(', ')}\n📁 Updated: ${fafResult.path} (every other line kept)`
            : `📖 FAF README Extraction:\n\n✅ Nothing to fill: every slot the README answers already holds a value. ${fafResult.path} was not changed.`
        }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `📖 FAF README Extraction:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleFafHumanAdd(args: any): Promise<CallToolResult> {
    try {
      const { field, value } = args;

      if (!field || !value) {
        return {
          content: [{
            type: 'text',
            text: `🧡 FAF Human Set:\n\n❌ Both field and value are required\n💡 Example: field="who", value="Development team"`
          }],
          isError: true
        };
      }

      const validFields = ['who', 'what', 'why', 'where', 'when', 'how'];
      if (!validFields.includes(field)) {
        return {
          content: [{
            type: 'text',
            text: `🧡 FAF Human Set:\n\n❌ Invalid field: ${field}\n💡 Valid fields: ${validFields.join(', ')}`
          }],
          isError: true
        };
      }

      const r = await this.resolveDir('faf_human_add', args.path, { write: true });
      if (!r.ok) {return this.refused(r);}
      const cwd = r.dir;
      // A writer edits <cwd>/project.faf exactly, never a .faf found above it.
      const t = await this.targetFaf('faf_human_add', cwd);
      if (!t.ok) {return this.refused({ message: `🧡 FAF Human Add:\n\n❌ ${t.message}` });}
      const fafResult = { path: t.path, filename: pathModule.basename(t.path) };

      // faf-cli reads and writes: the one value changes in place; comments,
      // key order and every other value stay as written.
      const { writeFaf } = await fafCli;
      const { data: fafData } = await readFafData(fafResult.path);
      if (fafData.human_context != null && !isMapping(fafData.human_context)) {
        return {
          content: [{
            type: 'text',
            text: `🧡 FAF Human Set:\n\n❌ human_context in ${fafResult.filename} is not a mapping, so faf will not replace it to set ${field}. ${fafResult.filename} was not changed; edit human_context by hand first.`
          }],
          isError: true
        };
      }
      fafData.human_context = { ...(fafData.human_context as Record<string, unknown> | undefined), [field]: value };
      try {
        writeFaf(fafResult.path, fafData as any);
      } catch (error: any) {
        return { content: [{ type: 'text', text: `🧡 FAF Human Set:\n\n❌ ${notWritten(fafResult.path, error)}` }], isError: true };
      }

      return {
        content: [{
          type: 'text',
          text: `🧡 FAF Human Set:\n\n✅ Set ${field.toUpperCase()} = "${value}"\n📁 Updated: ${fafResult.path}`
        }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `🧡 FAF Human Set:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  /**
   * faf_check — the project's .faf as faf-cli sees it: its reader (a scalar,
   * a list or invalid YAML is refused), validateFaf (the checks `faf check`
   * runs: faf_version, project.name, the about-block rules) and the scorer's
   * state for every slot. Before 6.0.0 it rated the 6Ws by string length
   * ("good" for any value over 20 characters) under faf-cli's `faf check`
   * name; its protect / unlock wrote a key no writer read. It writes nothing.
   */
  private async handleFafCheck(args: any): Promise<CallToolResult> {
    const r = await this.resolveDir('faf_check', args.path);
    if (!r.ok) {return this.refused(r);}
    const cwd = r.dir;
    const fafResult = await this.findFaf(cwd);

    if (!fafResult) {
      return {
        content: [{
          type: 'text',
          text: `FAF Check:\n\nNo project.faf found in ${cwd} or the folder above it. faf_init creates one.`
        }],
        isError: true
      };
    }

    const { readFaf, readFafRaw, validateFaf, scoreFafYaml, scoreText, SIX_WS_INTERVIEW } = await fafCli;
    let data: Record<string, unknown>;
    let result: ReturnType<Awaited<typeof fafCli>['scoreFafYaml']>;
    try {
      data = readFaf(fafResult.path) as Record<string, unknown>;
      result = scoreFafYaml(readFafRaw(fafResult.path));
    } catch (error) {
      return {
        content: [{ type: 'text', text: `FAF Check — ${where(fafResult)}\n\ninvalid: faf-cli could not read it as a .faf — ${oneLine(error)}` }],
        structuredContent: { path: fafResult.path, valid: false, errors: [oneLine(error)] },
      };
    }

    const validation = validateFaf(data);
    const lists = this.slotLists(result);
    const sixWs = SIX_WS_INTERVIEW.map((q) => q.path).filter((p) => p.startsWith('human_context.'));
    const humanContext: Record<string, string> = {};
    for (const p of sixWs) {humanContext[p.slice('human_context.'.length)] = result.slots[p] ?? 'empty';}

    const lines = [`FAF Check — ${where(fafResult)}`, ''];
    if (validation.valid) {
      lines.push("valid — faf-cli's validateFaf accepts it");
    } else {
      lines.push("invalid — faf-cli's validateFaf:");
      for (const e of validation.errors) {lines.push(`  • ${e}`);}
    }
    if (isScalarProject(data.project)) {lines.push(legacyProjectHint(fafResult.filename, String(data.project)));}
    lines.push('');
    lines.push(result.unknown
      ? `Score: ${scoreText(result)} — an About repo with no about.source_score`
      : `Score: ${result.score}% ${sealForScore(result.score)} ${result.tier.name} — ${result.populated}/${result.active} slots populated${result.ignored ? ` · ${result.ignored} slotignored` : ''}`);
    if (!result.unknown) {
      lines.push('');
      lines.push('The 6Ws:');
      for (const [w, state] of Object.entries(humanContext)) {lines.push(`  ${w.padEnd(6)} ${state}`);}
      lines.push('');
      lines.push(`Empty (${lists.empty.length}): ${lists.empty.join(', ') || '(none)'}`);
      if (lists.ignored.length) {lines.push(`Slotignored (${lists.ignored.length}): ${lists.ignored.join(', ')}`);}
      const hint = await this.fillHint(lists.empty);
      if (hint) {lines.push('', hint);}
    }

    return {
      content: [{ type: 'text', text: lines.join('\n') }],
      structuredContent: {
        path: fafResult.path,
        valid: validation.valid,
        errors: validation.errors,
        score: result.score,
        ...(result.unknown ? { unknown: true } : {}),
        tier: result.unknown ? 'unknown' : result.tier.name,
        populated: result.populated,
        empty: result.empty,
        ignored: result.ignored,
        active: result.active,
        slots: lists,
        humanContext,
      }
    };
  }

  /**
   * faf_context — show or set the active project. detail: true adds the
   * text of the .faf, read with faf-cli's reader (link rules, strict UTF-8),
   * so a host can read project.faf in one Core call (the faf-bench prompt's
   * with-faf pass). It never writes a file.
   */
  private async handleFafContext(args: any): Promise<CallToolResult> {
    try {
      const setting = args.path !== undefined && args.path !== null && args.path !== '';
      if (setting) {
        // Set the new context: the path must exist, and never be home or '/'
        // (a refused path leaves the active project where it was).
        const r = await this.resolveDir('faf_context', args.path, {
          write: true,
          homeRefusal: (dir) => `${dir} is your home folder (or the filesystem root), not a project, so faf_context does not make it the active project.`,
        });
        if (!r.ok) {return this.refused(r);}
      }
      const active = this.engineAdapter.getWorkingDirectory();
      const fafResult = await this.findFaf(active);

      let content: string | undefined;
      if (args.detail === true && fafResult) {
        const { readFafRaw } = await fafCli;
        content = readFafRaw(fafResult.path);
      }

      const head = setting
        ? `FAF Context Set:\n\nActive project: ${active}\n${fafResult ? `.faf: ${where(fafResult)}` : 'No project.faf here or in the folder above'}\n\nSubsequent faf_* calls will use this context`
        : `FAF Current Context:\n\nActive project: ${active}\n${fafResult ? `.faf: ${where(fafResult)}` : 'No project.faf found'}\n\nUse the path parameter to change context`;
      const body = args.detail === true
        ? content !== undefined
          ? `\n\n--- ${fafResult!.path} ---\n${content}`
          : '\n\n(detail: there is no .faf to show)'
        : '';

      return {
        content: [{ type: 'text', text: `${head}${body}` }],
        structuredContent: {
          active,
          hasFaf: !!fafResult,
          filename: fafResult ? fafResult.filename : null,
          path: fafResult ? fafResult.path : null,
          changed: setting,
          ...(content !== undefined ? { content } : {}),
        }
      };
    } catch (error: any) {
      if (error instanceof PathConfinementError) {throw error;}
      return {
        content: [{ type: 'text', text: `FAF Context:\n\nError: ${oneLine(error)}` }],
        isError: true
      };
    }
  }

  /**
   * faf_go's answers, checked before anything is written (the bootstrap
   * included). A key is a slot path faf-cli knows — its interview
   * (INTERVIEW_PATHS, own keys only) or its slot table (SLOT_BY_PATH, where a
   * Mk4 name like `stack.db` stands for the on-wire `stack.database`) — and
   * never walks through `__proto__`, `constructor` or `prototype`. An answer is
   * text; a blank one is skipped. One bad key refuses the whole call.
   */
  private async checkAnswers(answers: unknown): Promise<
    | { ok: true; entries: Array<{ key: string; path: string[]; twin: string[] | null; value: string }>; skipped: string[] }
    | { ok: false; rejected: string[] }
  > {
    if (!isMapping(answers)) {
      return { ok: false, rejected: ['answers must be an object: slot path → answer text'] };
    }
    const { INTERVIEW_PATHS, SLOT_BY_PATH } = await fafCli;
    const entries: Array<{ key: string; path: string[]; twin: string[] | null; value: string }> = [];
    const skipped: string[] = [];
    const rejected: string[] = [];
    const seen = new Map<string, string>();
    for (const key of Object.keys(answers)) {
      const value = answers[key];
      const segments = key.split('.');
      const slot = segments.some((seg) => seg === '' || FORBIDDEN_KEYS.has(seg)) ? undefined : SLOT_BY_PATH.get(key);
      const asked = !segments.some((seg) => seg === '' || FORBIDDEN_KEYS.has(seg)) && Object.hasOwn(INTERVIEW_PATHS, key);
      if (!slot && !asked) {
        rejected.push(`${JSON.stringify(key)} is not a slot faf_go fills (use a slot path such as "project.goal", "human_context.why" or "stack.database")`);
        continue;
      }
      if (typeof value !== 'string') {
        rejected.push(`${key}: the answer must be text, not ${Array.isArray(value) ? 'a list' : value === null ? 'null' : typeof value}`);
        continue;
      }
      if (value.trim() === '') {
        skipped.push(key);
        continue;
      }
      // The kernel scores the on-wire key: a Mk4 name is written there.
      const onWire = slot ? slot.path : key;
      const other = seen.get(onWire);
      if (other !== undefined) {
        rejected.push(`${other} and ${key} both answer ${onWire}; send one`);
        continue;
      }
      seen.set(onWire, key);
      const twin = slot?.canonical && slot.canonical !== onWire ? slot.canonical.split('.') : null;
      entries.push({ key, path: onWire.split('.'), twin, value: value.trim() });
    }
    return rejected.length > 0 ? { ok: false, rejected } : { ok: true, entries, skipped };
  }

  /**
   * faf_go - Guided interview to Gold Code
   *
   * Two-phase operation:
   * 1. Without answers: Returns questions for missing fields
   * 2. With answers: Applies answers to .faf file and returns new score
   *
   * faf_go reads and writes <folder>/project.faf exactly — the file its answers
   * go to — and never in the home folder or the filesystem root.
   */
  private async handleFafGo(args: any): Promise<CallToolResult> {
    const r = await this.resolveDir('faf_go', args.path, { write: true });
    if (!r.ok) {return this.refused(r);}
    const cwd = r.dir;
    const fafPath = pathModule.join(cwd, 'project.faf');

    try {
      // The answers are checked before anything is written — the bootstrap too.
      let plan: { entries: Array<{ key: string; path: string[]; twin: string[] | null; value: string }>; skipped: string[] } | null = null;
      if (args.answers !== undefined && args.answers !== null) {
        const checked = await this.checkAnswers(args.answers);
        if (!checked.ok) {
          return {
            content: [{ type: 'text', text: `🎯 FAF Go:\n\n❌ Nothing was written: ${checked.rejected.length === 1 ? 'one answer was' : `${checked.rejected.length} answers were`} refused.\n${checked.rejected.map((m) => `  • ${m}`).join('\n')}` }],
            isError: true
          };
        }
        plan = checked;
      }

      const bootstrap: { ran: boolean; birthScore?: number; sourcedScore?: number; filesWritten: string[]; above?: string } = {
        ran: false,
        filesWritten: [],
      };

      if (!present(fafPath)) {
        // BOOTSTRAP — faf_go is the front door ("let's go"). With no project.faf
        // yet, walk the rungs FOR the human instead of bailing: faf_init creates
        // it (the birth-score reveal), faf_auto sources the stack. We DELEGATE to
        // the existing handlers (compose, never reimplement) and pass the resolved
        // cwd so all three target the same file. The human half is still only ever
        // ASKED below — init owns creation, auto owns sourcing, faf_go owns the 6Ws.
        const { scoreFafYaml, readFafRaw, readClaudeMd } = await fafCli;
        const scoreOf = (): number | undefined => {
          try { return scoreFafYaml(readFafRaw(fafPath)).score; } catch { return undefined; }
        };
        // faf_auto also writes CLAUDE.md: compare its bytes so the report says
        // what was actually written. faf-cli's reader never follows a link out.
        const readClaude = (): string | null => {
          try { return readClaudeMd(cwd); } catch { return null; }
        };
        let nearest: FoundFaf | null = null;
        try { nearest = await this.findFaf(cwd); } catch { /* a refused link is named by faf_status */ }
        if (nearest?.above) {bootstrap.above = nearest.path;}
        const claudeBefore = readClaude();

        await this.handleFafInit(argsOf({ path: cwd }));
        bootstrap.birthScore = scoreOf();

        await this.handleFafAuto(argsOf({ path: cwd }));
        bootstrap.sourcedScore = scoreOf();
        bootstrap.ran = true;
        const claudeAfter = readClaude();
        bootstrap.filesWritten = [
          ...(present(fafPath) ? ['project.faf'] : []),
          ...(claudeAfter !== null && claudeAfter !== claudeBefore ? ['CLAUDE.md'] : []),
        ];

        if (!present(fafPath)) {
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                needsInit: true,
                context: 'faf_go',
                message: 'No project.faf found, and the bootstrap (faf_init + faf_auto) did not produce one. Run faf_init manually, then faf_go.',
              }, null, 2)
            }],
            isError: true
          };
        }
      }

      // The read boundary: the older `project: <name>` shape is lifted to project.name.
      const { data: fafData, legacyProject } = await readFafData(fafPath);

      // Single-source the HUMAN interview from faf-cli's canonical SIX_WS_INTERVIEW
      // (8 = the 6Ws + name + goal; public since 6.9.0). This is THE 6Ws — human-
      // only context that can't be derived. main_language + stack are NOT here:
      // they're SOURCED by Turbo-Cat (faf-cli's separate STACK_INTERVIEW if ever
      // needed), never asked of a human. (Decision: single-source the 8-Q 6Ws
      // Interview, wolfejam 2026-06-10 — language is not on the human side.)
      const { SIX_WS_INTERVIEW, buildTableOf8, updateFafFile, readFafRaw, scoreFafYaml, scoreText, loopVerdict } = await fafCli;
      const QUESTION_REGISTRY: Record<string, (typeof SIX_WS_INTERVIEW)[number]> =
        Object.fromEntries(SIX_WS_INTERVIEW.map((q) => [q.path, q]));

      // PHASE 2: Apply answers if provided
      if (plan !== null) {
        const answers = plan;
        // Where each answer lands must already be a mapping (or nothing yet):
        // faf_go never steps through a value or a list, and never replaces a
        // mapping or a list that holds something. The older scalar `project:`
        // is the one value it moves — to project.name, the name kept.
        const blocked: string[] = [];
        for (const e of plan.entries) {
          let cur: unknown = fafData;
          for (let i = 0; i < e.path.length - 1; i++) {
            const step = isMapping(cur) && Object.hasOwn(cur, e.path[i]) ? cur[e.path[i]] : undefined;
            if (step !== undefined && step !== null && !isMapping(step)) {
              blocked.push(`${e.key}: ${e.path.slice(0, i + 1).join('.')} holds ${Array.isArray(step) ? 'a list' : `the value ${JSON.stringify(step)}`}, not a mapping; faf_go does not replace it`);
              cur = undefined;
              break;
            }
            cur = step;
          }
          const leaf = isMapping(cur) && Object.hasOwn(cur, e.path[e.path.length - 1]) ? cur[e.path[e.path.length - 1]] : undefined;
          if ((Array.isArray(leaf) && leaf.length > 0) || (isMapping(leaf) && Object.keys(leaf).length > 0)) {
            blocked.push(`${e.key}: ${e.path.join('.')} holds ${Array.isArray(leaf) ? 'a list' : 'a mapping'}; faf_go does not replace it`);
          }
        }
        if (blocked.length > 0) {
          return {
            content: [{ type: 'text', text: `🎯 FAF Go:\n\n❌ Nothing was written to ${fafPath}:\n${blocked.map((m) => `  • ${m}`).join('\n')}\nEdit those sections by hand, then answer again.` }],
            isError: true
          };
        }

        // faf-cli edits the file in place: comments, key order and every value
        // not answered stay as written; a change that changes nothing writes nothing.
        // The older scalar `project:` is moved to project.name only when an
        // answer lands under project; otherwise the file keeps it as it is.
        const liftProject = legacyProject !== null && answers.entries.some((e) => e.path[0] === 'project');
        const underAlias: string[] = [];
        let result: { written: boolean; keptAliases?: Array<{ path: string }> };
        try {
          result = updateFafFile(fafPath, (doc: Document) => {
            const project = doc.get('project', true);
            if (liftProject && isScalar(project) && isScalarProject(project.value)) {
              const lifted = doc.createNode({ name: String(project.value) });
              if (project.commentBefore) {lifted.commentBefore = project.commentBefore;}
              if (project.comment) {lifted.comment = project.comment;}
              doc.set('project', lifted);
            }
            entries: for (const e of answers.entries) {
              // A step that is there but empty (`human_context:`) becomes a mapping.
              for (let i = 1; i < e.path.length; i++) {
                const step = doc.getIn(e.path.slice(0, i), true);
                if (isScalar(step) && (step.value === null || step.value === undefined)) {
                  const map = doc.createNode({});
                  if (step.commentBefore) {map.commentBefore = step.commentBefore;}
                  if (step.comment) {map.comment = step.comment;}
                  doc.setIn(e.path.slice(0, i), map);
                } else if (step !== undefined && !isMap(step)) {
                  // An alias (`human_context: *team`): faf never expands one.
                  underAlias.push(e.key);
                  continue entries;
                }
              }
              doc.setIn(e.path, e.value);
              // The Mk4 name of the slot, when the file uses it too, keeps in step.
              if (e.twin && isScalar(doc.getIn(e.twin, true))) {doc.setIn(e.twin, e.value);}
            }
          });
        } catch (error: any) {
          return { content: [{ type: 'text', text: `🎯 FAF Go:\n\n❌ ${notWritten(fafPath, error)}` }], isError: true };
        }

        // The score is faf-cli's, on the bytes now on disk — the number faf_score reports.
        const scored = scoreFafYaml(readFafRaw(fafPath));
        const score = scored.score;
        const growth = result.written && !scored.unknown ? await this.recordGrowth(cwd, score, 'faf_go') : null;
        const keptAliases = [...(result.keptAliases ?? []).map((k) => k.path), ...underAlias];
        const applied = plan.entries.filter((e) => !underAlias.includes(e.key));
        const after = await readFafData(fafPath);
        const lines = [
          'FAF Go - Answers Applied',
          '',
          result.written
            ? `Updated ${applied.length} field(s) in ${fafPath}: ${applied.map((e) => e.path.join('.')).join(', ')}`
            : `Nothing changed in ${fafPath}: every answer already matched it.`,
          ...(liftProject && result.written ? [`Moved the older \`project: ${legacyProject}\` to project.name (the name is kept)`] : []),
          ...(keptAliases.length ? [`Left ${keptAliases.length} alias(es) as written, so those answers were not written: ${keptAliases.join(', ')}`] : []),
          ...(plan.skipped.length ? [`Skipped ${plan.skipped.length} blank answer(s): ${plan.skipped.join(', ')}`] : []),
          `Score: ${scoreText(scored)} (faf-cli)`,
          ...(growth ? [growth] : []),
          '',
          await this.goVerdictLine(scored, after.data),
        ];
        return { content: [{ type: 'text', text: lines.join('\n') }] };
      }

      // PHASE 1: Build the Table-of-8 (the 8Qs flow) — single-sourced from
      // faf-cli's buildTableOf8. Name/Goal are filled where known; WHO/WHAT/WHERE
      // are SEEDED from the goal (facts only, terse); WHY/WHEN/HOW are asked. The
      // host presents the table: seeded rows are confirm-or-edit suggestions
      // (Tab/Enter), empty rows are questions. Nothing is committed until the
      // human approves and faf_go is called back with answers.
      //
      // The score is faf-cli's scoreFafYaml — the number faf_score reports —
      // and whether the work is done is faf-cli's loopVerdict: complete only at
      // 100. A filled Table-of-8 is not 100% by itself; before 6.0.0 it was
      // reported as "100% GOLD CODE" at 38–67%. When the repo can still fill
      // slots (can-source), the reply points to faf_auto; faf_go itself asks
      // only the Table-of-8.
      const table = buildTableOf8(fafData);
      const scored = scoreFafYaml(readFafRaw(fafPath));
      const verdict = loopVerdict(scored.unknown ? 0 : scored.score, fafData);
      const complete = !scored.unknown && scored.score >= 100;
      const next = await this.goVerdictLine(scored, fafData);
      const bootstrapInfo = bootstrap.ran ? {
        created: true,
        sourced: true,
        birthScore: bootstrap.birthScore,
        sourcedScore: bootstrap.sourcedScore,
        filesWritten: bootstrap.filesWritten,
        ...(bootstrap.above ? { leftAsIs: bootstrap.above } : {}),
        message: `No project.faf existed — created it and sourced your stack${
          bootstrap.birthScore != null && bootstrap.sourcedScore != null
            ? bootstrap.birthScore === bootstrap.sourcedScore
              ? ` (${bootstrap.sourcedScore}%)`
              : ` (${bootstrap.birthScore}% → ${bootstrap.sourcedScore}%)`
            : ''
        }. Wrote ${bootstrap.filesWritten.join(' and ')}.${bootstrap.above ? ` ${bootstrap.above} (one level up) is left as it is.` : ''}`,
      } : undefined;
      const scoreFields = {
        score: scored.score,
        scoreText: scoreText(scored),
        ...(scored.unknown ? { unknown: true } : {}),
        status: verdict.status,
        ...(verdict.gaps.sourceable.length ? { sourceable: verdict.gaps.sourceable } : {}),
        next,
      };

      // Nothing left in the Table-of-8 to ask.
      if (table.complete) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              complete,
              ...scoreFields,
              message: complete
                ? `${bootstrap.ran ? 'Created, sourced and already complete: ' : ''}✪ 100% — faf-cli scores this project.faf at 100%. Nothing to ask.`
                : `The Table-of-8 is answered. ${next}`,
              ...(bootstrapInfo ? { bootstrap: bootstrapInfo } : {}),
              context: 'faf_go'
            }, null, 2)
          }]
        };
      }

      // Rows needing human input: seeded (confirm/edit the goal-fact) + empty (answer).
      const questions = table.rows
        .filter((r) => r.status !== 'filled')
        .map((r) => ({
          field: r.path,
          question: r.question,
          header: r.header,
          status: r.status,                       // 'seeded' | 'empty'
          suggested: r.seeded ? r.value : '',      // a goal-fact to accept (Tab/Enter) or edit
          options: QUESTION_REGISTRY[r.path]?.options,
        }));

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            needsInput: true,
            complete: false,
            context: 'faf_go — the Table-of-8 (the human half of project.faf)',
            ...(bootstrapInfo ? { bootstrap: { ...bootstrapInfo, message: `${bootstrapInfo.message} The 6Ws below complete it.` } } : {}),
            currentScore: scored.score,
            targetScore: 100,
            ...scoreFields,
            // The full Table-of-8 to render: each box filled / seeded / empty.
            table: table.rows.map((r) => ({ n: r.n, header: r.header, field: r.path, value: r.value, status: r.status })),
            filled: table.filledCount,
            seeded: table.seededCount,
            empty: table.emptyCount,
            questionsRemaining: questions.length,
            questions,
            instructions: 'Present the Table-of-8. For SEEDED rows, show the `suggested` value for the human to accept (Tab/Enter) or edit — these are facts pulled from the project goal, confirm them, do not re-ask blind. For EMPTY rows, ask the question. Then call faf_go again with the answers parameter (field path → value) to apply.'
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `FAF Go:\n\nError: ${oneLine(error)}` }],
        isError: true
      };
    }
  }

  /**
   * The one line faf_go ends on: ✪ at 100, else where it stopped and why —
   * from faf-cli's loopVerdict on the lifted data. can-source → faf_auto;
   * needs-human → faf_go asks; done below 100 → faf_score shows the rest.
   */
  private async goVerdictLine(
    scored: ReturnType<Awaited<typeof fafCli>['scoreFafYaml']>,
    data: Record<string, unknown>,
  ): Promise<string> {
    const { loopVerdict, scoreText } = await fafCli;
    if (scored.unknown) {
      return `The score is ${scoreText(scored)}: an About repo is scored from about.source_score, which faf_go does not set.`;
    }
    if (scored.score >= 100) {return '✪ 100% — your AI has the complete context.';}
    const verdict = loopVerdict(scored.score, data);
    if (verdict.status === 'can-source') {
      return `Stopped at ${scored.score}%: the repo can still fill ${verdict.gaps.sourceable.join(', ')} — run faf_auto${verdict.gaps.human.length ? `; faf_go asks for ${verdict.gaps.human.join(', ')}` : ''}.`;
    }
    if (verdict.status === 'needs-human') {
      return `Stopped at ${scored.score}%: only you can fill ${verdict.gaps.human.join(', ')} — faf_go asks for them.`;
    }
    return `Stopped at ${scored.score}%: faf_go has nothing left to ask. faf_score (details: true) lists the slots still empty.`;
  }

  /**
   * faf_bench — the AI-grounding benchmark, in-session.
   *
   * Composes faf-cli's bench engine (the single source): questions derive from
   * the project.faf's populated slots — the .faf IS the answer key — so grading
   * is mechanical (deriveQuestionSet + gradeAnswers, no judge). We hand out only
   * publicQuestions (NEVER the answer key — a tool that prints it makes the
   * benchmark a lie) and bind the result with faf-cli's buildReceipt (a qset-bound hash; no ✪ — a bench is not a 100% score).
   *
   * DOCTRINE (faf-cli bench): the delta IS the product. A low score is an alarm,
   * not a FAF verdict — the cold number belongs to the ABSENCE of context. Never
   * render cold alone; always end in a prescription, never a verdict.
   */
  private async handleFafBench(args: any): Promise<CallToolResult> {
    const r = await this.resolveDir('faf_bench', args.path);
    if (!r.ok) {return this.refused(r);}
    const cwd = r.dir;
    try {
      const {
        readFafRaw, deriveQuestionSet, publicQuestions,
        gradeAnswers, buildReceipt: buildBenchReceipt, BENCH_VERSION,
      } = await fafCli;

      const found = await this.findFaf(cwd);
      const fafPath = found?.path;
      if (!found || !fafPath) {
        return {
          content: [{ type: 'text', text: 'faf_bench needs a project.faf to derive its questions — there is nothing to benchmark without context. Run faf_go (or faf_init) first.' }],
          isError: true
        };
      }

      const raw = readFafRaw(fafPath);
      const qset = deriveQuestionSet(raw);          // includes the answer key — NEVER emit it
      const N = qset.questions.length;
      const action = args.action === 'grade' ? 'grade' : 'questions';
      // The older `project: <name>` shape: faf-cli reads no name from it, so no
      // name question is derived. Say where the fix is (the questions are
      // faf-cli's, on the file as it is).
      let legacyNote = '';
      try {
        const { legacyProject } = await readFafData(fafPath);
        if (legacyProject !== null) {legacyNote = legacyProjectHint(found.filename, legacyProject);}
      } catch { /* faf_doctor says what is wrong with the file */ }

      if (N === 0) {
        return {
          content: [{ type: 'text', text: `faf_bench: no populated slots to derive questions from — the .faf is empty. Run faf_go to ground it, then benchmark.${legacyNote ? `\n${legacyNote}` : ''}` }],
          structuredContent: { action, version: qset.version, qsetHash: qset.qsetHash, total: 0, path: fafPath },
        };
      }

      // ── action: questions ── hand out the answer-key-SAFE set only.
      if (action === 'questions') {
        const pub = publicQuestions(qset);          // { version, qsetHash, questions } — no answers
        const text = [
          `faf_bench — ${pub.questions.length} grounding questions  (qset ${pub.qsetHash.slice(0, 12)}… · ${BENCH_VERSION})`,
          `From: ${where(found)}`,
          ...(legacyNote ? [legacyNote] : []),
          '',
          'Answer each one TWICE, honestly:',
          '  • cold — from general knowledge of this repo ONLY, as if the project.faf did not exist.',
          '  • faf  — with the project.faf in context.',
          'Then call: faf_bench { action: "grade", cold: { "1": "…", … }, faf: { "1": "…", … } }',
          '',
          ...pub.questions.map((q) => `  ${q.n}. [${q.path}] ${q.question}`),
        ].join('\n');
        return {
          content: [{ type: 'text', text }],
          structuredContent: { action: 'questions', version: pub.version, qsetHash: pub.qsetHash, total: pub.questions.length, questions: pub.questions, path: fafPath },
        };
      }

      // ── action: grade ──
      const cold = args.cold && typeof args.cold === 'object' ? (args.cold as Record<string, string>) : undefined;
      const faf = args.faf && typeof args.faf === 'object' ? (args.faf as Record<string, string>) : undefined;
      if (!cold && !faf) {
        return {
          content: [{ type: 'text', text: 'faf_bench grade needs answers: pass `cold` and/or `faf` as { questionNumber: answer }. Get the set first with faf_bench { action: "questions" }.' }],
          isError: true
        };
      }

      const cg = cold ? gradeAnswers(qset, cold) : undefined;
      const fg = faf ? gradeAnswers(qset, faf) : undefined;
      const repo = pathModule.basename(cwd);
      const receipt = buildBenchReceipt(
        {
          version: qset.version,
          qsetHash: qset.qsetHash,
          protocol: 'in-session',
          ...(cg ? { cold: { score: cg.correct, total: cg.total, ...(typeof args.coldTokens === 'number' ? { tokens: args.coldTokens } : {}), ...(args.model ? { model: String(args.model) } : {}) } } : {}),
          ...(fg ? { faf: { score: fg.correct, total: fg.total, ...(typeof args.fafTokens === 'number' ? { tokens: args.fafTokens } : {}), ...(args.model ? { model: String(args.model) } : {}) } } : {}),
        },
        repo,
      );

      // Render per bench doctrine: the pair, the delta as the product, a
      // prescription to close — never a bare cold verdict.
      const lines: string[] = [`faf_bench — grounding accuracy  (qset ${qset.qsetHash.slice(0, 12)}… · ${BENCH_VERSION})`, `From: ${where(found)}`, ''];
      if (cg && fg) {
        const delta = fg.correct - cg.correct;
        lines.push(`Without context:  ${cg.correct}/${N}`);
        lines.push(`With FAF:         ${fg.correct}/${N}`);
        lines.push(`Delta:            ${delta >= 0 ? '+' : ''}${delta}   ← the product`);
        if (typeof args.coldTokens === 'number' && typeof args.fafTokens === 'number') {
          lines.push(`Tokens to ground: ${args.coldTokens} (cold) → ${args.fafTokens} (with FAF)`);
        }
        lines.push('');
        lines.push(fg.correct >= N
          ? 'Prescription: fully grounded with the .faf. Keep it current — run faf_go after material changes so the context never drifts.'
          : `Prescription: ${N - fg.correct} question(s) still ungrounded even with the .faf — fill the matching slots (faf_go) to close them. The delta above is what the .faf already buys you.`);
      } else if (fg) {
        lines.push(`With FAF:  ${fg.correct}/${N}`);
        lines.push('');
        lines.push('No cold run submitted — the delta is the product; run the cold pass too to see what the context is worth.');
        lines.push(fg.correct >= N
          ? 'Prescription: fully grounded — keep the .faf current with faf_go.'
          : `Prescription: ${N - fg.correct} ungrounded — fill the matching slots with faf_go.`);
      } else if (cg) {
        // cold alone — framed as the ABSENCE baseline, never a FAF verdict.
        lines.push(`Without context: ${cg.correct}/${N}  — the absence-of-context baseline, NOT a FAF score.`);
        lines.push(`${N - cg.correct} of ${N} questions can't be answered without the project.faf — that's the AI guessing, and tokens burned doing it.`);
        lines.push('');
        lines.push('Prescription: run the WITH-FAF pass (answer with the .faf in context, then faf_bench grade) to see the lift — or just faf_go to ground the project now.');
      }
      // The receipt hash, plain: ✪ is the 100% mark and a bench is not a score.
      lines.push('', `Receipt: ${receipt.hash.slice(0, 16)}…   (in-session · ${repo})`);

      return {
        content: [{ type: 'text', text: lines.join('\n') }],
        structuredContent: {
          action: 'grade',
          version: qset.version,
          qsetHash: qset.qsetHash,
          protocol: 'in-session',
          total: N,
          ...(cg ? { cold: { correct: cg.correct, total: cg.total, misses: cg.misses.map((m) => m.path) } } : {}),
          ...(fg ? { faf: { correct: fg.correct, total: fg.total, misses: fg.misses.map((m) => m.path) } } : {}),
          ...(cg && fg ? { delta: fg.correct - cg.correct } : {}),
          receipt,
          path: fafPath,
        },
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `faf_bench:\n\n❌ Error: ${error?.message ?? String(error)}` }],
        isError: true
      };
    }
  }

  /**
   * faf_auto — faf-cli's `faf auto` chain, then CLAUDE.md.
   *
   * project.faf is <folder>/project.faf exactly (as `faf auto` targets it): a
   * new file is assembled with assembleFreshFaf; an existing one is filled with
   * updateExistingFaf (existing values win; interrogated → detected →
   * Turbo-Cat → Relentless fill only the empties; a typed none in a tech slot
   * takes a repo fact) and written in place by writeFaf, which keeps comments,
   * key order and exact scalars and writes nothing on a no-op. Every value the
   * file held that the fill changed is listed. A folder with only the older
   * `.faf` gets a project.faf filled from it (the .faf is left as it is), so
   * nothing typed there is lost.
   *
   * CLAUDE.md: faf-cli's render of the project.faf just written, through the
   * block injector. Each file's outcome is reported on its own: a CLAUDE.md
   * that cannot be written never hides a project.faf that was.
   */
  private async handleFafAuto(args: any): Promise<CallToolResult> {
    const startTime = Date.now();
    const r = await this.resolveDir('faf_auto', args.path, { write: true });
    if (!r.ok) {return this.refused(r);}
    const cwd = r.dir;
    const path = await import('path');

    const steps: string[] = [];
    const {
      readFafRaw,
      scoreFafYaml,
      assembleFreshFaf,
      updateExistingFaf,
      writeFaf,
    } = await fafCli;

    // Step 1: project.faf — <cwd>/project.faf exactly.
    const fafPath = path.join(cwd, 'project.faf');
    const legacyPath = path.join(cwd, '.faf');
    const fafLabel = 'project.faf';
    const fafExisted = present(fafPath);
    let beforeScore = 0;
    let fafOutcome: string;
    let legacyProject: string | null = null;
    try {
      if (!fafExisted && present(legacyPath)) {
        // The older file name: its values are kept, the empties filled, and the
        // result written as project.faf (read first from now on). The .faf stays.
        const read = await readFafData(legacyPath);
        legacyProject = read.legacyProject;
        beforeScore = scoreFafYaml(readFafRaw(legacyPath)).score;
        writeFaf(fafPath, updateExistingFaf(cwd, read.data) as any);
        fafOutcome = 'project.faf created from .faf';
        steps.push(`✅ Created ${fafPath} from ${legacyPath} (its values kept, the empty slots filled from the repo)`);
        steps.push('✅ .faf is left as it was; faf reads project.faf first from now on');
      } else if (!fafExisted) {
        writeFaf(fafPath, assembleFreshFaf(cwd) as any);
        fafOutcome = 'project.faf created';
        steps.push(`✅ Created project.faf (${fafPath})`);
        let nearest: FoundFaf | null = null;
        try { nearest = await this.findFaf(cwd); } catch { /* named by faf_status */ }
        if (nearest?.above) {steps.push(`ℹ️ ${nearest.path} (one level up) is left as it is; this folder now has its own project.faf`);}
      } else {
        const read = await readFafData(fafPath); // not a mapping / not YAML → refused here, nothing written
        legacyProject = read.legacyProject;
        const data = read.data;
        beforeScore = scoreFafYaml(readFafRaw(fafPath)).score;
        const before = structuredClone(data);
        const filled = updateExistingFaf(cwd, data);
        const kept: string[] = [];
        const written = writeFaf(fafPath, filled as any, { onAliasKept: (k) => kept.push(k.path) });
        const { filledPaths, ignoredPaths, changedValues } = slotChanges(before, filled);
        steps.push(`✅ Found ${fafPath}`);
        if (!written) {
          fafOutcome = `${fafLabel} unchanged`;
          steps.push('✅ Nothing to fill: every slot the repo answers already holds a value (file not rewritten)');
        } else {
          fafOutcome = `${fafLabel} updated`;
          if (legacyProject !== null) {steps.push(`✅ Moved the older \`project: ${legacyProject}\` to project.name (the name is kept)`);}
          steps.push(`✅ Filled ${filledPaths.length} empty slot(s) from the repo${filledPaths.length ? `: ${filledPaths.join(', ')}` : ''}`);
          if (ignoredPaths.length) {steps.push(`✅ Marked ${ignoredPaths.length} empty slot(s) slotignored (the app-type leaves them out): ${ignoredPaths.join(', ')}`);}
          if (changedValues.length === 0) {
            steps.push('✅ Every value already in the file was kept');
          } else {
            steps.push(`⚠️ Changed ${changedValues.length} value(s) the file held (faf-cli fills typed words from a repo fact or the app-type):`);
            for (const c of changedValues) {steps.push(`   • ${c}`);}
          }
        }
        if (kept.length) {steps.push(`✅ Left ${kept.length} alias(es) as written: ${kept.join(', ')}`);}
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `🏎️ FAF Auto:\n\n❌ Error: ${notWritten(fafLabel, error, fafExisted)}. Nothing was written.` }],
        isError: true
      };
    }

    // Step 2: report what TURBO-CAT found (faf-cli's engine; its slot fills
    // are already in the file written above).
    try {
      const formatsResult = await composedTurboCat(cwd);
      steps.push(formatsResult && formatsResult.discoveredFormats.length > 0
        ? `✅ TURBO-CAT discovered ${formatsResult.discoveredFormats.length} formats`
        : '⚠️ No additional formats detected');
    } catch {
      steps.push('⚠️ TURBO-CAT could not scan the folder');
    }

    // Step 3: CLAUDE.md — faf-cli's render of the project.faf just written,
    // injected with faf-cli's injector (only the faf-managed block changes).
    let claudeOutcome: string;
    let claudeFailed = false;
    try {
      const { data } = await readFafData(fafPath);
      const written = await writeClaudeFromFaf(cwd, data, legacyProject);
      claudeOutcome = written.before === null ? 'CLAUDE.md created'
        : written.after === written.before ? 'CLAUDE.md unchanged' : 'CLAUDE.md updated (faf-managed block)';
      steps.push(`✅ ${written.before === null ? 'Created CLAUDE.md' : written.after === written.before ? 'CLAUDE.md already current' : 'Updated CLAUDE.md (faf-managed block)'}`);
      for (const note of written.notes) {steps.push(`   ${note}`);}
    } catch (error: any) {
      claudeFailed = true;
      claudeOutcome = `CLAUDE.md not written: ${notWritten('CLAUDE.md', error)}`;
      steps.push(`❌ ${claudeOutcome}`);
    }

    // Step 4: final score — faf-cli's scorer, the same number faf_score reports.
    let newScore = beforeScore;
    let unknown = false;
    try {
      const after = scoreFafYaml(readFafRaw(fafPath));
      newScore = after.score;
      unknown = after.unknown === true;
    } catch { /* reported by faf_score */ }
    const growth = unknown ? null : await this.recordGrowth(cwd, newScore, 'faf_auto');
    if (growth) {steps.push(`✅ ${growth}`);}
    const scoreDelta = newScore - beforeScore;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const deltaDisplay = scoreDelta > 0 ? `(+${scoreDelta}%)` : scoreDelta < 0 ? `(${scoreDelta}%)` : '(no change)';

    let output = `${fafOutcome}; ${claudeOutcome}\n\n`;
    output += `FAF AUTO\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    output += steps.join('\n') + '\n\n';
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `⏱️ Completed in ${elapsed}s\n`;
    output += unknown
      ? `📊 Score: unknown (—) — an About repo with no about.source_score\n`
      : `📊 Before: ${beforeScore < 0 ? 'unknown (—)' : `${beforeScore}%`} | After: ${newScore}% ${beforeScore < 0 ? '' : deltaDisplay}\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    output += unknown
      ? `faf-cli scores an About repo from about.source_score; add it by hand to set the score.\n`
      : newScore >= 100
        ? `✪ 100% — your AI has the complete context.\n`
        : `${100 - newScore}% to go: faf_score (details: true) lists the empty slots; faf_go asks for what the repo cannot tell.\n`;
    output += `\n💡 Next: faf_score (details: true) | faf_go`;

    return { content: [{ type: 'text', text: output }], ...(claudeFailed ? { isError: true } : {}) };
  }

  /**
   * faf_dna — the project's .faf-dna lineage, read with faf-cli's
   * FafDNAManager (the one `faf dna` uses): the birth score faf_init recorded,
   * every score since and the journey line. It only reads: faf_init writes the
   * birth certificate, faf_auto and faf_go add to it. A .faf-dna in another
   * shape (claude-faf-mcp ≤5.22.1 wrote one) is read as far as it goes and left
   * as it is.
   */
  private async handleFafDna(args: any): Promise<CallToolResult> {
    const r = await this.resolveDir('faf_dna', args.path);
    if (!r.ok) {return this.refused(r);}
    const cwd = r.dir;

    try {
      const { FafDNAManager } = await fafCli;
      let found: FoundFaf | null = null;
      try { found = await this.findFaf(cwd); } catch { /* a refused .faf link: faf_status names it */ }
      // The lineage lives next to the project's .faf (faf init births it there).
      const projectDir = found ? found.dir : cwd;
      const dnaPath = pathModule.join(projectDir, '.faf-dna');
      const dna = new FafDNAManager(projectDir);

      if (!present(dnaPath)) {
        return {
          content: [{
            type: 'text',
            text: `🧬 FAF DNA Journey\n\nNo .faf-dna in ${projectDir}.\n💡 faf_init writes the birth certificate when it creates project.faf; faf_auto and faf_go add each new score to it.`
          }],
          structuredContent: { hasFaf: !!found, hasDna: false, path: dnaPath }
        };
      }

      const doc = dna.load();
      if (!doc) {
        const why = dna.readOnlyReason();
        return {
          content: [{
            type: 'text',
            text: `🧬 FAF DNA:\n\n❌ ${dnaPath} was refused or could not be read${why ? `: ${why}` : ' (a link that leaves the project or leads nowhere)'} — faf_dna reads nothing through it and writes nothing.`
          }],
          structuredContent: { hasFaf: !!found, hasDna: true, path: dnaPath, readOnly: why },
          isError: true
        };
      }

      const display = dna.getBirthDNADisplay();
      const journey = dna.getJourney();
      const log = dna.getLog();
      const readOnly = dna.readOnlyReason();
      const birthScore = display?.birthDNA ?? doc.birthCertificate.birthDNA;
      const currentScore = display?.current ?? doc.current.score;
      const totalGrowth = currentScore - birthScore;
      const born = display?.born ?? doc.birthCertificate.born;

      let output = `🧬 YOUR FAF DNA — ${dnaPath}\n\n`;
      output += `   ${journey}\n\n`;
      output += `Born: ${born ? born.split('T')[0] : 'unknown'}${doc.birthCertificate.certificate ? `  ·  ${doc.birthCertificate.certificate}` : ''}\n`;
      output += `Birth DNA: ${birthScore}%  ·  Now: ${currentScore}%  ·  Growth: ${totalGrowth >= 0 ? '+' : ''}${totalGrowth}%\n`;
      if (log.length) {
        output += `\nScores recorded (${log.length}):\n${log.map((l) => `  ${l}`).join('\n')}\n`;
      }
      if (readOnly) {output += `\n${readOnly}\n`;}

      return {
        content: [{ type: 'text', text: output }],
        structuredContent: {
          hasFaf: !!found,
          hasDna: true,
          path: dnaPath,
          birthScore,
          currentScore,
          totalGrowth,
          daysActive: doc.growth.daysActive,
          born,
          certificate: doc.birthCertificate.certificate || null,
          journey,
          versions: doc.versions.length,
          readOnly,
          milestones: doc.growth.milestones.map((m) => ({ type: m.type, score: m.score, date: m.date, version: m.version }))
        }
      };

    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `🧬 FAF DNA:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  /**
   * faf_formats — faf-cli's Turbo-Cat scan of the project folder (never above
   * it: faf-cli 7.13 reads only the folder's own files), each format with the
   * file it came from, and a dry run of faf_auto on this folder: the slots
   * faf_auto would fill, mark slotignored or change in <folder>/project.faf.
   * Nothing is written; no score of its own.
   */
  private async handleFafFormats(args: any): Promise<CallToolResult> {
    const r = await this.resolveDir('faf_formats', args.path);
    if (!r.ok) {return this.refused(r);}
    const cwd = r.dir;
    const startTime = Date.now();

    try {
      const { turboCatScan, assembleFreshFaf, updateExistingFaf } = await fafCli;
      const scan = turboCatScan(cwd);
      const formats = [...scan.discoveredFormats]
        .sort((a, b) => a.fileName.localeCompare(b.fileName))
        .map((f) => ({ ...f, path: pathModule.join(cwd, f.fileName) }));

      // The dry run: faf_auto's own chain on this folder, never written.
      const target = pathModule.join(cwd, 'project.faf');
      const legacy = pathModule.join(cwd, '.faf');
      const source = present(target) ? target : present(legacy) ? legacy : null;
      const before = source ? (await readFafData(source)).data : {};
      const after = source ? updateExistingFaf(cwd, structuredClone(before)) : assembleFreshFaf(cwd);
      const { filledPaths, ignoredPaths, changedValues } = slotChanges(before, after);
      const values = leaves(after);
      const wouldFill: Record<string, unknown> = {};
      for (const p of filledPaths) {wouldFill[p] = values.get(p);}
      const elapsed = Date.now() - startTime;

      const structured = {
        directory: cwd,
        count: formats.length,
        elapsedMs: elapsed,
        stackSignature: scan.stackSignature,
        formats,
        target,
        creates: source !== target,
        wouldFill,
        wouldIgnore: ignoredPaths,
        wouldChange: changedValues,
      };

      if (args.json === true) {
        return { content: [{ type: 'text', text: JSON.stringify(structured, null, 2) }], structuredContent: structured };
      }

      const show = (v: unknown): string => (typeof v === 'string' ? v : JSON.stringify(v));
      let output = `faf_formats — ${cwd} (reads only; nothing is written)\n\n`;
      output += formats.length
        ? `Formats faf-cli found in this folder (${formats.length}):\n${formats.map((f) => `  • ${f.fileName} (${f.category})`).join('\n')}\n`
        : 'No known formats in this folder.\n';
      output += `Stack signature: ${scan.stackSignature}\n\n`;
      const writes = source === target ? `faf_auto would fill ${target}` : source ? `faf_auto would create ${target} from ${source}` : `faf_auto would create ${target}`;
      output += filledPaths.length
        ? `${writes} with:\n${filledPaths.map((p) => `  • ${p}: ${show(wouldFill[p])}`).join('\n')}\n`
        : `${writes}: nothing to fill from the repo.\n`;
      if (ignoredPaths.length) {output += `It would mark slotignored (the app-type leaves them out): ${ignoredPaths.join(', ')}\n`;}
      if (changedValues.length) {output += `It would change what the file holds:\n${changedValues.map((c) => `  • ${c}`).join('\n')}\n`;}
      output += `\nRun faf_auto to write it.`;

      return { content: [{ type: 'text', text: output }], structuredContent: structured };

    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `faf_formats:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  /**
   * faf_quick — a new project.faf from one line, composed from faf-cli:
   * assembleFreshFaf detects the folder, and the words the user gave (name,
   * goal, language, framework, hosting) take their slots over the detected
   * ones. A framework goes to stack.frontend or stack.backend only when faf-cli's
   * stack interview lists it there; otherwise it is reported, never guessed.
   * It only creates: an existing project.faf (or legacy .faf) is left alone.
   */
  private async handleFafQuick(args: any): Promise<CallToolResult> {
    const r = await this.resolveDir('faf_quick', args.path, { write: true });
    if (!r.ok) {return this.refused(r);}
    const cwd = r.dir;
    const path = await import('path');
    const startTime = Date.now();

    try {
      const input = args.input;

      if (!input || typeof input !== 'string') {
        return {
          content: [{
            type: 'text',
            text: `⚡ FAF Quick

Usage: Provide a comma-separated string:
  "project-name, goal, language, framework, hosting"

Examples:
  "my-app, e-commerce platform, typescript, react, vercel"
  "api-service, REST API for mobile app, python, fastapi, aws"
  "cli-tool, developer productivity tool, go"

Minimum: name and goal. faf-cli detects the rest from the folder.`
          }]
        };
      }

      // Parse the quick input
      const parts = input.split(',').map((s: string) => s.trim());

      if (parts.length < 2 || !parts[0] || !parts[1]) {
        return {
          content: [{
            type: 'text',
            text: `⚡ FAF Quick: Need at least: project-name, goal

Got: "${input}"

Example: "my-app, e-commerce platform"`
          }],
          isError: true
        };
      }

      const [projectName, projectGoal, language = '', framework = '', hosting = ''] = parts;

      // A new <cwd>/project.faf only: a project.faf or .faf in this folder is the user's.
      const existing = [path.join(cwd, 'project.faf'), path.join(cwd, '.faf')].find(present);
      if (existing) {
        return {
          content: [{
            type: 'text',
            text: `⚡ FAF Quick

⚠️ ${path.basename(existing)} already exists at: ${existing}
faf_quick only creates a new file, so it wrote nothing. faf_auto fills its empty slots from the repo (existing values kept); faf_go asks for the 6Ws.`
          }],
          isError: true
        };
      }

      const { assembleFreshFaf, fillEmpties, writeFaf, readFafRaw, scoreFafYaml, STACK_INTERVIEW, FafDNAManager } = await fafCli;

      // faf-cli's own vocabulary for a slot (its stack interview's choices),
      // without None / Other.
      const norm = (w: string): string => w.toLowerCase().replace(/[^a-z0-9]/g, '');
      const choice = (slot: string, word: string): string | null => {
        const q = STACK_INTERVIEW.find((i) => i.path === slot);
        const hit = (q?.options ?? []).find((o) =>
          !['none', 'other'].includes(norm(o.value)) && (norm(o.value) === norm(word) || norm(o.label) === norm(word)));
        return hit ? hit.value : null;
      };

      const project: Record<string, string> = { name: projectName, goal: projectGoal };
      if (language && language.toLowerCase() !== 'none') {project.main_language = choice('project.main_language', language) ?? language;}
      const stack: Record<string, string> = {};
      let frameworkNote = '';
      if (framework && framework.toLowerCase() !== 'none') {
        const front = choice('stack.frontend', framework);
        const back = choice('stack.backend', framework);
        if (front) {stack.frontend = front; frameworkNote = `${front} → stack.frontend`;}
        else if (back) {stack.backend = back; frameworkNote = `${back} → stack.backend`;}
        else {frameworkNote = `"${framework}" was not placed: faf cannot tell whether it is a frontend or a backend framework. Add it to stack.frontend or stack.backend in project.faf.`;}
      }
      if (hosting && hosting.toLowerCase() !== 'none') {stack.hosting = hosting;}

      // The user's words win; faf-cli's detection fills every other slot.
      const fresh = assembleFreshFaf(cwd);
      const given: Record<string, unknown> = { project, ...(Object.keys(stack).length ? { stack } : {}) };
      const merged = fillEmpties(given, fresh);
      const data: Record<string, unknown> = {};
      for (const k of Object.keys(fresh)) {data[k] = merged[k];}
      for (const k of Object.keys(merged)) {if (!(k in data)) {data[k] = merged[k];}}

      const fafPath = path.join(cwd, 'project.faf');
      try {
        writeFaf(fafPath, data as any);
      } catch (error: any) {
        return { content: [{ type: 'text', text: `⚡ FAF Quick:\n\n❌ ${notWritten(fafPath, error, false)}` }], isError: true };
      }
      const score = scoreFafYaml(readFafRaw(fafPath));
      const lang = (data.project as Record<string, unknown> | undefined)?.main_language;

      // Birth DNA, as faf_init writes it: only when there is no .faf-dna.
      let dnaLine = '';
      try {
        const dna = new FafDNAManager(cwd);
        if (!dna.exists() && !present(path.join(cwd, '.faf-dna'))) {
          dna.birth(score.score);
          dnaLine = `Birth DNA: ${score.score}% (.faf-dna)\n`;
        }
      } catch (error) {
        dnaLine = `.faf-dna not written: ${oneLine(error)}\n`;
      }

      const elapsed = Date.now() - startTime;

      let output = `FAF Quick — created project.faf in ${elapsed}ms\n\n`;
      output += `Project: ${projectName}\n`;
      output += `Goal: ${projectGoal}\n`;
      output += `Language: ${typeof lang === 'string' && lang.trim() ? lang : '(not given, none detected)'}\n`;
      if (frameworkNote) {output += `Framework: ${frameworkNote}\n`;}
      if (stack.hosting) {output += `Hosting: ${stack.hosting} → stack.hosting\n`;}
      output += `Score: ${score.score}/100 (${score.populated}/${score.active} slots populated) — ${score.tier.name}\n`;
      output += `${dnaLine}\n`;
      output += `Created: ${fafPath}\n\n`;
      output += `Next steps:\n`;
      output += `  • faf_auto — fill more slots from the repo as it grows\n`;
      output += `  • faf_go — guided interview to 100%`;

      return { content: [{ type: 'text', text: output }] };

    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `⚡ FAF Quick:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  /**
   * faf_doctor — what is wrong with the project's .faf and how to fix each
   * thing, all from faf-cli: its finder and reader (a link out of the project,
   * a file that is not UTF-8, a scalar, a list or invalid YAML is refused),
   * validateFaf (the checks `faf check` runs), scoreFafYaml (the one score,
   * with every empty slot and the tool that fills it) and Turbo-Cat (the
   * formats in the folder). Before 6.0.0 it called a file faf-cli rejects
   * ".faf structure is valid", scored with its own formula (49 where faf_score
   * said 33) and set a "70%+" target. It reads only.
   */
  private async handleFafDoctor(args: any): Promise<CallToolResult> {
    const r = await this.resolveDir('faf_doctor', args.path);
    if (!r.ok) {return this.refused(r);}
    const cwd = r.dir;

    try {
      interface DiagnosticResult {
        status: 'ok' | 'warning' | 'error';
        message: string;
        fix?: string;
      }

      const results: DiagnosticResult[] = [];
      let valid: boolean | null = null;
      let scored: ReturnType<Awaited<typeof fafCli>['scoreFafYaml']> | null = null;
      const { readFaf, readFafRaw, validateFaf, scoreFafYaml, scoreText } = await fafCli;

      // Check 1: MCP Version
      results.push({
        status: 'ok',
        message: `claude-faf-mcp version: ${VERSION} (faf-cli ${bundledFafCliVersion() ?? 'not found'})`
      });

      // Check 2: .faf file exists (faf-cli's finder: the folder, then one level up)
      let fafResult: FoundFaf | null = null;
      try {
        fafResult = await this.findFaf(cwd);
      } catch (error) {
        results.push({
          status: 'error',
          message: `The .faf here could not be read: ${oneLine(error)}`,
          fix: 'faf reads project.faf only inside the project; replace the link with the file itself.'
        });
      }

      if (!fafResult) {
        if (!results.some((d) => d.status === 'error')) {
          results.push({
            status: 'error',
            message: `No .faf file found in ${cwd} or the folder above it`,
            fix: 'faf_init, faf_quick or faf_auto creates one.'
          });
        }
      } else {
        results.push({
          status: 'ok',
          message: `Found .faf at: ${where(fafResult)}`
        });

        // Check 3: faf-cli reads it as a .faf (a mapping of keys).
        let data: Record<string, unknown> | null = null;
        let raw: string | null = null;
        try {
          raw = readFafRaw(fafResult.path);
          data = readFaf(fafResult.path) as Record<string, unknown>;
        } catch (error) {
          const parseError = raw !== null ? yamlErrorAt(raw) : null;
          results.push({
            status: 'error',
            message: `faf-cli could not read ${fafResult.filename} as a .faf: ${oneLine(error)}`,
            fix: parseError && raw !== null
              ? `${yamlFixHint(raw, fafResult.path).replace(/^edit/, 'Edit').replace(/ faf_doctor runs the other checks\.$/, '')}`
              : `Edit ${fafResult.path} by hand into key: value pairs (UTF-8, inside the project); faf changes nothing until faf-cli can read it.`
          });
        }

        if (data !== null && raw !== null && Object.keys(data).length === 0) {
          // Empty, blank or comments only: faf-cli reads it as no keys at all.
          valid = false;
          results.push({
            status: 'error',
            message: `${fafResult.filename} has no keys (it is empty, blank or comments only)`,
            fix: `${NO_KEYS_FIX.charAt(0).toUpperCase()}${NO_KEYS_FIX.slice(1)}`
          });
        } else if (data !== null && raw !== null) {
          // Check 4: faf-cli's validateFaf — the same checks `faf check` runs.
          const validation = validateFaf(data);
          valid = validation.valid;
          if (validation.valid) {
            results.push({ status: 'ok', message: "faf-cli's validateFaf accepts it" });
          }
          for (const e of validation.errors) {
            results.push({
              status: 'error',
              message: `validateFaf: ${e}`,
              fix: e.includes('faf_version')
                ? `Add faf_version: "3.0" at the top of ${fafResult.filename} (faf_init writes it in a new file).`
                : e.includes('project.name')
                  ? isScalarProject(data.project)
                    ? legacyProjectHint(fafResult.filename, String(data.project))
                    : 'faf_go asks for the project name (project.name), or faf_auto fills it from the repo.'
                  : `Edit ${fafResult.path} by hand: ${e}.`
            });
          }

          // Check 5: faf-cli's score — the number faf_score reports.
          try {
            scored = scoreFafYaml(raw);
          } catch (error) {
            results.push({ status: 'error', message: `faf-cli's scorer could not read it: ${oneLine(error)}` });
          }
          if (scored?.unknown) {
            results.push({
              status: 'warning',
              message: `Score: ${scoreText(scored)} — an About repo with no about.source_score`,
              fix: 'Add about.source_score (0-100, the source repo\'s score) by hand; faf-cli reports it as this repo\'s score.'
            });
          } else if (scored) {
            const lists = this.slotLists(scored);
            if (scored.score >= 100) {
              results.push({ status: 'ok', message: `Score: ${sealForScore(100)} 100% — every active slot populated (faf-cli)` });
            } else {
              results.push({
                status: 'warning',
                message: `Score: ${scored.score}% ${scored.tier.name} (faf-cli) — ${scored.populated}/${scored.active} slots populated; empty: ${lists.empty.join(', ')}`,
                fix: (await this.fillHint(lists.empty)) ?? undefined
              });
            }
          }
        }
      }

      // Check 6: CLAUDE.md exists — next to the .faf (where faf_sync writes it)
      const claudePath = pathModule.join(fafResult ? fafResult.dir : cwd, 'CLAUDE.md');
      if (!fs.existsSync(claudePath)) {
        results.push({
          status: 'warning',
          message: 'No CLAUDE.md file',
          fix: 'faf_sync (or faf_auto) writes CLAUDE.md\'s faf-managed block from project.faf.'
        });
      } else {
        results.push({
          status: 'ok',
          message: 'CLAUDE.md found'
        });
      }

      // Check 7: what faf-cli's Turbo-Cat finds in the folder (faf_auto's source).
      try {
        const scan = await composedTurboCat(fafResult ? fafResult.dir : cwd);
        const names = scan ? scan.discoveredFormats.map((f) => f.fileName) : [];
        results.push(names.length
          ? { status: 'ok', message: `faf-cli finds ${names.length} format(s) in the folder: ${names.slice(0, 8).join(', ')}${names.length > 8 ? ', …' : ''}` }
          : { status: 'warning', message: 'faf-cli finds no manifest or config file in the folder', fix: 'faf_auto fills the stack from files such as package.json, pyproject.toml, Cargo.toml or go.mod; with none, answer the stack slots with faf_go.' });
      } catch {
        results.push({ status: 'warning', message: 'faf-cli could not scan the folder for formats' });
      }

      // Build output
      let output = `FAF Doctor - Health Check\n`;
      output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      let hasErrors = false;
      let hasWarnings = false;

      for (const result of results) {
        const icon = result.status === 'ok' ? '✅' :
                     result.status === 'warning' ? '⚠️' : '❌';

        output += `${icon} ${result.message}\n`;

        if (result.fix) {
          output += `   💡 ${result.fix}\n`;
        }

        if (result.status === 'error') hasErrors = true;
        if (result.status === 'warning') hasWarnings = true;
      }

      output += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (!hasErrors && !hasWarnings) {
        output += `Healthy: faf-cli validates it and scores it ${sealForScore(100)} 100%.`;
      } else if (!hasErrors) {
        output += `Valid, with the fixes above still to do.`;
      } else {
        output += `Issues found: follow the fixes above.`;
      }

      const health = hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok';

      return {
        content: [{ type: 'text', text: output }],
        structuredContent: {
          health,
          checks: results.length,
          errors: results.filter(r => r.status === 'error').length,
          warnings: results.filter(r => r.status === 'warning').length,
          valid,
          score: scored ? scored.score : null,
          ...(scored?.unknown ? { unknown: true } : {}),
          diagnostics: results
        }
      };

    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `FAF Doctor:\n\nError: ${oneLine(error)}` }],
        isError: true
      };
    }
  }

  // ============================================================================
  // Interop exports: AGENTS.md, .cursorrules and GEMINI.md are faf-cli's
  // renders and writers; conductor/ is claude-faf-mcp's, from faf-cli's keys.
  // The action was checked against the schema before the handler runs; the
  // retired `import` action gets its one line in callTool.
  // ============================================================================

  /** One interop export: the folder (never home or '/'), then the bundled command. */
  private async exportTool(
    tool: string,
    command: 'agents' | 'cursor' | 'gemini' | 'conductor',
    label: string,
    pathArg: unknown,
    action: 'export' | 'sync',
  ): Promise<CallToolResult> {
    const r = await this.resolveDir(tool, pathArg, { write: true });
    if (!r.ok) {return this.refused(r);}
    const result = await this.engineAdapter.callEngine(command, [r.dir, `--action=${action}`]);
    if (!result.success) {
      return {
        content: [{ type: 'text', text: `${label} ${action}:\n\nNot written: ${result.error ?? result.data?.message ?? 'unknown error'}` }],
        isError: true
      };
    }
    return {
      content: [{ type: 'text', text: `${label} ${action}:\n\n${result.data?.message || 'Done'}\n${result.duration}ms` }]
    };
  }

  private async handleFafAgents(args: any): Promise<CallToolResult> {
    return this.exportTool('faf_agents', 'agents', 'AGENTS.md', args.path, args.action === 'sync' ? 'sync' : 'export');
  }

  private async handleFafCursor(args: any): Promise<CallToolResult> {
    return this.exportTool('faf_cursor', 'cursor', '.cursorrules', args.path, args.action === 'sync' ? 'sync' : 'export');
  }

  private async handleFafGemini(args: any): Promise<CallToolResult> {
    return this.exportTool('faf_gemini', 'gemini', 'GEMINI.md', args.path, args.action === 'sync' ? 'sync' : 'export');
  }

  private async handleFafConductor(args: any): Promise<CallToolResult> {
    // action is required, and the schema allows only 'export'.
    const action: 'export' = args.action;
    return this.exportTool('faf_conductor', 'conductor', 'Conductor', args.path, action);
  }

  private async handleFafGit(args: any): Promise<CallToolResult> {
    const url = args.url;
    if (typeof url !== 'string' || url.trim() === '') {
      return {
        content: [{ type: 'text', text: 'faf_git: Missing required parameter "url"' }],
        isError: true
      };
    }

    // With path: an existing project folder (never home or '/'), checked
    // before anything is fetched. Without it: a preview, nothing written.
    let outputDir: string | undefined;
    if (args.path !== undefined && args.path !== null && args.path !== '') {
      const r = await this.resolveDir('faf_git', args.path, { write: true });
      if (!r.ok) {return this.refused(r);}
      outputDir = r.dir;
    }

    const startTime = Date.now();
    try {
      const result = await gitContextCommand(url, outputDir);
      if (!result.success) {
        return {
          content: [{ type: 'text', text: `faf_git:\n\n❌ ${result.message}` }],
          isError: true
        };
      }

      let output = `faf_git:\n\n✅ ${result.message}\n⏱️ ${Date.now() - startTime}ms`;
      // Include the authored .faf content if no output path (preview mode)
      if (!outputDir && result.data?.fafContent) {
        output += `\n\n--- project.faf (preview) ---\n${result.data.fafContent}`;
      }
      return { content: [{ type: 'text', text: output }] };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `faf_git:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  /**
   * faf_tri_sync — faf's block in the MEMORY.md Claude Code loads for this
   * project: <config>/projects/<id>/memory/MEMORY.md, where <config> is
   * CLAUDE_CONFIG_DIR or ~/.claude and <id> is Claude Code's own id for the
   * project's canonical git root. Composed from faf-cli: its resolver finds the
   * file, its writer changes only faf's block (and replaces claude-faf-mcp's
   * earlier tri-sync section once, when that section is whole). Every other
   * byte is Claude's and is kept; the writer reads the file back and says
   * whether it was — this tool says "kept" only when it was.
   */
  private async handleFafTriSync(args: any): Promise<CallToolResult> {
    // export (the default) or status: the schema allows no other action.
    const action: 'export' | 'status' = args.action === 'status' ? 'status' : 'export';
    const r = await this.resolveDir('faf_tri_sync', args.path, { write: action !== 'status' });
    if (!r.ok) {return this.refused(r);}
    const cwd = r.dir;

    // The .faf the readers use (the folder, then one level up); MEMORY.md is
    // Claude Code's memory for the project that .faf sits in.
    let fafResult: FoundFaf | null;
    try {
      fafResult = await this.findFaf(cwd);
    } catch (error) {
      return { content: [{ type: 'text', text: `🔄 tri-sync: ${oneLine(error)}` }], isError: true };
    }
    if (!fafResult) {
      // Nothing was written: an error the model can read, not a success.
      return {
        content: [{
          type: 'text',
          text: `tri-sync: No project.faf found in ${cwd} or the folder above it, so no MEMORY.md was written. faf_init creates one.`
        }],
        isError: true
      };
    }
    const projectDir = fafResult.dir;

    const { writeClaudeMemory, claudeMemoryStatus, resolveClaudeMemoryPath, isNonProjectRoot } = await fafCli;

    if (action === 'status') {
      try {
        const status = claudeMemoryStatus(projectDir);
        const statusText = [
          '🧠 MEMORY.md Status:',
          '',
          `  Path: ${status.path}`,
          `  Exists: ${status.exists ? 'Yes' : 'No'}`,
          status.exists ? `  Total lines: ${status.lines}` : '',
          status.exists ? `  faf block: ${status.hasBlock ? `Yes (${status.blockLines} lines)` : 'No'}` : '',
          status.exists && status.hasLegacySection ? '  Earlier tri-sync section: Yes (the next export replaces it with the faf block)' : '',
          status.exists ? `  Claude's own notes: ${status.otherLines} lines` : '',
          ...status.warnings.map((w) => `  ⚠️ ${w}`),
        ].filter(Boolean).join('\n');
        return { content: [{ type: 'text', text: statusText }] };
      } catch (error: any) {
        return { content: [{ type: 'text', text: `🧠 MEMORY.md status: ${oneLine(error)}` }], isError: true };
      }
    }

    // Export: .faf → MEMORY.md — never for the home folder or the filesystem root.
    if (isNonProjectRoot(projectDir)) {
      return {
        content: [{ type: 'text', text: `🔄 tri-sync: ${fafResult.path} sits in your home folder (or the filesystem root), not a project, so faf writes no MEMORY.md for it. Pass the project folder as path.` }],
        isError: true
      };
    }
    let memoryPath = '';
    try {
      memoryPath = resolveClaudeMemoryPath(projectDir);
      const { data } = await readFafData(fafResult.path);
      const result = writeClaudeMemory(projectDir, data as any);
      const mode: Record<typeof result.action, string> = {
        created: 'Created (there was no MEMORY.md)',
        updated: 'faf block updated in place',
        migrated: 'The earlier tri-sync section was replaced by the faf block',
        added: 'faf block added on top',
        unchanged: 'Already current; nothing written',
      };
      const exportText = [
        '🧠 tri-sync: .faf → MEMORY.md',
        '',
        `  From: ${where(fafResult)}`,
        `  Written to: ${result.path}`,
        `  Lines: ${result.lines}`,
        `  Mode: ${mode[result.action]}`,
        result.preserved
          ? `  Claude's own notes: kept byte for byte (read back and checked)`
          : `  ⚠️ Claude's own notes: the read-back did not match what faf wrote around its block — check ${result.path}`,
        ...result.warnings.map((w) => `  ⚠️ ${w}`),
      ].join('\n');
      return {
        content: [{ type: 'text', text: exportText }],
        ...(result.preserved ? {} : { isError: true }),
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `🔄 tri-sync export: ${notWritten(memoryPath || 'MEMORY.md', error)}` }],
        isError: true
      };
    }
  }
}
