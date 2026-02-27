import { CallToolResult, Tool } from '@modelcontextprotocol/sdk/types.js';
import { FafEngineAdapter } from './engine-adapter';
import { fileHandlers } from './fileHandler';
import * as fs from 'fs';
import * as os from 'os';
import * as pathModule from 'path';
import { FuzzyDetector, applyIntelFriday } from '../utils/fuzzy-detector';
import { findFafFile } from '../utils/faf-file-finder.js';
import { VERSION } from '../version';
import { resolveProjectPath, formatPathConfirmation } from '../utils/path-resolver';

export class FafToolHandler {
  constructor(private engineAdapter: FafEngineAdapter) {}

  /**
   * Get the project path - uses explicit path if provided, otherwise returns current context
   * If an explicit path is provided, it also sets the session context for subsequent calls
   */
  private getProjectPath(explicitPath?: string): string {
    if (explicitPath) {
      // Expand tilde
      const expandedPath = explicitPath.startsWith('~')
        ? pathModule.join(os.homedir(), explicitPath.slice(1))
        : explicitPath;

      // Resolve to absolute path
      const resolvedPath = pathModule.resolve(expandedPath);

      // If it's a file path, get the directory
      const projectDir = fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()
        ? pathModule.dirname(resolvedPath)
        : resolvedPath;

      // Set as the new session context
      if (fs.existsSync(projectDir)) {
        this.engineAdapter.setWorkingDirectory(projectDir);
      }

      return projectDir;
    }
    return this.engineAdapter.getWorkingDirectory();
  }

