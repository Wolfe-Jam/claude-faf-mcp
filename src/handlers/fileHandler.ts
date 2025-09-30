// claude-faf-mcp/src/handlers/fileHandler.ts
// 🏎️ FAF File Operations - Production Ready Implementation

import * as fs from 'fs/promises';
import * as path from 'path';
import { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Security validator for file paths
 */
export class PathValidator {
  private static readonly FORBIDDEN_PATHS = ['/etc', '/sys', '/proc', '/private/etc'];
  private static readonly MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  
  static validate(filePath: string): { valid: boolean; error?: string } {
    // Normalize and resolve path
    const normalized = path.normalize(filePath);
    const resolved = path.resolve(filePath);
    
    // Check for path traversal
    if (normalized.includes('..')) {
      return { valid: false, error: 'Path traversal detected' };
    }
    
    // Check forbidden paths
    for (const forbidden of this.FORBIDDEN_PATHS) {
      if (resolved.startsWith(forbidden)) {
        return { valid: false, error: `Access to ${forbidden} is forbidden` };
      }
    }
    
    return { valid: true };
  }
  
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
      // File doesn't exist yet (for write operations)
      return { valid: true };
    }
  }
}

/**
 * FAF Read Tool Definition
 */
export const fafReadTool: Tool = {
  name: 'faf_read',
  description: 'Read content from any file on the local filesystem',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute or relative file path to read'
      }
    },
    required: ['path']
  }
};

/**
 * FAF Write Tool Definition
 */
export const fafWriteTool: Tool = {
  name: 'faf_write',
  description: 'Write content to any file on the local filesystem',
  inputSchema: {
    type: 'object',
    properties: {
      path: {
        type: 'string',
        description: 'Absolute or relative file path to write'
      },
      content: {
        type: 'string',
        description: 'Content to write to the file'
      }
    },
    required: ['path', 'content']
  }
};

/**
 * Handle faf_read tool execution
 */
export async function handleFafRead(args: any): Promise<CallToolResult> {
  const startTime = Date.now();
  
  try {
    const { path: filePath } = args;
    
    // Validate path
    const pathValidation = PathValidator.validate(filePath);
    if (!pathValidation.valid) {
      return {
        content: [{
          type: 'text',
          text: `❌ Security error: ${pathValidation.error}`
        }],
        isError: true
      };
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
    
    return {
      content: [{
        type: 'text',
        text: content
      }],
      metadata: {
        duration_ms: duration,
        file_size: stats.size,
        file_path: path.resolve(filePath),
        message: `✅ Read ${stats.size} bytes in ${duration}ms`
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

/**
 * Handle faf_write tool execution
 */
export async function handleFafWrite(args: any): Promise<CallToolResult> {
  const startTime = Date.now();
  
  try {
    const { path: filePath, content } = args;
    
    // Validate path
    const pathValidation = PathValidator.validate(filePath);
    if (!pathValidation.valid) {
      return {
        content: [{
          type: 'text',
          text: `❌ Security error: ${pathValidation.error}`
        }],
        isError: true
      };
    }
    
    // Check content size
    const contentSize = Buffer.byteLength(content, 'utf8');
    if (contentSize > 50 * 1024 * 1024) {
      return {
        content: [{
          type: 'text',
          text: `❌ Content too large: ${(contentSize / 1024 / 1024).toFixed(2)}MB (max: 50MB)`
        }],
        isError: true
      };
    }
    
    // Create directory if needed
    const dir = path.dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Write file with timeout
    await Promise.race([
      fs.writeFile(filePath, content, 'utf8'),
      new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Write timeout (30s)')), 30000)
      )
    ]);
    
    const duration = Date.now() - startTime;
    
    return {
      content: [{
        type: 'text',
        text: `✅ Successfully wrote ${contentSize} bytes to ${path.resolve(filePath)}`
      }],
      metadata: {
        duration_ms: duration,
        bytes_written: contentSize,
        file_path: path.resolve(filePath),
        message: `✅ Write completed in ${duration}ms`
      }
    };
    
  } catch (error: any) {
    return {
      content: [{
        type: 'text',
        text: `❌ Failed to write file: ${error.message}`
      }],
      isError: true
    };
  }
}

// Export handlers
export const fileHandlers = {
  faf_read: handleFafRead,
  faf_write: handleFafWrite
};
