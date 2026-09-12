import type { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { FafEngineAdapter } from './engine-adapter';
import { fileHandlers } from './fileHandler';
import * as fs from 'fs';
import * as os from 'os';
import * as pathModule from 'path';
import { findFafFile } from '../utils/faf-file-finder.js';
import { confinePath, PathConfinementError } from '../utils/safe-path';
import { VERSION } from '../version';
import { resolveProjectPath, formatPathConfirmation } from '../utils/path-resolver';
// Truthful single-source FAF score wiring — faf-cli, loaded through
// src/utils/faf-cli-bridge.ts (ESM from CommonJS via import()).
import { fafCli } from '../utils/faf-cli-bridge.js';
import { computeParity } from '../trust/parity.js';
import { buildReceipt, renderReceipt } from '../trust/receipt.js';
import { composedTurboCat, turboCatDisplay } from '../faf-core/extract/turbocat-bridge.js';
import { setupSessionHook, HOOK_COMMAND, SETTINGS_SCOPE } from '../faf-core/commands/setup-hook.js';
import { notWritten, oneLine } from '../utils/write-outcome.js';
import { yamlFixHint, NO_KEYS_FIX } from '../faf-core/fix-once/yaml.js';

/**
 * The Core tier — the 12 distinct, well-described tools advertised by default.
 * Everything else is Extended: still callable by name (the dispatch in callTool
 * is unchanged), but advertised only when FAF_TOOLS=all. Glama (and any client)
 * runs the server and scores the default tools/list, so a tight, non-overlapping
 * Core is what earns the coherence grade. See
 * PLANET-FAF/strategy/claude-faf-mcp-core-tier-glama-a-2026-06-17.md.
 *
 * faf_bench leads on the default surface (added 5.12.0): the in-session proof
 * tool — "see the delta yourself" — is the value-prop made callable, so it
 * belongs where newcomers meet it, not behind FAF_TOOLS=all.
 */
const CORE_TOOLS = new Set<string>([
  'faf_init', 'faf_auto', 'faf_go', 'faf_bench',
  'faf_score', 'faf_doctor', 'faf_sync', 'faf_context',
  'faf_trust', 'faf_about', 'faf_etch', 'faf_recall',
]);

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

/** The one-line refusal for an interop import action (retired in 6.0.0). */
function importRetired(tool: string, file: string, actions = 'export or sync'): CallToolResult {
  return {
    content: [{
      type: 'text',
      text: `${tool} import was retired in 6.0.0: claude-faf-mcp no longer merges ${file} into project.faf. Use ${actions}; faf_auto and faf_go fill project.faf.`,
    }],
    isError: true,
  };
}

/**
 * faf-cli's `faf init` / `faf auto` / `faf go` refuse to write in the home
 * directory or a filesystem root (`/` or a drive root). Its guard is not
 * exported, so the writers here apply the same rule: a project.faf there — and a
 * faf block on top of a global ~/CLAUDE.md — belongs to no project. Paths are
 * compared through symlinks, so home reached by another spelling is still home.
 * Returns the refusal, or null.
 */
function refuseHomeOrRoot(dir: string): CallToolResult | null {
  const canonical = (p: string): string => {
    try { return fs.realpathSync(p); } catch { return pathModule.resolve(p); }
  };
  const resolved = pathModule.resolve(dir);
  const real = canonical(resolved);
  const isHome = real === canonical(os.homedir());
  const isRoot = real === pathModule.parse(real).root;
  if (!isHome && !isRoot) {return null;}
  return {
    content: [{
      type: 'text',
      text: `${resolved} is your home directory (or the filesystem root), not a project. Pass the project path, or open the project folder.`,
    }],
    isError: true,
  };
}

/**
 * CFM ≤5.22.1's faf_init and faf_auto wrote `project: <name>` as a plain string.
 * faf-cli reads name and goal only from a `project` mapping, so the old shape is
 * lifted to `{ name: <name> }` before faf-cli's updater or faf_go's answers use it.
 */
function liftLegacyProjectName(data: Record<string, unknown>): void {
  if (typeof data.project === 'string') {
    data.project = { name: data.project };
  }
}

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

/** A YAML mapping as JS: a plain object (not null, not a list). */
function isMapping(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

export class FafToolHandler {
  constructor(private engineAdapter: FafEngineAdapter) {}

  /**
   * Get the project path - uses explicit path if provided, otherwise the sticky
   * session working directory (set at adapter construct / last path arg).
   *
   * ⚠️ Sticky cwd is intentional for MCP sessions ("set path once, then omit").
   * process.chdir() does NOT rebind this. Callers that write project.faf
   * (faf_human_add, faf_readme apply, faf_go answers, …)
   * MUST pass `path` (or setWorkingDirectory) when not operating on the session
   * project — otherwise they can clobber the construct-time project.faf.
   * Tests: always path: testDir; never rely on chdir alone.
   */
  private getProjectPath(explicitPath?: string): string {
    if (explicitPath) {
      // Confine the caller-supplied path. A passed *file* must be a .faf/.fafm
      // context file; absolute/`..` escapes to secrets are refused. Throws
      // PathConfinementError, caught centrally in callTool() (CWE-22/73/200).
      const resolvedPath = confinePath(explicitPath);

      // If it's a file path, get the directory
      const projectDir = fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()
        ? pathModule.dirname(resolvedPath)
        : resolvedPath;

      // Set as the new session context
      if (fs.existsSync(projectDir)) {
        this.engineAdapter.setWorkingDirectory(projectDir);
      }

      return projectDir;
    }
    return this.engineAdapter.getWorkingDirectory();
  }

  async listTools() {
    const allTools = [
        {
          name: 'faf',
          description: 'Type "faf" to start. Scores your project, drives it to 100%, syncs everything. The one command that does it all.',
          annotations: {
            title: 'FAF',
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false
          },
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Project path (optional — uses current directory if not provided)' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_about',
          description: 'Explain what the FAF format is — project DNA for AI — with its IANA registration, version, and connected platforms. Returns format metadata and the available MCP bridges. Use this when someone asks what FAF is or how it connects to other AI tools.',
          annotations: {
            title: 'About FAF',
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false
          },
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'faf_status',
          description: 'Check if your project has project.faf (project DNA for AI) - Shows AI-readability status',
          annotations: {
            title: 'Project Status',
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false
          },
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
          description: 'Score a project.faf and return its 0–100% AI-readability, tier, and per-slot breakdown, via the deterministic Mk4 engine. Use this for a quick status check; use faf_doctor when you need to diagnose and fix what\'s missing.',
          annotations: {
            title: 'AI-Readiness Score',
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false
          },
          inputSchema: {
            type: 'object',
            properties: {
              details: { type: 'boolean', description: 'Include detailed breakdown and improvement suggestions' },
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
            },
            additionalProperties: false
          },
          outputSchema: {
            type: 'object',
            description: 'Structured AI-readiness score, single-sourced from faf-cli.',
            properties: {
              score: { type: 'number', description: 'AI-readiness score, 0-100' },
              tier: { type: 'string', description: 'Tier name for this score (e.g. Bronze, Trophy)' },
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
              inherited: { type: 'boolean', description: 'True if the score is attested from a source repo (app_type: about)' },
              hasFaf: { type: 'boolean', description: 'Whether a readable, valid project.faf was scored' },
              path: { type: 'string', description: 'Path that was scored' },
              parity: {
                type: 'object',
                description: 'Determinism parity receipt — an engine-agnostic hash any conformant scorer reproduces for this exact file. Third-party verifiable: sha256(projection) === parityHash.',
                properties: {
                  spec: { type: 'string', description: 'Parity spec id, e.g. faf-parity/v1' },
                  algo: { type: 'string', description: 'Hash algorithm (sha256)' },
                  scorer: { type: 'string', description: 'The single deterministic source the score comes from' },
                  producedBy: { type: 'string', description: 'Which wrapper emitted this receipt (metadata, not hashed)' },
                  sourceSha256: { type: 'string', description: 'SHA-256 of the raw .faf bytes' },
                  parityHash: { type: 'string', description: 'sha256(projection) — identical across any conformant engine' },
                  projection: { type: 'string', description: 'The exact canonical string that was hashed (for verification)' }
                },
                required: ['spec', 'parityHash', 'sourceSha256', 'projection']
              }
            },
            required: ['score', 'tier', 'hasFaf'],
            additionalProperties: true
          }
        },
        {
          name: 'faf_init',
          description: 'Create a new project.faf for a folder: faf-cli detects its name, language and stack, and the reply gives the file path and starting score. An existing project.faf is left as it is — use faf_auto to fill its empty slots from your manifests, or faf_go for the human 6Ws. force: true replaces an existing project.faf with a fresh one, after copying the old file to a backup beside it.',
          annotations: {
            title: 'Initialize .faf',
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false
          },
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Project path or name. Smart resolution: "my-app" finds ~/Projects/my-app OR ~/Code/my-app. Full paths like ~/Projects/app or /Users/me/code/app work too. Omit to create ~/Projects/unnamed-project; pass the workspace path to init it.'
              },
              force: { type: 'boolean', description: 'Replace an existing project.faf with a fresh one: every value and comment in it is replaced. The old file is copied to project.faf.bak-<time> first.' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_trust',
          description: 'Attest a project.faf\'s integrity: its validity, score, and a deterministic parity hash any conformant engine reproduces. Returns the ✪ receipt. Use this to prove a score is genuine and untampered.',
          annotations: {
            title: 'Trust Attestation',
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false
          },
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
            },
            additionalProperties: false
          },
          outputSchema: {
            type: 'object',
            description: 'Trust attestation: validity, score, and a third-party-verifiable determinism parity receipt.',
            properties: {
              valid: { type: 'boolean', description: 'Whether the project.faf is readable and valid' },
              hasFaf: { type: 'boolean', description: 'Whether a project.faf was found' },
              score: { type: 'number', description: 'AI-readiness score, 0-100' },
              tier: { type: 'string', description: 'Tier name for this score' },
              path: { type: 'string', description: 'Path that was attested' },
              sourceSha256: { type: 'string', description: 'SHA-256 of the raw .faf bytes' },
              reason: { type: 'string', description: 'Why validation failed, when valid is false' },
              parity: {
                type: 'object',
                description: 'Determinism parity receipt (same shape as faf_score.parity).',
                properties: {
                  spec: { type: 'string' },
                  algo: { type: 'string' },
                  scorer: { type: 'string' },
                  producedBy: { type: 'string' },
                  sourceSha256: { type: 'string' },
                  parityHash: { type: 'string' },
                  projection: { type: 'string' }
                },
                required: ['spec', 'parityHash', 'sourceSha256', 'projection']
              },
              receipt: {
                type: 'object',
                description: 'The ✪ trust receipt — render-identical, self-verifying score+parity artifact.',
                properties: {
                  spec: { type: 'string' },
                  seal: { type: 'string', description: 'Quiet-ladder glyph for this score (✪ at Trophy)' },
                  subject: { type: 'string' },
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
          description: 'Install the native SessionStart hook in the project settings (<project>/.claude/settings.json) — every Claude Code session in this project starts with fresh .faf context. Shows the exact settings first (preview); writes only with confirm: true, install or remove. faf changes only its own hook entry; every other key and hook stays as written. remove: true takes out only the hook whose command is exactly the faf hook command. Never writes the user settings: the home folder is refused.',
          annotations: {
            title: 'Native Session Hook Setup',
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false
          },
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
          description: 'Sync project.faf into CLAUDE.md as a faf-managed block, and optionally into AGENTS.md (agents), .cursorrules (cursor), GEMINI.md (gemini), and .github/copilot-instructions.md (copilot) — or all of them (all). Updates each block in place — it never overwrites your file. Use this after editing project.faf so every AI tool sees the latest context.',
          annotations: {
            title: 'Sync .faf to CLAUDE.md (+ any AI format)',
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false
          },
          inputSchema: {
            type: 'object',
            properties: {
              agents: { type: 'boolean', description: 'Also sync to AGENTS.md (OpenAI/Codex format)' },
              cursor: { type: 'boolean', description: 'Also sync to .cursorrules (Cursor IDE format)' },
              gemini: { type: 'boolean', description: 'Also sync to GEMINI.md (Google Gemini format)' },
              copilot: { type: 'boolean', description: 'Also sync to .github/copilot-instructions.md (GitHub Copilot)' },
              all: { type: 'boolean', description: 'Sync to ALL formats: CLAUDE.md + AGENTS.md + .cursorrules + GEMINI.md + .github/copilot-instructions.md' },
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_debug',
          description: 'Debug Claude FAF MCP environment - show working directory, permissions, and FAF CLI status',
          annotations: {
            title: 'Debug Info',
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false
          },
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'faf_read',
          description: 'Read a file within the project root (cwd / FAF_ALLOWED_ROOTS). Paths that escape the project are refused.',
          annotations: {
            title: 'Read .faf File',
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false
          },
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Absolute or relative file path to read'
              }
            },
            required: ['path'],
            additionalProperties: false
          }
        },
        {
          name: 'faf_list',
          description: 'List directories and discover projects with project.faf files - Essential for FAF discovery workflow',
          annotations: {
            title: 'List .faf Files',
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false
          },
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Directory path to list (e.g., ~/Projects, /Users/username/Projects)'
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
                    isDir: { type: 'boolean' }
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
          description: 'Read the 6 Ws (Who/What/Why/Where/When/How) from README.md and package.json with faf-cli\'s sourced extractor. Previews by default; apply: true fills only the empty human_context slots in project.faf — a value you wrote is never replaced — and lists the slots it filled.',
          annotations: {
            title: 'Extract from README',
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false
          },
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
          description: 'Add a human_context field (who/what/why/where/when/how) - Non-interactive for MCP',
          annotations: {
            title: 'Add Human Context',
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false
          },
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
          description: 'Quality inspection for human_context fields - Shows empty/generic/good/excellent ratings. Reads only; writes nothing.',
          annotations: {
            title: 'Check .faf Health',
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false
          },
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
            },
            additionalProperties: false
          },
          outputSchema: {
            type: 'object',
            description: 'Human-context quality report.',
            properties: {
              mode: { type: 'string', description: 'report' },
              qualityPercent: { type: 'number', description: 'Share of fields rated good/excellent' },
              goodCount: { type: 'number', description: 'Fields rated good or excellent' },
              emptyCount: { type: 'number', description: 'Fields that are empty' },
              fields: {
                type: 'object',
                description: 'Per-field quality',
                additionalProperties: {
                  type: 'object',
                  properties: {
                    quality: { type: 'string', description: 'empty | generic | good | excellent' }
                  }
                }
              }
            },
            required: ['mode'],
            additionalProperties: true
          }
        },
        {
          name: 'faf_context',
          description: 'Set or show the active project path that subsequent faf_ calls resolve against. Returns the current context path. Call this once at the start of a session so the other tools target the right project.',
          annotations: {
            title: 'View Context',
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false
          },
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Set active project path. If omitted, shows current context.' }
            },
            additionalProperties: false
          },
          outputSchema: {
            type: 'object',
            description: 'The active project context and whether a project.faf lives there.',
            properties: {
              active: { type: 'string', description: 'Absolute path of the active project' },
              hasFaf: { type: 'boolean', description: 'Whether a project.faf (or .faf) was found there' },
              filename: { type: ['string', 'null'], description: 'The .faf filename, if found' },
              changed: { type: 'boolean', description: 'True if this call set a new context, false if it only reported' }
            },
            required: ['active', 'hasFaf', 'changed'],
            additionalProperties: true
          }
        },
        {
          name: 'faf_go',
          description: 'The friendly front door — "let\'s go, tell me about your idea." Asks the human the 6Ws (goal, why, who, what, where, when) that can\'t be auto-detected, then applies them to project.faf. If no project.faf exists yet, faf_go bootstraps it first (creates it, sources the stack) so you go from nothing to the 6Ws in one step. Returns the Table-of-8 to confirm/answer, or applies the answers you pass back. Use faf_auto for the technical stack on its own.',
          annotations: {
            title: 'Guided Setup',
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false
          },
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' },
              answers: {
                type: 'object',
                description: 'Answers to apply. Keys are field paths (e.g., "project.goal", "human_context.why"), values are the answers. If provided, applies answers and returns new score.',
                additionalProperties: { type: 'string' }
              }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_auto',
          description: 'Scan your manifests (package.json, Cargo.toml, pyproject.toml, go.mod…) and fill the project.faf stack slots from real dependencies — no hardcoded defaults. Returns what was detected and the updated score. Use this for the technical context; use faf_go for the human 6Ws it can\'t detect. Also writes CLAUDE.md\'s faf-managed block from the result.',
          annotations: {
            title: 'Auto-detect Context',
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false
          },
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
          description: 'Prove the .faf earns its place — measure how much the context is worth, on THIS repo, falsifiably. Questions derive from the project.faf\'s own populated slots (the .faf is the answer key), so grading is mechanical — no judge, no rubric. action=questions returns the answer-key-safe question set; action=grade takes your answers WITHOUT the .faf (cold) and WITH it (faf), grades both, and returns the cold→with-faf lift with a ✪ receipt. The delta is the product; the cold number belongs to the absence of context, never to FAF.',
          annotations: {
            title: 'AI-Grounding Benchmark',
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false
          },
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Project path (optional — current directory if omitted).' },
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
            description: 'Question set (action=questions) or the cold→with-faf grading + ✪ receipt (action=grade).',
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
                description: '✪ receipt — sha256 over the canonical projection; third-party verifiable.',
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
          description: 'Show the project FAF DNA — score history and progression over time.',
          annotations: {
            title: 'View Project DNA',
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false
          },
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
              hasFaf: { type: 'boolean', description: 'Whether a project.faf was found' },
              hasDna: { type: 'boolean', description: 'Whether a .faf-dna history exists (or was just created)' },
              justBorn: { type: 'boolean', description: 'True if this call created the birth certificate' },
              birthScore: { type: 'number', description: 'Score at birth' },
              currentScore: { type: 'number', description: 'Current score' },
              totalGrowth: { type: 'number', description: 'currentScore - birthScore' },
              daysActive: { type: 'number', description: 'Days since birth' },
              authenticated: { type: 'boolean', description: 'Whether the birth certificate is authenticated' },
              certificate: { type: ['string', 'null'], description: 'Birth certificate ID' },
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
          description: 'Discover all formats in the project (154+ validated types) and fill stack slots.',
          annotations: {
            title: 'List Formats',
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false
          },
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
            description: 'Formats discovered in the project and the stack signature derived from them.',
            properties: {
              directory: { type: 'string', description: 'Directory that was scanned' },
              count: { type: 'number', description: 'Number of known formats discovered' },
              elapsedMs: { type: 'number', description: 'Discovery time in milliseconds' },
              stackSignature: { type: 'string', description: 'Derived stack signature' },
              intelligenceScore: { type: 'number', description: 'Total intelligence score across discovered formats' },
              formats: {
                type: 'array',
                description: 'Discovered formats',
                items: {
                  type: 'object',
                  properties: {
                    fileName: { type: 'string' },
                    category: { type: 'string' },
                    priority: { type: 'number' }
                  },
                  required: ['fileName']
                }
              },
              slotFillRecommendations: {
                type: 'object',
                description: 'Recommended .faf slot fills derived from discovered formats',
                additionalProperties: { type: 'string' }
              }
            },
            required: ['directory', 'count', 'formats'],
            additionalProperties: true
          }
        },
        {
          name: 'faf_quick',
          description: 'Create a new project.faf from one line: "name, goal, language, framework, hosting" (name and goal required). faf-cli detects the rest from the folder; each word you give goes in the slot it names, and a framework faf cannot place is reported, not guessed. Only creates: when a project.faf (or .faf) is already there it writes nothing — use faf_auto to fill it.',
          annotations: {
            title: 'Quick Create',
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false
          },
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
          description: 'Diagnose a project.faf: report empty or weak slots, common issues, and how to fix each. Returns a prioritized checklist. Use this when faf_score is below target and you need to know why.',
          annotations: {
            title: 'Diagnose Issues',
            readOnlyHint: true,
            destructiveHint: false,
            openWorldHint: false
          },
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
        // v4.5.0 INTEROP TOOLS
        // ============================================================================
        {
          name: 'faf_agents',
          description: 'Write project.faf into AGENTS.md (OpenAI/Codex) as a faf-managed block. A file already there keeps every line outside the block; the block is updated in place on later runs.',
          annotations: {
            title: 'Sync AGENTS.md',
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false
          },
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
          description: 'Write project.faf into .cursorrules (Cursor IDE) as a faf-managed block. A file already there keeps every line outside the block; the block is updated in place on later runs.',
          annotations: {
            title: 'Sync .cursorrules',
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false
          },
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
          description: 'Write project.faf into GEMINI.md (Google Gemini CLI) as a faf-managed block. A file already there keeps every line outside the block; the block is updated in place on later runs.',
          annotations: {
            title: 'Sync GEMINI.md',
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false
          },
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
          description: 'Write project.faf into Google Conductor\'s conductor/ folder — product.md, tech-stack.md, workflow.md and product-guidelines.md — as one faf-managed block per file. A file already there keeps every line outside the block.',
          annotations: {
            title: 'Sync Conductor',
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false
          },
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
          description: 'Author project.faf from any GitHub repo URL — 1-click context extraction.',
          annotations: {
            title: 'Extract from GitHub',
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false
          },
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'GitHub repository URL (e.g., https://github.com/owner/repo or owner/repo)' },
              path: { type: 'string', description: 'Output directory for the authored project.faf. If omitted, returns content without writing.' }
            },
            required: ['url'],
            additionalProperties: false
          }
        },
        {
          name: 'faf_tri_sync',
          description: 'Write project.faf as a faf-managed block into the MEMORY.md Claude Code loads for this project (~/.claude/projects/<project-id>/memory/MEMORY.md, or under CLAUDE_CONFIG_DIR). Only the block changes; every note of Claude\'s is kept, and the reply says so only after reading the file back. action: status reads only. faf_sync writes CLAUDE.md.',
          annotations: {
            title: 'Tri-Sync to MEMORY.md',
            readOnlyHint: false,
            destructiveHint: false,
            openWorldHint: false
          },
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
          description: 'Remember a decision, gotcha, or win across sessions by writing it to the project soul (.fafm). Returns the stored memory\'s id. Use this to persist something an AI should recall later; use faf_recall to read them back.',
          annotations: { title: 'Etch Memory', readOnlyHint: false, destructiveHint: false, openWorldHint: false },
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
          description: 'Recall memories from the project soul (.fafm), ranked by priority then recency, filtered by query/tags/type. Returns the matching entries. Use this to surface past decisions; use faf_etch to add new ones.',
          annotations: { title: 'Recall Memory', readOnlyHint: true, destructiveHint: false, openWorldHint: false },
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

    // Core-tier gate: advertise only the Core by default; FAF_TOOLS=all (or
    // FAF_EXTENDED=1) exposes the full set. Dispatch in callTool keeps every
    // case, so Extended tools stay callable by name even when un-advertised.
    const showAll = process.env.FAF_TOOLS === 'all' || process.env.FAF_EXTENDED === '1';
    return { tools: showAll ? allTools : allTools.filter((t) => CORE_TOOLS.has(t.name)) };
  }

  async callTool(name: string, args: any): Promise<CallToolResult> {
    // Input validation
    if (!name || typeof name !== 'string') {
      throw new Error('Tool name must be a non-empty string');
    }
    
    const retired = RETIRED_TOOLS.get(name);
    if (retired) {
      return { content: [{ type: 'text', text: retired }], isError: true };
    }

    try {
    switch (name) {
      case 'faf': {
        const projectPath = this.getProjectPath(args?.path);
        const fs = await import('fs');
        const pathModule = await import('path');
        const hasFaf = fs.existsSync(pathModule.join(projectPath, 'project.faf'));
        const hasPkg = fs.existsSync(pathModule.join(projectPath, 'package.json'));

        // Try to get project name from package.json or project.faf
        let projectName = projectPath.split('/').pop() || 'unknown';
        try {
          if (hasPkg) {
            const pkg = JSON.parse(fs.readFileSync(pathModule.join(projectPath, 'package.json'), 'utf8'));
            if (pkg.name) projectName = pkg.name;
          }
        } catch {
          // package.json unreadable — keep basename projectName
        }

        const projectInfo = hasFaf
          ? `Found project.faf in: ${projectPath} (${projectName})`
          : hasPkg
            ? `Found project at: ${projectPath} (${projectName}) — no project.faf yet`
            : `Working directory: ${projectPath}`;

        return {
          content: [{
            type: 'text',
            text: `${projectInfo}

Confirm this is your project and I'll score it, drive it to 100%, and sync everything.

If this isn't the right project, tell me the path or project name.

Once confirmed, the sequence is:
1. Check if project.faf exists (create with faf_auto if not)
2. Score with faf_score (details:true)
3. Drive to 100% with faf_go if below
4. Sync with faf_sync (CLAUDE.md) and faf_tri_sync (MEMORY.md) at 100%
5. Done — "FAF defines. MD instructs. AI codes."`
          }]
        };
      }
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
      case 'faf_read': {
        // Handle faf_read specially to set context when reading project.faf files
        const readResult = await fileHandlers.faf_read(args);
        // If reading a project.faf file, set the session context
        if (args?.path && (args.path.includes('project.faf') || args.path.endsWith('.faf'))) {
          this.getProjectPath(args.path);
        }
        return readResult;
      }
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
      // v4.5.0 Interop tools
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
        throw new Error(`Unknown tool: ${name}`);
    }
    } catch (err) {
      // Central catch for path-confinement violations from getProjectPath()
      // (CWE-22/73/200). Anything else propagates unchanged.
      if (err instanceof PathConfinementError) {
        return { content: [{ type: 'text', text: `PATH DENIED\n\n${err.message}` }], isError: true };
      }
      throw err;
    }
  }

  private async handleFafStatus(args: any): Promise<CallToolResult> {
    // Native implementation - no CLI needed!
    const cwd = this.getProjectPath(args?.path);

    try {
      const fafResult = await findFafFile(cwd);

      if (!fafResult) {
        return {
          content: [{
            type: 'text',
            text: `🤖 Claude FAF Project Status:\n\n❌ No FAF file found in ${cwd}\n💡 Run faf_init to create project.faf`
          }],
          structuredContent: { hasFaf: false, filename: null, path: null, directory: cwd }
        };
      }

      // faf-cli's reader: a project.faf that is a link out of the project, or
      // to a file that is not a .faf, is refused and never read into the reply.
      const { readFafRaw } = await fafCli;
      const fafContent = readFafRaw(fafResult.path);
      const lines = fafContent.split('\n').slice(0, 20);

      return {
        content: [{
          type: 'text',
          text: `🤖 Claude FAF Project Status:\n\n✅ ${fafResult.filename} found in ${cwd}\n\nContent preview:\n${lines.join('\n')}`
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
    const cwd = this.getProjectPath(args?.path);
    const soulPath = pathModule.join(cwd, 'soul.fafm');
    const namepoint = `@claude-code:${pathModule.basename(cwd)}`;
    if (!fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
      return { content: [{ type: 'text', text: `faf_etch: ${cwd} is not a folder. soul.fafm was not written; faf_etch creates no folders.` }], isError: true };
    }
    const existed = fs.existsSync(soulPath);
    try {
      const { FafmSoul } = await fafCli;
      const soul = existed
        ? FafmSoul.load(soulPath)
        : new FafmSoul(namepoint, { profile: 'knowledge' });
      const fact = soul.etch(args.text, { id: args?.id, type: args?.type, priority: args?.priority, tags: args?.tags });
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
    const cwd = this.getProjectPath(args?.path);
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
      const hits = soul.recall({ query: args?.query, tags: args?.tags, type: args?.type, minPriority: args?.minPriority, limit: args?.limit });
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

  private async handleFafScore(args: any): Promise<CallToolResult> {
    // v5.6.1: single-sourced from faf-cli's real scorer — same number `faf
    // score` (CLI), the championship handler, and faf-mcp 2.1.1 all emit.
    // The old FafCompiler-based path + banned medal/colored-circle tier
    // ladder (🥇🥈🥉🟢🟡🔴🤍) are retired on the live handler. Mirrors
    // faf-mcp PR #48 surgical fix verbatim.
    // Headline format carries both `FAF SCORE: <n>/100` AND `(<n>%)` so the
    // AERO parity regex AND any consumer scanning for the legacy `\d+%`
    // form continue to match. Invalid/unreadable .faf paths return an
    // honest `0/100 (0%)` with a diagnostic — no fake numbers, no crash.
    const cwd = this.getProjectPath(args?.path);
    const { findFafFile, readFafRaw, scoreFafYaml, getNextTier } = await fafCli;

    const fafPath = findFafFile(cwd);
    if (!fafPath) {
      return {
        content: [
          {
            type: 'text',
            text:
              `FAF SCORE: 0/100 (0%)  ♡ no .faf\n\n` +
              `No \`.faf\` found in \`${cwd}\`.\n` +
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

    // Strip ANSI from tier indicator (faf-cli emits colored glyphs).
    // eslint-disable-next-line no-control-regex
    const strip = (s: string): string => s.replace(/\[[0-9;]*m/g, '').trim();

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

    let result: ReturnType<Awaited<typeof fafCli>['scoreFafYaml']>;
    try {
      result = scoreFafYaml(raw);
    } catch (error: any) {
      // Invalid .faf content (malformed YAML, etc.) — honest 0 score with a
      // diagnostic, not a fake number. The output still carries `0%` so
      // downstream regex matchers like `/\d+%/` find a percentage token.
      return {
        content: [
          {
            type: 'text',
            text:
              `FAF SCORE: 0/100 (0%)  ○ INVALID\n\n` +
              `\`${fafPath}\` couldn't be parsed as a valid .faf YAML:\n` +
              `  ${error?.message ?? String(error)}\n\n` +
              `Fix: ${yamlFixHint(raw, fafPath)}`,
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

    const score = result.score;
    const tierDisplay = strip(result.tier.indicator);
    const next = getNextTier(score);
    const nextTierDisplay = next ? `${strip(next.indicator)} (${next.threshold}%)` : null;

    // Progress bar — same width/style as the championship handler.
    const barWidth = 24;
    const filled = Math.max(0, Math.min(barWidth, Math.round((score / 100) * barWidth)));
    const progressBar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);

    // Headline carries both `/100` AND `(%)` so multiple matchers stay happy.
    let output =
      `FAF SCORE: ${score}/100 (${score}%)  ${tierDisplay}\n` +
      `${progressBar} ${score}%\n` +
      `${result.populated}/${result.total} slots populated` +
      (nextTierDisplay ? `  ·  next: ${nextTierDisplay}` : '  ·  top tier') +
      `\n\n` +
      `Scored by faf-cli — the same context your AI reads.`;

    if (args?.details) {
      const populatedSlots = Object.entries(result.slots)
        .filter(([, state]) => state === 'populated')
        .map(([slot]) => slot);
      const emptySlots = Object.entries(result.slots)
        .filter(([, state]) => state === 'empty')
        .map(([slot]) => slot);
      const ignoredSlots = Object.entries(result.slots)
        .filter(([, state]) => state === 'slotignored')
        .map(([slot]) => slot);

      output += `\n\n--- Slot breakdown ---\n`;
      output += `Populated (${populatedSlots.length}): ${populatedSlots.join(', ') || '(none)'}\n`;
      output += `Empty (${emptySlots.length}): ${emptySlots.join(', ') || '(none)'}\n`;
      output += `Ignored (${ignoredSlots.length}): ${ignoredSlots.join(', ') || '(none)'}`;
      if (score < 100 && emptySlots.length > 0) {
        output += `\n\nTip: fill empty slots or mark them \`slotignored\` to climb tiers. Slot-by-slot detail: \`faf score\` (CLI).`;
      }
    }

    const slotEntries = Object.entries(result.slots);
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
        slots: {
          populated: slotEntries.filter(([, s]) => s === 'populated').map(([k]) => k),
          empty: slotEntries.filter(([, s]) => s === 'empty').map(([k]) => k),
          ignored: slotEntries.filter(([, s]) => s === 'slotignored').map(([k]) => k),
        },
        parity,
      },
    };
  }

  private async handleFafInit(args: any): Promise<CallToolResult> {
    // faf_init writes project.faf the way `faf init` / `faf auto` do: faf-cli's
    // assembleFreshFaf detects the folder, faf-cli's writeFaf writes the bytes,
    // faf-cli's scoreFafYaml scores them. Before 5.23 it wrote a legacy template
    // (`project:` as a plain string, no format version) that faf-cli scored 0%,
    // that faf_go could not apply answers to, and that renderClaudeMd could only
    // title "Project". Path resolution is unchanged.
    try {
      // Use smart path resolution (supports "my-app", "~/Projects/my-app", "/full/path")
      const userInput = args?.path;
      const resolution = resolveProjectPath(userInput);

      const targetDir = resolution.projectPath;
      const fafPath = resolution.fafFilePath;

      const refusal = refuseHomeOrRoot(targetDir);
      if (refusal) {return refusal;}

      // Ensure project directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // An existing file is the user's. writeFaf merges into a file that is
      // there — the fresh render's values over the file's — so without force
      // faf_init writes nothing. force is the explicit overwrite (`faf init
      // --force`: writeFaf { replace: true }), after the old bytes are kept as a backup.
      const existingFaf = await findFafFile(targetDir);
      if (existingFaf && !args?.force) {
        // The user named this project: it becomes the session project, as on a write.
        this.engineAdapter.setWorkingDirectory(targetDir);
        return {
          content: [{
            type: 'text',
            text: `🚀 Claude FAF Initialization:\n\n⚠️ ${existingFaf.filename} already exists in ${targetDir}; faf_init left it as it is.\n💡 faf_auto fills its empty slots from the repo (existing values kept); faf_go asks for the 6Ws.`
          }]
        };
      }

      const { assembleFreshFaf, writeFaf, readFafRaw, scoreFafYaml, resolveInside, safeWriteFile } = await fafCli;
      let backup: string | null = null;
      if (args?.force === true && fs.existsSync(fafPath)) {
        const original = fs.readFileSync(resolveInside(targetDir, fafPath, { read: true }));
        backup = `${fafPath}.bak-${new Date().toISOString().replace(/[:.]/g, '-')}`;
        safeWriteFile(backup, original, { root: targetDir, expect: null });
      }
      writeFaf(fafPath, assembleFreshFaf(targetDir) as any, { replace: args?.force === true });
      const score = scoreFafYaml(readFafRaw(fafPath));

      // The new project becomes the session project, so the next steps printed
      // below (faf_score, faf_sync, faf_go) act on it without a path.
      this.engineAdapter.setWorkingDirectory(targetDir);

      // Pomelli-style success confirmation with path resolution info
      const pathConfirmation = formatPathConfirmation(resolution);
      const sourceExplanation = resolution.source === 'user-name'
        ? `\n\n💡 Smart resolution: "${userInput}" → ${targetDir}`
        : '';

      return {
        content: [{
          type: 'text',
          text: `🚀 Claude FAF Initialization:\n\n✅ ${backup ? `Replaced project.faf with a fresh one (force). The previous file is kept at ${backup}` : 'Created project.faf'}${existingFaf && existingFaf.filename !== 'project.faf' ? `\nℹ️ ${existingFaf.filename} is left as it was; faf reads project.faf first from now on.` : ''}\n📊 ${score.score}/100 (${score.populated}/${score.active} slots populated) — ${score.tier.name}\n\n${pathConfirmation}${sourceExplanation}\n\n🍊 Vitamin Context activated!\n⚡ FAFFLESS AI ready!\n\n🏁 Next steps:\n  • Run faf_score for AI-readiness score\n  • Run faf_sync to create CLAUDE.md\n  • Run faf_go for human 6Ws`
        }]
      };
    } catch (error: any) {
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
    // Self-contained trust attestation (The Trust Edition · Pillar 3+4).
    // Was: shelled to `faf trust` — a command faf-cli has since removed. Now we
    // attest locally and deterministically: the .faf is valid, here is its score,
    // and here is a parity hash any conformant engine reproduces. No fake numbers,
    // no dead CLI dependency — the receipt is the trust.
    const cwd = this.getProjectPath(args?.path);
    const { findFafFile, readFafRaw, scoreFafYaml } = await fafCli;

    const fafPath = findFafFile(cwd);
    if (!fafPath) {
      return {
        content: [{
          type: 'text',
          text: `FAF Trust: no .faf found in ${cwd}\nRun faf_init first, then faf_trust attests the real score.`
        }],
        structuredContent: { valid: false, hasFaf: false, reason: 'no .faf found', path: cwd },
        isError: true
      };
    }

    let raw: string;
    try {
      raw = readFafRaw(fafPath);
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `FAF Trust: could not read ${fafPath}: ${error?.message ?? String(error)}` }],
        structuredContent: { valid: false, hasFaf: false, reason: 'unreadable', path: fafPath },
        isError: true
      };
    }

    let result: ReturnType<Awaited<typeof fafCli>['scoreFafYaml']>;
    try {
      result = scoreFafYaml(raw);
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `FAF Trust: ${fafPath} is not valid .faf YAML: ${error?.message ?? String(error)}` }],
        structuredContent: { valid: false, hasFaf: true, reason: 'invalid YAML', path: fafPath },
        isError: true
      };
    }

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
      subject: `claude-faf-mcp@${VERSION}`,
      score: result.score,
      tier: result.tier.name,
      parity,
    });

    const text =
      `${renderReceipt(receipt)}\n\n` +
      `Deterministic: any conformant engine reproduces this hash from the same file.`;

    return {
      content: [{ type: 'text', text }],
      structuredContent: {
        valid: true,
        hasFaf: true,
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
    const projectDir = this.getProjectPath(args?.path);
    const result = await setupSessionHook(projectDir, {
      confirm: args?.confirm === true,
      remove: args?.remove === true,
    });

    const lines: string[] = [`faf_setup — ${result.action}`, '', result.message];
    if (result.settings && (result.action === 'preview' || result.action === 'installed' || result.action === 'removed')) {
      lines.push('', `${result.settingsPath} (${SETTINGS_SCOPE}):`, '```json', JSON.stringify(result.settings, null, 2), '```');
    }
    if (result.action === 'preview') {
      const confirmCall = args?.remove === true ? 'faf_setup { remove: true, confirm: true }' : 'faf_setup { confirm: true }';
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
    // project when it exists) or the session project. The resolved directory is
    // handed to the engine, so a path that does not exist can never fall back to
    // the previous project's CLAUDE.md.
    const dir = this.getProjectPath(args?.path);
    if (args?.path && !fs.existsSync(dir)) {
      return {
        content: [{ type: 'text', text: `faf_sync: path not found: ${args.path}` }],
        isError: true
      };
    }

    // One direction: project.faf → CLAUDE.md (faf-cli's render + injector). Each
    // format flag also writes that format. A bare faf_sync writes CLAUDE.md only —
    // before 5.23 it ran the manifest-drift `sync` command and wrote no CLAUDE.md.
    const formatArgs: string[] = [];
    if (args?.agents) formatArgs.push('--agents');
    if (args?.cursor) formatArgs.push('--cursor');
    if (args?.gemini) formatArgs.push('--gemini');
    if (args?.copilot) formatArgs.push('--copilot');
    if (args?.all) formatArgs.push('--all');

    const result = await this.engineAdapter.callEngine('claude', [dir, ...formatArgs]);

    if (!result.success) {
      return {
        content: [{
          type: 'text',
          text: `🔄 Claude FAF Sync:\n\nFailed to sync: ${result.error ?? result.data?.message ?? 'unknown error'}`
        }],
        isError: true
      };
    }

    // The command's message (it carries "FAF Score: N%") plus the files it
    // wrote, one per line — not the raw result object.
    const filesChanged: string[] = Array.isArray(result.data?.filesChanged) ? result.data.filesChanged : [];
    const output = typeof result.data === 'string'
      ? result.data
      : `${result.data?.message ?? ''}` +
        (filesChanged.length > 0 ? `\n\nFiles written:\n${filesChanged.map((f) => `• ${f}`).join('\n')}` : '');

    return {
      content: [{
        type: 'text',
        text: `🔄 Claude FAF Sync:\n\n${output}`
      }]
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

Version ${packageInfo.version}

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


  private async handleFafDebug(_args: any): Promise<CallToolResult> {  // ✅ FIXED: Prefixed unused args
    try {
      const cwd = this.engineAdapter.getWorkingDirectory();
      const debugInfo = {
        workingDirectory: cwd,
        canWrite: false,
        fafCliPath: null as string | null,
        fafVersion: null as string | null,
        permissions: {} as any,
        enginePath: this.engineAdapter.getEnginePath(),
        pathEnv: process.env.PATH?.split(':') || []
      };
      
      // Write permission, asked of the OS — faf_debug reads only: it never
      // creates, writes or removes a file to find out (readOnlyHint is true).
      try {
        fs.accessSync(cwd, fs.constants.W_OK);
        debugInfo.canWrite = true;
      } catch (error) {
        debugInfo.permissions.writeError = error instanceof Error ? error.message : String(error);
      }
      
      // Check FAF CLI availability using championship auto-detection
      try {
        const cliInfo = this.engineAdapter.getCliInfo();

        if (cliInfo.detected && cliInfo.path) {
          debugInfo.fafCliPath = cliInfo.path;
          debugInfo.fafVersion = cliInfo.version || null;
        } else {
          debugInfo.fafCliPath = null;
          debugInfo.fafVersion = null;
        }
      } catch (error) {
        debugInfo.permissions.fafError = error instanceof Error ? error.message : String(error);
      }
      
      // Check for existing FAF file (v1.2.0: project.faf, *.faf, or .faf)
      const fafResult = await findFafFile(cwd);
      const hasFaf = fafResult !== null;

      const debugOutput = `🔍 Claude FAF MCP Server Debug Information:

📂 Working Directory: ${debugInfo.workingDirectory}
✏️ Write Permissions: ${debugInfo.canWrite ? '✅ Yes' : '❌ No'}
${debugInfo.permissions.writeError ? `   Error: ${debugInfo.permissions.writeError}\n` : ''}🤖 FAF Engine Path: ${debugInfo.enginePath}
🏎️ FAF CLI Path: ${debugInfo.fafCliPath || '❌ Not found'}
📋 FAF Version: ${debugInfo.fafVersion || 'Unknown'}
${debugInfo.permissions.fafError ? `   FAF Error: ${debugInfo.permissions.fafError}\n` : ''}📄 FAF File: ${hasFaf ? `✅ ${fafResult.filename} exists` : '❌ Not found (run faf_init)'}
🛤️ System PATH: ${debugInfo.pathEnv.slice(0, 3).join(', ')}${debugInfo.pathEnv.length > 3 ? '...' : ''}

💡 Quick Start:
   1. If FAF CLI not found: npm install -g faf-cli
   2. If .faf file missing: use faf_init tool
   3. For human context gaps: use faf_go
`;
      
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
          text: `🔍 Claude FAF Debug Failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  private async handleFafList(args: any): Promise<CallToolResult> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      // Parse arguments
      const targetPath = args?.path || this.engineAdapter.getWorkingDirectory();
      const filter = args?.filter || 'dirs';
      const depth = args?.depth || 1;
      const showHidden = args?.showHidden || false;

      // Expand tilde
      const expandedPath = targetPath.startsWith('~')
        ? path.join(os.homedir(), targetPath.slice(1))
        : targetPath;

      const resolvedPath = path.resolve(expandedPath);

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

      // Scan directory
      const results: Array<{name: string; path: string; hasFaf: boolean; isDir: boolean}> = [];

      const scanDir = (dirPath: string, currentDepth: number) => {
        if (currentDepth > depth) return;

        const entries = fs.readdirSync(dirPath);

        for (const entry of entries) {
          // Skip hidden files unless requested
          if (!showHidden && entry.startsWith('.')) continue;

          const fullPath = path.join(dirPath, entry);
          const entryStats = fs.statSync(fullPath);
          const isDir = entryStats.isDirectory();

          // Check for project.faf
          const hasFaf = isDir && fs.existsSync(path.join(fullPath, 'project.faf'));

          // Apply filter
          if (filter === 'faf' && !hasFaf) continue;
          if (filter === 'dirs' && !isDir) continue;

          results.push({
            name: entry,
            path: fullPath,
            hasFaf,
            isDir
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
          const icon = item.isDir ? '📁' : '📄';
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
      const cwd = this.getProjectPath(args?.path);

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

      // Find project.faf
      const fafResult = await findFafFile(cwd);
      if (!fafResult) {
        return {
          content: [{
            type: 'text',
            text: `📖 FAF README Extraction:\n\n❌ No project.faf found in ${cwd}\n💡 Run faf_init first`
          }],
          isError: true
        };
      }

      // Extract 6 Ws — composed from faf-cli's canonical sourced extractor
      // (README + package, no-guess). Single source; no local fork.
      const { relentlessContext } = await fafCli;
      const extracted = relentlessContext(cwd);

      if (!args?.apply) {
        // Preview mode
        let output = `📖 FAF Context Extraction (Preview)\n\n`;
        output += `Sourced from README + package.json:\n`;
        for (const [field, value] of Object.entries(extracted)) {
          if (value) {
            output += `  ${field.toUpperCase()}: ${value}\n`;
          }
        }
        output += `\n💡 Use apply: true to save to project.faf`;
        return { content: [{ type: 'text', text: output }] };
      }

      // Apply: faf-cli's fillEmpties — only an empty slot is filled; a value
      // the file holds (a typed none in a 6W included: the person's words) is
      // kept. writeFaf edits the file in place (comments, key order and exact
      // scalars kept) and writes nothing when nothing changed.
      const { readFaf, fillEmpties, writeFaf } = await fafCli;
      const data = readFaf(fafResult.path) as Record<string, unknown>;
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
            ? `📖 FAF README Extraction:\n\n✅ Filled ${changed.length} empty human_context slot(s): ${changed.join(', ')}\n📁 Updated: ${fafResult.filename} (every other line kept)`
            : `📖 FAF README Extraction:\n\n✅ Nothing to fill: every slot the README answers already holds a value. ${fafResult.filename} was not changed.`
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

      const cwd = this.getProjectPath(args?.path);
      const fafResult = await findFafFile(cwd);

      if (!fafResult) {
        return {
          content: [{
            type: 'text',
            text: `🧡 FAF Human Add:\n\n❌ No project.faf found in ${cwd}\n💡 Run faf_init first`
          }],
          isError: true
        };
      }

      // faf-cli reads and writes: the one value changes in place; comments,
      // key order and every other value stay as written.
      const { readFaf, writeFaf } = await fafCli;
      const fafData = readFaf(fafResult.path) as Record<string, unknown>;
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
          text: `🧡 FAF Human Set:\n\n✅ Set ${field.toUpperCase()} = "${value}"\n📁 Updated: ${fafResult.filename}`
        }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `🧡 FAF Human Set:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleFafCheck(args: any): Promise<CallToolResult> {
    // protect / unlock wrote a `_protected_fields` key that no writer ever
    // read, so nothing was locked. Retired in 6.0.0: faf_check only reports.
    if (args?.protect || args?.unlock) {
      return {
        content: [{
          type: 'text',
          text: 'faf_check protect/unlock was retired in 6.0.0: faf has no field lock, so nothing was locked or unlocked. faf_check only reports.',
        }],
        isError: true,
      };
    }
    try {
      const cwd = this.getProjectPath(args?.path);
      const fafResult = await findFafFile(cwd);

      if (!fafResult) {
        return {
          content: [{
            type: 'text',
            text: `🔍 FAF Check:\n\n❌ No project.faf found in ${cwd}\n💡 Run faf_init first`
          }],
          isError: true
        };
      }

      // faf-cli's reader: link rules, UTF-8, and a mapping (a list or scalar is refused).
      const { readFaf } = await fafCli;
      const fafData = readFaf(fafResult.path) as Record<string, any>;
      const humanContext = fafData.human_context || {};

      const fields = ['who', 'what', 'why', 'where', 'when', 'how'];

      // Assess quality
      const assessField = (value: string | null): string => {
        if (!value || value.trim() === '') return 'empty';
        if (value.length < 10) return 'generic';
        if (value.length > 20) return 'good';
        return 'generic';
      };

      const qualities: Record<string, string> = {};
      for (const field of fields) {
        qualities[field] = assessField(humanContext[field]);
      }

      // Quality report
      const icons: Record<string, string> = {
        empty: '⬜', generic: '🟡', good: '🟢', excellent: '💎'
      };

      let output = `🔍 FAF Human Context Quality\n\n`;
      for (const field of fields) {
        const q = qualities[field];
        const value = humanContext[field] || '(empty)';
        const displayValue = value.length > 40 ? value.substring(0, 37) + '...' : value;
        output += `${icons[q]} ${field.toUpperCase().padEnd(6)} ${displayValue}\n`;
      }

      const goodCount = fields.filter(f => qualities[f] === 'good' || qualities[f] === 'excellent').length;
      const emptyCount = fields.filter(f => qualities[f] === 'empty').length;

      output += `\n📊 Quality: ${Math.round((goodCount / fields.length) * 100)}%\n`;
      if (emptyCount > 0) {
        output += `\n💡 Use faf_readme or faf_human_add to fill empty slots`;
      }

      const fieldReport: Record<string, { quality: string }> = {};
      for (const field of fields) {
        fieldReport[field] = { quality: qualities[field] };
      }

      return {
        content: [{ type: 'text', text: output }],
        structuredContent: {
          mode: 'report',
          qualityPercent: Math.round((goodCount / fields.length) * 100),
          goodCount,
          emptyCount,
          fields: fieldReport
        }
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `🔍 FAF Check:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleFafContext(args: any): Promise<CallToolResult> {
    try {
      if (args?.path) {
        // Set the new context
        const newPath = this.getProjectPath(args.path);
        const fafResult = await findFafFile(newPath);

        return {
          content: [{
            type: 'text',
            text: `📂 FAF Context Set:\n\n✅ Active project: ${newPath}\n${fafResult ? `✅ project.faf found: ${fafResult.filename}` : '⚠️ No project.faf in this directory'}\n\n💡 Subsequent faf_* calls will use this context`
          }],
          structuredContent: {
            active: newPath,
            hasFaf: !!fafResult,
            filename: fafResult ? fafResult.filename : null,
            changed: true
          }
        };
      } else {
        // Show current context
        const currentPath = this.engineAdapter.getWorkingDirectory();
        const fafResult = await findFafFile(currentPath);

        return {
          content: [{
            type: 'text',
            text: `📂 FAF Current Context:\n\n📁 Active project: ${currentPath}\n${fafResult ? `✅ project.faf: ${fafResult.filename}` : '⚠️ No project.faf found'}\n\n💡 Use path parameter to change context`
          }],
          structuredContent: {
            active: currentPath,
            hasFaf: !!fafResult,
            filename: fafResult ? fafResult.filename : null,
            changed: false
          }
        };
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `📂 FAF Context:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  /**
   * faf_go - Guided interview to Gold Code
   *
   * Two-phase operation:
   * 1. Without answers: Returns questions for missing fields
   * 2. With answers: Applies answers to .faf file and returns new score
   */
  private async handleFafGo(args: any): Promise<CallToolResult> {
    const cwd = this.getProjectPath(args?.path);

    try {
      // Find .faf file
      let fafResult = await findFafFile(cwd);
      const bootstrap: { ran: boolean; birthScore?: number; sourcedScore?: number; filesWritten: string[] } = {
        ran: false,
        filesWritten: [],
      };

      if (!fafResult) {
        // BOOTSTRAP — faf_go is the front door ("let's go"). With no project.faf
        // yet, walk the rungs FOR the human instead of bailing: faf_init creates
        // it (the birth-score reveal), faf_auto sources the stack. We DELEGATE to
        // the existing handlers (compose, never reimplement) and pass the resolved
        // cwd so all three target the same file. The human half is still only ever
        // ASKED below — init owns creation, auto owns sourcing, faf_go owns the 6Ws.
        const refusal = refuseHomeOrRoot(cwd);
        if (refusal) {return refusal;}

        const { scoreFafYaml, readFafRaw, readClaudeMd } = await fafCli;
        const scoreOf = (p: { path: string } | null | undefined): number | undefined => {
          if (!p) return undefined;
          try { return scoreFafYaml(readFafRaw(p.path)).score; } catch { return undefined; }
        };
        // faf_auto also writes CLAUDE.md: compare its bytes so the report says
        // what was actually written. faf-cli's reader never follows a link out.
        const readClaude = (): string | null => {
          try { return readClaudeMd(cwd); } catch { return null; }
        };
        const claudeBefore = readClaude();

        await this.handleFafInit({ ...args, path: cwd });
        bootstrap.birthScore = scoreOf(await findFafFile(cwd));

        await this.handleFafAuto({ ...args, path: cwd });
        fafResult = await findFafFile(cwd);
        bootstrap.sourcedScore = scoreOf(fafResult);
        bootstrap.ran = true;
        const claudeAfter = readClaude();
        bootstrap.filesWritten = [
          ...(fafResult ? [fafResult.filename] : []),
          ...(claudeAfter !== null && claudeAfter !== claudeBefore ? ['CLAUDE.md'] : []),
        ];

        if (!fafResult) {
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

      const { readFaf, writeFaf } = await fafCli;
      const fafData = readFaf(fafResult.path) as Record<string, any>;
      liftLegacyProjectName(fafData); // CFM ≤5.22.1 wrote `project: <name>`

      // Single-source the HUMAN interview from faf-cli's canonical SIX_WS_INTERVIEW
      // (8 = the 6Ws + name + goal; public since 6.9.0). This is THE 6Ws — human-
      // only context that can't be derived. main_language + stack are NOT here:
      // they're SOURCED by Turbo-Cat (faf-cli's separate STACK_INTERVIEW if ever
      // needed), never asked of a human. (Decision: single-source the 8-Q 6Ws
      // Interview, wolfejam 2026-06-10 — language is not on the human side.)
      const { SIX_WS_INTERVIEW, buildTableOf8 } = await fafCli;
      const QUESTION_REGISTRY: Record<string, (typeof SIX_WS_INTERVIEW)[number]> =
        Object.fromEntries(SIX_WS_INTERVIEW.map((q) => [q.path, q]));

      // Helper to get nested value
      const getNestedValue = (obj: any, path: string): any => {
        const parts = path.split('.');
        let value = obj;
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            return undefined;
          }
        }
        return value;
      };

      // Helper to set nested value
      const setNestedValue = (obj: any, path: string, value: any): void => {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          // A missing or non-mapping step becomes a mapping (faf-cli's `faf go` setter).
          if (!current[part] || typeof current[part] !== 'object') {
            current[part] = {};
          }
          current = current[part];
        }
        current[parts[parts.length - 1]] = value;
      };

      // Check if value is empty/placeholder
      const isEmpty = (value: any): boolean => {
        return value === undefined ||
          value === null ||
          value === '' ||
          value === 'Unknown' ||
          value === 'TBD' ||
          value === 'None' ||
          (typeof value === 'string' && value.toLowerCase().includes('placeholder'));
      };

      // PHASE 2: Apply answers if provided
      if (args?.answers && typeof args.answers === 'object') {
        const answers = args.answers as Record<string, string>;
        let appliedCount = 0;

        for (const [fieldPath, answer] of Object.entries(answers)) {
          if (answer && answer.trim()) {
            setNestedValue(fafData, fieldPath, answer.trim());
            appliedCount++;
          }
        }

        // faf-cli writes the answers into the file in place: comments, key
        // order and every value not answered stay as written.
        try {
          writeFaf(fafResult.path, fafData as any);
        } catch (error: any) {
          return { content: [{ type: 'text', text: `🎯 FAF Go:\n\n❌ ${notWritten(fafResult.path, error)}` }], isError: true };
        }

        // Calculate new score (simple count-based)
        const totalFields = Object.keys(QUESTION_REGISTRY).length;
        const filledFields = Object.keys(QUESTION_REGISTRY).filter(field => !isEmpty(getNestedValue(fafData, field))).length;
        const newScore = Math.round((filledFields / totalFields) * 100);

        const celebration = newScore >= 100 ? '🏆 GOLD CODE ACHIEVED!' :
          newScore >= 85 ? '🥇 Championship grade!' :
          newScore >= 70 ? '🥈 Great progress!' : '📈 Keep going!';

        return {
          content: [{
            type: 'text',
            text: `🎯 FAF Go - Answers Applied!\n\n✅ Updated ${appliedCount} field(s) in ${fafResult.filename}\n📊 New Score: ${newScore}%\n${celebration}\n\n${newScore < 100 ? '💡 Run faf_go again to continue to Gold Code!' : '✨ Your AI now has complete context!'}`
          }]
        };
      }

      // PHASE 1: Build the Table-of-8 (the 8Qs flow) — single-sourced from
      // faf-cli's buildTableOf8. Name/Goal are filled where known; WHO/WHAT/WHERE
      // are SEEDED from the goal (facts only, terse); WHY/WHEN/HOW are asked. The
      // host presents the table: seeded rows are confirm-or-edit suggestions
      // (Tab/Enter), empty rows are questions. Nothing is committed until the
      // human approves and faf_go is called back with answers.
      const table = buildTableOf8(fafData);
      const currentScore = Math.round((table.filledCount / table.rows.length) * 100);

      // Already complete (all 8 filled)?
      if (table.complete) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              complete: true,
              score: 100,
              message: bootstrap.ran
                ? '🏆 Created, sourced, and already complete — the project reached 100% AI-Readiness on the strength of what was already there. Nothing to ask; confirm and go.'
                : '🏆 GOLD CODE ACHIEVED! Your project has 100% AI-Readiness.',
              ...(bootstrap.ran ? { bootstrap: { created: true, sourced: true, birthScore: bootstrap.birthScore, sourcedScore: bootstrap.sourcedScore, filesWritten: bootstrap.filesWritten } } : {}),
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
            context: 'faf_go — the Table-of-8 (guided path to Gold Code)',
            ...(bootstrap.ran ? {
              bootstrap: {
                created: true,
                sourced: true,
                birthScore: bootstrap.birthScore,
                sourcedScore: bootstrap.sourcedScore,
                filesWritten: bootstrap.filesWritten,
                message: `No project.faf existed — created it and sourced your stack${
                  bootstrap.birthScore != null && bootstrap.sourcedScore != null
                    ? bootstrap.birthScore === bootstrap.sourcedScore
                      ? ` (${bootstrap.sourcedScore}%)`
                      : ` (${bootstrap.birthScore}% → ${bootstrap.sourcedScore}%)`
                    : ''
                }. Wrote ${bootstrap.filesWritten.join(' and ')}. The 6Ws below complete it.`,
              },
            } : {}),
            currentScore,
            targetScore: 100,
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
        content: [{ type: 'text', text: `🎯 FAF Go:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  /**
   * faf_bench — the AI-grounding benchmark, in-session.
   *
   * Composes faf-cli's bench engine (the single source): questions derive from
   * the project.faf's populated slots — the .faf IS the answer key — so grading
   * is mechanical (deriveQuestionSet + gradeAnswers, no judge). We hand out only
   * publicQuestions (NEVER the answer key — a tool that prints it makes the
   * benchmark a lie) and seal the result with buildReceipt (✪, qset-hash bound).
   *
   * DOCTRINE (faf-cli bench): the delta IS the product. A low score is an alarm,
   * not a FAF verdict — the cold number belongs to the ABSENCE of context. Never
   * render cold alone; always end in a prescription, never a verdict.
   */
  private async handleFafBench(args: any): Promise<CallToolResult> {
    const cwd = this.getProjectPath(args?.path);
    try {
      const {
        findFafFile: cliFindFaf, readFafRaw, deriveQuestionSet, publicQuestions,
        gradeAnswers, buildReceipt: buildBenchReceipt, BENCH_VERSION,
      } = await fafCli;

      const fafPath = cliFindFaf(cwd);
      if (!fafPath) {
        return {
          content: [{ type: 'text', text: 'faf_bench needs a project.faf to derive its questions — there is nothing to benchmark without context. Run faf_go (or faf_init) first.' }],
          isError: true
        };
      }

      const raw = readFafRaw(fafPath);
      const qset = deriveQuestionSet(raw);          // includes the answer key — NEVER emit it
      const N = qset.questions.length;
      const action = args?.action === 'grade' ? 'grade' : 'questions';

      if (N === 0) {
        return {
          content: [{ type: 'text', text: 'faf_bench: no populated slots to derive questions from — the .faf is empty. Run faf_go to ground it, then benchmark.' }],
          structuredContent: { action, version: qset.version, qsetHash: qset.qsetHash, total: 0 },
        };
      }

      // ── action: questions ── hand out the answer-key-SAFE set only.
      if (action === 'questions') {
        const pub = publicQuestions(qset);          // { version, qsetHash, questions } — no answers
        const text = [
          `faf_bench — ${pub.questions.length} grounding questions  (qset ${pub.qsetHash.slice(0, 12)}… · ${BENCH_VERSION})`,
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
          structuredContent: { action: 'questions', version: pub.version, qsetHash: pub.qsetHash, total: pub.questions.length, questions: pub.questions },
        };
      }

      // ── action: grade ──
      const cold = args?.cold && typeof args.cold === 'object' ? (args.cold as Record<string, string>) : undefined;
      const faf = args?.faf && typeof args.faf === 'object' ? (args.faf as Record<string, string>) : undefined;
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
          ...(cg ? { cold: { score: cg.correct, total: cg.total, ...(typeof args?.coldTokens === 'number' ? { tokens: args.coldTokens } : {}), ...(args?.model ? { model: String(args.model) } : {}) } } : {}),
          ...(fg ? { faf: { score: fg.correct, total: fg.total, ...(typeof args?.fafTokens === 'number' ? { tokens: args.fafTokens } : {}), ...(args?.model ? { model: String(args.model) } : {}) } } : {}),
        },
        repo,
      );

      // Render per bench doctrine: the pair, the delta as the product, a
      // prescription to close — never a bare cold verdict.
      const lines: string[] = [`faf_bench — grounding accuracy  (qset ${qset.qsetHash.slice(0, 12)}… · ${BENCH_VERSION})`, ''];
      if (cg && fg) {
        const delta = fg.correct - cg.correct;
        lines.push(`Without context:  ${cg.correct}/${N}`);
        lines.push(`With FAF:         ${fg.correct}/${N}`);
        lines.push(`Delta:            ${delta >= 0 ? '+' : ''}${delta}   ← the product`);
        if (typeof args?.coldTokens === 'number' && typeof args?.fafTokens === 'number') {
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
      lines.push('', `✪ ${receipt.hash.slice(0, 16)}…   (in-session · ${repo})`);

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
   * project.faf: a new file is assembled with assembleFreshFaf; an existing one
   * is filled with updateExistingFaf (existing values win; interrogated →
   * detected → Turbo-Cat → Relentless fill only the empties; a typed none in a
   * tech slot takes a repo fact) and written in place by writeFaf, which keeps
   * comments, key order and exact scalars and writes nothing on a no-op. Every
   * value the file held that the fill changed is listed.
   *
   * CLAUDE.md: faf-cli's render of the project.faf just written, through the
   * block injector. Each file's outcome is reported on its own: a CLAUDE.md
   * that cannot be written never hides a project.faf that was.
   */
  private async handleFafAuto(args: any): Promise<CallToolResult> {
    const startTime = Date.now();
    const cwd = this.getProjectPath(args?.path);
    const path = await import('path');

    const refusal = refuseHomeOrRoot(cwd);
    if (refusal) {return refusal;}

    const steps: string[] = [];
    const {
      readFaf,
      readFafRaw,
      scoreFafYaml,
      assembleFreshFaf,
      updateExistingFaf,
      writeFaf,
      renderClaudeMd,
      writeClaudeMd,
      readClaudeMd,
      legacyStampNoteAt,
    } = await fafCli;

    // Step 1: project.faf.
    let fafPath: string;
    let fafLabel = 'project.faf';
    let fafExisted = false;
    let beforeScore = 0;
    let fafOutcome: string;
    try {
      const fafResult = await findFafFile(cwd);
      fafExisted = fafResult !== null;
      if (!fafResult) {
        fafPath = path.join(cwd, 'project.faf');
        writeFaf(fafPath, assembleFreshFaf(cwd) as any);
        fafOutcome = 'project.faf created';
        steps.push('✅ Created project.faf');
      } else {
        fafPath = fafResult.path;
        fafLabel = fafResult.filename;
        const data = readFaf(fafPath) as Record<string, unknown>; // not a mapping / not YAML → refused here, nothing written
        beforeScore = scoreFafYaml(readFafRaw(fafPath)).score;
        liftLegacyProjectName(data); // CFM ≤5.22.1 wrote `project: <name>`
        const before = structuredClone(data);
        const filled = updateExistingFaf(cwd, data);
        const kept: string[] = [];
        const written = writeFaf(fafPath, filled as any, { onAliasKept: (k) => kept.push(k.path) });
        const { filledPaths, ignoredPaths, changedValues } = slotChanges(before, filled);
        steps.push(`✅ Found ${fafLabel}`);
        if (!written) {
          fafOutcome = `${fafLabel} unchanged`;
          steps.push('✅ Nothing to fill: every slot the repo answers already holds a value (file not rewritten)');
        } else {
          fafOutcome = `${fafLabel} updated`;
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
      const claudeBefore = readClaudeMd(cwd);
      const note = legacyStampNoteAt(path.join(cwd, 'CLAUDE.md'), 'CLAUDE.md');
      writeClaudeMd(cwd, renderClaudeMd(readFaf(fafPath)));
      const claudeAfter = readClaudeMd(cwd);
      claudeOutcome = claudeBefore === null ? 'CLAUDE.md created'
        : claudeAfter === claudeBefore ? 'CLAUDE.md unchanged' : 'CLAUDE.md updated (faf-managed block)';
      steps.push(`✅ ${claudeBefore === null ? 'Created CLAUDE.md' : claudeAfter === claudeBefore ? 'CLAUDE.md already current' : 'Updated CLAUDE.md (faf-managed block)'}`);
      if (note) {steps.push(`   ${note}`);}
    } catch (error: any) {
      claudeFailed = true;
      claudeOutcome = `CLAUDE.md not written: ${notWritten('CLAUDE.md', error)}`;
      steps.push(`❌ ${claudeOutcome}`);
    }

    // Step 4: final score — faf-cli's scorer, the same number faf_score reports.
    let newScore = beforeScore;
    try { newScore = scoreFafYaml(readFafRaw(fafPath)).score; } catch { /* reported by faf_score */ }
    const scoreDelta = newScore - beforeScore;
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    const deltaDisplay = scoreDelta > 0 ? `(+${scoreDelta}%)` : scoreDelta < 0 ? `(${scoreDelta}%)` : '(no change)';

    let output = `${fafOutcome}; ${claudeOutcome}\n\n`;
    output += `FAF AUTO\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    output += steps.join('\n') + '\n\n';
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    output += `⏱️ Completed in ${elapsed}s\n`;
    output += `📊 Before: ${beforeScore}% | After: ${newScore}% ${deltaDisplay}\n`;
    output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
    output += newScore >= 100
      ? `✪ 100% — your AI has the complete context.\n`
      : `${100 - newScore}% to go: faf_go asks for what the repo cannot tell.\n`;
    output += `\n💡 Next: faf_score (details: true) | faf_go`;

    return { content: [{ type: 'text', text: output }], ...(claudeFailed ? { isError: true } : {}) };
  }

  /**
   * faf_dna - Show your FAF DNA journey
   * Displays evolution from birth to current (22% → 85% → 99%)
   */
  private async handleFafDna(args: any): Promise<CallToolResult> {
    const cwd = this.getProjectPath(args?.path);
    const path = await import('path');

    try {
      const dnaPath = path.join(cwd, '.faf-dna');
      // faf-cli's safe path: a .faf-dna link out of the project (or a dangling
      // one) is refused, never read or written through.
      const { readFaf, resolveInside, readUtf8, safeWriteFile } = await fafCli;

      // Check if DNA file exists (a link counts: faf never writes through it)
      let dnaThere = true;
      try { fs.lstatSync(dnaPath); } catch { dnaThere = false; }
      if (!dnaThere) {
        // No DNA yet - check if .faf exists
        const fafResult = await findFafFile(cwd);

        if (!fafResult) {
          return {
            content: [{
              type: 'text',
              text: `🧬 FAF DNA Journey\n\n❌ No FAF DNA found\n💡 Run faf_auto to start your journey!`
            }],
            structuredContent: { hasFaf: false, hasDna: false }
          };
        }

        // .faf exists but no DNA - create initial DNA
        const fafData = readFaf(fafResult.path);
        const currentScore = this.calculateSimpleScore(fafData);

        const dna = {
          birthCertificate: {
            born: new Date().toISOString(),
            birthDNA: currentScore,
            birthDNASource: 'auto',
            authenticated: false,
            certificate: `FAF-${new Date().getFullYear()}-${path.basename(cwd).toUpperCase().slice(0, 8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
          },
          current: {
            score: currentScore,
            version: 'v1.0.0',
            lastSync: new Date().toISOString()
          },
          milestones: [
            { type: 'birth', score: currentScore, date: new Date().toISOString(), version: 'v1.0.0' }
          ],
          format: 'faf-dna-v1'
        };

        try {
          safeWriteFile(dnaPath, JSON.stringify(dna, null, 2), { root: cwd, expect: null });
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `🧬 FAF DNA:\n\n❌ ${notWritten(dnaPath, error, false)}` }],
            structuredContent: { hasFaf: true, hasDna: false },
            isError: true
          };
        }

        return {
          content: [{
            type: 'text',
            text: `🧬 FAF DNA Journey\n\n🐣 Birth Certificate Created!\n\n📊 Birth DNA: ${currentScore}%\n📅 Born: ${new Date().toISOString().split('T')[0]}\n🎫 Certificate: ${dna.birthCertificate.certificate}\n\n💡 Your journey begins here! Run faf_auto or faf_go to grow.`
          }],
          structuredContent: {
            hasFaf: true,
            hasDna: true,
            justBorn: true,
            birthScore: currentScore,
            currentScore,
            totalGrowth: 0,
            authenticated: false,
            certificate: dna.birthCertificate.certificate,
            milestones: dna.milestones
          }
        };
      }

      // Load existing DNA
      const dnaContent = readUtf8(resolveInside(cwd, dnaPath));
      const dna = JSON.parse(dnaContent);

      // Build journey string
      const birthScore = dna.birthCertificate?.birthDNA || 0;
      const currentScore = dna.current?.score || 0;
      const milestones = dna.milestones || [];

      // Find key milestones
      const _birth = milestones.find((m: any) => m.type === 'birth');
      const peak = milestones.find((m: any) => m.type === 'peak');
      const championship = milestones.find((m: any) => m.type === 'championship');
      const elite = milestones.find((m: any) => m.type === 'elite');

      // Build compact journey
      let journey = `${birthScore}%`;

      if (championship && championship.score !== birthScore) {
        journey += ` → ${championship.score}%`;
      }

      if (elite && (!championship || elite.score !== championship.score)) {
        journey += ` → ${elite.score}%`;
      }

      if (peak) {
        journey += ` → ${peak.score}%`;
        if (currentScore < peak.score) {
          journey += ` ← ${currentScore}%`;
        }
      } else if (currentScore !== birthScore) {
        journey += ` → ${currentScore}%`;
      }

      // Calculate stats
      const birthDate = new Date(dna.birthCertificate?.born || Date.now());
      const daysActive = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalGrowth = currentScore - birthScore;

      let output = `🧬 YOUR FAF DNA\n\n`;
      output += `   ${journey}\n\n`;
      output += `═══════════════════════════════════════════════════\n\n`;
      output += `📊 QUICK STATS\n`;
      output += `   Born: ${birthDate.toISOString().split('T')[0]}\n`;
      output += `   Days Active: ${daysActive}\n`;
      output += `   Total Growth: +${totalGrowth}%\n`;

      if (dna.birthCertificate?.authenticated) {
        output += `   ✅ Authenticated: ${dna.birthCertificate.certificate}\n`;
      } else {
        output += `   ⚠️ Not authenticated\n`;
      }

      output += `\n🧬 MILESTONES\n`;
      const milestoneIcons: Record<string, string> = {
        birth: '🐣', first_save: '💾', doubled: '2️⃣',
        championship: '🏆', elite: '⭐', peak: '🏔️', perfect: '💎'
      };

      for (const m of milestones) {
        const icon = milestoneIcons[m.type] || '📍';
        const isCurrent = m.score === currentScore;
        output += `   ${icon} ${m.type}: ${m.score}%${isCurrent ? ' ← You are here!' : ''}\n`;
      }

      output += `\n═══════════════════════════════════════════════════\n`;

      // Motivational message
      if (totalGrowth > 70) {
        output += `🚀 Incredible journey! You've transformed your AI context!\n`;
      } else if (totalGrowth > 50) {
        output += `📈 Great progress! Your context is evolving beautifully.\n`;
      } else if (totalGrowth > 0) {
        output += `🌱 Your journey has begun. Every step counts!\n`;
      } else {
        output += `🐣 Just born! Your growth story starts now.\n`;
      }

      return {
        content: [{ type: 'text', text: output }],
        structuredContent: {
          hasFaf: true,
          hasDna: true,
          justBorn: false,
          birthScore,
          currentScore,
          totalGrowth,
          daysActive,
          authenticated: !!dna.birthCertificate?.authenticated,
          certificate: dna.birthCertificate?.certificate ?? null,
          milestones
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
   * faf_formats - TURBO-CAT format discovery
   * Discovers all formats in the project
   */
  private async handleFafFormats(args: any): Promise<CallToolResult> {
    const cwd = this.getProjectPath(args?.path);
    const startTime = Date.now();

    try {
      const analysis = await turboCatDisplay(cwd);
      const elapsed = Date.now() - startTime;

      const structured = {
        directory: cwd,
        count: analysis.discoveredFormats.length,
        elapsedMs: elapsed,
        stackSignature: analysis.stackSignature,
        intelligenceScore: analysis.totalIntelligenceScore,
        formats: analysis.discoveredFormats,
        slotFillRecommendations: analysis.slotFillRecommendations
      };

      if (args?.json) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(analysis, null, 2)
          }],
          structuredContent: structured
        };
      }

      // Format human-readable output
      let output = `😽 TURBO-CAT™ Format Discovery v2.0.0\n`;
      output += `═══════════════════════════════════════════════════\n\n`;
      output += `✅ Found ${analysis.discoveredFormats.length} formats in ${elapsed}ms!\n\n`;

      output += `📋 Discovered Formats (A-Z):\n`;
      const sorted = [...analysis.discoveredFormats].sort((a, b) => a.fileName.localeCompare(b.fileName));
      for (const format of sorted) {
        output += `  ✅ ${format.fileName}\n`;
      }

      output += `\n💡 Stack Signature: ${analysis.stackSignature}\n`;
      output += `🏆 Intelligence Score: ${analysis.totalIntelligenceScore}\n\n`;

      if (Object.keys(analysis.slotFillRecommendations).length > 0) {
        output += `📊 Recommended Slot Fills:\n`;
        for (const [key, value] of Object.entries(analysis.slotFillRecommendations)) {
          output += `  • ${key}: ${value}\n`;
        }
        output += `\n`;
      }

      output += `───────────────────────────────────────────────────\n`;
      output += `😽 TURBO-CAT™: "I detected ${analysis.discoveredFormats.length} formats and made your stack PURRR!"\n`;

      return { content: [{ type: 'text', text: output }], structuredContent: structured };

    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `😽 TURBO-CAT:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  /**
   * Internal helper: Calculate simple score from .faf data
   */
  private calculateSimpleScore(fafData: any): number {
    let score = 0;
    const maxScore = 100;

    // Project section (30 points)
    if (fafData.project) score += 15;
    if (fafData.project?.goal || fafData.description) score += 15;

    // Human context (30 points)
    const humanContext = fafData.human_context || {};
    const wFields = ['who', 'what', 'why', 'where', 'when', 'how'];
    const filledW = wFields.filter(f => humanContext[f] && humanContext[f] !== 'null').length;
    score += Math.round((filledW / wFields.length) * 30);

    // Stack section (20 points)
    const stack = fafData.stack || {};
    const stackFields = ['frontend', 'backend', 'database', 'hosting', 'build'];
    const filledStack = stackFields.filter(f => stack[f] && stack[f] !== 'None').length;
    score += Math.round((filledStack / stackFields.length) * 20);

    // Files exist bonus (20 points)
    if (fafData.initialized_by || fafData.generated) score += 10;
    if (fafData.stack_signature) score += 10;

    return Math.min(score, maxScore);
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
    const cwd = this.getProjectPath(args?.path);
    const path = await import('path');
    const startTime = Date.now();

    try {
      const input = args?.input;

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

      const refusal = refuseHomeOrRoot(cwd);
      if (refusal) {return refusal;}

      const existing = await findFafFile(cwd);
      if (existing) {
        return {
          content: [{
            type: 'text',
            text: `⚡ FAF Quick

⚠️ ${existing.filename} already exists at: ${existing.path}
faf_quick only creates a new file, so it wrote nothing. faf_auto fills its empty slots from the repo (existing values kept); faf_go asks for the 6Ws.`
          }],
          isError: true
        };
      }

      const { assembleFreshFaf, fillEmpties, writeFaf, readFafRaw, scoreFafYaml, STACK_INTERVIEW } = await fafCli;

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

      const elapsed = Date.now() - startTime;

      let output = `FAF Quick — created project.faf in ${elapsed}ms\n\n`;
      output += `Project: ${projectName}\n`;
      output += `Goal: ${projectGoal}\n`;
      output += `Language: ${typeof lang === 'string' && lang.trim() ? lang : '(not given, none detected)'}\n`;
      if (frameworkNote) {output += `Framework: ${frameworkNote}\n`;}
      if (stack.hosting) {output += `Hosting: ${stack.hosting} → stack.hosting\n`;}
      output += `Score: ${score.score}/100 (${score.populated}/${score.active} slots populated) — ${score.tier.name}\n\n`;
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
   * faf_doctor - Health check for .faf setup
   * Diagnose and fix common issues
   */
  private async handleFafDoctor(args: any): Promise<CallToolResult> {
    const cwd = this.getProjectPath(args?.path);
    const path = await import('path');
    const yaml = await import('yaml');

    try {
      interface DiagnosticResult {
        status: 'ok' | 'warning' | 'error';
        message: string;
        fix?: string;
      }

      const results: DiagnosticResult[] = [];

      // Check 1: MCP Version
      results.push({
        status: 'ok',
        message: `claude-faf-mcp version: ${VERSION}`
      });

      // Check 2: .faf file exists
      const fafResult = await findFafFile(cwd);

      if (!fafResult) {
        results.push({
          status: 'error',
          message: 'No .faf file found',
          fix: 'Run: faf_init, faf_quick, or faf_auto to create one'
        });
      } else {
        results.push({
          status: 'ok',
          message: `Found .faf at: ${fafResult.path}`
        });

        // Check 3: .faf file validity. faf-cli's reader applies the link rules
        // (a project.faf linked out of the project is refused, never read).
        let content: string | null = null;
        try {
          const { readFafRaw } = await fafCli;
          content = readFafRaw(fafResult.path);
        } catch (error) {
          results.push({
            status: 'error',
            message: `${fafResult.filename} could not be read: ${oneLine(error)}`,
            fix: 'faf reads project.faf only inside the project and as UTF-8; replace the link or re-save the file as UTF-8 by hand.'
          });
        }
        if (content !== null) {
          const raw = content;
          try {
            const fafData = yaml.parse(raw);

            if (fafData === null || fafData === undefined) {
              results.push({
                status: 'error',
                message: `${fafResult.filename} has no keys (it is empty, blank or comments only)`,
                fix: `${NO_KEYS_FIX.charAt(0).toUpperCase()}${NO_KEYS_FIX.slice(1)}`
              });
            } else if (typeof fafData !== 'object' || Array.isArray(fafData)) {
              results.push({
                status: 'error',
                message: `${fafResult.filename} is a YAML ${Array.isArray(fafData) ? 'list' : 'scalar'}, not a mapping of keys`,
                fix: `Edit ${fafResult.path} by hand into key: value pairs; faf changes nothing until it is a mapping.`
              });
            } else {
              // Check for required fields
              const missingFields: string[] = [];
              if (!fafData.project?.name && !fafData.project) missingFields.push('project.name');
              if (!fafData.project?.goal) missingFields.push('project.goal');

              if (missingFields.length > 0) {
                results.push({
                  status: 'warning',
                  message: `Missing important fields: ${missingFields.join(', ')}`,
                  fix: 'Run: faf_go to add missing human context'
                });
              } else {
                results.push({
                  status: 'ok',
                  message: '.faf structure is valid'
                });
              }

              // Check 4: Score
              const score = this.calculateSimpleScore(fafData);

              if (score < 30) {
                results.push({
                  status: 'error',
                  message: `Score too low: ${score}%`,
                  fix: 'Run: faf_go to improve human context'
                });
              } else if (score < 70) {
                results.push({
                  status: 'warning',
                  message: `Score could be better: ${score}%`,
                  fix: 'Target 70%+ for championship AI context'
                });
              } else {
                results.push({
                  status: 'ok',
                  message: `Great score: ${score}%`
                });
              }
            }
          } catch {
            results.push({
              status: 'error',
              message: `${fafResult.filename} is not valid YAML`,
              fix: `${yamlFixHint(raw, fafResult.path).replace(/^edit/, 'Edit').replace(/ faf_doctor runs the other checks\.$/, '')}`
            });
          }
        }
      }

      // Check 5: CLAUDE.md exists
      const claudePath = path.join(cwd, 'CLAUDE.md');
      if (!fs.existsSync(claudePath)) {
        results.push({
          status: 'warning',
          message: 'No CLAUDE.md file',
          fix: 'Run: faf_auto or faf_sync to create the CLAUDE.md sync'
        });
      } else {
        results.push({
          status: 'ok',
          message: 'CLAUDE.md found'
        });
      }

      // Check 6: Project detection
      const packageJsonPath = path.join(cwd, 'package.json');
      const requirementsPath = path.join(cwd, 'requirements.txt');
      const goModPath = path.join(cwd, 'go.mod');
      const cargoPath = path.join(cwd, 'Cargo.toml');

      if (fs.existsSync(packageJsonPath)) {
        results.push({
          status: 'ok',
          message: 'Node.js/JavaScript project detected'
        });
      } else if (fs.existsSync(requirementsPath)) {
        results.push({
          status: 'ok',
          message: 'Python project detected'
        });
      } else if (fs.existsSync(goModPath)) {
        results.push({
          status: 'ok',
          message: 'Go project detected'
        });
      } else if (fs.existsSync(cargoPath)) {
        results.push({
          status: 'ok',
          message: 'Rust project detected'
        });
      } else {
        results.push({
          status: 'warning',
          message: 'No standard project files detected',
          fix: 'FAF works best with package.json, requirements.txt, go.mod, or Cargo.toml'
        });
      }

      // Build output
      let output = `🏥 FAF Doctor - Health Check\n`;
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
        output += `🏆 Perfect health! Your FAF setup is championship-ready!`;
      } else if (!hasErrors) {
        output += `🎯 Good health with minor improvements suggested.`;
      } else {
        output += `⚠️ Issues detected. Follow the fixes above.`;
      }

      const health = hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok';

      return {
        content: [{ type: 'text', text: output }],
        structuredContent: {
          health,
          checks: results.length,
          errors: results.filter(r => r.status === 'error').length,
          warnings: results.filter(r => r.status === 'warning').length,
          diagnostics: results
        }
      };

    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `🏥 FAF Doctor:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  // ============================================================================
  // v4.5.0 INTEROP HANDLERS
  // ============================================================================

  private async handleFafAgents(args: any): Promise<CallToolResult> {
    if (args?.action === 'import') {
      return importRetired('faf_agents', 'AGENTS.md');
    }
    const cwd = this.getProjectPath(args?.path);
    const action = args?.action || 'sync';

    try {
      const result = await this.engineAdapter.callEngine('agents', [
        cwd,
        `--action=${action}`,
      ]);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `AGENTS.md ${action}:\n\n❌ ${result.error ?? result.data?.message ?? 'unknown error'}` }],
          isError: true
        };
      }

      const data = result.data;
      return {
        content: [{ type: 'text', text: `AGENTS.md ${action}:\n\n✅ ${data?.message || 'Done'}\n⏱️ ${result.duration}ms` }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `AGENTS.md ${action}:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleFafCursor(args: any): Promise<CallToolResult> {
    if (args?.action === 'import') {
      return importRetired('faf_cursor', '.cursorrules');
    }
    const cwd = this.getProjectPath(args?.path);
    const action = args?.action || 'sync';

    try {
      const result = await this.engineAdapter.callEngine('cursor', [
        cwd,
        `--action=${action}`,
      ]);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `.cursorrules ${action}:\n\n❌ ${result.error ?? result.data?.message ?? 'unknown error'}` }],
          isError: true
        };
      }

      const data = result.data;
      return {
        content: [{ type: 'text', text: `.cursorrules ${action}:\n\n✅ ${data?.message || 'Done'}\n⏱️ ${result.duration}ms` }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `.cursorrules ${action}:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleFafGemini(args: any): Promise<CallToolResult> {
    if (args?.action === 'import') {
      return importRetired('faf_gemini', 'GEMINI.md');
    }
    const cwd = this.getProjectPath(args?.path);
    const action = args?.action || 'sync';

    try {
      const result = await this.engineAdapter.callEngine('gemini', [
        cwd,
        `--action=${action}`,
      ]);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `GEMINI.md ${action}:\n\n❌ ${result.error ?? result.data?.message ?? 'unknown error'}` }],
          isError: true
        };
      }

      const data = result.data;
      return {
        content: [{ type: 'text', text: `GEMINI.md ${action}:\n\n✅ ${data?.message || 'Done'}\n⏱️ ${result.duration}ms` }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `GEMINI.md ${action}:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleFafConductor(args: any): Promise<CallToolResult> {
    if (args?.action === 'import') {
      return importRetired('faf_conductor', 'conductor/', 'export');
    }
    const cwd = this.getProjectPath(args?.path);
    const action = args?.action || 'export';

    try {
      const result = await this.engineAdapter.callEngine('conductor', [
        cwd,
        `--action=${action}`,
      ]);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Conductor ${action}:\n\n❌ ${result.error ?? result.data?.message ?? 'unknown error'}` }],
          isError: true
        };
      }

      const data = result.data;
      return {
        content: [{ type: 'text', text: `Conductor ${action}:\n\n✅ ${data?.message || 'Done'}\n⏱️ ${result.duration}ms` }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Conductor ${action}:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleFafGit(args: any): Promise<CallToolResult> {
    const url = args?.url;
    if (!url) {
      return {
        content: [{ type: 'text', text: 'faf_git: Missing required parameter "url"' }],
        isError: true
      };
    }

    const outputPath = args?.path ? this.getProjectPath(args.path) : undefined;

    try {
      const result = await this.engineAdapter.callEngine('git', [
        url,
        ...(outputPath ? [outputPath] : []),
      ]);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `GitHub Context:\n\n❌ ${result.error ?? result.data?.message ?? 'unknown error'}` }],
          isError: true
        };
      }

      const data = result.data;
      let output = `GitHub Context:\n\n✅ ${data?.message || 'Done'}\n⏱️ ${result.duration}ms`;

      // Include the authored .faf content if no output path (preview mode)
      if (!outputPath && data?.data?.fafContent) {
        output += `\n\n--- project.faf (preview) ---\n${data.data.fafContent}`;
      }

      return {
        content: [{ type: 'text', text: output }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `GitHub Context:\n\n❌ Error: ${error.message}` }],
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
    const cwd = this.getProjectPath(args?.path);

    // Find project.faf
    const fafResult = await findFafFile(cwd);
    if (!fafResult) {
      return {
        content: [{
          type: 'text',
          text: `🔄 tri-sync: No project.faf found in ${cwd}\n💡 Run faf_init first.`
        }]
      };
    }

    const action = args?.action || 'export';
    const { readFaf, writeClaudeMemory, claudeMemoryStatus, resolveClaudeMemoryPath } = await fafCli;

    if (action === 'status') {
      try {
        const status = claudeMemoryStatus(cwd);
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

    // Export: .faf → MEMORY.md
    let memoryPath = '';
    try {
      memoryPath = resolveClaudeMemoryPath(cwd);
      const result = writeClaudeMemory(cwd, readFaf(fafResult.path));
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
