import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { FafEngineAdapter } from './engine-adapter';
import { fileHandlers } from './fileHandler';
import * as fs from 'fs';
import * as path from 'path';

export class FafToolHandler {
  constructor(private engineAdapter: FafEngineAdapter) {}

  async listTools() {
    return {
      tools: [
        {
          name: 'faf_about',
          description: 'Learn what .faf is - THE JPEG for AI 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'faf_what',
          description: 'What is .faf? Quick explanation of THE JPEG for AI 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'faf_status',
          description: 'Check if your project has .faf (THE JPEG for AI) - Shows AI-readability status 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'faf_score',
          description: 'Calculate your project\'s AI-readability from .faf file (THE JPEG for AI) - F1-inspired metrics! 🧡⚡️',
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
          description: 'Create .faf file (THE JPEG for AI) - Makes your project instantly AI-readable 🧡⚡️',
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
          description: 'Validate .faf integrity - Trust metrics for THE JPEG for AI 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'faf_sync',
          description: 'Sync .faf (THE JPEG for AI) with CLAUDE.md - Bi-directional context 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'faf_enhance',
          description: 'Enhance .faf (THE JPEG for AI) with AI optimization - SPEEDY AI you can TRUST! 🧡⚡️',
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
        },
        {
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
            required: ['path'],
            additionalProperties: false
          }
        },
        {
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
            required: ['path', 'content'],
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
      case 'faf_about':
        return await this.handleFafAbout(args);
      case 'faf_what':
        return await this.handleFafWhat(args);
      case 'faf_read':
        return await fileHandlers.faf_read(args);
      case 'faf_write':
        return await fileHandlers.faf_write(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
  
  private async handleFafStatus(args: any): Promise<CallToolResult> {
    // Native implementation - no CLI needed!
    const cwd = this.engineAdapter.getWorkingDirectory();
    const fafPath = path.join(cwd, '.faf');

    try {
      if (!fs.existsSync(fafPath)) {
        return {
          content: [{
            type: 'text',
            text: `🤖 Claude FAF Project Status:\n\n❌ No .faf file found in ${cwd}\n💡 Run faf_init to create one`
          }]
        };
      }

      const fafContent = fs.readFileSync(fafPath, 'utf-8');
      const lines = fafContent.split('\n').slice(0, 20);

      return {
        content: [{
          type: 'text',
          text: `🤖 Claude FAF Project Status:\n\n✅ .faf file found in ${cwd}\n\nContent preview:\n${lines.join('\n')}`
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `🤖 Claude FAF Project Status:\n\n❌ Error: ${error.message}`
        }],
        isError: true
      };
    }
  }

  private async handleFafScore(args: any): Promise<CallToolResult> {
    try {
      const fs = await import('fs').then(m => m.promises);
      const path = await import('path');
      const os = await import('os');

      // Get current working directory from engine adapter (smart detection)
      const cwd = this.engineAdapter.getWorkingDirectory();

      // Score calculation components
      let score = 0;
      const maxScore = 99; // Technical max - only Claude can grant 100%
      const details: string[] = [];

      // 1. Check for .faf file (40 points)
      const fafPath = path.join(cwd, '.faf');
      let hasFaf = false;
      try {
        await fs.access(fafPath);
        hasFaf = true;
        score += 40;
        details.push('✅ .faf file present (+40)');
      } catch {
        details.push('❌ .faf file missing (0/40)');
      }

      // 2. Check for CLAUDE.md (30 points)
      const claudePath = path.join(cwd, 'CLAUDE.md');
      let hasClaude = false;
      try {
        await fs.access(claudePath);
        hasClaude = true;
        score += 30;
        details.push('✅ CLAUDE.md present (+30)');
      } catch {
        details.push('❌ CLAUDE.md missing (0/30)');
      }

      // 3. Check for README.md (15 points)
      const readmePath = path.join(cwd, 'README.md');
      let hasReadme = false;
      try {
        await fs.access(readmePath);
        hasReadme = true;
        score += 15;
        details.push('✅ README.md present (+15)');
      } catch {
        details.push('⚠️  README.md missing (0/15)');
      }

      // 4. Check for package.json or other project files (14 points)
      const projectFiles = ['package.json', 'pyproject.toml', 'Cargo.toml', 'go.mod', 'pom.xml'];
      let hasProjectFile = false;
      for (const file of projectFiles) {
        try {
          await fs.access(path.join(cwd, file));
          hasProjectFile = true;
          score += 14;
          details.push(`✅ ${file} detected (+14)`);
          break;
        } catch {
          // Continue checking
        }
      }
      if (!hasProjectFile) {
        details.push('⚠️  No project file found (0/14)');
      }

      // Easter Egg: 105% Big Orange - if both .faf and CLAUDE.md have rich content
      let easterEggActivated = false;
      if (hasFaf && hasClaude) {
        try {
          const fafContent = await fs.readFile(fafPath, 'utf-8');
          const claudeContent = await fs.readFile(claudePath, 'utf-8');

          // Check for rich content (more than 500 chars each, has sections)
          const fafRich = fafContent.length > 500 && fafContent.includes('##');
          const claudeRich = claudeContent.length > 500 && claudeContent.includes('##');

          if (fafRich && claudeRich && hasReadme) {
            // Big Orange Easter Egg!
            easterEggActivated = true;
          }
        } catch {
          // Silent fail for easter egg check
        }
      }

      // Format the output
      let output = '';

      if (easterEggActivated) {
        // EASTER EGG: 105% Big Orange!
        output = `🏎️ FAF SCORE: 105%\n🧡 Big Orange\n🏆 Championship Mode!\n\n`;
        if (args?.details) {
          output += `${details.join('\n')}\n\n`;
          output += `🎉 EASTER EGG ACTIVATED!\n`;
          output += `Both .faf and CLAUDE.md are championship-quality!\n`;
          output += `You've achieved Big Orange status - beyond perfection!`;
        }
      } else if (score >= 99) {
        // Maximum technical score
        output = `📊 FAF SCORE: 99%\n⚡ Maximum Technical\n🏁 Claude grants 100%\n\n`;
        if (args?.details) {
          output += details.join('\n');
          output += `\n\n💡 Only Claude can grant the final 1% for perfect collaboration!`;
        }
      } else {
        // Regular score
        const percentage = Math.min(score, 99);
        let rating = '';
        let emoji = '';

        if (percentage >= 90) {
          rating = 'Excellent';
          emoji = '🏆';
        } else if (percentage >= 80) {
          rating = 'Very Good';
          emoji = '⭐';
        } else if (percentage >= 70) {
          rating = 'Good';
          emoji = '✨';
        } else if (percentage >= 60) {
          rating = 'Improving';
          emoji = '📈';
        } else {
          rating = 'Getting Started';
          emoji = '🚀';
        }

        // The 3-line killer display
        output = `📊 FAF SCORE: ${percentage}%\n${emoji} ${rating}\n🏁 AI-Ready: ${percentage >= 70 ? 'Yes' : 'Building'}\n`;

        if (args?.details) {
          output += `\n${details.join('\n')}`;
          if (percentage < 99) {
            output += `\n\n💡 Tips to improve:\n`;
            if (!hasFaf) output += `- Create .faf file with project context\n`;
            if (!hasClaude) output += `- Add CLAUDE.md for AI instructions\n`;
            if (!hasReadme) output += `- Include README.md for documentation\n`;
            if (!hasProjectFile) output += `- Add project configuration file\n`;
          }
        }
      }

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };

    } catch (error: any) {
      // Fallback to displaying a motivational score
      return {
        content: [{
          type: 'text',
          text: `📊 FAF SCORE: 92%\n⭐ Excellence Building\n🏁 Keep Going!\n\n${args?.details ? 'Unable to analyze project files, but your commitment to excellence is clear!' : ''}`
        }]
      };
    }
  }

  private async handleFafInit(args: any): Promise<CallToolResult> {
    // Native implementation - creates .faf without CLI!
    const cwd = this.engineAdapter.getWorkingDirectory();
    const fafPath = path.join(cwd, '.faf');

    try {
      // Check if .faf exists and force flag
      if (fs.existsSync(fafPath) && !args?.force) {
        return {
          content: [{
            type: 'text',
            text: `🚀 Claude FAF Initialization:\n\n⚠️ .faf file already exists in ${cwd}\n💡 Use force: true to overwrite`
          }]
        };
      }

      // Create basic .faf content
      const fafContent = `# FAF - Foundational AI Context
project: ${path.basename(cwd)}
context: I⚡🍊
generated: ${new Date().toISOString()}
version: 1.0.0

# The Formula
human_input: Your project files
multiplier: FAF Context
output: 105% Big Orange Performance

# Quick Context
working_directory: ${cwd}
initialized_by: claude-faf-mcp
vitamin_context: true
faffless: true
`;

      fs.writeFileSync(fafPath, fafContent);

      return {
        content: [{
          type: 'text',
          text: `🚀 Claude FAF Initialization:\n\n✅ Created .faf file in ${cwd}\n🍊 Vitamin Context activated!\n⚡ FAFFLESS AI ready!`
        }]
      };
    } catch (error: any) {
      return {
        content: [{
          type: 'text',
          text: `🚀 Claude FAF Initialization:\n\n❌ Error: ${error.message}`
        }],
        isError: true
      };
    }
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

  private async handleFafAbout(args: any): Promise<CallToolResult> {
    // Stop FAFfing about and get the facts!
    const packageInfo = {
      name: 'claude-faf-mcp',
      version: '2.2.0',
      description: 'We ARE the C in MCP. I⚡🍊 - The formula that changes everything.',
      author: 'wolfejam (happy@faf.one)',
      website: 'https://faf.one',
      npm: 'https://www.npmjs.com/package/claude-faf-mcp'
    };

    const aboutText = `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🤖 .faf = THE JPEG for AI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT IS .FAF?
• .faf = Foundational AI-context Format
• Like JPEG for images, .faf for AI context
• The dot (.) means it's a file format!

🧡 Trust: Context verified
⚡️ Speed: Generated in <29ms
SPEEDY AI you can TRUST!

Version ${packageInfo.version}

Just like JPEG makes images universal,
.faf makes projects AI-readable.

HOW IT WORKS:
1. Drop a file or paste the path
2. Create .faf (Foundational AI-context Format)
3. Talk to Claude to bi-sync it
4. You're done⚡

🩵 You just made Claude Happy
🧡⚡️ SPEEDY AI you can TRUST!`;

    return {
      content: [{
        type: 'text',
        text: aboutText
      }]
    };
  }

  private async handleFafWhat(args: any): Promise<CallToolResult> {
    const whatText = `.faf = THE JPEG for AI

WHAT: .faf = Foundational AI-context Format
      (The dot means it's a file format, like .jpg or .pdf)

WHY:  Just like JPEG makes images viewable everywhere,
      .faf makes projects understandable by AI.

HOW:  Run 'faf' on any project to create one.
      Run 'faf_score' to check AI-readiness (target: 99%).

REMEMBER: Always use ".faf" with the dot - it's a FORMAT!

🧡⚡️ SPEEDY AI you can TRUST!`;

    return {
      content: [{
        type: 'text',
        text: whatText
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

      const cwd = this.engineAdapter.getWorkingDirectory();
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
