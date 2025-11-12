import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { isError } from '../utils/type-guards.js';  // ✅ FIXED: Removed unused isDefined
import { detectFafCli, validateCliVersion } from '../utils/cli-detector.js';
import { scoreFafFile } from '../faf-core/commands/score.js';
import { initFafFile } from '../faf-core/commands/init.js';
import { autoCommand } from '../faf-core/commands/auto.js';
import { syncFafFile } from '../faf-core/commands/sync.js';
import { syncBiDirectional } from '../faf-core/commands/bi-sync.js';
import { formatsCommand } from '../faf-core/commands/formats.js';
import { doctorCommand } from '../faf-core/commands/doctor.js';
import { validateFafFile } from '../faf-core/commands/validate.js';
import { auditFafFile } from '../faf-core/commands/audit.js';
import { updateFafFile } from '../faf-core/commands/update.js';
import { migrateFafFile } from '../faf-core/commands/migrate.js';
import { innitFafFile } from '../faf-core/commands/innit.js';
import { quickCommand } from '../faf-core/commands/quick.js';
import { enhanceCommand } from '../faf-core/commands/enhance.js';

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

    // Priority 3: FORCE ~/Projects as universal default
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

    // Priority 4: Current directory if not root
    const currentDir = process.cwd();
    if (currentDir !== '/' && currentDir !== '/root' && fs.existsSync(currentDir)) {
      return currentDir;
    }

    // Last resort: /tmp (should rarely happen)
    return '/tmp';
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

    // ============================================================================
    // MK3 BUNDLED ENGINE - Direct function calls (no CLI dependency!)
    // ============================================================================

    // SCORE command - use bundled FafCompiler
    if (command === 'score') {
      try {
        const filePath = args[0] || this.workingDirectory;
        const result = await scoreFafFile(filePath, { json: true });
        const duration = Date.now() - startTime;

        return {
          success: true,
          data: result,
          duration
        };
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        const errorMessage = isError(error) ? error.message : 'Score command failed';

        return {
          success: false,
          error: errorMessage,
          duration
        };
      }
    }

    // INIT command - use bundled init
    if (command === 'init') {
      try {
        // Filter out flags to get the actual path argument
        const pathArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
        const projectPath = pathArgs[0] || this.workingDirectory;
        const force = args.includes('--force');
        const result = await initFafFile(projectPath, { force });
        const duration = Date.now() - startTime;

        return {
          success: result.success,
          data: result,
          duration
        };
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        const errorMessage = isError(error) ? error.message : 'Init command failed';

        return {
          success: false,
          error: errorMessage,
          duration
        };
      }
    }

    // AUTO command - use bundled auto (init + score)
    if (command === 'auto') {
      try {
        // Filter out flags to get the actual path argument
        const pathArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
        const directory = pathArgs[0] || this.workingDirectory;
        const force = args.includes('--force');
        const result = await autoCommand(directory, { force });
        const duration = Date.now() - startTime;

        return {
          success: result.success,
          data: result,
          duration
        };
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        const errorMessage = isError(error) ? error.message : 'Auto command failed';

        return {
          success: false,
          error: errorMessage,
          duration
        };
      }
    }

    // SYNC command - use bundled sync
    if (command === 'sync') {
      try {
        const pathArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
        const projectPath = pathArgs[0] || this.workingDirectory;
        const auto = args.includes('--auto');
        const result = await syncFafFile(projectPath, { auto, json: true });
        const duration = Date.now() - startTime;

        return {
          success: result.success,
          data: result,
          duration
        };
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        return {
          success: false,
          error: isError(error) ? error.message : 'Sync command failed',
          duration
        };
      }
    }

    // BI-SYNC command - use bundled bi-sync
    if (command === 'bi-sync' || command === 'bisync') {
      try {
        const pathArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
        const projectPath = pathArgs[0] || this.workingDirectory;
        const result = await syncBiDirectional(projectPath, { json: true });
        const duration = Date.now() - startTime;

        return {
          success: result.success,
          data: result,
          duration
        };
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        return {
          success: false,
          error: isError(error) ? error.message : 'Bi-sync command failed',
          duration
        };
      }
    }

    // FORMATS command - use bundled formats
    if (command === 'formats') {
      try {
        const pathArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
        const projectPath = pathArgs[0] || this.workingDirectory;
        const result = await formatsCommand(projectPath, { json: true });
        const duration = Date.now() - startTime;

        return {
          success: result.success,
          data: result,
          duration
        };
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        return {
          success: false,
          error: isError(error) ? error.message : 'Formats command failed',
          duration
        };
      }
    }

    // DOCTOR command - use bundled doctor
    if (command === 'doctor') {
      try {
        const pathArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
        const projectPath = pathArgs[0] || this.workingDirectory;
        const result = await doctorCommand(projectPath);
        const duration = Date.now() - startTime;

        return {
          success: result.success,
          data: result,
          duration
        };
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        return {
          success: false,
          error: isError(error) ? error.message : 'Doctor command failed',
          duration
        };
      }
    }

    // VALIDATE command - use bundled validate
    if (command === 'validate') {
      try {
        const pathArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
        const projectPath = pathArgs[0] || this.workingDirectory;
        const result = await validateFafFile(projectPath, { json: true });
        const duration = Date.now() - startTime;

        return {
          success: result.success,
          data: result,
          duration
        };
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        return {
          success: false,
          error: isError(error) ? error.message : 'Validate command failed',
          duration
        };
      }
    }

    // AUDIT command - use bundled audit
    if (command === 'audit') {
      try {
        const pathArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
        const projectPath = pathArgs[0] || this.workingDirectory;
        const result = await auditFafFile(projectPath, { json: true });
        const duration = Date.now() - startTime;

        return {
          success: result.success,
          data: result,
          duration
        };
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        return {
          success: false,
          error: isError(error) ? error.message : 'Audit command failed',
          duration
        };
      }
    }

    // UPDATE command - use bundled update
    if (command === 'update') {
      try {
        const pathArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
        const projectPath = pathArgs[0] || this.workingDirectory;
        const result = await updateFafFile(projectPath, { json: true });
        const duration = Date.now() - startTime;

        return {
          success: result.success,
          data: result,
          duration
        };
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        return {
          success: false,
          error: isError(error) ? error.message : 'Update command failed',
          duration
        };
      }
    }

    // MIGRATE command - use bundled migrate
    if (command === 'migrate') {
      try {
        const pathArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
        const projectPath = pathArgs[0] || this.workingDirectory;
        const force = args.includes('--force');
        const result = await migrateFafFile(projectPath, { force, json: true });
        const duration = Date.now() - startTime;

        return {
          success: result.success,
          data: result,
          duration
        };
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        return {
          success: false,
          error: isError(error) ? error.message : 'Migrate command failed',
          duration
        };
      }
    }

    // INNIT command - use bundled innit (British init)
    if (command === 'innit') {
      try {
        const pathArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
        const projectPath = pathArgs[0] || this.workingDirectory;
        const force = args.includes('--force');
        const result = await innitFafFile(projectPath, { force });
        const duration = Date.now() - startTime;

        return {
          success: result.success,
          data: result,
          duration
        };
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        return {
          success: false,
          error: isError(error) ? error.message : 'Innit command failed',
          duration
        };
      }
    }

    // QUICK command - use bundled quick
    if (command === 'quick') {
      try {
        const pathArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
        const projectPath = pathArgs[0] || this.workingDirectory;
        const input = pathArgs[1]; // optional input string
        const force = args.includes('--force');
        const json = args.includes('--json');
        const result = await quickCommand(projectPath, input, { force, json });
        const duration = Date.now() - startTime;

        return {
          success: result.success,
          data: result,
          duration
        };
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        return {
          success: false,
          error: isError(error) ? error.message : 'Quick command failed',
          duration
        };
      }
    }

    // ENHANCE command - use bundled enhance
    if (command === 'enhance') {
      try {
        const pathArgs = args.filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
        const projectPath = pathArgs[0] || this.workingDirectory;
        const autoFill = args.includes('--auto-fill');
        const interactive = args.includes('--interactive');
        const json = args.includes('--json');
        const result = await enhanceCommand(projectPath, { autoFill, interactive, json });
        const duration = Date.now() - startTime;

        return {
          success: result.success,
          data: result,
          duration
        };
      } catch (error: unknown) {
        const duration = Date.now() - startTime;
        return {
          success: false,
          error: isError(error) ? error.message : 'Enhance command failed',
          duration
        };
      }
    }

    // ============================================================================
    // FALLBACK: Shell out to CLI for commands not yet bundled
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

  // Method to check if FAF CLI is available
  async checkHealth(): Promise<boolean> {
    try {
      const result = await this.callEngine('--version');
      return result.success;
    } catch {
      return false;
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

  // Auto-detect from file path (when file operations occur)
  updateWorkingDirectoryFromPath(filePath: string): void {
    const dir = path.dirname(filePath);
    if (dir && dir !== '/' && fs.existsSync(dir)) {
      // Only update if it's a real project directory
      if (dir.includes('Users') || dir.includes('home') || dir.includes('projects')) {
        this.workingDirectory = dir;
      }
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
