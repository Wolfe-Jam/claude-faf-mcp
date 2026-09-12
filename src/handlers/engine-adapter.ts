/**
 * FafEngineAdapter — routes faf_sync and the interop tools to their bundled,
 * in-process commands, and holds the session's working directory.
 *
 * Five commands are reached by a registered tool: claude (faf_sync), agents,
 * cursor, gemini and conductor (export); faf_git calls its command directly.
 * 6.0.0 cut the sixteen command branches no tool called — the Mk3 score /
 * init / auto / sync / formats / doctor / validate / audit / update / migrate
 * / innit / quick / human / readme commands and the FafCompiler scorer behind
 * them — the 'bi-sync' / 'bisync' aliases, the interop import paths, and the
 * PATH detector with its shell-out to whatever `faf` was on PATH (tag
 * archive/cfm-v5-surface keeps them). Every command here runs on the bundled
 * faf-cli; nothing is ever run from PATH. Template: faf-mcp 3.0.2's
 * engine-adapter.ts.
 */
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { isError } from '../utils/type-guards.js';
import { claudeExportCommand } from '../faf-core/commands/claude.js';
import { agentsExportCommand, agentsSyncCommand } from '../faf-core/commands/agents.js';
import { cursorExportCommand, cursorSyncCommand } from '../faf-core/commands/cursor.js';
import { geminiExportCommand, geminiSyncCommand } from '../faf-core/commands/gemini.js';
import { conductorExportCommand } from '../faf-core/commands/conductor.js';

export interface FafEngineResult {
  success: boolean;
  data?: any;
  error?: string;
  duration?: number;
}

/** What every bundled command returns, as far as the adapter cares. */
interface CommandOutcome {
  success: boolean;
  message?: string;
  error?: string;
}

export class FafEngineAdapter {
  private workingDirectory: string;

  constructor() {
    this.workingDirectory = this.findBestWorkingDirectory();
  }

  /**
   * The session's starting project. Nothing is created here: startup never
   * makes a folder. Order: FAF_WORKING_DIR, MCP_WORKING_DIR, then the folder the
   * host started the server in — the workspace an IDE or MCP host opens. Only
   * when that is the filesystem root (a host that starts servers at '/') does it
   * fall back, to an existing ~/Projects (or ~/projects), else the home folder.
   * Writers refuse the home folder and the filesystem root and ask for a path,
   * so a server started there writes nothing until it is given a project.
   */
  private findBestWorkingDirectory(): string {
    const isDir = (p: string): boolean => {
      try { return fs.statSync(p).isDirectory(); } catch { return false; }
    };
    for (const dir of [process.env.FAF_WORKING_DIR, process.env.MCP_WORKING_DIR]) {
      if (dir && isDir(dir)) {return path.resolve(dir);}
    }

    const currentDir = process.cwd();
    if (path.parse(currentDir).root !== currentDir && isDir(currentDir)) {
      return currentDir;
    }

    const home = os.homedir();
    for (const dir of [path.join(home, 'Projects'), path.join(home, 'projects')]) {
      if (isDir(dir)) {return dir;}
    }
    return home || currentDir;
  }

  /**
   * Wrap a bundled command's outcome. A failed command's reason travels in
   * `error`, so handlers can print it.
   */
  private outcome(result: CommandOutcome, fallback: string, startTime: number): FafEngineResult {
    return {
      success: result.success,
      data: result,
      error: result.success ? undefined : (result.message || result.error || fallback),
      duration: Date.now() - startTime,
    };
  }

  private failure(error: unknown, fallback: string, startTime: number): FafEngineResult {
    return { success: false, error: isError(error) ? error.message : fallback, duration: Date.now() - startTime };
  }

  /**
   * Run one bundled command. `args` holds the project folder (the first
   * argument that is not a flag), the format flags for 'claude', and
   * `--action=<export|sync>` for the interop commands. An unknown command or
   * action is refused: nothing runs, nothing is written.
   */
  async callEngine(command: string, args: string[] = []): Promise<FafEngineResult> {
    const startTime = Date.now();

    const pathArgs = args.filter(arg => !arg.startsWith('-'));
    const projectPath = pathArgs[0] || this.workingDirectory;
    const actionArg = args.find(arg => arg.startsWith('--action='));
    const action = actionArg ? actionArg.substring('--action='.length) : 'export';
    const refuse = (why: string): FafEngineResult => ({ success: false, error: why, duration: Date.now() - startTime });

    try {
      switch (command) {
        // faf_sync: CLAUDE.md from project.faf via faf-cli (+ agents/cursor/gemini/copilot/all).
        case 'claude': {
          const result = await claudeExportCommand(projectPath, {
            agents: args.includes('--agents'),
            cursor: args.includes('--cursor'),
            gemini: args.includes('--gemini'),
            copilot: args.includes('--copilot'),
            all: args.includes('--all'),
          });
          return this.outcome(result, 'CLAUDE.md write failed', startTime);
        }

        case 'agents':
        case 'cursor':
        case 'gemini': {
          if (action !== 'export' && action !== 'sync') {
            return refuse(`${command}: unknown action "${action}" (export or sync). Nothing was written.`);
          }
          const run = {
            agents: action === 'export' ? agentsExportCommand : agentsSyncCommand,
            cursor: action === 'export' ? cursorExportCommand : cursorSyncCommand,
            gemini: action === 'export' ? geminiExportCommand : geminiSyncCommand,
          }[command];
          return this.outcome(await run(projectPath), `${command} export failed`, startTime);
        }

        case 'conductor': {
          if (action !== 'export') {
            return refuse(`conductor: unknown action "${action}" (export). Nothing was written.`);
          }
          return this.outcome(await conductorExportCommand(projectPath), 'Conductor export failed', startTime);
        }

        default:
          return refuse(`No bundled command "${command}". Nothing was run.`);
      }
    } catch (error: unknown) {
      return this.failure(error, `${command} command failed`, startTime);
    }
  }

  // Get the current working directory used by the adapter
  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  setWorkingDirectory(dir: string): void {
    if (fs.existsSync(dir)) {
      this.workingDirectory = dir;
    }
  }
}
