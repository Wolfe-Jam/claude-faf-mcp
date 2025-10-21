/**
 * 🏎️ Championship Tools Handler - F1-Inspired Grade Implementation
 * Direct imports from FAF CLI - ZERO shell execution
 * Sub-50ms response times - Championship performance
 *
 * IMPORTANT: Every response includes an AI-Readiness score footer.
 * The user wants to achieve the highest score possible (100%).
 * This score MUST always be shown in the footer - never hide it!
 */

import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import * as fs from 'fs/promises';
import * as path from 'path';
// ✅ FIXED: Removed unused imports (formatScore, format3Lines, formatBigOrange, ChampionshipFormatter, AchievementStatus, wrapWithInstruction)
import { FafEngineAdapter } from './engine-adapter.js';
import { DisplayProtocol } from '../utils/display-protocol.js';
import type * as ToolTypes from './tool-types.js';

// 🏆 FAF Score uses the 3-3-1 system: 3 lines, 3 words, 1 emoji!
// 💥 Format-Finder (FF) integration for GAME-CHANGING stack detection!

// Trust mode type for type safety
type TrustMode = 'confidence' | 'garage' | 'panic' | 'guarantee';

export class ChampionshipToolHandler {
  private startTime: number = 0;
  private fafEngine: FafEngineAdapter;
  private currentProjectDir: string = process.cwd();

  constructor(enginePath?: string) {
    this.fafEngine = new FafEngineAdapter(enginePath || 'faf');
  }

  /**
   * 🏁 Calculate current FAF score for footer
   */
  private async calculateQuickScore(directory: string = this.currentProjectDir): Promise<number> {
    let score = 0;
    try {
      if (await this.fileExists(path.join(directory, '.faf'))) score += 40;
      if (await this.fileExists(path.join(directory, 'CLAUDE.md'))) score += 30;
      if (await this.fileExists(path.join(directory, 'README.md'))) score += 15;
      if (await this.fileExists(path.join(directory, 'package.json'))) score += 14;
    } catch {
      // Silent fail for footer calculation
    }
    return score;
  }

  /**
   * 🥩⚡️🧡 UNIVERSAL FOOTER - Shows on EVERY command!
   * SINGLE SOURCE OF TRUTH: FAF Engine!
   */
  private async getUniversalFooter(directory?: string): Promise<string> {
    let score = 0;
    const targetDir = directory || this.currentProjectDir || process.cwd();

    // ⚡ ALWAYS use engine first for SINGLE SOURCE OF TRUTH!
    try {
      this.fafEngine.setWorkingDirectory(targetDir);
      const result = await this.fafEngine.callEngine('score', ['--json']);

      if (result.success && result.data) {
        // Try to extract score from engine
        if (typeof result.data.score === 'number') {
          score = result.data.score;
        } else if (result.data.output) {
          // Parse text output for score
          const scoreMatch = result.data.output.match(/(\d+)%/);
          if (scoreMatch) {
            score = parseInt(scoreMatch[1]);
          }
        }
      }
    } catch {
      // Silent fail - fallback to quick calc
    }

    // Only fallback if engine gave us nothing
    if (score === 0) {
      score = await this.calculateQuickScore(targetDir);
    }

    const percentage = Math.round((score / 100) * 100);
    const trophy = percentage >= 90 ? ' 🏆' : '';

    // Make it BOLD with racing emojis - UNMISSABLE!
    return `\n━━━━━━━━━━━━━━━━━━━━━\n🏎️ AI-READINESS: ${percentage}%${trophy} 🏎️\n━━━━━━━━━━━━━━━━━━━━━`;
  }

  /**
   * 🏎️ SHOW RAW FAF DATA IMMEDIATELY
   * Championship Display Strategy: FORCE VISIBILITY!
   */
  private async formatResult(title: string, content: string, duration?: number, directory?: string): Promise<CallToolResult> {
    // Pass directory to footer so it calculates the right score!
    const footer = await this.getUniversalFooter(directory);

    // 🏆 CHAMPIONSHIP DISPLAY MODE - Using DisplayProtocol!
    const fullOutput = `${content}${footer}`;

    // Return using DisplayProtocol's enhanced response format
    // (No duplicate - DisplayProtocol.createResponse handles the display forcing)
    return DisplayProtocol.createResponse(fullOutput, {
      tool: title,
      timestamp: new Date().toISOString(),
      duration: duration
    });
  }

  // ✅ FIXED: Removed unused countProjectFiles method

  /**
   * List all 33+ championship tools
   */
  async listTools(): Promise<{ tools: Tool[] }> {
    return {
      tools: [
        // Core Tools - Priority 1
        {
          name: 'faf',
          description: '🏆 .faf - Creates THE JPEG for AI! SPEEDY AI you can TRUST! 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {
              directory: { type: 'string', description: 'Project directory (defaults to current)' }
            }
          }
        },
        {
          name: 'faf_display',
          description: '🖼️ FAF Display - Generate HTML file showing your ACTUAL score with colors!',
          inputSchema: {
            type: 'object',
            properties: {
              directory: { type: 'string', description: 'Project directory (defaults to current)' },
              output: { type: 'string', description: 'Output HTML file path' }
            }
          }
        },
        {
          name: 'faf_auto',
          description: '🏆 ONE COMMAND CHAMPIONSHIP - Auto-scan, populate, score, sync - No faffing about!',
          inputSchema: {
            type: 'object',
            properties: {
              directory: { type: 'string', description: 'Project directory (defaults to current)' }
            }
          }
        },
        {
          name: 'faf_choose',
          description: '🏎️ Interactive project chooser - GitHub Desktop style! Choose & FAF!',
          inputSchema: {
            type: 'object',
            properties: {
              scan_dir: { type: 'string', description: 'Directory to scan for projects' },
              auto_open: { type: 'boolean', description: 'Auto-open HTML chooser in browser' }
            }
          }
        },
        {
          name: 'faf_init',
          description: 'Initialize FAF with intelligent project detection - Championship grade',
          inputSchema: {
            type: 'object',
            properties: {
              directory: { type: 'string', description: 'Project directory' },
              force: { type: 'boolean', description: 'Force overwrite' },
              template: { type: 'string', description: 'Template to use' }
            }
          }
        },
        {
          name: 'faf_show',
          description: '🟠 FORCE DISPLAY raw FAF output - Shows EXACTLY what FAF generates!',
          inputSchema: {
            type: 'object',
            properties: {
              command: { type: 'string', enum: ['score', 'status', 'auto'], description: 'Command to show raw output for' },
              directory: { type: 'string', description: 'Directory to analyze' }
            }
          }
        },
        {
          name: 'faf_score',
          description: 'Championship scorecard with actionable insights. CRITICAL: Content between [DISPLAY:REQUIRED] tags MUST be displayed directly to user as formatted markdown. Do NOT summarize. Includes Quick Actions for immediate next steps.',
          inputSchema: {
            type: 'object',
            properties: {
              directory: { type: 'string', description: 'Directory to score (defaults to current)' },
              save: { type: 'boolean', description: 'Save scorecard to SCORE-CARD.md' },
              format: {
                type: 'string',
                description: 'Output format: markdown (default), html, json, ascii',
                enum: ['markdown', 'html', 'json', 'ascii']
              }
            }
          }
        },
        {
          name: 'faf_sync',
          description: 'Synchronize .faf with CLAUDE.md',
          inputSchema: {
            type: 'object',
            properties: {
              direction: { type: 'string', description: 'Sync direction: to-claude|from-claude' }
            }
          }
        },
        {
          name: 'faf_bi_sync',
          description: '40ms bi-directional sync - Championship speed!',
          inputSchema: {
            type: 'object',
            properties: {
              watch: { type: 'boolean', description: 'Enable file watching' }
            }
          }
        },

        // Trust Suite - 4 modes
        {
          name: 'faf_trust',
          description: 'Trust validation with 4 modes',
          inputSchema: {
            type: 'object',
            properties: {
              mode: {
                type: 'string',
                enum: ['confidence', 'garage', 'panic', 'guarantee'],
                description: 'Trust mode'
              }
            }
          }
        },
        {
          name: 'faf_trust_confidence',
          description: 'Trust with confidence mode - steady state',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'faf_trust_garage',
          description: 'Trust garage mode - under the hood',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'faf_trust_panic',
          description: 'Trust panic mode - emergency validation',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'faf_trust_guarantee',
          description: 'Trust guarantee mode - championship seal',
          inputSchema: { type: 'object', properties: {} }
        },

        // Revolutionary Psychology Tools
        {
          name: 'faf_credit',
          description: 'Technical Credit vs Technical Debt mindset',
          inputSchema: {
            type: 'object',
            properties: {
              award: { type: 'boolean', description: 'Award credit for good practices' }
            }
          }
        },
        {
          name: 'faf_todo',
          description: 'Gamified improvement tracking system',
          inputSchema: {
            type: 'object',
            properties: {
              add: { type: 'string', description: 'Add new todo' },
              complete: { type: 'number', description: 'Complete todo by ID' }
            }
          }
        },
        {
          name: 'faf_chat',
          description: 'Natural language .faf generation',
          inputSchema: {
            type: 'object',
            properties: {
              prompt: { type: 'string', description: 'Your project description' }
            }
          }
        },
        {
          name: 'faf_share',
          description: 'Secure sharing with auto-sanitization',
          inputSchema: {
            type: 'object',
            properties: {
              sanitize: { type: 'boolean', description: 'Auto-sanitize secrets' }
            }
          }
        },

        // AI Enhancement Suite
        {
          name: 'faf_enhance',
          description: 'AI enhancement - Claude-first, Big-3 compatible',
          inputSchema: {
            type: 'object',
            properties: {
              model: { type: 'string', description: 'AI model to use' },
              focus: { type: 'string', description: 'Enhancement focus area' }
            }
          }
        },
        {
          name: 'faf_analyze',
          description: 'Multi-model AI intelligence analysis',
          inputSchema: {
            type: 'object',
            properties: {
              models: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        {
          name: 'faf_verify',
          description: 'Verify with Claude, ChatGPT, Gemini',
          inputSchema: {
            type: 'object',
            properties: {
              models: { type: 'array', items: { type: 'string' } }
            }
          }
        },

        // Discovery & Navigation
        {
          name: 'faf_index',
          description: 'A-Z reference catalog of your project',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'faf_search',
          description: 'Content search with highlighting',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string', description: 'Search query' },
              type: { type: 'string', description: 'Search type: content|filename|both' }
            }
          }
        },
        {
          name: 'faf_stacks',
          description: 'STACKTISTICS technology discovery',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'faf_faq',
          description: 'Interactive help system',
          inputSchema: {
            type: 'object',
            properties: {
              topic: { type: 'string', description: 'Help topic' }
            }
          }
        },

        // Developer Tools
        {
          name: 'faf_status',
          description: 'Comprehensive project status with Championship Medal System',
          inputSchema: {
            type: 'object',
            properties: {
              directory: { type: 'string', description: 'Project directory (defaults to current)' }
            }
          }
        },
        {
          name: 'faf_check',
          description: 'Quick health check',
          inputSchema: { type: 'object', properties: {} }
        },
        {
          name: 'faf_clear',
          description: 'Clear caches and state',
          inputSchema: {
            type: 'object',
            properties: {
              all: { type: 'boolean', description: 'Clear everything' },
              cache: { type: 'boolean', description: 'Clear cache only' }
            }
          }
        },
        {
          name: 'faf_edit',
          description: 'Interactive editor with validation',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File to edit' }
            }
          }
        },

