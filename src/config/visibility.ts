/**
 * 🏎️ FAF Tool Visibility Configuration - v2.8.0
 * Controls which tools are visible (core vs all)
 * Championship-grade configuration management
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface VisibilityConfig {
  showAdvanced: boolean;
  source: 'env' | 'flag' | 'config' | 'default';
}

export interface FafConfig {
  showAdvanced?: boolean;
  [key: string]: unknown;
}

/**
 * Get visibility configuration from multiple sources
 * Priority: ENV var > config file > default
 */
export function getVisibilityConfig(): VisibilityConfig {
  // 1. Check ENV: FAF_MCP_SHOW_ADVANCED=true
  if (process.env.FAF_MCP_SHOW_ADVANCED === 'true') {
    return { showAdvanced: true, source: 'env' };
  }

  // 2. Check config file: ~/.fafrc or .fafrc
  const configFile = readConfigFile();
  if (configFile?.showAdvanced === true) {
    return { showAdvanced: true, source: 'config' };
  }

  // 3. Default: core only (changed from "show all" to align with spec)
  // NOTE: For backward compatibility during transition, you may want to
  // temporarily set default to `true` and notify users to update config
  return { showAdvanced: false, source: 'default' };
}

/**
 * Read configuration from .fafrc file
 * Checks multiple locations:
 * 1. ~/.fafrc (home directory)
 * 2. ./.fafrc (current working directory)
 */
export function readConfigFile(): FafConfig | null {
  const configPaths = [
    path.join(os.homedir(), '.fafrc'),
    path.join(process.cwd(), '.fafrc'),
  ];

  for (const configPath of configPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');

        // Support both JSON and simple key=value format
        if (content.trim().startsWith('{')) {
          // JSON format
          return JSON.parse(content) as FafConfig;
        } else {
          // Simple key=value format
          const config: FafConfig = {};
          const lines = content.split('\n');

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;

            const [key, value] = trimmed.split('=').map((s) => s.trim());
            if (key === 'showAdvanced' || key === 'FAF_SHOW_ADVANCED') {
              config.showAdvanced = value === 'true';
            }
          }

          return config;
        }
      }
    } catch (error) {
      // Silently ignore config file errors - graceful degradation
      // Config file is optional, errors are non-critical
    }
  }

  return null;
}

/**
 * Write configuration to ~/.fafrc file
 */
export function writeConfigFile(config: FafConfig): boolean {
  const configPath = path.join(os.homedir(), '.fafrc');

  try {
    const content = JSON.stringify(config, null, 2);
    fs.writeFileSync(configPath, content, 'utf-8');
    return true;
  } catch (error) {
    // Silent failure - config file write is optional
    return false;
  }
}

/**
 * Enable advanced tools
 */
export function enableAdvancedTools(): boolean {
  const config = readConfigFile() || {};
  config.showAdvanced = true;
  return writeConfigFile(config);
}

/**
 * Disable advanced tools (show core only)
 */
export function disableAdvancedTools(): boolean {
  const config = readConfigFile() || {};
  config.showAdvanced = false;
  return writeConfigFile(config);
}

/**
 * Get current tool visibility status (for logging)
 */
export function getVisibilityStatus(): string {
  const config = getVisibilityConfig();
  const toolCount = config.showAdvanced ? '51 (ALL)' : '20 (CORE)';
  const sourceEmoji = {
    env: '🌍',
    flag: '🚩',
    config: '⚙️',
    default: '🏁',
  };

  return `${sourceEmoji[config.source]} ${toolCount} tools via ${config.source.toUpperCase()}`;
}
