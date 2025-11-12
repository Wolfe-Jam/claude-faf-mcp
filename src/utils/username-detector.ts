/**
 * 🔍 Username & Home Directory Detection
 *
 * Cross-platform detection of current user and home directory
 * for Projects convention path resolution.
 */

import * as os from 'os';

export interface UserInfo {
  username: string;
  homeDir: string;
  platform: 'darwin' | 'linux' | 'win32' | 'unknown';
}

/**
 * Detect current user information
 */
export function detectUser(): UserInfo {
  const userInfo = os.userInfo();
  const platform = os.platform();

  return {
    username: userInfo.username,
    homeDir: os.homedir(),
    platform: platform === 'darwin' ? 'darwin' :
             platform === 'linux' ? 'linux' :
             platform === 'win32' ? 'win32' : 'unknown'
  };
}

/**
 * Get platform-specific home directory notation
 */
export function getHomeDirNotation(): string {
  const platform = os.platform();

  if (platform === 'win32') {
    return process.env.USERPROFILE || os.homedir();
  }

  return '~'; // Unix-like systems
}

/**
 * Expand ~ to full home directory path
 */
export function expandTilde(inputPath: string): string {
  if (inputPath.startsWith('~')) {
    return inputPath.replace('~', os.homedir());
  }
  return inputPath;
}

/**
 * Contract full home directory path to ~
 */
export function contractToTilde(fullPath: string): string {
  const homeDir = os.homedir();
  if (fullPath.startsWith(homeDir)) {
    return fullPath.replace(homeDir, '~');
  }
  return fullPath;
}