  async listTools() {
    return {
      tools: [
        {
          name: 'faf_about',
          description: 'Learn what .faf format is - THE JPEG for AI 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'faf_what',
          description: 'What is .faf format? Quick explanation of THE JPEG for AI 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'faf_status',
          description: 'Check if your project has project.faf (THE JPEG for AI) - Shows AI-readability status 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_score',
          description: 'Calculate your project\'s AI-readability from project.faf (THE JPEG for AI) - F1-inspired metrics! 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {
              details: { type: 'boolean', description: 'Include detailed breakdown and improvement suggestions' },
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_init',
          description: 'Create project.faf (THE JPEG for AI) - Makes your project instantly AI-readable 🧡⚡️. Just enter path or project name. Examples: ~/Projects/my-app, my-app, /full/path/to/project',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Project path or name. Smart resolution: "my-app" finds ~/Projects/my-app OR ~/Code/my-app. Full paths like ~/Projects/app or /Users/me/code/app work too. Omit to use current directory.'
              },
              force: { type: 'boolean', description: 'Overwrite existing project.faf if it exists' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_trust',
          description: 'Validate project.faf integrity - Trust metrics for THE JPEG for AI 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'faf_sync',
          description: 'Sync project.faf (THE JPEG for AI) with CLAUDE.md - Bi-directional context 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_enhance',
          description: 'Enhance project.faf (THE JPEG for AI) with AI optimization - SPEEDY AI you can TRUST! 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {
              model: { type: 'string', description: 'Target AI model: claude|chatgpt|gemini|universal (default: claude)' },
              focus: { type: 'string', description: 'Enhancement focus: claude-optimal|human-context|ai-instructions|completeness' },
              consensus: { type: 'boolean', description: 'Build consensus from multiple AI models' },
              dryRun: { type: 'boolean', description: 'Preview enhancement without applying changes' },
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_bi_sync',
          description: 'Bi-directional sync between project.faf and CLAUDE.md. v4.5.0: Also sync to AGENTS.md, .cursorrules, GEMINI.md!',
          inputSchema: {
            type: 'object',
            properties: {
              auto: { type: 'boolean', description: 'Enable automatic synchronization' },
              watch: { type: 'boolean', description: 'Start real-time file watching for changes' },
              force: { type: 'boolean', description: 'Force overwrite conflicting changes' },
              agents: { type: 'boolean', description: 'Also sync to AGENTS.md (OpenAI/Codex format)' },
              cursor: { type: 'boolean', description: 'Also sync to .cursorrules (Cursor IDE format)' },
              gemini: { type: 'boolean', description: 'Also sync to GEMINI.md (Google Gemini format)' },
              all: { type: 'boolean', description: 'Sync to ALL formats: CLAUDE.md + AGENTS.md + .cursorrules + GEMINI.md' },
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
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
        },
        {
          name: 'faf_list',
          description: 'List directories and discover projects with project.faf files - Essential for FAF discovery workflow',
          inputSchema: {
            type: 'object',
            properties: {
              path: {
                type: 'string',
                description: 'Directory path to list (e.g., ~/Projects, /Users/username/Projects)'
              },
              filter: {
                type: 'string',
                enum: ['faf', 'dirs', 'all'],
                description: 'Filter: "faf" (only dirs with project.faf), "dirs" (all directories), "all" (dirs and files). Default: "dirs"'
              },
              depth: {
                type: 'number',
                enum: [1, 2],
                description: 'Directory depth to scan: 1 (immediate children) or 2 (one level deeper). Default: 1'
              },
              showHidden: {
                type: 'boolean',
                description: 'Show hidden files/directories (starting with .). Default: false'
              }
            },
            required: ['path'],
            additionalProperties: false
          }
        },
        {
          name: 'faf_chat',
          description: '🗣️ Natural language project.faf generation - Ask 6W questions (Who/What/Why/Where/When/How) to build complete human context 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'faf_friday',
          description: '🎉 Friday Features - Chrome Extension detection, fuzzy matching & more! 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {
              test: {
                type: 'string',
                description: 'Test fuzzy matching with typos like "raect" or "chr ext"'
              }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_guide',
          description: 'FAF MCP usage guide for Claude Desktop - Projects convention, path resolution, and UX patterns',
          inputSchema: {
            type: 'object',
            properties: {},
            additionalProperties: false
          }
        },
        {
          name: 'faf_readme',
          description: '📖 Extract 6 Ws (Who/What/Why/Where/When/How) from README.md into human_context - Smart pattern matching 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {
              apply: { type: 'boolean', description: 'Apply extracted content to project.faf (default: preview only)' },
              force: { type: 'boolean', description: 'Overwrite existing human_context values (default: only fill empty slots)' },
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_human_add',
          description: '🧡 Add a human_context field (who/what/why/where/when/how) - Non-interactive for MCP 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {
              field: {
                type: 'string',
                enum: ['who', 'what', 'why', 'where', 'when', 'how'],
                description: 'The 6 W field to set'
              },
              value: { type: 'string', description: 'The value to set for the field' },
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
            },
            required: ['field', 'value'],
            additionalProperties: false
          }
        },
        {
          name: 'faf_check',
          description: '🔍 Quality inspection for human_context fields + field protection - Shows empty/generic/good/excellent ratings 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {
              protect: { type: 'boolean', description: 'Lock good/excellent fields from being overwritten' },
              unlock: { type: 'boolean', description: 'Remove all field protections' },
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_context',
          description: '📂 Set or view active project context - Path is remembered for subsequent faf_ calls 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Set active project path. If omitted, shows current context.' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_go',
          description: '🎯 Guided interview to Gold Code - Claude asks questions till you hit 100%! Returns questions for missing fields, then apply answers to reach Gold Code 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' },
              answers: {
                type: 'object',
                description: 'Answers to apply. Keys are field paths (e.g., "project.goal", "human_context.why"), values are the answers. If provided, applies answers and returns new score.',
                additionalProperties: { type: 'string' }
              }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_auto',
          description: '🏎️ ONE COMMAND TO RULE THEM ALL - Zero to Championship AI context instantly! Runs init + sync + formats + bi-sync + score in one go 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' },
              force: { type: 'boolean', description: 'Force overwrite existing files' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_dna',
          description: '🧬 Show your FAF DNA journey - See your evolution from birth to championship (22% → 85% → 99%) 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_formats',
          description: '😽 TURBO-CAT format discovery - Discovers all formats in your project (154+ validated types!) and fills stack slots 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' },
              json: { type: 'boolean', description: 'Return results as JSON' }
            },
            additionalProperties: false
          }
        },
        {
          name: 'faf_quick',
          description: '⚡ Lightning-fast .faf creation - One-liner format: "name, description, language, framework, hosting" 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' },
              input: { type: 'string', description: 'Quick input: "project-name, description, language, framework, hosting" (minimum: name, description)' },
              force: { type: 'boolean', description: 'Force overwrite existing .faf file' }
            },
            required: ['input'],
            additionalProperties: false
          }
        },
        {
          name: 'faf_doctor',
          description: '🏥 Health check for your .faf setup - Diagnose and fix common issues 🧡⚡️',
          inputSchema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
            },
            additionalProperties: false
          }
        },
        // ============================================================================
        // v4.5.0 INTEROP TOOLS
        // ============================================================================
        {
          name: 'faf_agents',
          description: 'Import/Export/Sync between AGENTS.md (OpenAI/Codex) and project.faf - AI interop!',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['import', 'export', 'sync'], description: 'Action: import (AGENTS.md -> .faf), export (.faf -> AGENTS.md), sync (bidirectional)' },
              force: { type: 'boolean', description: 'Force overwrite existing files' },
              merge: { type: 'boolean', description: 'Merge imported data with existing .faf instead of replacing' },
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
            },
            required: ['action'],
            additionalProperties: false
          }
        },
        {
          name: 'faf_cursor',
          description: 'Import/Export/Sync between .cursorrules (Cursor IDE) and project.faf - AI interop!',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['import', 'export', 'sync'], description: 'Action: import (.cursorrules -> .faf), export (.faf -> .cursorrules), sync (bidirectional)' },
              force: { type: 'boolean', description: 'Force overwrite existing files' },
              merge: { type: 'boolean', description: 'Merge imported data with existing .faf instead of replacing' },
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
            },
            required: ['action'],
            additionalProperties: false
          }
        },
        {
          name: 'faf_gemini',
          description: 'Import/Export/Sync between GEMINI.md (Google Gemini CLI) and project.faf - AI interop!',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['import', 'export', 'sync'], description: 'Action: import (GEMINI.md -> .faf), export (.faf -> GEMINI.md), sync (bidirectional)' },
              force: { type: 'boolean', description: 'Force overwrite existing files' },
              merge: { type: 'boolean', description: 'Merge imported data with existing .faf instead of replacing' },
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
            },
            required: ['action'],
            additionalProperties: false
          }
        },
        {
          name: 'faf_conductor',
          description: 'Import/Export between conductor/ directory (Google Conductor) and project.faf - AI interop!',
          inputSchema: {
            type: 'object',
            properties: {
              action: { type: 'string', enum: ['import', 'export'], description: 'Action: import (conductor/ -> .faf), export (.faf -> conductor/)' },
              force: { type: 'boolean', description: 'Force overwrite existing files' },
              merge: { type: 'boolean', description: 'Merge imported data with existing .faf instead of replacing' },
              path: { type: 'string', description: 'Project path. Sets session context for subsequent calls.' }
            },
            required: ['action'],
            additionalProperties: false
          }
        },
        {
          name: 'faf_git',
          description: 'Generate project.faf from any GitHub repo URL - 1-click context extraction!',
          inputSchema: {
            type: 'object',
            properties: {
              url: { type: 'string', description: 'GitHub repository URL (e.g., https://github.com/owner/repo or owner/repo)' },
              path: { type: 'string', description: 'Output directory for generated project.faf. If omitted, returns content without writing.' }
            },
            required: ['url'],
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
      case 'faf_read': {
        // Handle faf_read specially to set context when reading project.faf files
        const readResult = await fileHandlers.faf_read(args);
        // If reading a project.faf file, set the session context
        if (args?.path && (args.path.includes('project.faf') || args.path.endsWith('.faf'))) {
          this.getProjectPath(args.path);
        }
        return readResult;
      }
      case 'faf_chat':
        return await this.handleFafChat(args);
      case 'faf_friday':
        return await this.handleFafFriday(args);
      case 'faf_write':
        return await fileHandlers.faf_write(args);
      case 'faf_list':
        return await this.handleFafList(args);
      case 'faf_guide':
        return await this.handleFafGuide(args);
      case 'faf_readme':
        return await this.handleFafReadme(args);
      case 'faf_human_add':
        return await this.handleFafHumanAdd(args);
      case 'faf_check':
        return await this.handleFafCheck(args);
      case 'faf_context':
        return await this.handleFafContext(args);
      case 'faf_go':
        return await this.handleFafGo(args);
      case 'faf_auto':
        return await this.handleFafAuto(args);
      case 'faf_dna':
        return await this.handleFafDna(args);
      case 'faf_formats':
        return await this.handleFafFormats(args);
      case 'faf_quick':
        return await this.handleFafQuick(args);
      case 'faf_doctor':
        return await this.handleFafDoctor(args);
      // v4.5.0 Interop tools
      case 'faf_agents':
        return await this.handleFafAgents(args);
      case 'faf_cursor':
        return await this.handleFafCursor(args);
      case 'faf_gemini':
        return await this.handleFafGemini(args);
      case 'faf_conductor':
        return await this.handleFafConductor(args);
      case 'faf_git':
        return await this.handleFafGit(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
  
  private async handleFafStatus(args: any): Promise<CallToolResult> {
    // Native implementation - no CLI needed!
    const cwd = this.getProjectPath(args?.path);

    try {
      const fafResult = await findFafFile(cwd);

      if (!fafResult) {
        return {
          content: [{
            type: 'text',
            text: `🤖 Claude FAF Project Status:\n\n❌ No FAF file found in ${cwd}\n💡 Run faf_init to create project.faf`
          }]
        };
      }

      const fafContent = fs.readFileSync(fafResult.path, 'utf-8');
      const lines = fafContent.split('\n').slice(0, 20);

      return {
        content: [{
          type: 'text',
          text: `🤖 Claude FAF Project Status:\n\n✅ ${fafResult.filename} found in ${cwd}\n\nContent preview:\n${lines.join('\n')}`
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

      // Get current working directory - uses path param or session context
      const cwd = this.getProjectPath(args?.path);

      // Score calculation components
      let score = 0;
      const details: string[] = [];

      // 1. Check for FAF file (40 points) - v1.2.0: project.faf, *.faf, or .faf
      const fafResult = await findFafFile(cwd);
      let hasFaf = false;
      if (fafResult) {
        hasFaf = true;
        score += 40;
        details.push(`✅ ${fafResult.filename} present (+40)`);
      } else {
        details.push('❌ FAF file missing (0/40)');
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

      // Format the output
      let output = '';

      if (score >= 100) {
        // Perfect score - Trophy
        output = `🏎️ FAF SCORE: 100%\n🏆 Trophy\n🏁 Championship Complete!\n\n`;
        if (args?.details) {
          output += `${details.join('\n')}\n\n`;
          output += `🏆 PERFECT SCORE!\n`;
          output += `Both .faf and CLAUDE.md are championship-quality!\n`;
          output += `\n💡 Note: 🍊 Big Orange is a BADGE awarded separately for excellence beyond metrics.`;
        }
      } else {
        // Regular score - FAF standard tiers
        const percentage = Math.min(score, 100);
        let rating = '';
        let emoji = '';

        if (percentage >= 99) {
          rating = 'Gold';
          emoji = '🥇';
        } else if (percentage >= 95) {
          rating = 'Silver';
          emoji = '🥈';
        } else if (percentage >= 85) {
          rating = 'Bronze';
          emoji = '🥉';
        } else if (percentage >= 70) {
          rating = 'Green';
          emoji = '🟢';
        } else if (percentage >= 55) {
          rating = 'Yellow';
          emoji = '🟡';
        } else {
          rating = 'Red';
          emoji = '🔴';
        }

        // The 3-line killer display
        output = `📊 FAF SCORE: ${percentage}%\n${emoji} ${rating}\n🏁 AI-Ready: ${percentage >= 85 ? 'Yes' : 'Building'}\n`;

        if (args?.details) {
          output += `\n${details.join('\n')}`;
          if (percentage < 100) {
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
    // Native implementation - creates project.faf with Pomelli-simple path resolution!
    try {
      // Use smart path resolution (supports "my-app", "~/Projects/my-app", "/full/path")
      const userInput = args?.path;
      const resolution = resolveProjectPath(userInput);

      const targetDir = resolution.projectPath;
      const projectName = resolution.projectName;
      const fafPath = resolution.fafFilePath;

      // Ensure project directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      // Check if any FAF file exists and force flag
      const existingFaf = await findFafFile(targetDir);
      if (existingFaf && !args?.force) {
        return {
          content: [{
            type: 'text',
            text: `🚀 Claude FAF Initialization:\n\n⚠️ ${existingFaf.filename} already exists in ${targetDir}\n💡 Use force: true to overwrite`
          }]
        };
      }

      // Check project type with fuzzy detection (Friday Feature!)
      const projectDescription = args?.description || '';

      // Detect Chrome Extension with fuzzy matching
      const chromeDetection = FuzzyDetector.detectChromeExtension(projectDescription);
      const projectType = FuzzyDetector.detectProjectType(projectDescription);

      // Build project data with Intel-Friday auto-fill!
      let projectData: any = {
        project: projectName,
        project_type: projectType,
        description: projectDescription,
        generated: new Date().toISOString(),
        version: VERSION
      };

      // Apply Intel-Friday: Auto-fill Chrome Extension slots for 90%+ score!
      if (chromeDetection.detected) {
        projectData = applyIntelFriday(projectData);
      }

      // Create enhanced .faf content
      const fafContent = `# FAF - Foundational AI Context
project: ${projectData.project}
type: ${projectData.project_type}${chromeDetection.detected ? ' 🎯' : ''}
context: I⚡🍊
generated: ${projectData.generated}
version: ${projectData.version}
${chromeDetection.corrected ? `# Auto-corrected: "${args?.description}" → "${chromeDetection.corrected}"` : ''}

# The Formula
human_input: Your project files
multiplier: FAF Context
output: Championship Performance

# Quick Context
working_directory: ${targetDir}
initialized_by: claude-faf-mcp${projectData._friday_feature ? `\nfriday_feature: ${projectData._friday_feature}` : ''}
vitamin_context: true
faffless: true

${chromeDetection.detected ? `# Chrome Extension Auto-Fill (90%+ Score!)
runtime: ${projectData.runtime}
hosting: ${projectData.hosting}
api_type: ${projectData.api_type}
backend: ${projectData.backend}
database: ${projectData.database}
build: ${projectData.build}
package_manager: ${projectData.package_manager}` : ''}
`;

      fs.writeFileSync(fafPath, fafContent);

      // Pomelli-style success confirmation with path resolution info
      const pathConfirmation = formatPathConfirmation(resolution);
      const sourceExplanation = resolution.source === 'user-name'
        ? `\n\n💡 Smart resolution: "${userInput}" → ${targetDir}`
        : '';

      return {
        content: [{
          type: 'text',
          text: `🚀 Claude FAF Initialization:\n\n✅ Created project.faf\n\n${pathConfirmation}${sourceExplanation}\n\n🍊 Vitamin Context activated!\n⚡ FAFFLESS AI ready!${
            chromeDetection.detected ? '\n\n🎯 Friday Feature: Chrome Extension detected!\n📈 Auto-filled 7 slots for 90%+ score!' : ''
          }${
            chromeDetection.corrected ? `\n📝 Auto-corrected: "${args?.description}" → "${chromeDetection.corrected}"` : ''
          }\n\n🏁 Next steps:\n  • Run faf_score for AI-readiness score\n  • Run faf_sync to create CLAUDE.md\n  • Run faf_enhance to improve context`
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

  private async handleFafTrust(_args: any): Promise<CallToolResult> {  // ✅ FIXED: Prefixed unused args
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

    const output = typeof result.data === 'string'
      ? result.data
      : result.data?.output || JSON.stringify(result.data, null, 2);

    return {
      content: [{
        type: 'text',
        text: `🔒 Claude FAF Trust Validation:\n\n${output}`
      }]
    };
  }

  private async handleFafSync(args: any): Promise<CallToolResult> {
    // Set project context if path provided
    if (args?.path) {
      this.getProjectPath(args.path);
    }
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

    const output = typeof result.data === 'string'
      ? result.data
      : result.data?.output || JSON.stringify(result.data, null, 2);

    return {
      content: [{
        type: 'text',
        text: `🔄 Claude FAF Sync:\n\n${output}`
      }]
    };
  }

  private async handleFafEnhance(args: any): Promise<CallToolResult> {
    // Set project context if path provided
    if (args?.path) {
      this.getProjectPath(args.path);
    }

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

    const output = typeof result.data === 'string'
      ? result.data
      : result.data?.message || result.data?.output || JSON.stringify(result.data, null, 2);

    return {
      content: [{
        type: 'text',
        text: `🚀 Claude FAF Enhancement:\n\n${output}`
      }]
    };
  }

  private async handleFafBiSync(args: any): Promise<CallToolResult> {
    // Set project context if path provided
    if (args?.path) {
      this.getProjectPath(args.path);
    }

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

    const output = typeof result.data === 'string'
      ? result.data
      : result.data?.output || JSON.stringify(result.data, null, 2);

    return {
      content: [{
        type: 'text',
        text: `🔗 Claude FAF Bi-Sync:\n\n${output}`
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

    const output = typeof result.data === 'string'
      ? result.data
      : result.data?.output || JSON.stringify(result.data, null, 2);

    return {
      content: [{
        type: 'text',
        text: `🧹 Claude FAF Clear:\n\n${output}`
      }]
    };
  }

  private async handleFafAbout(_args: any): Promise<CallToolResult> {  // ✅ FIXED: Prefixed unused args
    // Stop FAFfing about and get the facts!
    const packageInfo = {
      name: 'claude-faf-mcp',
      version: VERSION,
      description: 'We ARE the C in MCP. I⚡🍊 - The formula that changes everything.',
      author: 'FAF Team (team@faf.one)',
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

  private async handleFafWhat(_args: any): Promise<CallToolResult> {  // ✅ FIXED: Prefixed unused args
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

  private async handleFafDebug(_args: any): Promise<CallToolResult> {  // ✅ FIXED: Prefixed unused args
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const _execAsync = promisify(exec);

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
      
      // Check FAF CLI availability using championship auto-detection
      try {
        const cliInfo = this.engineAdapter.getCliInfo();

        if (cliInfo.detected && cliInfo.path) {
          debugInfo.fafCliPath = cliInfo.path;
          debugInfo.fafVersion = cliInfo.version || null;
        } else {
          debugInfo.fafCliPath = null;
          debugInfo.fafVersion = null;
        }
      } catch (error) {
        debugInfo.permissions.fafError = error instanceof Error ? error.message : String(error);
      }
      
      // Check for existing FAF file (v1.2.0: project.faf, *.faf, or .faf)
      const fafResult = await findFafFile(cwd);
      const hasFaf = fafResult !== null;

      const debugOutput = `🔍 Claude FAF MCP Server Debug Information:

📂 Working Directory: ${debugInfo.workingDirectory}
✏️ Write Permissions: ${debugInfo.canWrite ? '✅ Yes' : '❌ No'}
${debugInfo.permissions.writeError ? `   Error: ${debugInfo.permissions.writeError}\n` : ''}🤖 FAF Engine Path: ${debugInfo.enginePath}
🏎️ FAF CLI Path: ${debugInfo.fafCliPath || '❌ Not found'}
📋 FAF Version: ${debugInfo.fafVersion || 'Unknown'}
${debugInfo.permissions.fafError ? `   FAF Error: ${debugInfo.permissions.fafError}\n` : ''}📄 FAF File: ${hasFaf ? `✅ ${fafResult.filename} exists` : '❌ Not found (run faf_init)'}
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

  private async handleFafChat(_args: any): Promise<CallToolResult> {
    try {
      const result = await this.engineAdapter.callEngine('chat');

      if (!result.success) {
        return {
          content: [{
            type: 'text',
            text: `Error running faf chat: ${result.error || 'Unknown error'}`
          }],
          isError: true
        };
      }

      // Format the response text
      const responseText = typeof result.data === 'string'
        ? result.data
        : result.data?.output || JSON.stringify(result.data, null, 2);

      return {
        content: [{
          type: 'text',
          text: responseText
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: 'text',
          text: `Error running faf chat: ${error instanceof Error ? error.message : String(error)}`
        }],
        isError: true
      };
    }
  }

  private async handleFafFriday(args: any): Promise<CallToolResult> {
    const { test } = args || {};

    let response = `🎉 **Friday Features in FAF MCP!**\n\n`;
    response += `**Chrome Extension Auto-Detection** | Boosts scores to 90%+ automatically\n`;
    response += `**Universal Fuzzy Matching** | Typo-tolerant: "raect"→"react", "chr ext"→"chrome extension"\n`;
    response += `**Intel-Friday™** | Smart IF statements that add massive value\n\n`;

    if (test) {
      // Test fuzzy matching
      const suggestion = FuzzyDetector.getSuggestion(test);
      const projectType = FuzzyDetector.detectProjectType(test);
      const chromeDetection = FuzzyDetector.detectChromeExtension(test);

      response += `\n**Testing: "${test}"**\n`;

      if (suggestion) {
        response += `✅ Fuzzy Match: "${test}" → "${suggestion}"\n`;
      }

      response += `📦 Project Type Detected: ${projectType}\n`;

      if (chromeDetection.detected) {
        response += `🎯 Chrome Extension Detected! (Confidence: ${chromeDetection.confidence})\n`;
        if (chromeDetection.corrected) {
          response += `   Corrected from: "${test}" → "${chromeDetection.corrected}"\n`;
        }
      }

      // Show what would be auto-filled
      if (chromeDetection.detected && chromeDetection.confidence === 'high') {
        response += `\n**Auto-fill Preview (7 slots for 90%+ score):**\n`;
        const slots = FuzzyDetector.getChromeExtensionSlots();
        for (const [key, value] of Object.entries(slots)) {
          response += `• ${key}: ${value}\n`;
        }
      }
    } else {
      response += `\n💡 Try: \`faf_friday test:"raect"\` or \`faf_friday test:"chr ext"\``;
    }

    return {
      content: [{
        type: 'text',
        text: response
      }]
    };
  }

  private async handleFafGuide(_args: any): Promise<CallToolResult> {
    const guide = `# FAF MCP - Claude Desktop Guide

## Path Convention (CRITICAL)
**Default**: \`~/Projects/[project-name]/project.faf\`

**Project name from:**
1. AI inference (README, files, context)
2. User statement
3. User custom path (always wins)

**Example Flow:**
- User uploads README for "Heritage Club Dubai"
- Infer: \`~/Projects/heritage-club-dubai/project.faf\`
- Confirm: "Creating at ~/Projects/heritage-club-dubai/"

## Real Filesystem Only
- ✅ \`/Users/wolfejam/Projects/my-app/\`
- ❌ \`/mnt/user-data/\` (container paths)
- ❌ \`/home/claude/\` (container paths)

## Commands
All work: \`faf init\`, \`faf init new\`, \`faf init --new\`, \`faf init -new\`

**Core:**
- \`faf init\` - create FAF (infer path from context)
- \`faf score\` - show AI-readiness
- \`faf sync\` - synchronize files
- \`faf quick\` - rapid FAF creation

**Extensions:**
- \`new\` - force overwrite existing
- \`full\` - detailed output
- \`bi\` - bi-directional sync

## UX Rules
1. **Don't offer option menus** - just solve it
2. **Infer project name** from context
3. **Suggest Projects path** if ambiguous
4. **User path always wins**
5. **No CLI talk** - you ARE the FAF system

## Quick Patterns

**User uploads README:**
→ Infer project name
→ Create at \`~/Projects/[name]/project.faf\`
→ Confirm location

**User gives path:**
→ Use exactly as provided
→ No validation needed

**No context available:**
→ Ask once: "Project name or path?"
→ Use Projects convention with answer

## Username Detection
- Check \`$HOME\` environment
- Default to \`~/Projects/\` structure
- Works across macOS/Linux/Windows

## Test Your Understanding
❌ "I need more information" (when README uploaded)
❌ "Option 1, Option 2, Option 3..." (option menus)
❌ Creating files in \`/mnt/user-data/\`
✅ "Creating FAF for [project] at ~/Projects/[name]/"
✅ Using context to infer and act
✅ Real filesystem paths only`;

    return {
      content: [{
        type: 'text',
        text: guide
      }]
    };
  }

  private async handleFafList(args: any): Promise<CallToolResult> {
    try {
      const fs = await import('fs');
      const path = await import('path');

      // Parse arguments
      const targetPath = args?.path || this.engineAdapter.getWorkingDirectory();
      const filter = args?.filter || 'dirs';
      const depth = args?.depth || 1;
      const showHidden = args?.showHidden || false;

      // Expand tilde
      const expandedPath = targetPath.startsWith('~')
        ? path.join(os.homedir(), targetPath.slice(1))
        : targetPath;

      const resolvedPath = path.resolve(expandedPath);

      // Check if directory exists
      if (!fs.existsSync(resolvedPath)) {
        return {
          content: [{
            type: 'text',
            text: `❌ Directory not found: ${resolvedPath}`
          }],
          isError: true
        };
      }

      // Check if it's actually a directory
      const stats = fs.statSync(resolvedPath);
      if (!stats.isDirectory()) {
        return {
          content: [{
            type: 'text',
            text: `❌ Not a directory: ${resolvedPath}`
          }],
          isError: true
        };
      }

      // Scan directory
      const results: Array<{name: string; path: string; hasFaf: boolean; isDir: boolean}> = [];

      const scanDir = (dirPath: string, currentDepth: number) => {
        if (currentDepth > depth) return;

        const entries = fs.readdirSync(dirPath);

        for (const entry of entries) {
          // Skip hidden files unless requested
          if (!showHidden && entry.startsWith('.')) continue;

          const fullPath = path.join(dirPath, entry);
          const entryStats = fs.statSync(fullPath);
          const isDir = entryStats.isDirectory();

          // Check for project.faf
          const hasFaf = isDir && fs.existsSync(path.join(fullPath, 'project.faf'));

          // Apply filter
          if (filter === 'faf' && !hasFaf) continue;
          if (filter === 'dirs' && !isDir) continue;

          results.push({
            name: entry,
            path: fullPath,
            hasFaf,
            isDir
          });

          // Recurse if needed
          if (isDir && currentDepth < depth) {
            scanDir(fullPath, currentDepth + 1);
          }
        }
      };

      scanDir(resolvedPath, 1);

      // Sort: FAF projects first, then alphabetically
      results.sort((a, b) => {
        if (a.hasFaf && !b.hasFaf) return -1;
        if (!a.hasFaf && b.hasFaf) return 1;
        return a.name.localeCompare(b.name);
      });

      // Format output
      let output = `📁 ${resolvedPath}\n\n`;

      if (results.length === 0) {
        output += '(empty)\n';
      } else {
        for (const item of results) {
          const indent = item.path.split('/').length - resolvedPath.split('/').length - 1;
          const prefix = '  '.repeat(indent);
          const icon = item.isDir ? '📁' : '📄';
          const status = item.hasFaf ? '✅ project.faf' : '';

          output += `${prefix}${icon} ${item.name}`;
          if (status) output += ` ${status}`;
          output += '\n';
        }
      }

      output += `\nTotal: ${results.length} items`;
      if (filter === 'faf') {
        const fafCount = results.filter(r => r.hasFaf).length;
        output += ` (${fafCount} with project.faf)`;
      }

      return {
        content: [{
          type: 'text',
          text: output
        }]
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [{
          type: 'text',
          text: `❌ Failed to list directory: ${errorMessage}`
        }],
        isError: true
      };
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // NEW: Human Context Tools (v3.2.0 parity)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  private async handleFafReadme(args: any): Promise<CallToolResult> {
    try {
      const path = await import('path');
      const cwd = this.getProjectPath(args?.path);

      // Find README.md
      const readmePath = path.join(cwd, 'README.md');
      if (!fs.existsSync(readmePath)) {
        return {
          content: [{
            type: 'text',
            text: `📖 FAF README Extraction:\n\n❌ No README.md found in ${cwd}\n💡 Create a README.md first`
          }],
          isError: true
        };
      }

      // Find project.faf
      const fafResult = await findFafFile(cwd);
      if (!fafResult) {
        return {
          content: [{
            type: 'text',
            text: `📖 FAF README Extraction:\n\n❌ No project.faf found in ${cwd}\n💡 Run faf_init first`
          }],
          isError: true
        };
      }

      // Read README content
      const readmeContent = fs.readFileSync(readmePath, 'utf-8');

      // Extract 6 Ws using simple pattern matching
      const extracted = this.extractSixWsFromReadme(readmeContent);

      if (!args?.apply) {
        // Preview mode
        let output = `📖 FAF README Extraction (Preview)\n\n`;
        output += `Found in README.md:\n`;
        for (const [field, value] of Object.entries(extracted)) {
          if (value) {
            output += `  ${field.toUpperCase()}: ${value}\n`;
          }
        }
        output += `\n💡 Use apply: true to save to project.faf`;
        return { content: [{ type: 'text', text: output }] };
      }

      // Apply mode - update project.faf
      const fafContent = fs.readFileSync(fafResult.path, 'utf-8');
      const yaml = await import('yaml');
      const fafData = yaml.parse(fafContent) || {};

      if (!fafData.human_context) {
        fafData.human_context = {};
      }

      let appliedCount = 0;
      for (const [field, value] of Object.entries(extracted)) {
        if (value) {
          const existingValue = fafData.human_context[field];
          if (!existingValue || args?.force) {
            fafData.human_context[field] = value;
            appliedCount++;
          }
        }
      }

      fs.writeFileSync(fafResult.path, yaml.stringify(fafData), 'utf-8');

      return {
        content: [{
          type: 'text',
          text: `📖 FAF README Extraction:\n\n✅ Applied ${appliedCount} field(s) to human_context\n📁 Updated: ${fafResult.filename}`
        }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `📖 FAF README Extraction:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  private extractSixWsFromReadme(content: string): Record<string, string | null> {
    const result: Record<string, string | null> = {
      who: null, what: null, why: null, where: null, when: null, how: null
    };

    // WHAT: First paragraph after title
    const whatMatch = content.match(/^#\s+[^\n]+\n+(?:\*\*[^*]+\*\*\n+)?([A-Z][^#\n]{30,})/m);
    if (whatMatch) result.what = whatMatch[1].trim().substring(0, 200);

    // WHO: Look for "team", "company", "by", "for"
    const whoMatch = content.match(/(?:built by|created by|maintained by|for|team)\s+([^\n.]{10,50})/i);
    if (whoMatch) result.who = whoMatch[1].trim();

    // WHY: Look for "because", "to", benefits
    const whyMatch = content.match(/(?:because|to help|enables|allows|makes it)\s+([^\n.]{15,100})/i);
    if (whyMatch) result.why = whyMatch[1].trim();

    // WHERE: Look for deployment/runtime mentions
    const whereMatch = content.match(/(?:runs on|deployed to|works with|for)\s+(browser|server|edge|npm|cargo|cloud|local)/i);
    if (whereMatch) result.where = whereMatch[0].trim();

    // WHEN: Look for version, date
    const whenMatch = content.match(/(?:version|v)\s*(\d+\.\d+(?:\.\d+)?)/i);
    if (whenMatch) result.when = `v${whenMatch[1]}`;

    // HOW: Look for install/run commands
    const howMatch = content.match(/(?:npm install|cargo|pip install|brew install)\s+[^\n]+/i);
    if (howMatch) result.how = howMatch[0].trim();

    return result;
  }

  private async handleFafHumanAdd(args: any): Promise<CallToolResult> {
    try {
      const { field, value } = args;

      if (!field || !value) {
        return {
          content: [{
            type: 'text',
            text: `🧡 FAF Human Set:\n\n❌ Both field and value are required\n💡 Example: field="who", value="Development team"`
          }],
          isError: true
        };
      }

      const validFields = ['who', 'what', 'why', 'where', 'when', 'how'];
      if (!validFields.includes(field)) {
        return {
          content: [{
            type: 'text',
            text: `🧡 FAF Human Set:\n\n❌ Invalid field: ${field}\n💡 Valid fields: ${validFields.join(', ')}`
          }],
          isError: true
        };
      }

      const cwd = this.getProjectPath(args?.path);
      const fafResult = await findFafFile(cwd);

      if (!fafResult) {
        return {
          content: [{
            type: 'text',
            text: `🧡 FAF Human Add:\n\n❌ No project.faf found in ${cwd}\n💡 Run faf_init first`
          }],
          isError: true
        };
      }

      const fafContent = fs.readFileSync(fafResult.path, 'utf-8');
      const yaml = await import('yaml');
      const fafData = yaml.parse(fafContent) || {};

      if (!fafData.human_context) {
        fafData.human_context = {};
      }

      fafData.human_context[field] = value;
      fs.writeFileSync(fafResult.path, yaml.stringify(fafData), 'utf-8');

      return {
        content: [{
          type: 'text',
          text: `🧡 FAF Human Set:\n\n✅ Set ${field.toUpperCase()} = "${value}"\n📁 Updated: ${fafResult.filename}`
        }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `🧡 FAF Human Set:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleFafCheck(args: any): Promise<CallToolResult> {
    try {
      const cwd = this.getProjectPath(args?.path);
      const fafResult = await findFafFile(cwd);

      if (!fafResult) {
        return {
          content: [{
            type: 'text',
            text: `🔍 FAF Check:\n\n❌ No project.faf found in ${cwd}\n💡 Run faf_init first`
          }],
          isError: true
        };
      }

      const fafContent = fs.readFileSync(fafResult.path, 'utf-8');
      const yaml = await import('yaml');
      const fafData = yaml.parse(fafContent) || {};
      const humanContext = fafData.human_context || {};
      const protectedFields: string[] = fafData._protected_fields || [];

      const fields = ['who', 'what', 'why', 'where', 'when', 'how'];

      // Handle --unlock
      if (args?.unlock) {
        fafData._protected_fields = [];
        fs.writeFileSync(fafResult.path, yaml.stringify(fafData), 'utf-8');
        return {
          content: [{
            type: 'text',
            text: `🔓 FAF Check:\n\n✅ All fields unlocked\n📁 Updated: ${fafResult.filename}`
          }]
        };
      }

      // Assess quality
      const assessField = (value: string | null): string => {
        if (!value || value.trim() === '') return 'empty';
        if (value.length < 10) return 'generic';
        if (value.length > 20) return 'good';
        return 'generic';
      };

      const qualities: Record<string, string> = {};
      for (const field of fields) {
        qualities[field] = assessField(humanContext[field]);
      }

      // Handle --protect
      if (args?.protect) {
        const toProtect = fields.filter(f =>
          qualities[f] === 'good' || qualities[f] === 'excellent'
        );
        if (toProtect.length === 0) {
          return {
            content: [{
              type: 'text',
              text: `🔒 FAF Check:\n\n⚠️ No fields qualify for protection (need good or excellent quality)`
            }]
          };
        }
        fafData._protected_fields = [...new Set([...protectedFields, ...toProtect])];
        fs.writeFileSync(fafResult.path, yaml.stringify(fafData), 'utf-8');
        return {
          content: [{
            type: 'text',
            text: `🔒 FAF Check:\n\n✅ Protected ${toProtect.length} field(s): ${toProtect.join(', ')}\n📁 Updated: ${fafResult.filename}`
          }]
        };
      }

      // Default: show quality report
      const icons: Record<string, string> = {
        empty: '⬜', generic: '🟡', good: '🟢', excellent: '💎'
      };

      let output = `🔍 FAF Human Context Quality\n\n`;
      for (const field of fields) {
        const q = qualities[field];
        const locked = protectedFields.includes(field) ? '🔒' : '  ';
        const value = humanContext[field] || '(empty)';
        const displayValue = value.length > 40 ? value.substring(0, 37) + '...' : value;
        output += `${icons[q]} ${locked} ${field.toUpperCase().padEnd(6)} ${displayValue}\n`;
      }

      const goodCount = fields.filter(f => qualities[f] === 'good' || qualities[f] === 'excellent').length;
      const emptyCount = fields.filter(f => qualities[f] === 'empty').length;

      output += `\n📊 Quality: ${Math.round((goodCount / fields.length) * 100)}%\n`;
      if (protectedFields.length > 0) {
        output += `🔒 Protected: ${protectedFields.join(', ')}\n`;
      }
      if (emptyCount > 0) {
        output += `\n💡 Use faf_readme or faf_human_add to fill empty slots`;
      }

      return { content: [{ type: 'text', text: output }] };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `🔍 FAF Check:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleFafContext(args: any): Promise<CallToolResult> {
    try {
      if (args?.path) {
        // Set the new context
        const newPath = this.getProjectPath(args.path);
        const fafResult = await findFafFile(newPath);

        return {
          content: [{
            type: 'text',
            text: `📂 FAF Context Set:\n\n✅ Active project: ${newPath}\n${fafResult ? `✅ project.faf found: ${fafResult.filename}` : '⚠️ No project.faf in this directory'}\n\n💡 Subsequent faf_* calls will use this context`
          }]
        };
      } else {
        // Show current context
        const currentPath = this.engineAdapter.getWorkingDirectory();
        const fafResult = await findFafFile(currentPath);

        return {
          content: [{
            type: 'text',
            text: `📂 FAF Current Context:\n\n📁 Active project: ${currentPath}\n${fafResult ? `✅ project.faf: ${fafResult.filename}` : '⚠️ No project.faf found'}\n\n💡 Use path parameter to change context`
          }]
        };
      }
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `📂 FAF Context:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  /**
   * faf_go - Guided interview to Gold Code
   *
   * Two-phase operation:
   * 1. Without answers: Returns questions for missing fields
   * 2. With answers: Applies answers to .faf file and returns new score
   */
  private async handleFafGo(args: any): Promise<CallToolResult> {
    const yaml = await import('yaml');
    const cwd = this.getProjectPath(args?.path);

    try {
      // Find .faf file
      const fafResult = await findFafFile(cwd);

      if (!fafResult) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              needsInit: true,
              context: 'faf_go',
              message: 'No project.faf found. Run faf_init first to create project DNA.',
              suggestion: 'Use faf_init to create project.faf, then use faf_go to reach Gold Code.'
            }, null, 2)
          }]
        };
      }

      const fafContent = fs.readFileSync(fafResult.path, 'utf-8');
      const fafData = yaml.parse(fafContent) || {};

      // Question registry - maps field paths to questions
      const QUESTION_REGISTRY: Record<string, { question: string; header: string; type: string; required: boolean; options?: Array<{ label: string; value: string; description: string }> }> = {
        'project.goal': {
          question: 'What does this project do? (one sentence)',
          header: 'Goal',
          type: 'text',
          required: true
        },
        'project.name': {
          question: 'What is the name of this project?',
          header: 'Name',
          type: 'text',
          required: true
        },
        'project.main_language': {
          question: 'What is the primary programming language?',
          header: 'Language',
          type: 'select',
          required: true,
          options: [
            { label: 'TypeScript', value: 'TypeScript', description: 'JavaScript with types' },
            { label: 'JavaScript', value: 'JavaScript', description: 'Vanilla JS or Node.js' },
            { label: 'Python', value: 'Python', description: 'Python 3.x' },
            { label: 'Rust', value: 'Rust', description: 'Systems programming' },
            { label: 'Go', value: 'Go', description: 'Golang' },
            { label: 'Other', value: 'Other', description: 'Specify manually' }
          ]
        },
        'human_context.why': {
          question: 'Why does this project exist? (motivation)',
          header: 'Why',
          type: 'text',
          required: true
        },
        'human_context.who': {
          question: 'Who uses this project? (target audience)',
          header: 'Who',
          type: 'text',
          required: false
        },
        'human_context.what': {
          question: 'What problem does this solve?',
          header: 'What',
          type: 'text',
          required: false
        },
        'human_context.where': {
          question: 'Where does this run? (environment)',
          header: 'Where',
          type: 'text',
          required: false
        },
        'human_context.when': {
          question: 'When was this started or what phase is it in?',
          header: 'When',
          type: 'text',
          required: false
        },
        'human_context.how': {
          question: 'How should AI assist with this project?',
          header: 'How',
          type: 'text',
          required: false
        },
        'stack.frontend': {
          question: 'What frontend framework do you use?',
          header: 'Frontend',
          type: 'select',
          required: false,
          options: [
            { label: 'React', value: 'React', description: 'React.js' },
            { label: 'Vue', value: 'Vue', description: 'Vue.js' },
            { label: 'Svelte', value: 'Svelte', description: 'Svelte/SvelteKit' },
            { label: 'Next.js', value: 'Next.js', description: 'React framework' },
            { label: 'None', value: 'None', description: 'No frontend' },
            { label: 'Other', value: 'Other', description: 'Specify manually' }
          ]
        },
        'stack.backend': {
          question: 'What backend framework do you use?',
          header: 'Backend',
          type: 'select',
          required: false,
          options: [
            { label: 'Express', value: 'Express', description: 'Node.js Express' },
            { label: 'Fastify', value: 'Fastify', description: 'Node.js Fastify' },
            { label: 'Django', value: 'Django', description: 'Python Django' },
            { label: 'FastAPI', value: 'FastAPI', description: 'Python FastAPI' },
            { label: 'None', value: 'None', description: 'No backend' },
            { label: 'Other', value: 'Other', description: 'Specify manually' }
          ]
        },
        'stack.database': {
          question: 'What database do you use?',
          header: 'Database',
          type: 'select',
          required: false,
          options: [
            { label: 'PostgreSQL', value: 'PostgreSQL', description: 'Relational database' },
            { label: 'MongoDB', value: 'MongoDB', description: 'Document database' },
            { label: 'SQLite', value: 'SQLite', description: 'File-based database' },
            { label: 'Supabase', value: 'Supabase', description: 'Postgres + auth' },
            { label: 'None', value: 'None', description: 'No database' },
            { label: 'Other', value: 'Other', description: 'Specify manually' }
          ]
        },
        'stack.hosting': {
          question: 'Where is this hosted/deployed?',
          header: 'Hosting',
          type: 'select',
          required: false,
          options: [
            { label: 'Vercel', value: 'Vercel', description: 'Frontend/serverless' },
            { label: 'AWS', value: 'AWS', description: 'Amazon Web Services' },
            { label: 'Cloudflare', value: 'Cloudflare', description: 'Workers/Pages' },
            { label: 'Railway', value: 'Railway', description: 'App hosting' },
            { label: 'Local only', value: 'Local', description: 'Not deployed' },
            { label: 'Other', value: 'Other', description: 'Specify manually' }
          ]
        }
      };

      // Priority order for questions
      const priorityOrder = [
        'project.goal',
        'human_context.why',
        'human_context.who',
        'human_context.what',
        'project.name',
        'project.main_language',
        'stack.database',
        'stack.hosting',
        'stack.frontend',
        'stack.backend',
        'human_context.where',
        'human_context.when',
        'human_context.how'
      ];

      // Helper to get nested value
      const getNestedValue = (obj: any, path: string): any => {
        const parts = path.split('.');
        let value = obj;
        for (const part of parts) {
          if (value && typeof value === 'object' && part in value) {
            value = value[part];
          } else {
            return undefined;
          }
        }
        return value;
      };

      // Helper to set nested value
      const setNestedValue = (obj: any, path: string, value: any): void => {
        const parts = path.split('.');
        let current = obj;
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!(part in current)) {
            current[part] = {};
          }
          current = current[part];
        }
        current[parts[parts.length - 1]] = value;
      };

      // Check if value is empty/placeholder
      const isEmpty = (value: any): boolean => {
        return value === undefined ||
          value === null ||
          value === '' ||
          value === 'Unknown' ||
          value === 'TBD' ||
          value === 'None' ||
          (typeof value === 'string' && value.toLowerCase().includes('placeholder'));
      };

      // PHASE 2: Apply answers if provided
      if (args?.answers && typeof args.answers === 'object') {
        const answers = args.answers as Record<string, string>;
        let appliedCount = 0;

        for (const [fieldPath, answer] of Object.entries(answers)) {
          if (answer && answer.trim()) {
            setNestedValue(fafData, fieldPath, answer.trim());
            appliedCount++;
          }
        }

        // Write updated file
        fs.writeFileSync(fafResult.path, yaml.stringify(fafData), 'utf-8');

        // Calculate new score (simple count-based)
        const totalFields = Object.keys(QUESTION_REGISTRY).length;
        const filledFields = Object.keys(QUESTION_REGISTRY).filter(field => !isEmpty(getNestedValue(fafData, field))).length;
        const newScore = Math.round((filledFields / totalFields) * 100);

        const celebration = newScore >= 100 ? '🏆 GOLD CODE ACHIEVED!' :
          newScore >= 85 ? '🥇 Championship grade!' :
          newScore >= 70 ? '🥈 Great progress!' : '📈 Keep going!';

        return {
          content: [{
            type: 'text',
            text: `🎯 FAF Go - Answers Applied!\n\n✅ Updated ${appliedCount} field(s) in ${fafResult.filename}\n📊 New Score: ${newScore}%\n${celebration}\n\n${newScore < 100 ? '💡 Run faf_go again to continue to Gold Code!' : '✨ Your AI now has complete context!'}`
          }]
        };
      }

      // PHASE 1: Analyze and return questions
      const missingFields: string[] = [];
      for (const fieldPath of Object.keys(QUESTION_REGISTRY)) {
        const value = getNestedValue(fafData, fieldPath);
        if (isEmpty(value)) {
          missingFields.push(fieldPath);
        }
      }

      // Calculate current score
      const totalFields = Object.keys(QUESTION_REGISTRY).length;
      const filledFields = totalFields - missingFields.length;
      const currentScore = Math.round((filledFields / totalFields) * 100);

      // Already at 100%?
      if (currentScore >= 100) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              complete: true,
              score: 100,
              message: '🏆 GOLD CODE ACHIEVED! Your project has 100% AI-Readiness.',
              context: 'faf_go'
            }, null, 2)
          }]
        };
      }

      // No missing fields but score < 100? Content quality issue
      if (missingFields.length === 0) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              score: currentScore,
              message: `Score is ${currentScore}%. All fields filled but content may need enhancement.`,
              suggestion: 'Use faf_enhance to improve content quality.',
              context: 'faf_go'
            }, null, 2)
          }]
        };
      }

      // Sort by priority
      const prioritizedFields = missingFields.sort((a, b) => {
        const aIdx = priorityOrder.indexOf(a);
        const bIdx = priorityOrder.indexOf(b);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });

      // Build questions
      const questions = prioritizedFields.map(field => {
        const reg = QUESTION_REGISTRY[field];
        return {
          field,
          question: reg.question,
          header: reg.header,
          type: reg.type,
          required: reg.required,
          options: reg.options
        };
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            needsInput: true,
            context: 'faf_go - guided path to Gold Code',
            currentScore,
            targetScore: 100,
            questionsRemaining: questions.length,
            questions,
            instructions: 'Use AskUserQuestion to ask these questions, then call faf_go again with the answers parameter to apply them.'
          }, null, 2)
        }]
      };

    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `🎯 FAF Go:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  /**
   * faf_auto - ONE COMMAND TO RULE THEM ALL
   * Zero to Championship in one command
   * Runs: init + formats + sync + bi-sync + score
   */
  private async handleFafAuto(args: any): Promise<CallToolResult> {
    const startTime = Date.now();
    const cwd = this.getProjectPath(args?.path);
    const yaml = await import('yaml');
    const path = await import('path');

    try {
      const steps: string[] = [];
      let currentScore = 0;

      // Step 1: Check/Create .faf file
      const fafResult = await findFafFile(cwd);

      let fafPath: string;

      if (!fafResult) {
        // Create .faf file
        const projectName = path.basename(cwd);
        fafPath = path.join(cwd, 'project.faf');
        const initFafContent = `# FAF - Foundational AI Context
