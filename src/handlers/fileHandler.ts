// claude-faf-mcp/src/handlers/fileHandler.ts
// faf_read — read a file inside the active project (plus FAF_ALLOWED_ROOTS).
// faf_write was retired in 6.0.0.

import * as fs from 'fs/promises';
import * as path from 'path';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { confineFileOp, PathConfinementError } from '../utils/safe-path';

/**
 * Size guard for faf_read.
 */
export class PathValidator {
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

  static async checkFileSize(filePath: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const stats = await fs.stat(filePath);
      if (stats.size > this.MAX_FILE_SIZE) {
        return {
          valid: false,
          error: `File too large: ${(stats.size / 1024 / 1024).toFixed(2)}MB (max: 50MB)`
        };
      }
      return { valid: true };
    } catch (_error: unknown) {
      // Missing file: the read itself reports it
      return { valid: true };
    }
  }
}

/** Where faf_read may read: the roots (the active project plus FAF_ALLOWED_ROOTS,
 *  never home or '/') and the folder a relative path resolves against. */
export interface FileOpContext {
  roots: string[];
  base: string;
}

/**
 * Handle faf_read tool execution
 */
export async function handleFafRead(args: any, ctx: FileOpContext): Promise<CallToolResult> {
  const startTime = Date.now();

  try {
    const rawPath = args?.path;

    // Confine to the active project (and FAF_ALLOWED_ROOTS) — any file type, no
    // escape to /etc, ~/.ssh, a temp folder or via ../ traversal (CWE-22). A
    // relative path resolves against the active project. Returns the
    // symlink-canonical path.
    let filePath: string;
    try {
      filePath = confineFileOp(rawPath, ctx);
    } catch (err) {
      if (err instanceof PathConfinementError) {
        return {
          content: [{ type: 'text', text: `❌ Security error: ${err.message}` }],
          isError: true,
        };
      }
      throw err;
    }

    // Check file size
    const sizeValidation = await PathValidator.checkFileSize(filePath);
    if (!sizeValidation.valid) {
      return {
        content: [{
          type: 'text',
          text: `❌ ${sizeValidation.error}`
        }],
        isError: true
      };
    }
    
    // Read file with timeout
    const content = await Promise.race([
      fs.readFile(filePath, 'utf8'),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Read timeout (30s)')), 30000)
      )
    ]);
    
    const duration = Date.now() - startTime;
    const stats = await fs.stat(filePath);
    
    // Result metadata goes in `_meta` (MCP's reserved key), never a
    // top-level key the protocol does not define.
    return {
      content: [{
        type: 'text',
        text: content
      }],
      _meta: {
        duration_ms: duration,
        file_size: stats.size,
        file_path: path.resolve(filePath),
      }
    };
    
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to read file: ${error.message}`
      }],
      isError: true
    };
  }
}

// Export handlers
export const fileHandlers = {
  faf_read: handleFafRead
};
