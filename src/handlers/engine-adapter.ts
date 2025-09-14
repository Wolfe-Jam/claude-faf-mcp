import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

// Enhanced PATH for FAF CLI discovery
const getEnhancedEnv = (): NodeJS.ProcessEnv => ({
  ...process.env,
  PATH: [
    '/usr/local/bin',
    '/opt/homebrew/bin',
    process.env.HOME + '/.npm/bin',
    process.env.HOME + '/.npm-global/bin',
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
    // Try to find the most appropriate directory for FAF operations
    const currentDir = process.cwd();
    const homeDir = process.env.HOME;
    
    // Check if current directory has .faf or is writable
    if (fs.existsSync(path.join(currentDir, '.faf'))) {
      return currentDir;
    }
    
    // Check if current directory is writable
    try {
      const testFile = path.join(currentDir, '.faf-test-write');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
      return currentDir;
    } catch {
      // Current directory not writable, try home directory
      if (homeDir && fs.existsSync(homeDir)) {
        try {
          const testFile = path.join(homeDir, '.faf-test-write');
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
          return homeDir;
        } catch {
          // Fall back to /tmp
          return '/tmp';
        }
      }
      return '/tmp';
    }
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
      
      if (stderr && stderr.trim()) {
        console.warn(`FAF engine warning: ${stderr.trim()}`);
      }
      
      return {
        success: true,
        data: this.parseOutput(stdout),
        duration
      };
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      let errorMessage = error.message;
      if (error.code === 'ETIMEDOUT') {
        errorMessage = `Command timed out after ${this.timeout}ms`;
      } else if (error.signal === 'SIGTERM') {
        errorMessage = 'Command was terminated';
      } else if (error.code === 'ENOENT') {
        errorMessage = `FAF CLI not found. Please ensure 'faf' is installed and accessible. Path: ${this.enginePath}`;
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
  
  // Get the engine path being used
  getEnginePath(): string {
    return this.enginePath;
  }
}