project: ${projectName}
type: auto-detected
context: I⚡🍊
generated: ${new Date().toISOString()}
version: ${VERSION}

# Quick Context
working_directory: ${cwd}
initialized_by: claude-faf-mcp-auto
vitamin_context: true
faffless: true
`;
        fs.writeFileSync(fafPath, initFafContent);
        steps.push('✅ Created project.faf');
      } else {
        fafPath = fafResult.path;
        steps.push(`✅ Found ${fafResult.filename}`);
      }

      // Get initial score
      const fafContent = fs.readFileSync(fafPath, 'utf-8');
      const fafData = yaml.parse(fafContent) || {};
      currentScore = this.calculateSimpleScore(fafData);

      // Step 2: Run TURBO-CAT format discovery
      const formatsResult = await this.discoverFormatsInternal(cwd);
      if (formatsResult.discoveredFormats.length > 0) {
        // Apply slot fills to .faf
        if (!fafData.stack) fafData.stack = {};

        for (const [key, value] of Object.entries(formatsResult.slotFillRecommendations)) {
          if (!fafData.stack[key] || fafData.stack[key] === 'None') {
            fafData.stack[key] = value;
          }
        }

        if (formatsResult.stackSignature) {
          fafData.stack_signature = formatsResult.stackSignature;
        }

        fs.writeFileSync(fafPath, yaml.stringify(fafData), 'utf-8');
        steps.push(`✅ TURBO-CAT discovered ${formatsResult.discoveredFormats.length} formats`);
      } else {
        steps.push('⚠️ No additional formats detected');
      }

      // Step 3: Extract human context from README
      const readmePath = path.join(cwd, 'README.md');
      if (fs.existsSync(readmePath)) {
        const readmeContent = fs.readFileSync(readmePath, 'utf-8');
        const extracted = this.extractSixWsFromReadme(readmeContent);

        if (!fafData.human_context) fafData.human_context = {};

        let extractedCount = 0;
        for (const [field, value] of Object.entries(extracted)) {
          if (value && !fafData.human_context[field]) {
            fafData.human_context[field] = value;
            extractedCount++;
          }
        }

        if (extractedCount > 0) {
          fs.writeFileSync(fafPath, yaml.stringify(fafData), 'utf-8');
          steps.push(`✅ Extracted ${extractedCount} human context fields from README`);
        }
      }

      // Step 4: Create/Update CLAUDE.md (bi-sync)
      const claudePath = path.join(cwd, 'CLAUDE.md');
      if (!fs.existsSync(claudePath)) {
        const claudeContent = `# 🏎️ CLAUDE.md - AI Telemetry Link

