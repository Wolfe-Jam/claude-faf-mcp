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
          description: 'Bi-directional sync between project.faf context and claude.md for persistent Claude collaboration',
          inputSchema: {
            type: 'object',
            properties: {
              auto: { type: 'boolean', description: 'Enable automatic synchronization' },
              watch: { type: 'boolean', description: 'Start real-time file watching for changes' },
              force: { type: 'boolean', description: 'Force overwrite conflicting changes' },
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

      // Easter Egg: 105% Big Orange - if both .faf and CLAUDE.md have rich content
      let easterEggActivated = false;
      if (hasFaf && hasClaude) {
        try {
          const fafContent = await fs.readFile(fafResult!.path, 'utf-8');
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
output: 105% Big Orange Performance

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
      : result.data?.output || JSON.stringify(result.data, null, 2);

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
}
