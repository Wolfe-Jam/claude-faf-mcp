/**
 * 🇬🇧 faf innit - British Init Command (Mk3 Bundled)
 * "Innit bruv" - Initialize with style
 */

import { initFafFile, type InitOptions, type InitResult } from './init';

export type { InitOptions, InitResult };

export async function innitFafFile(projectPath?: string, options: InitOptions = {}): Promise<InitResult> {
  // Just delegate to init - same functionality, British flavor
  return initFafFile(projectPath, options);
}