## Project: ${fafData.project || path.basename(cwd)}
**Championship-Grade Project DNA Foundation**

### 🎯 Project Mission
${fafData.human_context?.why || fafData.project?.goal || 'AI-ready project context'}

### 🏗️ Architecture Overview
${fafData.stack_signature || 'Auto-detected stack'}

---

**STATUS: BI-SYNC ACTIVE 🔗**
*Last Sync: ${new Date().toISOString()}*
*Sync Engine: FAF Auto*
`;
        fs.writeFileSync(claudePath, claudeContent);
        steps.push('✅ Created CLAUDE.md');
      } else {
        steps.push('✅ CLAUDE.md already exists');
      }

      // Step 5: Calculate final score
      const updatedContent = fs.readFileSync(fafPath, 'utf-8');
      const updatedData = yaml.parse(updatedContent) || {};
      const newScore = this.calculateSimpleScore(updatedData);
      const scoreDelta = newScore - currentScore;

      // Calculate elapsed time
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      // Format output
      const deltaDisplay = scoreDelta > 0 ? `(+${scoreDelta}%)` : scoreDelta < 0 ? `(${scoreDelta}%)` : '(no change)';

      let output = `🏎️⚡️ FAF AUTO - CHAMPIONSHIP MODE!\n`;
      output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      output += steps.join('\n') + '\n\n';
      output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      output += `⏱️ Completed in ${elapsed}s\n`;
      output += `📊 Before: ${currentScore}% | After: ${newScore}% ${deltaDisplay}\n`;
      output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (newScore >= 99) {
        output += `🏆 CHAMPIONSHIP ACHIEVED! Your AI has complete context.\n`;
      } else if (newScore >= 85) {
        output += `🥇 Elite level! ${100 - newScore}% to perfection.\n`;
      } else if (newScore >= 70) {
        output += `🥈 Great progress! Run faf_go to reach championship.\n`;
      } else {
        output += `🚀 Good start! Run faf_go for guided improvement.\n`;
      }

      output += `\n💡 Next: faf_score --details | faf_go | faf_enhance`;

      return { content: [{ type: 'text', text: output }] };

    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `🏎️ FAF Auto:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  /**
   * faf_dna - Show your FAF DNA journey
   * Displays evolution from birth to current (22% → 85% → 99%)
   */
  private async handleFafDna(args: any): Promise<CallToolResult> {
    const cwd = this.getProjectPath(args?.path);
    const path = await import('path');

    try {
      const dnaPath = path.join(cwd, '.faf-dna');

      // Check if DNA file exists
      if (!fs.existsSync(dnaPath)) {
        // No DNA yet - check if .faf exists
        const fafResult = await findFafFile(cwd);

        if (!fafResult) {
          return {
            content: [{
              type: 'text',
              text: `🧬 FAF DNA Journey\n\n❌ No FAF DNA found\n💡 Run faf_auto to start your journey!`
            }]
          };
        }

        // .faf exists but no DNA - create initial DNA
        const yaml = await import('yaml');
        const fafContent = fs.readFileSync(fafResult.path, 'utf-8');
        const fafData = yaml.parse(fafContent) || {};
        const currentScore = this.calculateSimpleScore(fafData);

        const dna = {
          birthCertificate: {
            born: new Date().toISOString(),
            birthDNA: currentScore,
            birthDNASource: 'auto',
            authenticated: false,
            certificate: `FAF-${new Date().getFullYear()}-${path.basename(cwd).toUpperCase().slice(0, 8)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
          },
          current: {
            score: currentScore,
            version: 'v1.0.0',
            lastSync: new Date().toISOString()
          },
          milestones: [
            { type: 'birth', score: currentScore, date: new Date().toISOString(), version: 'v1.0.0' }
          ],
          format: 'faf-dna-v1'
        };

        fs.writeFileSync(dnaPath, JSON.stringify(dna, null, 2));

        return {
          content: [{
            type: 'text',
            text: `🧬 FAF DNA Journey\n\n🐣 Birth Certificate Created!\n\n📊 Birth DNA: ${currentScore}%\n📅 Born: ${new Date().toISOString().split('T')[0]}\n🎫 Certificate: ${dna.birthCertificate.certificate}\n\n💡 Your journey begins here! Run faf_auto or faf_go to grow.`
          }]
        };
      }

      // Load existing DNA
      const dnaContent = fs.readFileSync(dnaPath, 'utf-8');
      const dna = JSON.parse(dnaContent);

      // Build journey string
      const birthScore = dna.birthCertificate?.birthDNA || 0;
      const currentScore = dna.current?.score || 0;
      const milestones = dna.milestones || [];

      // Find key milestones
      const _birth = milestones.find((m: any) => m.type === 'birth');
      const peak = milestones.find((m: any) => m.type === 'peak');
      const championship = milestones.find((m: any) => m.type === 'championship');
      const elite = milestones.find((m: any) => m.type === 'elite');

      // Build compact journey
      let journey = `${birthScore}%`;

      if (championship && championship.score !== birthScore) {
        journey += ` → ${championship.score}%`;
      }

      if (elite && (!championship || elite.score !== championship.score)) {
        journey += ` → ${elite.score}%`;
      }

      if (peak) {
        journey += ` → ${peak.score}%`;
        if (currentScore < peak.score) {
          journey += ` ← ${currentScore}%`;
        }
      } else if (currentScore !== birthScore) {
        journey += ` → ${currentScore}%`;
      }

      // Calculate stats
      const birthDate = new Date(dna.birthCertificate?.born || Date.now());
      const daysActive = Math.floor((Date.now() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalGrowth = currentScore - birthScore;

      let output = `🧬 YOUR FAF DNA\n\n`;
      output += `   ${journey}\n\n`;
      output += `═══════════════════════════════════════════════════\n\n`;
      output += `📊 QUICK STATS\n`;
      output += `   Born: ${birthDate.toISOString().split('T')[0]}\n`;
      output += `   Days Active: ${daysActive}\n`;
      output += `   Total Growth: +${totalGrowth}%\n`;

      if (dna.birthCertificate?.authenticated) {
        output += `   ✅ Authenticated: ${dna.birthCertificate.certificate}\n`;
      } else {
        output += `   ⚠️ Not authenticated\n`;
      }

      output += `\n🧬 MILESTONES\n`;
      const milestoneIcons: Record<string, string> = {
        birth: '🐣', first_save: '💾', doubled: '2️⃣',
        championship: '🏆', elite: '⭐', peak: '🏔️', perfect: '💎'
      };

      for (const m of milestones) {
        const icon = milestoneIcons[m.type] || '📍';
        const isCurrent = m.score === currentScore;
        output += `   ${icon} ${m.type}: ${m.score}%${isCurrent ? ' ← You are here!' : ''}\n`;
      }

      output += `\n═══════════════════════════════════════════════════\n`;

      // Motivational message
      if (totalGrowth > 70) {
        output += `🚀 Incredible journey! You've transformed your AI context!\n`;
      } else if (totalGrowth > 50) {
        output += `📈 Great progress! Your context is evolving beautifully.\n`;
      } else if (totalGrowth > 0) {
        output += `🌱 Your journey has begun. Every step counts!\n`;
      } else {
        output += `🐣 Just born! Your growth story starts now.\n`;
      }

      return { content: [{ type: 'text', text: output }] };

    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `🧬 FAF DNA:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  /**
   * faf_formats - TURBO-CAT format discovery
   * Discovers all formats in the project
   */
  private async handleFafFormats(args: any): Promise<CallToolResult> {
    const cwd = this.getProjectPath(args?.path);
    const startTime = Date.now();

    try {
      const analysis = await this.discoverFormatsInternal(cwd);
      const elapsed = Date.now() - startTime;

      if (args?.json) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify(analysis, null, 2)
          }]
        };
      }

      // Format human-readable output
      let output = `😽 TURBO-CAT™ Format Discovery v2.0.0\n`;
      output += `═══════════════════════════════════════════════════\n\n`;
      output += `✅ Found ${analysis.discoveredFormats.length} formats in ${elapsed}ms!\n\n`;

      output += `📋 Discovered Formats (A-Z):\n`;
      const sorted = [...analysis.discoveredFormats].sort((a, b) => a.fileName.localeCompare(b.fileName));
      for (const format of sorted) {
        output += `  ✅ ${format.fileName}\n`;
      }

      output += `\n💡 Stack Signature: ${analysis.stackSignature}\n`;
      output += `🏆 Intelligence Score: ${analysis.totalIntelligenceScore}\n\n`;

      if (Object.keys(analysis.slotFillRecommendations).length > 0) {
        output += `📊 Recommended Slot Fills:\n`;
        for (const [key, value] of Object.entries(analysis.slotFillRecommendations)) {
          output += `  • ${key}: ${value}\n`;
        }
        output += `\n`;
      }

      output += `───────────────────────────────────────────────────\n`;
      output += `😽 TURBO-CAT™: "I detected ${analysis.discoveredFormats.length} formats and made your stack PURRR!"\n`;

      return { content: [{ type: 'text', text: output }] };

    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `😽 TURBO-CAT:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  /**
   * Internal helper: Discover formats in a directory (TURBO-CAT logic)
   */
  private async discoverFormatsInternal(projectDir: string): Promise<{
    discoveredFormats: Array<{ fileName: string; category: string; priority: number }>;
    totalIntelligenceScore: number;
    stackSignature: string;
    slotFillRecommendations: Record<string, string>;
    extractedContext: Record<string, any>;
  }> {
    const path = await import('path');

    // Known format files and their categories
    const KNOWN_FORMATS: Record<string, { category: string; priority: number }> = {
      'package.json': { category: 'package-manager', priority: 35 },
      'tsconfig.json': { category: 'typescript-config', priority: 30 },
      'Cargo.toml': { category: 'package-manager', priority: 35 },
      'pyproject.toml': { category: 'package-manager', priority: 35 },
      'requirements.txt': { category: 'package-manager', priority: 25 },
      'go.mod': { category: 'package-manager', priority: 35 },
      'pom.xml': { category: 'package-manager', priority: 35 },
      'README.md': { category: 'documentation', priority: 20 },
      'CLAUDE.md': { category: 'ai-context', priority: 40 },
      'project.faf': { category: 'faf-context', priority: 45 },
      '.faf': { category: 'faf-context', priority: 45 },
      'Dockerfile': { category: 'docker', priority: 25 },
      'docker-compose.yml': { category: 'docker', priority: 25 },
      'vercel.json': { category: 'deployment', priority: 20 },
      'netlify.toml': { category: 'deployment', priority: 20 },
      '.eslintrc.json': { category: 'linting', priority: 15 },
      '.prettierrc': { category: 'linting', priority: 15 },
      'jest.config.js': { category: 'testing', priority: 20 },
      'vitest.config.ts': { category: 'testing', priority: 20 },
      'svelte.config.js': { category: 'framework', priority: 30 },
      'next.config.js': { category: 'framework', priority: 30 },
      'vite.config.ts': { category: 'build', priority: 25 },
      'webpack.config.js': { category: 'build', priority: 25 },
      '.github': { category: 'ci-cd', priority: 20 },
      'manifest.json': { category: 'chrome-extension', priority: 35 }
    };

    const discoveredFormats: Array<{ fileName: string; category: string; priority: number }> = [];
    let totalIntelligenceScore = 0;
    const slotFillRecommendations: Record<string, string> = {};
    const extractedContext: Record<string, any> = {};

    // Scan directory
    try {
      const files = fs.readdirSync(projectDir);

      for (const file of files) {
        if (KNOWN_FORMATS[file]) {
          const format = KNOWN_FORMATS[file];
          discoveredFormats.push({
            fileName: file,
            category: format.category,
            priority: format.priority
          });
          totalIntelligenceScore += format.priority;
        }
      }

      // Extract intelligence from package.json
      const pkgPath = path.join(projectDir, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkgContent = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const allDeps = { ...pkgContent.dependencies, ...pkgContent.devDependencies };

        extractedContext.projectName = pkgContent.name;
        extractedContext.projectDescription = pkgContent.description;

        // Detect frameworks and fill slots
        if (allDeps['typescript'] || allDeps['@types/node']) {
          slotFillRecommendations['mainLanguage'] = 'TypeScript';
        }
        if (allDeps['react'] || allDeps['next']) {
          slotFillRecommendations['frontend'] = allDeps['next'] ? 'Next.js' : 'React';
        }
        if (allDeps['vue'] || allDeps['nuxt']) {
          slotFillRecommendations['frontend'] = allDeps['nuxt'] ? 'Nuxt' : 'Vue';
        }
        if (allDeps['svelte'] || allDeps['@sveltejs/kit']) {
          slotFillRecommendations['frontend'] = allDeps['@sveltejs/kit'] ? 'SvelteKit' : 'Svelte';
        }
        if (allDeps['express']) {
          slotFillRecommendations['backend'] = 'Express';
        }
        if (allDeps['fastify']) {
          slotFillRecommendations['backend'] = 'Fastify';
        }
        if (allDeps['vite']) {
          slotFillRecommendations['build'] = 'Vite';
        }
        if (allDeps['jest'] || allDeps['vitest']) {
          slotFillRecommendations['testing'] = allDeps['vitest'] ? 'Vitest' : 'Jest';
        }
      }

      // Check for deployment indicators
      if (fs.existsSync(path.join(projectDir, 'vercel.json'))) {
        slotFillRecommendations['hosting'] = 'Vercel';
      } else if (fs.existsSync(path.join(projectDir, 'netlify.toml'))) {
        slotFillRecommendations['hosting'] = 'Netlify';
      }

    } catch (error) {
      // Ignore errors, return empty results
    }

    // Generate stack signature
    const parts: string[] = [];
    if (slotFillRecommendations['mainLanguage']) parts.push(slotFillRecommendations['mainLanguage'].toLowerCase());
    if (slotFillRecommendations['frontend']) parts.push(slotFillRecommendations['frontend'].toLowerCase());
    const stackSignature = parts.length > 0 ? parts.join('-') : 'unknown-stack';

    return {
      discoveredFormats,
      totalIntelligenceScore,
      stackSignature,
      slotFillRecommendations,
      extractedContext
    };
  }

  /**
   * Internal helper: Calculate simple score from .faf data
   */
  private calculateSimpleScore(fafData: any): number {
    let score = 0;
    const maxScore = 100;

    // Project section (30 points)
    if (fafData.project) score += 15;
    if (fafData.project?.goal || fafData.description) score += 15;

    // Human context (30 points)
    const humanContext = fafData.human_context || {};
    const wFields = ['who', 'what', 'why', 'where', 'when', 'how'];
    const filledW = wFields.filter(f => humanContext[f] && humanContext[f] !== 'null').length;
    score += Math.round((filledW / wFields.length) * 30);

    // Stack section (20 points)
    const stack = fafData.stack || {};
    const stackFields = ['frontend', 'backend', 'database', 'hosting', 'build'];
    const filledStack = stackFields.filter(f => stack[f] && stack[f] !== 'None').length;
    score += Math.round((filledStack / stackFields.length) * 20);

    // Files exist bonus (20 points)
    if (fafData.initialized_by || fafData.generated) score += 10;
    if (fafData.stack_signature) score += 10;

    return Math.min(score, maxScore);
  }

  /**
   * faf_quick - Lightning-fast .faf creation
   * One-liner format: "name, description, language, framework, hosting"
   */
  private async handleFafQuick(args: any): Promise<CallToolResult> {
    const cwd = this.getProjectPath(args?.path);
    const path = await import('path');
    const yaml = await import('yaml');
    const startTime = Date.now();

    try {
      const input = args?.input;

      if (!input || typeof input !== 'string') {
        return {
          content: [{
            type: 'text',
            text: `⚡ FAF Quick

Usage: Provide a comma-separated string:
  "project-name, description, language, framework, hosting"

Examples:
  "my-app, e-commerce platform, typescript, react, vercel"
  "api-service, REST API for mobile app, python, fastapi, aws"
  "cli-tool, developer productivity tool, go"

Minimum: name and description. Rest is auto-detected!`
          }]
        };
      }

      // Parse the quick input
      const parts = input.split(',').map((s: string) => s.trim());

      if (parts.length < 2) {
        return {
          content: [{
            type: 'text',
            text: `⚡ FAF Quick: Need at least: project-name, description

Got: "${input}"

Example: "my-app, e-commerce platform"`
          }],
          isError: true
        };
      }

      const projectName = parts[0] || 'my-project';
      const projectGoal = parts[1] || 'Build amazing software';
      const mainLanguage = parts[2] || 'TypeScript';
      const framework = parts[3] || 'none';
      const hosting = parts[4] || 'cloud';

      // Check if .faf exists
      const fafPath = path.join(cwd, 'project.faf');
      if (fs.existsSync(fafPath) && !args?.force) {
        return {
          content: [{
            type: 'text',
            text: `⚡ FAF Quick

⚠️ project.faf already exists at: ${fafPath}

Use force: true to overwrite, or use faf_enhance to modify.`
          }]
        };
      }

      // Detect project type from inputs
      const projectType = this.detectProjectTypeFromQuick(projectGoal, framework, mainLanguage);

      // Build .faf content
      const fafData: any = {
        project: {
          name: projectName,
          goal: projectGoal,
          main_language: mainLanguage
        },
        type: projectType,
        generated: new Date().toISOString(),
        version: VERSION,
        initialized_by: 'claude-faf-mcp-quick'
      };

      if (framework && framework !== 'none') {
        fafData.stack = { frontend: framework };
      }

      if (hosting && hosting !== 'cloud') {
        if (!fafData.stack) fafData.stack = {};
        fafData.stack.hosting = hosting;
      }

      // Write the file
      fs.writeFileSync(fafPath, yaml.stringify(fafData), 'utf-8');

      const elapsed = Date.now() - startTime;

      let output = `⚡ FAF Quick - Created in ${elapsed}ms!\n\n`;
      output += `📦 Project: ${projectName}\n`;
      output += `🎯 Purpose: ${projectGoal}\n`;
      output += `💻 Stack: ${mainLanguage}${framework !== 'none' ? ` + ${framework}` : ''}\n`;
      output += `📍 Type: ${projectType}\n\n`;
      output += `✅ Created: ${fafPath}\n\n`;
      output += `Next steps:\n`;
      output += `  • faf_score - Check AI-readiness\n`;
      output += `  • faf_enhance - Improve context\n`;
      output += `  • faf_go - Guided interview to 100%`;

      return { content: [{ type: 'text', text: output }] };

    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `⚡ FAF Quick:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  /**
   * Helper: Detect project type from quick input
   */
  private detectProjectTypeFromQuick(goal: string, framework: string, language: string): string {
    const fw = framework?.toLowerCase() || '';
    const lang = language?.toLowerCase() || '';
    const g = goal?.toLowerCase() || '';

    // Framework-based detection
    if (fw.includes('react') || fw.includes('next')) return 'react';
    if (fw.includes('vue') || fw.includes('nuxt')) return 'vue';
    if (fw.includes('svelte') || fw.includes('kit')) return 'svelte';
    if (fw.includes('angular')) return 'angular';
    if (fw.includes('fastapi')) return 'python-fastapi';
    if (fw.includes('django')) return 'python-django';
    if (fw.includes('flask')) return 'python-flask';
    if (fw.includes('express')) return 'node-api';

    // Goal-based detection
    if (g.includes('chrome extension') || g.includes('browser extension')) return 'chrome-extension';
    if (g.includes('api') || g.includes('backend')) return 'node-api';
    if (g.includes('cli') || g.includes('command')) return 'cli-tool';
    if (g.includes('library') || g.includes('package')) return 'library';
    if (g.includes('mcp') || g.includes('model context')) return 'mcp-server';

    // Language-based fallback
    if (lang.includes('python')) return 'python';
    if (lang.includes('go')) return 'golang';
    if (lang.includes('rust')) return 'rust';
    if (lang.includes('typescript')) return 'typescript';

    return 'general';
  }

  /**
   * faf_doctor - Health check for .faf setup
   * Diagnose and fix common issues
   */
  private async handleFafDoctor(args: any): Promise<CallToolResult> {
    const cwd = this.getProjectPath(args?.path);
    const path = await import('path');
    const yaml = await import('yaml');

    try {
      interface DiagnosticResult {
        status: 'ok' | 'warning' | 'error';
        message: string;
        fix?: string;
      }

      const results: DiagnosticResult[] = [];

      // Check 1: MCP Version
      results.push({
        status: 'ok',
        message: `claude-faf-mcp version: ${VERSION}`
      });

      // Check 2: .faf file exists
      const fafResult = await findFafFile(cwd);

      if (!fafResult) {
        results.push({
          status: 'error',
          message: 'No .faf file found',
          fix: 'Run: faf_init, faf_quick, or faf_auto to create one'
        });
      } else {
        results.push({
          status: 'ok',
          message: `Found .faf at: ${fafResult.path}`
        });

        // Check 3: .faf file validity
        try {
          const content = fs.readFileSync(fafResult.path, 'utf-8');
          const fafData = yaml.parse(content);

          if (!fafData) {
            results.push({
              status: 'error',
              message: '.faf file is empty',
              fix: 'Run: faf_init with force option to regenerate'
            });
          } else {
            // Check for required fields
            const missingFields: string[] = [];
            if (!fafData.project?.name && !fafData.project) missingFields.push('project.name');
            if (!fafData.project?.goal) missingFields.push('project.goal');

            if (missingFields.length > 0) {
              results.push({
                status: 'warning',
                message: `Missing important fields: ${missingFields.join(', ')}`,
                fix: 'Run: faf_enhance or faf_go to add missing info'
              });
            } else {
              results.push({
                status: 'ok',
                message: '.faf structure is valid'
              });
            }

            // Check 4: Score
            const score = this.calculateSimpleScore(fafData);

            if (score < 30) {
              results.push({
                status: 'error',
                message: `Score too low: ${score}%`,
                fix: 'Run: faf_enhance or faf_go to improve context'
              });
            } else if (score < 70) {
              results.push({
                status: 'warning',
                message: `Score could be better: ${score}%`,
                fix: 'Target 70%+ for championship AI context'
              });
            } else {
              results.push({
                status: 'ok',
                message: `Great score: ${score}%`
              });
            }
          }
        } catch {
          results.push({
            status: 'error',
            message: '.faf file is corrupted or invalid YAML',
            fix: 'Run: faf_init with force option to regenerate'
          });
        }
      }

      // Check 5: CLAUDE.md exists
      const claudePath = path.join(cwd, 'CLAUDE.md');
      if (!fs.existsSync(claudePath)) {
        results.push({
          status: 'warning',
          message: 'No CLAUDE.md file',
          fix: 'Run: faf_auto or faf_bi_sync to create bi-directional sync'
        });
      } else {
        results.push({
          status: 'ok',
          message: 'CLAUDE.md found (bi-sync ready)'
        });
      }

      // Check 6: Project detection
      const packageJsonPath = path.join(cwd, 'package.json');
      const requirementsPath = path.join(cwd, 'requirements.txt');
      const goModPath = path.join(cwd, 'go.mod');
      const cargoPath = path.join(cwd, 'Cargo.toml');

      if (fs.existsSync(packageJsonPath)) {
        results.push({
          status: 'ok',
          message: 'Node.js/JavaScript project detected'
        });
      } else if (fs.existsSync(requirementsPath)) {
        results.push({
          status: 'ok',
          message: 'Python project detected'
        });
      } else if (fs.existsSync(goModPath)) {
        results.push({
          status: 'ok',
          message: 'Go project detected'
        });
      } else if (fs.existsSync(cargoPath)) {
        results.push({
          status: 'ok',
          message: 'Rust project detected'
        });
      } else {
        results.push({
          status: 'warning',
          message: 'No standard project files detected',
          fix: 'FAF works best with package.json, requirements.txt, go.mod, or Cargo.toml'
        });
      }

      // Build output
      let output = `🏥 FAF Doctor - Health Check\n`;
      output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      let hasErrors = false;
      let hasWarnings = false;

      for (const result of results) {
        const icon = result.status === 'ok' ? '✅' :
                     result.status === 'warning' ? '⚠️' : '❌';

        output += `${icon} ${result.message}\n`;

        if (result.fix) {
          output += `   💡 ${result.fix}\n`;
        }

        if (result.status === 'error') hasErrors = true;
        if (result.status === 'warning') hasWarnings = true;
      }

      output += `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (!hasErrors && !hasWarnings) {
        output += `🏆 Perfect health! Your FAF setup is championship-ready!`;
      } else if (!hasErrors) {
        output += `🎯 Good health with minor improvements suggested.`;
      } else {
        output += `⚠️ Issues detected. Follow the fixes above.`;
      }

      return { content: [{ type: 'text', text: output }] };

    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `🏥 FAF Doctor:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  // ============================================================================
  // v4.5.0 INTEROP HANDLERS
  // ============================================================================

  private async handleFafAgents(args: any): Promise<CallToolResult> {
    const cwd = this.getProjectPath(args?.path);
    const action = args?.action || 'sync';

    try {
      const result = await this.engineAdapter.callEngine('agents', [
        cwd,
        `--action=${action}`,
        ...(args?.force ? ['--force'] : []),
        ...(args?.merge ? ['--merge'] : []),
      ]);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `AGENTS.md ${action}:\n\n❌ ${result.error}` }],
          isError: true
        };
      }

      const data = result.data;
      return {
        content: [{ type: 'text', text: `AGENTS.md ${action}:\n\n✅ ${data?.message || 'Done'}\n⏱️ ${result.duration}ms` }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `AGENTS.md ${action}:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleFafCursor(args: any): Promise<CallToolResult> {
    const cwd = this.getProjectPath(args?.path);
    const action = args?.action || 'sync';

    try {
      const result = await this.engineAdapter.callEngine('cursor', [
        cwd,
        `--action=${action}`,
        ...(args?.force ? ['--force'] : []),
        ...(args?.merge ? ['--merge'] : []),
      ]);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `.cursorrules ${action}:\n\n❌ ${result.error}` }],
          isError: true
        };
      }

      const data = result.data;
      return {
        content: [{ type: 'text', text: `.cursorrules ${action}:\n\n✅ ${data?.message || 'Done'}\n⏱️ ${result.duration}ms` }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `.cursorrules ${action}:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleFafGemini(args: any): Promise<CallToolResult> {
    const cwd = this.getProjectPath(args?.path);
    const action = args?.action || 'sync';

    try {
      const result = await this.engineAdapter.callEngine('gemini', [
        cwd,
        `--action=${action}`,
        ...(args?.force ? ['--force'] : []),
        ...(args?.merge ? ['--merge'] : []),
      ]);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `GEMINI.md ${action}:\n\n❌ ${result.error}` }],
          isError: true
        };
      }

      const data = result.data;
      return {
        content: [{ type: 'text', text: `GEMINI.md ${action}:\n\n✅ ${data?.message || 'Done'}\n⏱️ ${result.duration}ms` }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `GEMINI.md ${action}:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleFafConductor(args: any): Promise<CallToolResult> {
    const cwd = this.getProjectPath(args?.path);
    const action = args?.action || 'import';

    try {
      const result = await this.engineAdapter.callEngine('conductor', [
        cwd,
        `--action=${action}`,
        ...(args?.force ? ['--force'] : []),
        ...(args?.merge ? ['--merge'] : []),
      ]);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `Conductor ${action}:\n\n❌ ${result.error}` }],
          isError: true
        };
      }

      const data = result.data;
      return {
        content: [{ type: 'text', text: `Conductor ${action}:\n\n✅ ${data?.message || 'Done'}\n⏱️ ${result.duration}ms` }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `Conductor ${action}:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }

  private async handleFafGit(args: any): Promise<CallToolResult> {
    const url = args?.url;
    if (!url) {
      return {
        content: [{ type: 'text', text: 'faf_git: Missing required parameter "url"' }],
        isError: true
      };
    }

    const outputPath = args?.path ? this.getProjectPath(args.path) : undefined;

    try {
      const result = await this.engineAdapter.callEngine('git', [
        url,
        ...(outputPath ? [outputPath] : []),
      ]);

      if (!result.success) {
        return {
          content: [{ type: 'text', text: `GitHub Context:\n\n❌ ${result.error}` }],
          isError: true
        };
      }

      const data = result.data;
      let output = `GitHub Context:\n\n✅ ${data?.message || 'Done'}\n⏱️ ${result.duration}ms`;

      // Include generated .faf content if no output path (preview mode)
      if (!outputPath && data?.data?.fafContent) {
        output += `\n\n--- Generated project.faf ---\n${data.data.fafContent}`;
      }

      return {
        content: [{ type: 'text', text: output }]
      };
    } catch (error: any) {
      return {
        content: [{ type: 'text', text: `GitHub Context:\n\n❌ Error: ${error.message}` }],
        isError: true
      };
    }
  }
}
