import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { FafEngineAdapter } from './engine-adapter';

export class FafToolHandler {
  constructor(private engineAdapter: FafEngineAdapter) {}

  async listTools() {
    return {
      tools: [
        {
          name: 'faf_status',
          description: 'Get comprehensive project status including context quality, AI readiness, and Claude collaboration metrics',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'faf_score',
          description: 'Calculate your project\'s AI collaboration score with detailed breakdown and Claude-specific optimizations',
          inputSchema: {
            type: 'object',
            properties: {
              details: { type: 'boolean', description: 'Include detailed breakdown and improvement suggestions' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_init',
          description: 'Initialize FAF context for your project with intelligent stack detection and Claude optimization',
          inputSchema: {
            type: 'object',
            properties: {
              force: { type: 'boolean', description: 'Force reinitialize existing FAF context' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_trust',
          description: 'Validate FAF context integrity and show trust metrics for confident Claude collaboration',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'faf_sync',
          description: 'Synchronize .faf context with claude.md for seamless bi-directional context sharing',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'faf_enhance',
          description: 'Claude-optimized AI enhancement with multi-model compatibility and context optimization',
          inputSchema: {
            type: 'object',
            properties: {
              model: { type: 'string', description: 'Target AI model: claude|chatgpt|gemini|universal (default: claude)' },
              focus: { type: 'string', description: 'Enhancement focus: claude-optimal|human-context|ai-instructions|completeness' },
              consensus: { type: 'boolean', description: 'Build consensus from multiple AI models' },
              dryRun: { type: 'boolean', description: 'Preview enhancement without applying changes' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_bi_sync',
          description: 'Bi-directional sync between .faf context and claude.md for persistent Claude collaboration',
          inputSchema: {
            type: 'object',
            properties: {
              auto: { type: 'boolean', description: 'Enable automatic synchronization' },
              watch: { type: 'boolean', description: 'Start real-time file watching for changes' },
              force: { type: 'boolean', description: 'Force overwrite conflicting changes' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_clear',
          description: 'Clear caches, temporary files, and reset FAF state for a fresh start',
          inputSchema: {
            type: 'object',
            properties: {
              cache: { type: 'boolean', description: 'Clear trust cache only' },
              todos: { type: 'boolean', description: 'Clear todo lists only' },
              backups: { type: 'boolean', description: 'Clear backup files only' },
              all: { type: 'boolean', description: 'Clear everything (default)' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_debug',
          description: 'Debug Claude FAF MCP environment - show working directory, permissions, and FAF CLI status',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        }
      ] as Tool[]
    };
  }

  async callTool(name: string, args: any): Promise<CallToolResult> {
    // Input validation
    if (!name || typeof name !== 'string') {
      throw new Error('Tool name must be a non-empty string');
    }
    
    switch (name) {
      case 'faf_status':
        return await this.handleFafStatus(args);
      case 'faf_score':
        return await this.handleFafScore(args);
      case 'faf_init':
        return await this.handleFafInit(args);
      case 'faf_trust':
        return await this.handleFafTrust(args);
      case 'faf_sync':
        return await this.handleFafSync(args);
      case 'faf_enhance':
        return await this.handleFafEnhance(args);
      case 'faf_bi_sync':
        return await this.handleFafBiSync(args);
      case 'faf_clear':
        return await this.handleFafClear(args);
      case 'faf_debug':
        return await this.handleFafDebug(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
  
  private async handleFafStatus(args: any): Promise<CallToolResult> {
    const result = await this.engineAdapter.callEngine('status');
    
    if (!result.success) {
      return {
        content: [{
          type: 'text',
          text: `🤖 Claude FAF Project Status:\n\nFailed to get status: ${result.error}`
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: 'text',
        text: `🤖 Claude FAF Project Status:\n\n${result.data?.output || result.data}`
      }]
    };
  }

  private async handleFafScore(args: any): Promise<CallToolResult> {
    const scoreArgs = args?.details ? ['--details'] : [];
    const result = await this.engineAdapter.callEngine('score', scoreArgs);
    
    if (!result.success) {
      return {
        content: [{
          type: 'text',
          text: `📈 Claude AI Collaboration Score:\n\nFailed to calculate score: ${result.error}`
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: 'text',
        text: `📈 Claude AI Collaboration Score:\n\n${result.data?.output || result.data}`
      }]
    };
  }

  private async handleFafInit(args: any): Promise<CallToolResult> {
    const initArgs = args?.force ? ['--force'] : [];
    const result = await this.engineAdapter.callEngine('init', initArgs);
    
    if (!result.success) {
      return {
        content: [{
          type: 'text',
          text: `🚀 Claude FAF Initialization:\n\nFailed to initialize: ${result.error}`
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: 'text',
        text: `🚀 Claude FAF Initialization:\n\n${result.data?.output || result.data}`
      }]
    };
  }

  private async handleFafTrust(args: any): Promise<CallToolResult> {
    const result = await this.engineAdapter.callEngine('trust');
    
    if (!result.success) {
      return {
        content: [{
          type: 'text',
          text: `🔒 Claude FAF Trust Validation:\n\nFailed to check trust: ${result.error}`
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: 'text',
        text: `🔒 Claude FAF Trust Validation:\n\n${result.data?.output || result.data}`
      }]
    };
  }

  private async handleFafSync(args: any): Promise<CallToolResult> {
    const result = await this.engineAdapter.callEngine('sync');
    
    if (!result.success) {
      return {
        content: [{
          type: 'text',
          text: `🔄 Claude FAF Sync:\n\nFailed to sync: ${result.error}`
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: 'text',
        text: `🔄 Claude FAF Sync:\n\n${result.data?.output || result.data}`
      }]
    };
  }

  private async handleFafEnhance(args: any): Promise<CallToolResult> {
    const enhanceArgs: string[] = [];
    
    // Default to Claude optimization if no model specified
    const model = args?.model || 'claude';
    enhanceArgs.push('--model', model);
    
    if (args?.focus) {
      enhanceArgs.push('--focus', args.focus);
    }
    if (args?.consensus) {
      enhanceArgs.push('--consensus');
    }
    if (args?.dryRun) {
      enhanceArgs.push('--dry-run');
    }
    
    const result = await this.engineAdapter.callEngine('enhance', enhanceArgs);
    
    if (!result.success) {
      return {
        content: [{
          type: 'text',
          text: `🚀 Claude FAF Enhancement:\n\nFailed to enhance: ${result.error}`
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: 'text',
        text: `🚀 Claude FAF Enhancement:\n\n${result.data?.output || result.data}`
      }]
    };
  }

  private async handleFafBiSync(args: any): Promise<CallToolResult> {
    const biSyncArgs: string[] = [];
    
    if (args?.auto) {
      biSyncArgs.push('--auto');
    }
    if (args?.watch) {
      biSyncArgs.push('--watch');
    }
    if (args?.force) {
      biSyncArgs.push('--force');
    }
    
    const result = await this.engineAdapter.callEngine('bi-sync', biSyncArgs);
    
    if (!result.success) {
      return {
        content: [{
          type: 'text',
          text: `🔗 Claude FAF Bi-Sync:\n\nFailed to bi-sync: ${result.error}`
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: 'text',
        text: `🔗 Claude FAF Bi-Sync:\n\n${result.data?.output || result.data}`
      }]
    };
  }

  private async handleFafClear(args: any): Promise<CallToolResult> {
    const clearArgs: string[] = [];
    
    if (args?.cache) {
      clearArgs.push('--cache');
    }
    if (args?.todos) {
      clearArgs.push('--todos');
    }
    if (args?.backups) {
      clearArgs.push('--backups');
    }
    if (args?.all || (!args?.cache && !args?.todos && !args?.backups)) {
      clearArgs.push('--all');
    }
    
    const result = await this.engineAdapter.callEngine('clear', clearArgs);
    
    if (!result.success) {
      return {
        content: [{
          type: 'text',
          text: `🧹 Claude FAF Clear:\n\nFailed to clear: ${result.error}`
        }],
        isError: true
      };
    }

    return {
      content: [{
        type: 'text',
        text: `🧹 Claude FAF Clear:\n\n${result.data?.output || result.data}`
      }]
    };
  }

  private async handleFafDebug(args: any): Promise<CallToolResult> {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);
      
      const cwd = process.cwd();
      const debugInfo = {
        workingDirectory: cwd,
        canWrite: false,
        fafCliPath: null as string | null,
        fafVersion: null as string | null,
        permissions: {} as any,
        enginePath: this.engineAdapter.getEnginePath(),
        pathEnv: process.env.PATH?.split(':') || []
      };
      
      // Check write permissions
      try {
        const testFile = path.join(cwd, '.claude-faf-test');
        fs.writeFileSync(testFile, 'test');
        fs.unlinkSync(testFile);
        debugInfo.canWrite = true;
      } catch (error) {
        debugInfo.permissions.writeError = error instanceof Error ? error.message : String(error);
      }
      
      // Check FAF CLI availability
      try {
        const enginePath = this.engineAdapter.getEnginePath();
        let whichCmd = 'which faf';
        
        if (enginePath !== 'faf') {
          // Custom path provided
          debugInfo.fafCliPath = enginePath;
        } else {
          // Try to find global faf installation
          const whichResult = await execAsync(whichCmd);
          debugInfo.fafCliPath = whichResult.stdout.trim();
        }
        
        // Get FAF version using the engine adapter
        const healthCheck = await this.engineAdapter.checkHealth();
        if (healthCheck) {
          const versionResult = await this.engineAdapter.callEngine('--version');
          if (versionResult.success) {
            debugInfo.fafVersion = versionResult.data?.output || versionResult.data;
          }
        }
      } catch (error) {
        debugInfo.permissions.fafError = error instanceof Error ? error.message : String(error);
      }
      
      // Check for existing .faf file
      const fafFile = path.join(cwd, '.faf');
      const hasFafFile = fs.existsSync(fafFile);
      
      const debugOutput = `🔍 Claude FAF MCP Server Debug Information:

📂 Working Directory: ${debugInfo.workingDirectory}
✏️ Write Permissions: ${debugInfo.canWrite ? '✅ Yes' : '❌ No'}
${debugInfo.permissions.writeError ? `   Error: ${debugInfo.permissions.writeError}\n` : ''}🤖 FAF Engine Path: ${debugInfo.enginePath}
🏎️ FAF CLI Path: ${debugInfo.fafCliPath || '❌ Not found'}
📋 FAF Version: ${debugInfo.fafVersion || 'Unknown'}
${debugInfo.permissions.fafError ? `   FAF Error: ${debugInfo.permissions.fafError}\n` : ''}📄 .faf File: ${hasFafFile ? '✅ Exists' : '❌ Not found (run faf_init)'}
🛤️ System PATH: ${debugInfo.pathEnv.slice(0, 3).join(', ')}${debugInfo.pathEnv.length > 3 ? '...' : ''}

💡 Quick Start:
   1. If FAF CLI not found: npm install -g faf-cli
   2. If .faf file missing: use faf_init tool
   3. For optimization: use faf_enhance tool with model="claude"
`;
      
      return {
        content: [{
          type: 'text',
          text: debugOutput
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `🔍 Claude FAF Debug Failed: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }
}
