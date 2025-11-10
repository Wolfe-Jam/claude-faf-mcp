# FAF MCP Server User Guide

## Overview

The FAF MCP Server enhances Claude Desktop with intelligent project context management. It provides native tools for scoring, exploring, and improving your project's AI-readiness—all without external dependencies.

## Getting Started

### Installation

```bash
npm install -g claude-faf-mcp
```

### Configuration

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "faf": {
      "command": "npx",
      "args": ["claude-faf-mcp"]
    }
  }
}
```

## Core Features

### Project Scoring

The FAF Score evaluates your project's AI-collaboration readiness:

```
faf_score()
```

Returns a three-line display showing your current score, rating, and AI-readiness status. Scores range from 0-99%, with only Claude able to grant the perfect 100%.

### Project Detection

Automatically identifies your project type and structure:

```
faf_detect()
```

Analyzes your project files and returns the detected stack, frameworks, and confidence level.

### Directory Exploration

View your project structure:

```
faf_list()
```

Shows files and directories with smart icons indicating file types and purposes.

### File Operations

Read and write files directly:

```
faf_read(filepath)
faf_write(filepath, content)
```

Native file system operations for examining and modifying project files.

## Understanding Your Score

Your FAF Score consists of four components:

- **.faf file** (40 points): Project context configuration
- **CLAUDE.md** (30 points): AI-specific instructions
- **README.md** (15 points): General documentation
- **Project file** (14 points): package.json, requirements.txt, etc.

The maximum technical score is 99%. The final 1% can only be granted by Claude based on collaboration quality.

## Frequently Asked Questions

### What is the 105% Easter Egg?

When your project has rich .faf and CLAUDE.md files (500+ characters with sections) plus a README, you may achieve legendary "Big Orange" status at 105%.

### Why do some commands require the CLI?

Features like `faf_enhance` and `faf_sync` currently depend on the FAF CLI. We're working on native implementations for future releases.

### How does context switching work?

The MCP server maintains separate contexts for multiple projects. When you work with different directories, it automatically switches between saved contexts.

### What's the difference between .faf and CLAUDE.md?

- **.faf**: Contains project structure and context for any AI tool
- **CLAUDE.md**: Specific instructions and preferences for Claude

### Can I use this without the FAF CLI?

Yes. Core features (score, detect, list, read, write) work natively without any CLI dependencies.

## Working Features (No CLI Required)

- `faf_score` - Calculate AI-readiness score
- `faf_detect` - Identify project type
- `faf_list` - Explore directories
- `faf_read` - Read files
- `faf_write` - Write files
- `faf_debug` - System diagnostics

## Features in Development

The following features currently require the FAF CLI and are being migrated to native implementations:

- `faf_init` - Initialize FAF context
- `faf_enhance` - AI-powered improvements
- `faf_sync` - Synchronize context
- `faf_trust` - Validation metrics
- `faf_status` - Project status
- `faf_clear` - Reset context

## Best Practices

1. **Start with detection**: Let FAF understand your project first
2. **Check your score**: See where you stand before making changes
3. **Follow suggestions**: Each command suggests logical next steps
4. **Build gradually**: Improve your score incrementally

## Troubleshooting

### "Command not found" errors

Some commands require the FAF CLI. Stick to the native features listed above for CLI-free operation.

### Score not updating

Ensure your files are saved before running `faf_score`. The tool reads directly from the file system.

### Can't detect project type

Make sure you have a project configuration file (package.json, requirements.txt, etc.) in your project root.

## Support

For issues and feature requests, visit: https://github.com/Wolfe-Jam/claude-faf-mcp

---

*Built with Formula 1-inspired engineering for championship performance.*