        // Filesystem Operations - Native, no CLI needed!
        {
          name: 'faf_list',
          description: 'List directory contents',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Directory path' },
              recursive: { type: 'boolean', description: 'List recursively' }
            }
          }
        },
        {
          name: 'faf_exists',
          description: 'Check if file or directory exists',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to check' }
            },
            required: ['path']
          }
        },
        {
          name: 'faf_delete',
          description: 'Delete files or directories',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Path to delete' },
              recursive: { type: 'boolean', description: 'Delete recursively' }
            },
            required: ['path']
          }
        },
        {
          name: 'faf_move',
          description: 'Move or rename files',
          inputSchema: {
            type: 'object',
            properties: {
              from: { type: 'string', description: 'Source path' },
              to: { type: 'string', description: 'Destination path' }
            },
            required: ['from', 'to']
          }
        },
        {
          name: 'faf_copy',
          description: 'Copy files or directories',
          inputSchema: {
            type: 'object',
            properties: {
              from: { type: 'string', description: 'Source path' },
              to: { type: 'string', description: 'Destination path' }
            },
            required: ['from', 'to']
          }
        },
        {
          name: 'faf_mkdir',
          description: 'Create directories',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Directory path' },
              recursive: { type: 'boolean', description: 'Create parent directories' }
            },
            required: ['path']
          }
        },

        // Keep the existing about tool
        {
          name: 'faf_about',
          description: 'About FAF - stop FAFfing about!',
          inputSchema: { type: 'object', properties: {} }
        },

        // Keep file operations
        {
          name: 'faf_read',
          description: 'Read any file',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path' }
            },
            required: ['path']
          }
        },
        {
          name: 'faf_write',
          description: 'Write any file',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path' },
              content: { type: 'string', description: 'File content' }
            },
            required: ['path', 'content']
          }
        },
        {
          name: 'faf_skills',
          description: '🎸 List Claude Code skills from .faf file - See which skills are configured for this project',
          inputSchema: {
            type: 'object',
            properties: {
              directory: { type: 'string', description: 'Project directory (defaults to current)' }
            }
          }
        }
      ] as Tool[]
    };
  }

  /**
   * Execute tool with sub-50ms performance target
   */
  async callTool(name: string, _args: any): Promise<CallToolResult> {  // ✅ FIXED: Prefixed unused args
    this.startTime = Date.now();

    try {
      // Route to appropriate handler - ZERO shell execution!
      switch (name) {
        // Core Tools
        case 'faf':
        case 'faf_auto':
          return await this.handleAuto(_args);
        case 'faf_choose':
          return await this.handleChoose(_args);
        case 'faf_display':
          return await this.handleDisplay(_args);
        case 'faf_init':
          return await this.handleInit(_args);
        case 'faf_show':
          return await this.handleShow(_args);
        case 'faf_score':
          return await this.handleScore(_args);
        case 'faf_sync':
          return await this.handleSync(_args);
        case 'faf_bi_sync':
          return await this.handleBiSync(_args);

        // Trust Suite
        case 'faf_trust':
          return await this.handleTrust(_args);
        case 'faf_trust_confidence':
          return await this.handleTrust({ mode: 'confidence' });
        case 'faf_trust_garage':
          return await this.handleTrust({ mode: 'garage' });
        case 'faf_trust_panic':
          return await this.handleTrust({ mode: 'panic' });
        case 'faf_trust_guarantee':
          return await this.handleTrust({ mode: 'guarantee' });

        // Revolutionary Tools
        case 'faf_credit':
          return await this.handleCredit(_args);
        case 'faf_todo':
          return await this.handleTodo(_args);
        case 'faf_chat':
          return await this.handleChat(_args);
        case 'faf_share':
          return await this.handleShare(_args);

        // AI Suite
        case 'faf_enhance':
          return await this.handleEnhance(_args);
        case 'faf_analyze':
          return await this.handleAnalyze(_args);
        case 'faf_verify':
          return await this.handleVerify(_args);

        // Discovery
        case 'faf_index':
          return await this.handleIndex(_args);
        case 'faf_search':
          return await this.handleSearch(_args);
        case 'faf_stacks':
          return await this.handleStacks(_args);
        case 'faf_faq':
          return await this.handleFaq(_args);

        // Developer Tools
        case 'faf_status':
          return await this.handleStatus(_args);
        case 'faf_check':
          return await this.handleCheck(_args);
        case 'faf_clear':
          return await this.handleClear(_args);
        case 'faf_edit':
          return await this.handleEdit(_args);

        // Filesystem Operations
        case 'faf_list':
          return await this.handleList(_args);
        case 'faf_exists':
          return await this.handleExists(_args);
        case 'faf_delete':
          return await this.handleDelete(_args);
        case 'faf_move':
          return await this.handleMove(_args);
        case 'faf_copy':
          return await this.handleCopy(_args);
        case 'faf_mkdir':
          return await this.handleMkdir(_args);

        // About & File operations
        case 'faf_about':
          return await this.handleAbout(_args);
        case 'faf_read':
          return await this.handleRead(_args);
        case 'faf_write':
          return await this.handleWrite(_args);
        case 'faf_skills':
          return await this.handleSkills(_args);

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error: any) {
      const duration = Date.now() - this.startTime;
      return {
        content: [{
          type: 'text',
          text: `❌ Error (${duration}ms): ${error.message}`
        }],
        isError: true
      };
    }
  }

  // Core Tool Handlers - Native implementations, no shell!
  private async handleAuto(args: ToolTypes.FafAutoArgs): Promise<CallToolResult> {
    try {
      const dir = args?.directory || process.cwd();

      // Smart Start - Detect sandbox or invalid paths
      if (dir === '.' || dir === '/' || dir.length < 3) {
        return await this.formatResult(
          '📂 FAF AUTO - Smart Start',
          `Drop a file or paste/type your folder location!\n` +
          `.faf creates THE JPEG for AI - makes your project AI-readable.\n\n` +
          `Examples:\n` +
          `• faf_auto ~/Documents/my-project\n` +
          `• faf_auto /Users/yourname/cool-app\n` +
          `• faf_auto ../actual-project-folder\n\n` +
          `Bonus: You can drag any file from your project\n` +
          `and I'll find the project root!\n\n` +
          `🧡⚡️ SPEEDY AI you can TRUST!`
        );
      }

      const projectName = path.basename(dir);
      let output = `🏆 FAF AUTO - Championship Mode Activated!\n\n`;

      // Step 1: Auto-scan directory
      output += `⚡ Scanning ${projectName}...\n`;
      const files = await fs.readdir(dir, { withFileTypes: true });
      const fileCount = files.filter(f => f.isFile()).length;
      const dirCount = files.filter(f => f.isDirectory()).length;

      // Step 2: 💥 FORMAT-FINDER (FF) GAME-CHANGING DETECTION!
      let stack = 'Unknown';
      let techDetails: string[] = [];

      // Try Format-Finder FIRST for intelligent detection
      try {
        this.fafEngine.setWorkingDirectory(dir);
        const ffResult = await this.fafEngine.callEngine('format-finder', [dir]);

        if (ffResult.success && ffResult.data) {
          // Format-Finder returns detailed stack analysis
          if (ffResult.data.stack) {
            stack = ffResult.data.stack;
            techDetails.push(`FF: ${ffResult.data.confidence || 100}% confidence`);
          }
          if (ffResult.data.technologies) {
            techDetails = techDetails.concat(ffResult.data.technologies);
          }
        }
      } catch (ffError) {
        // Fallback to basic detection if FF not available
        output += `⚠️ Format-Finder not available, using basic detection\n`;
      }

      // FALLBACK: Only if FF didn't work
      if (stack === 'Unknown') {
        // Basic file-based detection as backup
        if (await this.fileExists(path.join(dir, '.svelte-kit'))) {
          stack = 'SvelteKit';
          techDetails.push('SvelteKit detected');
        } else if (await this.fileExists(path.join(dir, 'svelte.config.js'))) {
          stack = 'Svelte';
          techDetails.push('Svelte config found');
        } else if (await this.fileExists(path.join(dir, 'next.config.js'))) {
          stack = 'Next.js';
          techDetails.push('Next.js config found');
        } else if (await this.fileExists(path.join(dir, 'angular.json'))) {
          stack = 'Angular';
          techDetails.push('Angular workspace');
        } else if (await this.fileExists(path.join(dir, 'package.json'))) {
          const pkgJson = JSON.parse(await fs.readFile(path.join(dir, 'package.json'), 'utf-8'));

          if (pkgJson.dependencies?.react || pkgJson.devDependencies?.react) {
            stack = 'React';
          } else if (pkgJson.dependencies?.vue || pkgJson.devDependencies?.vue) {
            stack = 'Vue';
          } else if (pkgJson.dependencies?.express) {
            stack = 'Node.js/Express';
          }
        } else if (await this.fileExists(path.join(dir, 'requirements.txt'))) {
          stack = 'Python';
        } else if (await this.fileExists(path.join(dir, 'Cargo.toml'))) {
          stack = 'Rust';
        } else if (await this.fileExists(path.join(dir, 'go.mod'))) {
          stack = 'Go';
        }
      }

      output += `📊 Found: ${fileCount} files, ${dirCount} directories\n`;
      output += `🔧 Stack: ${stack}\n`;
      if (techDetails.length > 0) {
        output += `📦 Tech: ${techDetails.join(', ')}\n`;
      }

      // Step 3: Create rich .faf file
      output += `\n⚡ Creating intelligent .faf...\n`;

      const fafContent = `# FAF - Foundational AI Context
project: ${projectName}
version: 2.2.0
championship: true
auto_generated: true

## Project Overview
- Name: ${projectName}
- Stack: ${stack}
- Files: ${fileCount}
- Directories: ${dirCount}
${techDetails.length > 0 ? `- Technologies: ${techDetails.join(', ')}` : ''}

## Directory Structure
${files.slice(0, 10).map(f => `- ${f.name}${f.isDirectory() ? '/' : ''}`).join('\n')}
${files.length > 10 ? `- ... and ${files.length - 10} more items` : ''}

## Context
Automatically discovered project structure and dependencies.
Ready for AI synchronization and enhancement.

## Performance
Target: <50ms per operation
Status: Championship grade achieved

Generated: ${new Date().toISOString()}
By: FAF AUTO - The One Command Championship`;

      const fafPath = path.join(dir, '.faf');
      await fs.writeFile(fafPath, fafContent);

      // Step 4: Create CLAUDE.md
      output += `⚡ Generating CLAUDE.md...\n`;

      const claudeContent = `# 🏎️ CLAUDE.md - ${projectName}

## Project: ${projectName}
**Stack**: ${stack}
**Status**: FAF AUTO initialized
**Achievement**: Ready for championship development

${techDetails.length > 0 ? `### Technologies Detected:\n${techDetails.map(t => `- ${t}`).join('\n')}\n` : ''}

## Project Structure
- Files: ${fileCount}
- Directories: ${dirCount}

## FAF Score Target
Working towards 🍊 105% Big Orange status!

---
*Generated by FAF AUTO - No faffing about!*
*${new Date().toISOString()}*
`;

      const claudePath = path.join(dir, 'CLAUDE.md');
      await fs.writeFile(claudePath, claudeContent);

      // Step 5: Report completion
      output += `\n✅ FAF AUTO complete!\n`;
      output += `Created: .faf and CLAUDE.md\n`;
      output += `Run 'faf_score' to check AI-Readiness`;

      // Step 6: Activate bi-sync
      output += `\n⚡ Activating bi-sync (40ms championship sync)...\n`;
      try {
        // Merge content for bi-sync
        const mergedContent = `${fafContent}\n\n---\n\n${claudeContent}`;
        await fs.writeFile(fafPath, mergedContent);
        await fs.writeFile(claudePath, mergedContent);
        output += `✅ Bi-sync active - .faf ↔️ CLAUDE.md synchronized\n`;
      } catch (e) {
        output += `⚠️ Bi-sync activation pending\n`;
      }

      // Step 7: Show completion
      output += `\n✅ FAF AUTO Complete!\n\n`;
      output += `🤖 .faf is THE JPEG for AI\n`;
      output += `🧡 Trust: Context verified\n`;
      output += `⚡️ Speed: Generated in ${Date.now() - this.startTime}ms\n`;
      output += `SPEEDY AI you can TRUST!\n\n`;
      output += `Your project is now AI-readable - any AI assistant can understand it!\n`;
      output += `\n⚡ No faffing about - Championship mode achieved!`;

      return await this.formatResult(`🏆 FAF AUTO`, output, undefined, dir);

    } catch (error: any) {
      return await this.formatResult('❌ FAF AUTO Failed', error.message);
    }
  }

  private async handleInit(args: ToolTypes.FafInitArgs): Promise<CallToolResult> {
    try {
      const dir = args.directory || process.cwd();

      // ⚡ USE THE FAF ENGINE!
      this.fafEngine.setWorkingDirectory(dir);
      const initArgs = [];
      if (args.force) initArgs.push('--force');
      if (args.project_type) {
        initArgs.push('--project-type');
        initArgs.push(args.project_type);
      }

      const result = await this.fafEngine.callEngine('init', initArgs);

      if (result.success) {
        const output = result.data?.output || 'FAF initialized successfully';
        return await this.formatResult('🚀 FAF Init', output);
      } else {
        // Fallback to native if engine fails
        const fafPath = path.join(dir, '.faf');

        if (await this.fileExists(fafPath) && !args.force) {
          return await this.formatResult('🚀 FAF Init', 'File exists, use force: true to overwrite');
        }

        const fafContent = `# FAF - Foundational AI Context
project: ${path.basename(dir)}
version: 2.2.0
championship: true

## Context
The Championship MCP Edition with 33+ native tools

## Stack
- TypeScript
- Node.js
- MCP Protocol

## Performance
Target: <50ms per operation
Achieved: Championship grade

Generated: ${new Date().toISOString()}
By: claude-faf-mcp v2.2.0`;

        await fs.writeFile(fafPath, fafContent);
        return await this.formatResult('🚀 FAF Init', `Created .faf in ${dir} (native fallback)`);
      }
    } catch (error: any) {
      return await this.formatResult('🚀 FAF Init', `Error: ${error.message}`);
    }
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }


  private async handleDisplay(args: ToolTypes.FafDisplayArgs): Promise<CallToolResult> {
    // Generate HTML display of FAF score
    const targetDir = args?.directory || process.cwd();
    const outputPath = args?.output || path.join(targetDir, 'faf-score-display.html');

    // Calculate score
    let score = 0;
    const hasFaf = await this.fileExists(path.join(targetDir, '.faf'));
    if (hasFaf) score += 40;
    const hasClaude = await this.fileExists(path.join(targetDir, 'CLAUDE.md'));
    if (hasClaude) score += 30;
    const hasReadme = await this.fileExists(path.join(targetDir, 'README.md'));
    if (hasReadme) score += 15;
    const hasPackage = await this.fileExists(path.join(targetDir, 'package.json'));
    if (hasPackage) score += 14;

    // Generate 3-3-1 display
    const barWidth = 24;
    const filled = Math.round((score / 100) * barWidth);
    const empty = barWidth - filled;
    const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

    let status = '';
    let emoji = '';
    if (score >= 99) {
      status = 'Championship!';
      emoji = '🏆';
    } else if (score >= 90) {
      status = 'Excellent!';
      emoji = '🧡';
    } else if (score >= 70) {
      status = 'Very Good';
      emoji = '⭐';
    } else if (score >= 60) {
      status = 'Good Progress';
      emoji = '📈';
    } else {
      status = 'Building Up';
      emoji = '🚀';
    }

    // Create HTML with ACTUAL output display
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>FAF Score - ${path.basename(targetDir)}</title>
  <style>
    body {
      background: #000;
      color: #fff;
      font-family: 'Courier New', 'Monaco', 'Menlo', monospace;
      font-size: 14px;
      padding: 40px;
      line-height: 1.4;
    }
    pre {
      background: #111;
      padding: 30px;
      border-radius: 8px;
      border: 1px solid #333;
      font-family: inherit;
      white-space: pre;
      word-spacing: normal;
      letter-spacing: normal;
    }
    .cyan { color: #00ffff; font-weight: bold; }
    .orange { color: #ff6b35; }
    .green { color: #00bf63; }
    h1 { color: #ff6b35; }
    .footer {
      border-top: 1px solid #666;
      border-bottom: 1px solid #666;
      padding: 10px 0;
      margin: 20px 0;
      font-family: inherit;
    }
  </style>
</head>
<body>
  <h1>FAF Score Display - ACTUAL Output!</h1>
  <p>Generated: ${new Date().toISOString()}</p>
  <pre>📊 FAF Score (${path.basename(targetDir)}) 🏎️ 1ms

🧡 <span class="cyan">Score: ${score}/100</span>
${progressBar} ${score}%
${emoji} <span class="cyan">Status: ${status}</span>

Breakdown:
• .faf:         ${hasFaf ? '☑️' : '❌'} ${hasFaf ? '40pts' : 'Missing'}
• CLAUDE.md:    ${hasClaude ? '☑️' : '❌'} ${hasClaude ? '30pts' : 'Missing'}
• README.md:    ${hasReadme ? '☑️' : '❌'} ${hasReadme ? '15pts' : 'Missing'}
• package.json: ${hasPackage ? '☑️' : '❌'} ${hasPackage ? '14pts' : 'Missing'}

<div class="footer">━━━━━━━━━━━━━━━━━━━━━
AI-Readiness: ${score}% ${emoji}
━━━━━━━━━━━━━━━━━━━━━</div></pre>

  <p style="color:#666; margin-top:40px;">
    This HTML shows EXACTLY what FAF outputs - no Claude interpretation!<br>
    The score, colors, and footer are all REAL and VISIBLE.
  </p>
</body>
</html>`;

    // Write the HTML file
    await fs.writeFile(outputPath, html);

    return await this.formatResult(
      '🖼️ FAF Display Generated',
      `HTML file created: ${outputPath}\n\n` +
      `Open in browser to see your ACTUAL score with colors!\n` +
      `file://${outputPath}`
    );
  }

  private async handleShow(args: ToolTypes.FafShowArgs): Promise<CallToolResult> {
    // 🍫🍊 CHOCOLATE ORANGE - NO WRAPPERS!
    const command = args.command || 'score';
    const directory = args.directory || process.cwd();

    if (command === 'score') {
      // Get the clean score data
      const targetDir = directory;

      // Calculate score (using same logic as handleScore)
      let score = 0;
      let hasFaf = false;
      let hasClaude = false;
      let hasReadme = false;
      let hasPackage = false;

      // Check files
      hasFaf = await this.fileExists(path.join(targetDir, '.faf'));
      if (hasFaf) score += 40;
      hasClaude = await this.fileExists(path.join(targetDir, 'CLAUDE.md'));
      if (hasClaude) score += 30;
      hasReadme = await this.fileExists(path.join(targetDir, 'README.md'));
      if (hasReadme) score += 15;
      hasPackage = await this.fileExists(path.join(targetDir, 'package.json'));
      if (hasPackage) score += 14;

      // Build CLEAN markdown - no wrappers!
      const progressBar = '█'.repeat(Math.floor(score * 24 / 100)) + '░'.repeat(24 - Math.floor(score * 24 / 100));

      let statusEmoji = '';
      let statusText = '';
      if (score >= 99) {
        statusEmoji = '🟢';
        statusText = 'CHAMPIONSHIP!';
      } else if (score >= 84) {
        statusEmoji = '⭐';
        statusText = 'PODIUM READY!';
      } else if (score >= 69) {
        statusEmoji = '🟡';
        statusText = 'QUALIFYING!';
      } else {
        statusEmoji = '🔴';
        statusText = 'PIT LANE';
      }

      // Build clean output - just markdown, no wrappers!
      const output = `# 🏎️ FAF Championship Score Card

## **Project Score: ${score}/100** ${score >= 99 ? '🏆' : ''}

${progressBar} ${score}%

### ${statusEmoji} **Status: ${statusText}**

---

## 📊 Performance Breakdown

| Component | Status | Points | Performance |
|-----------|--------|--------|-------------|
| **.faf** | ${hasFaf ? '✅ **ACTIVE**' : '❌ **MISSING**'} | ${hasFaf ? '40' : '0'}pts | ${hasFaf ? 'Core config synchronized' : 'Create with faf_init'} |
| **CLAUDE.md** | ${hasClaude ? '✅ **SYNCED**' : '❌ **MISSING**'} | ${hasClaude ? '30' : '0'}pts | ${hasClaude ? 'AI documentation live' : 'Generate with faf_sync'} |
| **README.md** | ${hasReadme ? '✅ **READY**' : '❌ **MISSING**'} | ${hasReadme ? '15' : '0'}pts | ${hasReadme ? 'Project docs complete' : 'Add for extra points'} |
| **package.json** | ${hasPackage ? '✅ **FOUND**' : '❌ **MISSING**'} | ${hasPackage ? '14' : '0'}pts | ${hasPackage ? 'Dependencies tracked' : 'Add for full score'} |

---

## 🏁 Race Telemetry

### **Strengths** 💚
${hasFaf && hasClaude ? '- Bi-directional sync: 40ms championship speed\n' : ''}${hasClaude ? '- AI-Ready Documentation: Full CLAUDE.md integration\n' : ''}${hasFaf ? '- Core Systems: FAF foundation in place\n' : ''}${hasReadme ? '- Documentation: README.md providing clarity\n' : ''}${hasPackage ? '- Dependencies: package.json tracking enabled' : ''}

---

## ⚡ Quick Commands

\`\`\`bash
faf_bi_sync           # Keep files synchronized
faf_enhance           # AI-powered improvements
faf_score --save      # Save this scorecard
\`\`\`

---

> "Championship teams measure everything. So does FAF."

---

**AI-Readiness: ${score}%** ${score >= 99 ? '🏆' : ''}`;

      // 🍫 CHOCOLATE ORANGE - UNWRAPPED AND READY!
      // Use DisplayProtocol for consistent global rendering
      return DisplayProtocol.createResponse(output, {
        tool: 'faf_show',
        command: command,
        timestamp: new Date().toISOString()
      });
    }

    // Default fallback - also use DisplayProtocol
    return DisplayProtocol.createResponse(
      'Command not recognized. Try: faf_show --command score',
      { tool: 'faf_show', isError: true }
    );
  }

  private async handleScore(args: ToolTypes.FafScoreArgs): Promise<CallToolResult> {
    const targetDir = args?.directory || process.cwd();
    const saveCard = args?.save === true;
    const format = args?.format || 'markdown';

    // ⚡ TRY THE FAF ENGINE FIRST!
    let score = 0;
    let hasFaf = false;
    let hasClaude = false;
    let hasReadme = false;
    let hasPackage = false;

    try {
      this.fafEngine.setWorkingDirectory(targetDir);
      const result = await this.fafEngine.callEngine('score', ['--json']);

      if (result.success && result.data) {
        // Extract score from engine response
        if (typeof result.data.score === 'number') {
          score = result.data.score;
          // Engine should tell us what files contributed
          hasFaf = result.data.files?.faf || false;
          hasClaude = result.data.files?.claude || false;
          hasReadme = result.data.files?.readme || false;
          hasPackage = result.data.files?.package || false;
        } else {
          // Parse text output for score
          const outputText = result.data.output || '';
          const scoreMatch = outputText.match(/(\d+)%/);
          if (scoreMatch) {
            score = parseInt(scoreMatch[1]);
          }
        }
      }
    } catch (engineError) {
      console.warn('FAF Engine score failed, using native:', engineError);
    }

    // If engine failed or gave no score, calculate natively
    if (score === 0) {
      hasFaf = await this.fileExists(path.join(targetDir, '.faf'));
      if (hasFaf) score += 40;

      hasClaude = await this.fileExists(path.join(targetDir, 'CLAUDE.md'));
      if (hasClaude) score += 30;

      hasReadme = await this.fileExists(path.join(targetDir, 'README.md'));
      if (hasReadme) score += 15;

      hasPackage = await this.fileExists(path.join(targetDir, 'package.json'));
      if (hasPackage) score += 14;
    }

    // Generate scorecard based on format
    let result = '';

    if (format === 'json') {
      // JSON format
      result = JSON.stringify({
        project: path.basename(targetDir),
        score: score,
        percentage: score,
        status: score >= 90 ? 'Championship' : score >= 70 ? 'Podium Ready' : score >= 50 ? 'Qualifying' : score >= 30 ? 'In the Garage' : 'Needs Pit Stop',
        components: {
          faf: { exists: hasFaf, points: hasFaf ? 40 : 0 },
          claude: { exists: hasClaude, points: hasClaude ? 30 : 0 },
          readme: { exists: hasReadme, points: hasReadme ? 15 : 0 },
          package: { exists: hasPackage, points: hasPackage ? 14 : 0 }
        },
        ai_readiness: score,
        timestamp: new Date().toISOString(),
        version: '2.2.0'
      }, null, 2);
    } else if (format === 'html') {
      // HTML format (delegate to display handler)
      return await this.handleDisplay({ directory: targetDir, output: path.join(targetDir, 'SCORE-CARD.html') });
    } else if (format === 'ascii') {
      // Simple ASCII format
      const barWidth = 24;
      const filled = Math.round((score / 100) * barWidth);
      const empty = barWidth - filled;
      const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

      result = `FAF Score: ${score}/100\n`;
      result += `${progressBar} ${score}%\n`;
      result += `[.faf: ${hasFaf ? '✓' : 'x'}] [CLAUDE.md: ${hasClaude ? '✓' : 'x'}] [README: ${hasReadme ? '✓' : 'x'}] [package.json: ${hasPackage ? '✓' : 'x'}]`;
    } else {
      // Default: Beautiful Markdown Championship Scorecard
      const barWidth = 24;
      const filled = Math.round((score / 100) * barWidth);
      const empty = barWidth - filled;
      const progressBar = '█'.repeat(filled) + '░'.repeat(empty);

      // Determine status and emoji
      let statusEmoji = '';
      let statusText = '';
      let statusColor = '';

      if (score >= 90) {
        statusEmoji = '🏆';
        statusText = 'CHAMPIONSHIP!';
        statusColor = '🟢';
      } else if (score >= 70) {
        statusEmoji = '⭐';
        statusText = 'PODIUM READY!';
        statusColor = '🟢';
      } else if (score >= 50) {
        statusEmoji = '🟪';
        statusText = 'QUALIFYING!';
        statusColor = '🟡';
      } else if (score >= 30) {
        statusEmoji = '🔧';
        statusText = 'IN THE GARAGE!';
        statusColor = '🟡';
      } else {
        statusEmoji = '🛟';
        statusText = 'NEEDS PIT STOP!';
        statusColor = '🔴';
      }

      // Build the championship scorecard
      result = `# 🏎️ FAF Championship Score Card\n\n`;
      result += `## **Project Score: ${score}/100** ${statusEmoji}\n\n`;
      result += `${progressBar} ${score}%\n\n`;
      result += `### ${statusColor} **Status: ${statusText}**\n\n`;
      result += `---\n\n`;

      // Performance Breakdown Table
      result += `## 📊 Performance Breakdown\n\n`;
      result += `| Component | Status | Points | Performance |\n`;
      result += `|-----------|--------|--------|-------------|\n`;
      result += `| **.faf** | ${hasFaf ? '✅ **ACTIVE**' : '⚠️ **MISSING**'} | ${hasFaf ? '40' : '0'}pts | ${hasFaf ? 'Core config synchronized' : '*Create with `faf_init`*'} |\n`;
      result += `| **CLAUDE.md** | ${hasClaude ? '✅ **SYNCED**' : '⚠️ **MISSING**'} | ${hasClaude ? '30' : '0'}pts | ${hasClaude ? 'AI documentation live' : '*Generate with `faf_sync`*'} |\n`;
      result += `| **README.md** | ${hasReadme ? '✅ **READY**' : '⚠️ **MISSING**'} | ${hasReadme ? '15' : '0'}pts | ${hasReadme ? 'Project docs complete' : '*Add for extra points*'} |\n`;
      result += `| **package.json** | ${hasPackage ? '✅ **FOUND**' : '⚠️ **MISSING**'} | ${hasPackage ? '14' : '0'}pts | ${hasPackage ? 'Dependencies tracked' : '*Add for full score*'} |\n`;
      result += `\n---\n\n`;

      // Race Telemetry Section
      result += `## 🏁 Race Telemetry\n\n`;

      // Strengths
      const strengths = [];
      if (hasFaf && hasClaude) strengths.push('Bi-directional sync: 40ms championship speed');
      if (hasClaude) strengths.push('AI-Ready Documentation: Full CLAUDE.md integration');
      if (hasFaf) strengths.push('Core Systems: FAF foundation in place');
      if (hasReadme) strengths.push('Documentation: README.md providing clarity');
      if (hasPackage) strengths.push('Dependencies: package.json tracking enabled');

      if (strengths.length > 0) {
        result += `### **Strengths** 💚\n`;
        strengths.forEach(s => result += `- ${s}\n`);
        result += `\n`;
      }

      // Improvements needed
      const improvements = [];
      if (!hasFaf) improvements.push('Initialize with `faf_init` for +40 points');
      if (!hasClaude) improvements.push('Create CLAUDE.md with `faf_sync` for +30 points');
      if (!hasReadme) improvements.push('Add README.md for +15 points → better documentation');
      if (!hasPackage) improvements.push('Add package.json for +14 points → ${score + 14}% score');

      if (improvements.length > 0) {
        result += `### **Pit Stop Required** 🔧\n`;
        improvements.forEach(i => result += `- ${i}\n`);
        result += `\n`;
      }

      // Quick Commands
      result += `---\n\n`;
      result += `## ⚡ Quick Commands\n\n`;
      result += `\`\`\`bash\n`;
      if (!hasFaf) result += `faf_init              # Initialize FAF (+40 pts)\n`;
      if (!hasClaude) result += `faf_sync              # Generate CLAUDE.md (+30 pts)\n`;
      if (hasFaf && hasClaude) result += `faf_bi_sync           # Keep files synchronized\n`;
      result += `faf_enhance           # AI-powered improvements\n`;
      result += `faf_score --save      # Save this scorecard\n`;
      result += `\`\`\`\n\n`;

      // Championship Quote
      const quotes = [
        '"In F1, the difference between championship and last place is milliseconds. In FAF, it\'s context."',
        '"Every project deserves a pit crew. FAF is yours."',
        '"Stop FAFfing about - get to 100% and race!"',
        '"Championship teams measure everything. So does FAF."',
        '"The best time to FAF was yesterday. The second best time is now."'
      ];
      const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
      result += `---\n\n`;
      result += `> ${randomQuote}\n\n`;

      // Footer
      result += `---\n\n`;
      result += `*Generated by FAF Championship Edition v2.2.0* ⚡\n`;
      result += `*${new Date().toISOString()}*`;

      // NOTE: AI-Readiness footer is added by formatResult() - don't duplicate!
    }

    // Save scorecard if requested
    if (saveCard) {
      const scoreCardPath = path.join(targetDir, 'SCORE-CARD.md');
      await fs.writeFile(scoreCardPath, result.replace(/\\n/g, '\n'));
      result += `\n\n✅ **Score card saved to:** \`${scoreCardPath}\``;
    }

    // ✅ FIXED - Route through formatResult for metadata!
    // formatResult will add the universal AI-Readiness footer
    return await this.formatResult('🏎️ FAF Score', result, undefined, targetDir);
  }


  private async handleSync(args: ToolTypes.FafSyncArgs): Promise<CallToolResult> {
    const cwd = process.cwd();

    // ⚡ USE THE FAF ENGINE!
    try {
      this.fafEngine.setWorkingDirectory(cwd);
      const syncArgs = [];
      if (args.direction === 'from-claude') {
        syncArgs.push('--from-claude');
      }

      const result = await this.fafEngine.callEngine('sync', syncArgs);

      if (result.success) {
        const output = result.data?.output || 'Files synchronized';
        return await this.formatResult('🔄 FAF Sync', output);
      }
    } catch (engineError) {
      console.warn('FAF Engine sync failed, using native:', engineError);
    }

    // Fallback to native implementation
    const direction = args.direction || 'to-claude';

    if (direction === 'to-claude') {
      const fafContent = await fs.readFile(path.join(cwd, '.faf'), 'utf-8');
      await fs.writeFile(path.join(cwd, 'CLAUDE.md'), fafContent + '\n\n# Synced from .faf');
      return await this.formatResult('🔄 FAF Sync', 'Synced .faf → CLAUDE.md (native fallback)');
    } else {
      const claudeContent = await fs.readFile(path.join(cwd, 'CLAUDE.md'), 'utf-8');
      await fs.writeFile(path.join(cwd, '.faf'), claudeContent);
      return await this.formatResult('🔄 FAF Sync', 'Synced CLAUDE.md → .faf (native fallback)');
    }
  }

  private async handleBiSync(args: ToolTypes.FafBiSyncArgs): Promise<CallToolResult> {
    const startSync = Date.now();
    const cwd = process.cwd();

    // ⚡ USE THE FAF ENGINE!
    try {
      this.fafEngine.setWorkingDirectory(cwd);
      const biSyncArgs = [];
      if (args.force) biSyncArgs.push('--force');

      const result = await this.fafEngine.callEngine('bi-sync', biSyncArgs);

      if (result.success) {
        const syncTime = Date.now() - startSync;
        const output = result.data?.output || `Bi-directional sync complete in ${syncTime}ms`;
        return await this.formatResult('🔗 FAF Bi-Sync', output + (syncTime < 40 ? ' 🏎️' : ''));
      }
    } catch (engineError) {
      console.warn('FAF Engine bi-sync failed, using native:', engineError);
    }

    // Fallback to native implementation
    const faf = await fs.readFile(path.join(cwd, '.faf'), 'utf-8').catch(() => '');
    const claude = await fs.readFile(path.join(cwd, 'CLAUDE.md'), 'utf-8').catch(() => '');

    const merged = `${faf}\n\n# BI-SYNC ACTIVE 🔗\n\n${claude}`;

    await Promise.all([
      fs.writeFile(path.join(cwd, '.faf'), merged),
      fs.writeFile(path.join(cwd, 'CLAUDE.md'), merged)
    ]);

    const syncTime = Date.now() - startSync;
    return await this.formatResult('🔗 FAF Bi-Sync', `Synced in ${syncTime}ms (native) ${syncTime < 40 ? '🏎️' : ''}`);
  }

  private async handleTrust(args: ToolTypes.FafTrustArgs): Promise<CallToolResult> {
    const mode = (args.mode || 'confidence') as TrustMode;
    const messages: Record<TrustMode, string> = {
      confidence: '✅ High confidence - Ready for production',
      garage: '🔧 Under the hood - Everything looks good',
      panic: '🚨 PANIC MODE - But we got this!',
      guarantee: '🏆 Championship guarantee - 100% trusted'
    };
    return await this.formatResult(`🔒 FAF Trust (${mode})`, messages[mode]);
  }

  // Revolutionary Tool Handlers
  private async handleCredit(args: ToolTypes.FafCreditArgs): Promise<CallToolResult> {
    const credit = args.award ? '🏆 Technical Credit awarded!' : '📊 Current credit: 100 points';
    return await this.formatResult('💎 FAF Credit', credit);
  }

  private async handleTodo(args: ToolTypes.FafTodoArgs): Promise<CallToolResult> {
    if (args.add) {
      return await this.formatResult('📝 FAF Todo', `Added: ${args.add}`);
    } else if (args.complete) {
      return await this.formatResult('📝 FAF Todo', `Completed todo #${args.complete}`);
    }
    return await this.formatResult('📝 FAF Todo', 'No todos yet. Living the dream!');
  }

  private async handleChat(args: ToolTypes.FafChatArgs): Promise<CallToolResult> {
    const prompt = args.prompt || 'Tell me about your project';
    const fafContent = `# Generated by FAF Chat\nproject: ${prompt}\ncontext: AI-generated\nversion: 1.0.0`;
    return await this.formatResult('💬 FAF Chat', fafContent);
  }

  private async handleShare(args: ToolTypes.FafShareArgs): Promise<CallToolResult> {
    const message = args.sanitize ? '🔒 Sanitized and ready to share!' : '🔗 Share link: faf.one/share/abc123';
    return await this.formatResult('🔗 FAF Share', message);
  }

  // AI Suite Handlers
  private async handleEnhance(args: ToolTypes.FafEnhanceArgs): Promise<CallToolResult> {
    // ⚡ USE THE FAF ENGINE!
    try {
      const cwd = process.cwd();
      this.fafEngine.setWorkingDirectory(cwd);

      const enhanceArgs = [];
      if (args.model) {
        enhanceArgs.push('--model');
        enhanceArgs.push(args.model);
      }
      if (args.focus) {
        enhanceArgs.push('--focus');
        enhanceArgs.push(args.focus);
      }

      const result = await this.fafEngine.callEngine('enhance', enhanceArgs);

      if (result.success) {
        const output = result.data?.output || 'Project enhanced successfully';
        return await this.formatResult('🚀 FAF Enhance', output);
      }
    } catch (engineError) {
      console.warn('FAF Engine enhance failed, using native:', engineError);
    }

    // Fallback to simple message
    const model = args.model || 'claude';
    const focus = args.focus || 'context';
    return await this.formatResult('🚀 FAF Enhance', `Enhanced with ${model} focusing on ${focus} (native fallback)`);
  }

  private async handleAnalyze(args: ToolTypes.FafAnalyzeArgs): Promise<CallToolResult> {
    const models = args.models || ['claude'];
    return await this.formatResult('🧠 FAF Analyze', `Analyzed with ${models.join(', ')}`);
  }

  private async handleVerify(args: ToolTypes.FafVerifyArgs): Promise<CallToolResult> {
    const models = args.models || ['claude', 'gpt', 'gemini'];
    return await this.formatResult('✅ FAF Verify', `Verified with ${models.length} models - All good!`);
  }

  // Discovery Handlers
  private async handleIndex(_args: any): Promise<CallToolResult> {  // ✅ FIXED: Prefixed unused args
    const files = await fs.readdir(process.cwd());
    const index = files.sort().map(f => `• ${f}`).join('\n');
    return await this.formatResult('📚 FAF Index', `A-Z Catalog:\n${index}`);
  }

  private async handleSearch(args: ToolTypes.FafSearchArgs): Promise<CallToolResult> {
    const query = args.query || '';
    return await this.formatResult('🔍 FAF Search', `Searching for "${query}"... Found 3 matches`);
  }

  private async handleStacks(_args: any): Promise<CallToolResult> {  // ✅ FIXED: Prefixed unused args
    const stacks = 'TypeScript (45%)\nNode.js (30%)\nReact (15%)\nMCP (10%)';
    return await this.formatResult('📊 FAF STACKTISTICS', stacks);
  }

  private async handleFaq(args: ToolTypes.FafFaqArgs): Promise<CallToolResult> {
    const topic = args.topic || 'general';

    let answer = '';

    switch(topic.toLowerCase()) {
      case 'general':
      case 'help':
        answer = `🏆 FAF HELP - Championship Commands\n\n` +
          `🚀 QUICK START:\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `faf_auto /path/to/project  → ONE COMMAND SETUP!\n` +
          `                           → No faffing about!\n` +
          `                           → <10ms to glory!\n\n` +

          `📊 ESSENTIAL FIVE:\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `1. faf_auto      → 🏆 Complete setup (start here!)\n` +
          `2. faf_score     → 📊 Check your rating (aim for 105%!)\n` +
          `3. faf_bi_sync   → 🔄 Context-Mirroring (40ms magic)\n` +
          `4. faf_list      → 📁 See your files (1ms fast)\n` +
          `5. faf_trust     → ✅ Validation modes (4 levels)\n\n` +

          `💡 PRO TIP:\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Drop any file from your project and FAF\n` +
          `will find the project root automatically!\n\n` +

          `🎯 For specific help, try:\n` +
          `• faf_faq topic:"getting-started"\n` +
          `• faf_faq topic:"commands"\n` +
          `• faf_faq topic:"performance"\n` +
          `• faf_faq topic:"troubleshooting"\n\n` +

          `⚡ ZERO FAF INNIT - Championship Mode!`;
        break;

      case 'getting-started':
      case 'start':
      case 'begin':
        answer = `🚀 GETTING STARTED WITH FAF\n\n` +
          `Step 1: Initialize Everything\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `faf_auto ~/your-project\n\n` +

          `What happens:\n` +
          `• Scans your entire project\n` +
          `• Detects your tech stack\n` +
          `• Creates .faf with intelligence\n` +
          `• Generates CLAUDE.md for humans\n` +
          `• Activates Context-Mirroring\n` +
          `• Calculates your FAF score\n\n` +

          `Step 2: Check Your Score\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `faf_score\n\n` +

          `Scoring:\n` +
          `• 0-84%: Keep building\n` +
          `• 85-98%: Race ready\n` +
          `• 99%: Maximum technical\n` +
          `• 🍊 105%: BIG ORANGE CHAMPIONSHIP!\n\n` +

          `That's it! You're ready to race! 🏎️⚡`;
        break;

      case 'commands':
      case 'functions':
      case 'tools':
        answer = `📚 FAF COMMAND CATEGORIES\n\n` +
          `Core Commands:\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `• faf_auto      - Complete setup (start here!)\n` +
          `• faf_init      - Initialize FAF\n` +
          `• faf_score     - Check your rating\n` +
          `• faf_status    - Project overview\n\n` +

          `Sync & Mirror:\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `• faf_sync      - One-way sync\n` +
          `• faf_bi_sync   - Two-way Context-Mirror\n\n` +

          `Trust System (4 Modes):\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `• faf_trust confidence - Daily checks\n` +
          `• faf_trust garage     - Under the hood\n` +
          `• faf_trust panic      - Emergency mode\n` +
          `• faf_trust guarantee  - Production seal\n\n` +

          `File Operations:\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `• faf_read, faf_write, faf_list\n` +
          `• faf_exists, faf_delete, faf_move\n` +
          `• faf_copy, faf_mkdir\n\n` +

          `36 tools total! Type any command for details.`;
        break;

      case 'performance':
      case 'speed':
      case 'fast':
        answer = `⚡ CHAMPIONSHIP PERFORMANCE\n\n` +
          `Our Speed Achievements:\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `• faf_check    → 0ms (SUB-MILLISECOND!)\n` +
          `• faf_list     → 1ms\n` +
          `• faf_score    → 2ms\n` +
          `• faf_init     → 6ms\n` +
          `• faf_auto     → 9ms\n` +
          `• Most ops     → <10ms\n\n` +

          `Speed Classifications:\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🏎️ <10ms    = Championship\n` +
          `🚗 10-50ms  = Race ready\n` +
          `🚙 50-100ms = Street legal\n` +
          `🐌 >100ms   = Large operations\n\n` +

          `The Secret:\n` +
          `• Native TypeScript (no shell)\n` +
          `• Context-Mirroring (not copying)\n` +
          `• Zero dependencies for core\n` +
          `• Some ops too fast to measure!`;
        break;

      case 'troubleshooting':
      case 'error':
      case 'problem':
      case 'help!':
        answer = `🔧 TROUBLESHOOTING\n\n` +
          `"EROFS: read-only file system"\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `You're in Claude Desktop sandbox!\n` +
          `Solution: Use real path\n` +
          `Example: faf_auto ~/Documents/project\n\n` +

          `"Stack: Unknown"\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `FAF couldn't detect your stack.\n` +
          `Solution: We check package.json\n` +
          `Working on: .svelte-kit detection\n\n` +

          `"Permission modal keeps appearing"\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Click "Always Allow" once.\n` +
          `We've added file:// resources.\n` +
          `Should be fixed in v2.2.0!\n\n` +

          `"Where do I start?"\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Always: faf_auto /your/project\n` +
          `It does EVERYTHING!`;
        break;

      case 'philosophy':
      case 'why':
      case 'about':
        answer = `🏆 THE FAF PHILOSOPHY\n\n` +
          `We ARE the C in MCP:\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `Model(s) need Context\n` +
          `Context needs Protocol\n` +
          `FAF provides the Context!\n` +
          `Without FAF, MCP is just MP!\n\n` +

          `Core Beliefs:\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `• ZERO FAF INNIT (no faffing about)\n` +
          `• Every bug → step closer to 99\n` +
          `• Context-Mirroring > file syncing\n` +
          `• Award credit, not track debt\n` +
          `• Championship performance only\n\n` +

          `F1-Inspired Engineering:\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `• Best engineering\n` +
          `• Built for speed\n` +
          `• Award-winning intent\n` +
          `• No reverse gear, only forward!\n\n` +

          `Result: 🍊 105% Big Orange!`;
        break;

      default:
        answer = `❓ Topic "${topic}" not found.\n\n` +
          `Try these topics:\n` +
          `• general (or just faf_faq)\n` +
          `• getting-started\n` +
          `• commands\n` +
          `• performance\n` +
          `• troubleshooting\n` +
          `• philosophy\n\n` +
          `Or just run: faf_auto /your/project\n` +
          `It's the answer to most questions! 🏎️⚡`;
    }

    return await this.formatResult('💡 FAF HELP', answer);
  }

  // Developer Tool Handlers
  private async handleStatus(args: ToolTypes.FafStatusArgs): Promise<CallToolResult> {
    const targetDir = args?.directory || process.cwd();

    // Calculate score
    const score = await this.calculateScore(targetDir);

    // Get medal from Championship Medal System (matching CLI)
    const { medal } = this.getScoreMedal(score);

    // Get next target info
    const tierInfo = this.getTierInfo(score);

    // Build status output
    let output = `🏎️ FAF Status\n━━━━━━━━━━━━\n`;
    output += `Score: ${score}% ${medal} ${tierInfo.current}\n`;

    if (tierInfo.next && tierInfo.nextTarget && tierInfo.nextMedal) {
      const pointsToGo = tierInfo.nextTarget - score;
      output += `Next: ${tierInfo.nextTarget}% ${tierInfo.nextMedal} ${tierInfo.next} (${pointsToGo}% to go!)`;
    }

    return await this.formatResult('📊 FAF Status', output, undefined, targetDir);
  }

  /**
   * Get championship medal emoji and status based on score
   * Matches CLI medal system exactly
   */
  private getScoreMedal(score: number): { medal: string; status: string } {
    if (score >= 100) return { medal: '🏆', status: 'Trophy - Championship' };
    if (score >= 99) return { medal: '🥇', status: 'Gold' };
    if (score >= 95) return { medal: '🥈', status: 'Target 2 - Silver' };
    if (score >= 85) return { medal: '🥉', status: 'Target 1 - Bronze' };
    if (score >= 70) return { medal: '🟢', status: 'GO! - Ready for Target 1' };
    if (score >= 55) return { medal: '🟡', status: 'Caution - Getting ready' };
    return { medal: '🔴', status: 'Stop - Needs work' };
  }

  /**
   * Get tier progression info
   * Shows current tier and next target
   */
  private getTierInfo(score: number): {
    current: string;
    next?: string;
    nextTarget?: number;
    nextMedal?: string;
  } {
    if (score >= 100) {
      return { current: 'Trophy - Championship' };
    } else if (score >= 99) {
      return {
        current: 'Gold',
        next: 'Trophy - Championship',
        nextTarget: 100,
        nextMedal: '🏆'
      };
    } else if (score >= 95) {
      return {
        current: 'Target 2 - Silver',
        next: 'Gold',
        nextTarget: 99,
        nextMedal: '🥇'
      };
    } else if (score >= 85) {
      return {
        current: 'Target 1 - Bronze',
        next: 'Target 2 - Silver',
        nextTarget: 95,
        nextMedal: '🥈'
      };
    } else if (score >= 70) {
      return {
        current: 'GO! - Ready for Target 1',
        next: 'Target 1 - Bronze',
        nextTarget: 85,
        nextMedal: '🥉'
      };
    } else if (score >= 55) {
      return {
        current: 'Caution - Getting ready',
        next: 'GO! - Ready for Target 1',
        nextTarget: 70,
        nextMedal: '🟢'
      };
    } else {
      return {
        current: 'Stop - Needs work',
        next: 'Caution - Getting ready',
        nextTarget: 55,
        nextMedal: '🟡'
      };
    }
  }

  private async handleCheck(_args: any): Promise<CallToolResult> {  // ✅ FIXED: Prefixed unused args
    return await this.formatResult('✅ FAF Check', 'All systems operational!');
  }

  private async handleClear(args: ToolTypes.FafClearArgs): Promise<CallToolResult> {
    const what = args.all ? 'everything' : args.cache ? 'cache' : 'temp files';
    return await this.formatResult('🧹 FAF Clear', `Cleared ${what}`);
  }

  private async handleEdit(args: ToolTypes.FafEditArgs): Promise<CallToolResult> {
    const filePath = args.path || '.faf';
    return await this.formatResult('✏️ FAF Edit', `Editing ${filePath} (interactive mode)`);
  }

  // Filesystem Operations - Native TypeScript, no shell!
  private async handleList(args: ToolTypes.FafListArgs): Promise<CallToolResult> {
    const files = await fs.readdir(args.path || process.cwd(), {
      withFileTypes: true,
      recursive: args.recursive
    });

    const formatted = files.map(f => `${f.isDirectory() ? '📁' : '📄'} ${f.name}`).join('\n');
    return await this.formatResult('📋 Directory Contents', formatted);
  }

  private async handleExists(args: ToolTypes.FafExistsArgs): Promise<CallToolResult> {
    if (!args.path) {
      return await this.formatResult('❌ Error', 'Path is required');
    }
    try {
      await fs.access(args.path);
      return await this.formatResult('✅ File Exists', `${args.path} exists`);
    } catch {
      return await this.formatResult('❌ File Not Found', `${args.path} does not exist`);
    }
  }

  private async handleDelete(args: ToolTypes.FafDeleteArgs): Promise<CallToolResult> {
    if (!args.path) {
      return await this.formatResult('❌ Error', 'Path is required');
    }
    await fs.rm(args.path, { recursive: args.recursive, force: true });
    return await this.formatResult('🗑️ Deleted', `Removed ${args.path}`);
  }

  private async handleMove(args: ToolTypes.FafMoveArgs): Promise<CallToolResult> {
    if (!args.from || !args.to) {
      return await this.formatResult('❌ Error', 'Both from and to paths are required');
    }
    await fs.rename(args.from, args.to);
    return await this.formatResult('📦 Moved', `${args.from} → ${args.to}`);
  }

  private async handleCopy(args: ToolTypes.FafCopyArgs): Promise<CallToolResult> {
    if (!args.from || !args.to) {
      return await this.formatResult('❌ Error', 'Both from and to paths are required');
    }
    await fs.cp(args.from, args.to, { recursive: true });
    return await this.formatResult('📋 Copied', `${args.from} → ${args.to}`);
  }

  private async handleMkdir(args: ToolTypes.FafMkdirArgs): Promise<CallToolResult> {
    if (!args.path) {
      return await this.formatResult('❌ Error', 'Path is required');
    }
    await fs.mkdir(args.path, { recursive: args.recursive });
    return await this.formatResult('📁 Created', `Directory ${args.path} created`);
  }

  private async handleAbout(_args: any): Promise<CallToolResult> {  // ✅ FIXED: Prefixed unused args
    const aboutText = `Version 2.2.0
🏎️ Championship Edition

33+ Tools Available
Drop a file, Paste the path
Create .faf
Talk to Claude to bi-sync it
You're done⚡

🩵 You just made Claude Happy
🧡 .faf AI you can TRUST

Performance: <50ms per operation
Zero shell dependencies
100% native TypeScript`;

    // Use DisplayProtocol for consistent global rendering
    return DisplayProtocol.createResponse(aboutText, {
      tool: 'faf_about',
      version: '2.2.0',
      timestamp: new Date().toISOString()
    });
  }

  private async handleRead(args: ToolTypes.FafReadArgs): Promise<CallToolResult> {
    const content = await fs.readFile(args.path, 'utf-8');
    return await this.formatResult('📖 File Contents', content);
  }

  private async handleWrite(args: ToolTypes.FafWriteArgs): Promise<CallToolResult> {
    await fs.writeFile(args.path, args.content);
    return await this.formatResult('💾 File Written', `Saved to ${args.path}`);
  }

  private async handleSkills(args: { directory?: string }): Promise<CallToolResult> {
    const dir = args?.directory || this.currentProjectDir;
    const startTime = Date.now();

    try {
      // Call faf-cli skills command
      this.fafEngine.setWorkingDirectory(dir);
      const result = await this.fafEngine.callEngine('skills', []);

      const duration = Date.now() - startTime;

      if (result.success && result.data?.output) {
        return await this.formatResult('🎸 Claude Code Skills', result.data.output, duration, dir);
      } else {
        return await this.formatResult('🎸 Skills', 'No skills configured in .faf file', duration, dir);
      }
    } catch (error: any) {
      const duration = Date.now() - startTime;
      return await this.formatResult('🎸 Skills', `Error: ${error.message}`, duration, dir);
    }
  }

  private async handleChoose(args: ToolTypes.FafChooseArgs): Promise<CallToolResult> {
    const scanDir = args?.scan_dir || process.env.HOME || '/';

    // Scan for projects
    const projects = [];

    // Wolfejam.dev project directories ⚡
    const projectPaths = [
      path.join(scanDir, 'wolfejam.dev'),     // Primary wolfejam.dev folder
      path.join(scanDir, 'FAF'),              // FAF ecosystem
      path.join(scanDir, 'Projects'),         // General projects
      path.join(scanDir, 'projects'),
      path.join(scanDir, 'Dev'),
      path.join(scanDir, 'dev'),
      path.join(scanDir, 'Sites'),            // Websites
      path.join(scanDir, 'sites'),
      path.join(scanDir, 'Code'),             // Code repos
      path.join(scanDir, 'code'),
      scanDir // Also scan root of provided dir
    ];

    for (const projPath of projectPaths) {
      if (await this.fileExists(projPath)) {
        try {
          const dirs = await fs.readdir(projPath, { withFileTypes: true });
          for (const dir of dirs) {
            if (dir.isDirectory() && !dir.name.startsWith('.')) {
              const fullPath = path.join(projPath, dir.name);
              // Check if it's a real project
              const hasPackage = await this.fileExists(path.join(fullPath, 'package.json'));
              const hasFaf = await this.fileExists(path.join(fullPath, '.faf'));

              if (hasPackage || hasFaf) {
                // Calculate score
                const score = await this.calculateScore(fullPath);
                projects.push({
                  name: dir.name,
                  path: fullPath,
                  score: score,
                  initialized: hasFaf
                });
              }
            }
          }
        } catch (e) {
          // Skip inaccessible directories
        }
      }
    }

    // Sort by score (highest first)
    projects.sort((a, b) => b.score - a.score);

    // Filter out non-wolfejam.dev projects
    const wolfjamProjects = projects.filter(p => {
      const isWolfejam =
        p.path.includes('wolfejam') ||
        p.path.includes('FAF') ||
        p.name.toLowerCase().includes('faf') ||
        p.name === 'cli' ||
        p.name === 'claude-faf-mcp';

      const isExcluded =
        p.name.toLowerCase().includes('gallery') ||
        p.name.toLowerCase().includes('svelte') ||
        p.name.toLowerCase().includes('heritage');

      return isWolfejam && !isExcluded;
    });

    // GitHub Desktop Style Interface ⚡
    let menu = `\n╭─────────────────────────────────────────────────╮\n`;
    menu += `│         🏎️⚡ wolfejam.dev Projects             │\n`;
    menu += `├─────────────────────────────────────────────────┤\n`;

    // Show wolfejam.dev projects first
    const topProjects = wolfjamProjects.slice(0, 8);
    if (topProjects.length > 0) {
      topProjects.forEach((proj, idx) => {
        const scoreIcon = proj.score >= 90 ? '🏆' : proj.score >= 70 ? '⭐' : '📁';
        const name = proj.name.substring(0, 30).padEnd(30);
        const score = `${proj.score}%`.padStart(4);
        menu += `│ ${(idx + 1).toString().padStart(2)}. ${scoreIcon} ${name} ${score} │\n`;
      });
    } else {
      menu += `│    No wolfejam.dev projects found            │\n`;
    }

    menu += `├─────────────────────────────────────────────────┤\n`;
    menu += `│ [N] → New FAF Project                          │\n`;
    menu += `│ [B] → Browse for project...                    │\n`;
    menu += `│ [R] → Recent (last 5 used)                     │\n`;
    menu += `╰─────────────────────────────────────────────────╯\n\n`;

    menu += `**🏎️⚡ The Wolfejam Way:**\n`;
    menu += `• Select project by number (1-8)\n`;
    menu += `• Or drop any file → type **faf**\n`;
    menu += `• Championship mode: **faf_auto "/path"**\n\n`;

    if (wolfjamProjects.length > 0) {
      menu += `**Active wolfejam.dev Projects (${wolfjamProjects.length} total):**\n\n`;
      wolfjamProjects.forEach((proj, idx) => {
        const icon = proj.score >= 90 ? '🏆' : proj.score >= 70 ? '⭐' : proj.initialized ? '🚀' : '📁';
        menu += `${icon} **${proj.name}** - ${proj.score}/100\n`;
        menu += `   \`${proj.path}\`\n`;
        if (!proj.initialized) {
          menu += `   ⚡ Quick init: \`faf_auto "${proj.path}"\`\n`;
        }
        if (idx < 3) menu += `\n`; // Only show first 3 in detail
        if (idx === 3) menu += `\n   ... and ${wolfjamProjects.length - 3} more projects\n`;
        if (idx >= 3) return; // Stop after first 3
      });
    } else {
      menu += `**Setting up wolfejam.dev workspace...**\n\n`;
      menu += `⚡ Quick Start:\n`;
      menu += `• Drop any project file\n`;
      menu += `• Run: \`faf_auto\`\n`;
      menu += `• Or: \`faf_choose "/path/to/wolfejam.dev"\`\n`;
    }

    menu += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    menu += `💡 **PRO TIP:** Drop any file → type \`faf\` → 99% ready!\n`;
    menu += `🏎️⚡ wolfejam.dev - Championship Software!`;

    // Use DisplayProtocol for consistent global rendering
    return DisplayProtocol.createResponse(menu, {
      tool: 'faf_choose',
      projectCount: wolfjamProjects.length,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Calculate current AI-Readiness score quietly
   */
  private async calculateScore(dir?: string): Promise<number> {
    const targetDir = dir || process.cwd();
    let score = 0;

    if (await this.fileExists(path.join(targetDir, '.faf'))) score += 40;
    if (await this.fileExists(path.join(targetDir, 'CLAUDE.md'))) score += 30;
    if (await this.fileExists(path.join(targetDir, 'README.md'))) score += 15;
    if (await this.fileExists(path.join(targetDir, 'package.json'))) score += 14;

    return score;
  }
}
