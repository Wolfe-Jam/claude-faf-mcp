import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * CLI Path Detection for Claude Desktop Sandbox
 *
 * Claude Desktop MCP runs in a sandboxed environment with limited PATH.
 * This utility detects the faf CLI using absolute paths.
 */

export interface CliDetectionResult {
  found: boolean;
  path?: string;
  version?: string;
  method?: string;
}

/**
 * Get common CLI installation paths based on platform and package manager
 */
function getCommonCliPaths(): string[] {
  const homeDir = os.homedir();
  const platform = os.platform();

  const paths: string[] = [];

  // Homebrew paths (macOS/Linux)
  if (platform === 'darwin') {
    paths.push('/opt/homebrew/bin/faf');      // Apple Silicon
    paths.push('/usr/local/bin/faf');         // Intel
    paths.push('/usr/local/Cellar/node@20/20.19.4/bin/faf'); // Node 20
    paths.push('/usr/local/Cellar/node/*/bin/faf'); // Any Node version
  } else {
    paths.push('/usr/local/bin/faf');
  }

  // npm global paths
  paths.push(path.join(homeDir, '.npm-global/bin/faf'));
  paths.push(path.join(homeDir, '.nvm/versions/node/*/bin/faf'));

  // Standard Unix paths
  paths.push('/usr/bin/faf');

  // Windows paths
  if (platform === 'win32') {
    const appData = process.env.APPDATA || path.join(homeDir, 'AppData', 'Roaming');
    paths.push(path.join(appData, 'npm/faf.cmd'));
    paths.push(path.join(appData, 'npm/faf'));
    paths.push('C:\\Program Files\\nodejs\\faf.cmd');
  }

  return paths;
}

/**
 * Expand glob patterns in paths
 * Example: /usr/local/Cellar/node/wildcard/bin/faf
 */
function expandGlobPath(globPath: string): string | null {
  if (!globPath.includes('*')) {
    return globPath;
  }

  try {
    const parts = globPath.split('/');
    const globIndex = parts.findIndex(p => p.includes('*'));

    if (globIndex === -1) return globPath;

    const basePath = parts.slice(0, globIndex).join('/');
    const pattern = parts[globIndex];
    const restPath = parts.slice(globIndex + 1).join('/');

    if (!fs.existsSync(basePath)) return null;

    const entries = fs.readdirSync(basePath);
    const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
    const matches = entries.filter(e => regex.test(e));

    if (matches.length === 0) return null;

    // Return first match
    const expanded = path.join(basePath, matches[0], restPath);
    return fs.existsSync(expanded) ? expanded : null;
  } catch {
    return null;
  }
}

/**
 * Try to detect CLI using 'which' command (works if PATH is set)
 */
function detectViaWhich(): string | null {
  try {
    const result = execSync('which faf', { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const cliPath = result.trim();
    if (cliPath && fs.existsSync(cliPath)) {
      return cliPath;
    }
  } catch {
    // which failed, PATH not set or faf not in PATH
  }
  return null;
}

/**
 * Try to detect CLI using 'command -v' (POSIX alternative to which)
 */
function detectViaCommand(): string | null {
  try {
    const result = execSync('command -v faf', {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore'],
      shell: '/bin/sh'
    });
    const cliPath = result.trim();
    if (cliPath && fs.existsSync(cliPath)) {
      return cliPath;
    }
  } catch {
    // command -v failed
  }
  return null;
}

/**
 * Get CLI version from path
 */
function getCliVersion(cliPath: string): string | undefined {
  try {
    const result = execSync(`"${cliPath}" --version`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'ignore']
    });
    return result.trim();
  } catch {
    return undefined;
  }
}

/**
 * Detect faf CLI location with multiple fallback strategies
 */
export function detectFafCli(): CliDetectionResult {
  // 1. Check environment variable override
  if (process.env.FAF_CLI_PATH) {
    const envPath = process.env.FAF_CLI_PATH;
    if (fs.existsSync(envPath)) {
      return {
        found: true,
        path: envPath,
        version: getCliVersion(envPath),
        method: 'env:FAF_CLI_PATH'
      };
    }
  }

  // 2. Try 'which' command (works if PATH is set)
  const whichPath = detectViaWhich();
  if (whichPath) {
    return {
      found: true,
      path: whichPath,
      version: getCliVersion(whichPath),
      method: 'which'
    };
  }

  // 3. Try 'command -v' (POSIX)
  const commandPath = detectViaCommand();
  if (commandPath) {
    return {
      found: true,
      path: commandPath,
      version: getCliVersion(commandPath),
      method: 'command'
    };
  }

  // 4. Check common installation paths
  const commonPaths = getCommonCliPaths();
  for (const cliPath of commonPaths) {
    const expanded = expandGlobPath(cliPath);
    if (expanded && fs.existsSync(expanded)) {
      return {
        found: true,
        path: expanded,
        version: getCliVersion(expanded),
        method: 'common-path'
      };
    }
  }

  // 5. Not found
  return {
    found: false,
    method: 'none'
  };
}

/**
 * Validate CLI meets minimum version requirement
 */
export function validateCliVersion(version: string, minVersion: string = '3.1.1'): boolean {
  try {
    const parse = (v: string) => v.split('.').map(Number);
    const current = parse(version);
    const required = parse(minVersion);

    for (let i = 0; i < 3; i++) {
      if (current[i] > required[i]) return true;
      if (current[i] < required[i]) return false;
    }
    return true; // Equal versions
  } catch {
    return false;
  }
}
