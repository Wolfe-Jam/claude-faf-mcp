/**
 * FafEngineAdapter — routes faf_sync and the interop tools to their bundled,
 * in-process commands, and holds the session's working directory.
 *
 * Six commands are reached by a registered tool: claude (faf_sync), agents,
 * cursor, gemini, conductor (export) and git. 6.0.0 cut the sixteen command
 * branches no tool called — the Mk3 score / init / auto / sync / formats /
 * doctor / validate / audit / update / migrate / innit / quick / human /
 * readme commands and the FafCompiler scorer behind them — the 'bi-sync' /
 * 'bisync' aliases, and the interop import paths (tag archive/cfm-v5-surface
 * keeps them). Template: faf-mcp 3.0.2's engine-adapter.ts.
 *
 * The PATH detector and the exec fallback at the end are still reached by the
 * two resources (callEngine('status')) and faf_debug; they go when those move
 * to the bundled faf-cli.
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { isError } from '../utils/type-guards.js';
import { detectFafCli, validateCliVersion } from '../utils/cli-detector.js';
import { claudeExportCommand } from '../faf-core/commands/claude.js';
import { agentsExportCommand, agentsSyncCommand } from '../faf-core/commands/agents.js';
import { cursorExportCommand, cursorSyncCommand } from '../faf-core/commands/cursor.js';
import { geminiExportCommand, geminiSyncCommand } from '../faf-core/commands/gemini.js';
import { conductorExportCommand } from '../faf-core/commands/conductor.js';
import { gitContextCommand } from '../faf-core/commands/git-context.js';

const execAsync = promisify(exec);

// Enhanced PATH for FAF CLI discovery
const getEnhancedEnv = (): NodeJS.ProcessEnv => ({
  ...process.env,
  PATH: [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    process.env.HOME ? `${process.env.HOME}/.npm/bin` : undefined,
    process.env.HOME ? `${process.env.HOME}/.npm-global/bin` : undefined,
    '/usr/bin',
    '/bin',
    process.env.PATH
  ].filter(Boolean).join(':')
});

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
  private enginePath: string;
  private detectedCliPath: string | null = null;
  private cliVersion: string | undefined;
  private timeout: number;
  private workingDirectory: string;

  constructor(enginePath: string = 'faf', timeout: number = 30000) {
    this.enginePath = enginePath;
    this.timeout = timeout;
    this.workingDirectory = this.findBestWorkingDirectory();

    // Auto-detect CLI on initialization
    this.detectCli();
  }

  private detectCli(): void {
    const detection = detectFafCli();

    if (detection.found && detection.path) {
      this.detectedCliPath = detection.path;
      this.cliVersion = detection.version;

      // Validate version meets minimum requirement
      if (this.cliVersion && !validateCliVersion(this.cliVersion, '3.1.1')) {
        console.warn(`FAF CLI version ${this.cliVersion} is below minimum required version 3.1.1. Some features may not work correctly.`);
      }

      console.error(`✅ FAF CLI detected: ${this.detectedCliPath} (v${this.cliVersion || 'unknown'}) via ${detection.method}`);
    } else {
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('⚠️  FAF CLI NOT DETECTED');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.error('');
      console.error('INSTALLATION ORDER REQUIRED:');
      console.error('  1️⃣  npm install -g faf-cli        (REQUIRED FIRST)');
      console.error('  2️⃣  npm install -g claude-faf-mcp  (THEN THIS)');
      console.error('');
      console.error('Most MCP tools require faf-cli to be installed.');
      console.error('Only basic file operations will work without it.');
      console.error('');
      console.error('After installing faf-cli, restart Claude Desktop.');
      console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }
  }
  
  private findBestWorkingDirectory(): string {
    // Priority 1: Environment variable for explicit control
    const fafWorkingDir = process.env.FAF_WORKING_DIR;
    if (fafWorkingDir && fs.existsSync(fafWorkingDir)) {
      return fafWorkingDir;
    }

    // Priority 2: MCP might pass a working directory hint
    const mcpWorkingDir = process.env.MCP_WORKING_DIR;
    if (mcpWorkingDir && fs.existsSync(mcpWorkingDir)) {
      return mcpWorkingDir;
    }

    // Priority 3 (FIX 2026-06-30): the caller's ACTUAL working directory — the
    // workspace an IDE / MCP host (Claude Desktop, Cursor, VS Code) launches the
    // server in. This MUST win over the ~/Projects convention below. Previously
    // ~/Projects was FORCED here, so every no-path tool call that resolves via
    // the engine adapter operated on ~/Projects instead of the project the user
    // actually had open. Prefer a real FAF project (cwd contains project.faf —
    // the path-check), else the cwd itself when it's a usable, non-root
    // directory (so faf_init/score act on the open workspace even before a .faf
    // exists). Shared fix across faf-mcp / grok-faf-mcp / claude-faf-mcp.
    const currentDir = process.cwd();
    const usableCwd =
      currentDir !== '/' && currentDir !== '/root' && fs.existsSync(currentDir);
    if (usableCwd && fs.existsSync(path.join(currentDir, 'project.faf'))) {
      return currentDir;
    }
    if (usableCwd) {
      return currentDir;
    }

    // Priority 4: ~/Projects convention — a soft landing ONLY when the host gave
    // us no usable workspace (e.g. cwd is the filesystem root). Never overrides a
    // real cwd above.
    const homeDir = process.env.HOME ?? process.env.USERPROFILE;
    if (homeDir) {
      // Try capitalized Projects first (macOS/Windows convention)
      const projectsDir = path.join(homeDir, 'Projects');
      if (fs.existsSync(projectsDir)) {
        return projectsDir;
      }

      // Create ~/Projects if it doesn't exist
      try {
        fs.mkdirSync(projectsDir, { recursive: true });
        return projectsDir;
      } catch {
        // If we can't create Projects, try lowercase
        const projectsLower = path.join(homeDir, 'projects');
        if (fs.existsSync(projectsLower)) {
          return projectsLower;
        }

        // Fall back to home
        return homeDir;
      }
    }

    // Last resort: /tmp (should rarely happen)
    return '/tmp';
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

  async callEngine(command: string, args: string[] = []): Promise<FafEngineResult> {
    const startTime = Date.now();

    // Input validation
    if (!command || typeof command !== 'string') {
      return {
        success: false,
        error: 'Command must be a non-empty string',
        duration: 0
      };
    }

    const pathArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
    const projectPath = pathArgs[0] || this.workingDirectory;
    const actionArg = args.find(arg => arg.startsWith('--action='));
    const action = actionArg ? actionArg.substring('--action='.length) : undefined;
    const importRetired = (tool: string): FafEngineResult => ({
      success: false,
      error: `${tool} import was retired in 6.0.0; export and sync remain.`,
      duration: Date.now() - startTime,
    });

    try {
      switch (command) {
        // faf_sync: CLAUDE.md from project.faf via faf-cli (+ agents/cursor/gemini/copilot/all).
        case 'claude': {
          const result = await claudeExportCommand(projectPath, {
            json: true,
            agents: args.includes('--agents'),
            cursor: args.includes('--cursor'),
            gemini: args.includes('--gemini'),
            copilot: args.includes('--copilot'),
            all: args.includes('--all'),
          });
          return this.outcome(result, 'CLAUDE.md write failed', startTime);
        }

        case 'agents': {
          if (action === 'import') {return importRetired('AGENTS.md');}
          const result = action === 'export'
            ? await agentsExportCommand(projectPath)
            : await agentsSyncCommand(projectPath);
          return this.outcome(result, 'Agents command failed', startTime);
        }

        case 'cursor': {
          if (action === 'import') {return importRetired('.cursorrules');}
          const result = action === 'export'
            ? await cursorExportCommand(projectPath)
            : await cursorSyncCommand(projectPath);
          return this.outcome(result, 'Cursor command failed', startTime);
        }

        case 'gemini': {
          if (action === 'import') {return importRetired('GEMINI.md');}
          const result = action === 'export'
            ? await geminiExportCommand(projectPath)
            : await geminiSyncCommand(projectPath);
          return this.outcome(result, 'Gemini command failed', startTime);
        }

        case 'conductor': {
          if (action === 'import') {return importRetired('conductor/');}
          const result = await conductorExportCommand(projectPath);
          return this.outcome(result, 'Conductor command failed', startTime);
        }

        // faf_git: author .faf from a GitHub repo ([url, outputDir?]).
        case 'git': {
          const url = args[0];
          const outputPath = args[1]; // optional
          if (!url) {
            return { success: false, error: 'URL is required', duration: Date.now() - startTime };
          }
          const result = await gitContextCommand(url, outputPath);
          return { success: result.success, data: result, duration: Date.now() - startTime };
        }

        default:
          break;
      }
    } catch (error: unknown) {
      return this.failure(error, `${command} command failed`, startTime);
    }

    // ============================================================================
    // FALLBACK: the `faf` on PATH. Only the resources' 'status' reaches it.
    // ============================================================================

    // Check if CLI is available
    if (!this.detectedCliPath) {
      const duration = Date.now() - startTime;
      return {
        success: false,
        error: `FAF CLI not detected. Command '${command}' requires faf-cli.\n\nINSTALLATION ORDER:\n  1️⃣  npm install -g faf-cli\n  2️⃣  npm install -g claude-faf-mcp\n\nAfter installing faf-cli, restart Claude Desktop.`,
        duration
      };
    }

    // Sanitize arguments to prevent injection
    const sanitizedArgs = args.map(arg =>
      typeof arg === 'string' ? arg.replace(/[;&|`$(){}[\]]/g, '') : ''
    );

    try {
      // Use detected absolute path to CLI
      const fullCommand = `"${this.detectedCliPath}" ${command} ${sanitizedArgs.join(' ')}`;

      const { stdout, stderr } = await execAsync(fullCommand, {
        env: getEnhancedEnv(),
        timeout: this.timeout,
        maxBuffer: 1024 * 1024, // 1MB buffer limit
        cwd: this.workingDirectory
      });

      const duration = Date.now() - startTime;

      if (stderr?.trim()) {
        console.warn(`FAF CLI warning: ${stderr.trim()}`);
      }

      return {
        success: true,
        data: this.parseOutput(stdout),
        duration
      };
    } catch (error: unknown) {
      const duration = Date.now() - startTime;

      let errorMessage = 'Unknown error occurred';

      if (isError(error)) {
        errorMessage = error.message;

        // Handle specific error codes
        if ('code' in error) {
          if (error.code === 'ETIMEDOUT') {
            errorMessage = `Command timed out after ${this.timeout}ms`;
          } else if (error.code === 'ENOENT') {
            errorMessage = `FAF CLI not found at ${this.detectedCliPath}. Please reinstall: npm install -g faf-cli`;
          }
        }

        // Handle signal termination
        if ('signal' in error && error.signal === 'SIGTERM') {
          errorMessage = 'Command was terminated';
        }
      }

      console.error(`FAF CLI error: ${errorMessage}`);

      return {
        success: false,
        error: errorMessage,
        duration
      };
    }
  }

  private parseOutput(output: string): any {
    if (!output || output.trim() === '') {
      return { output: '' };
    }
    
    try {
      return JSON.parse(output);
    } catch {
      return { output: output.trim() };
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

  // Get the engine path being used
  getEnginePath(): string {
    return this.enginePath;
  }

  // Get CLI detection info for debugging
  getCliInfo(): { detected: boolean; path?: string; version?: string } {
    return {
      detected: this.detectedCliPath !== null,
      path: this.detectedCliPath || undefined,
      version: this.cliVersion
    };
  }
}
