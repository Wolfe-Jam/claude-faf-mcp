import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';
import { isError, isDefined } from '../utils/type-guards.js';

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
  private timeout: number;
  private workingDirectory: string;

  constructor(enginePath: string = 'faf', timeout: number = 30000) {
    this.enginePath = enginePath;
    this.timeout = timeout;
    this.workingDirectory = this.findBestWorkingDirectory();
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

    // Priority 3: Check common project locations
    const homeDir = process.env.HOME ?? process.env.USERPROFILE;
    if (homeDir) {
      // Check for common project directories
      const projectPaths = [
        path.join(homeDir, 'projects'),
        path.join(homeDir, 'Projects'),
        path.join(homeDir, 'dev'),
        path.join(homeDir, 'Dev'),
        path.join(homeDir, 'workspace'),
        path.join(homeDir, 'FAF'),
        homeDir
      ];

      for (const projPath of projectPaths) {
        if (fs.existsSync(projPath)) {
          try {
            const testFile = path.join(projPath, '.faf-test-write');
            fs.writeFileSync(testFile, 'test');
            fs.unlinkSync(testFile);
            return projPath;
          } catch {
            // Not writable, continue
          }
        }
      }
    }

    // Priority 4: Current directory if not root
    const currentDir = process.cwd();
    if (currentDir !== '/' && fs.existsSync(currentDir)) {
      try {
        const testFile = path.join(currentDir, '.faf-test-write');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        return currentDir;
      } catch {
        // Not writable
      }
    }

    // Fall back to home or temp
    return homeDir ?? '/tmp';
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

    // Sanitize arguments to prevent injection
    const sanitizedArgs = args.map(arg => 
      typeof arg === 'string' ? arg.replace(/[;&|`$(){}[\]]/g, '') : ''
    );
    
    try {
      // Try to use the enginePath as provided (could be 'faf' for global install or a full path)
      let fullCommand: string;
      
      if (this.enginePath === 'faf' || !this.enginePath.includes('/')) {
        // Global FAF CLI command
        fullCommand = `${this.enginePath} ${command} ${sanitizedArgs.join(' ')}`;
      } else {
        // Specific path to FAF CLI
        if (this.enginePath.endsWith('.js')) {
          fullCommand = `node ${this.enginePath} ${command} ${sanitizedArgs.join(' ')}`;
        } else {
          fullCommand = `${this.enginePath} ${command} ${sanitizedArgs.join(' ')}`;
        }
      }
      
      const { stdout, stderr } = await execAsync(fullCommand, {
        env: getEnhancedEnv(),
        timeout: this.timeout,
        maxBuffer: 1024 * 1024, // 1MB buffer limit
        cwd: this.workingDirectory
      });
      
      const duration = Date.now() - startTime;
      
      if (stderr?.trim()) {
        console.warn(`FAF engine warning: ${stderr.trim()}`);
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
            errorMessage = `FAF CLI not found. Please ensure 'faf' is installed and accessible. Path: ${this.enginePath}`;
          }
        }
        
        // Handle signal termination
        if ('signal' in error && error.signal === 'SIGTERM') {
          errorMessage = 'Command was terminated';
        }
      }
      
      console.error(`FAF engine error: ${errorMessage}`);
      
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
}
