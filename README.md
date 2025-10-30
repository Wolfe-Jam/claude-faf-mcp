# claude-faf-mcp

[![NPM Version](https://img.shields.io/npm/v/claude-faf-mcp?color=FF4500)](https://www.npmjs.com/package/claude-faf-mcp)
[![Downloads](https://img.shields.io/npm/dt/claude-faf-mcp?color=00CCFF)](https://www.npmjs.com/package/claude-faf-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## TL;DR

**Problem:** AI needs persistent project context—not just docs or tools, but foundational infrastructure.

**Solution:** The .faf format is a structured, machine-readable context layer. This MCP server gives Claude 33+ tools to create, score, and improve your project's persistent context through format-driven architecture.

**How it works:** Get a score (0-100%) showing how well AI understands your project. Higher scores = AI more in-tune with your codebase. Use tools to improve your score and context quality. Your .faf context persists across sessions.

**Install:**

Via npm:
```bash
npm install -g claude-faf-mcp
```

Via Homebrew:
```bash
brew install wolfe-jam/faf/claude-faf-mcp
```

**Configure:** Add to `claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "claude-faf-mcp": {
      "command": "claude-faf-mcp"
    }
  }
}
```

**CLI vs MCP clarity**

faf-cli (npm) runs on your machine locally in a terminal. claude-faf-mcp (this) runs through Claude Desktop as a tool. Same .faf format, different execution layer. Same persistent context and scoring. Same capabilities (create, score, improve).

Use CLI for raw speed and local development; use MCP for AI-integrated workflows. No feature gaps between them - pick based on your flow.

Website: https://faf.one | GitHub: https://github.com/Wolfe-Jam/claude-faf-mcp | Discussions: https://github.com/Wolfe-Jam/claude-faf-mcp/discussions

---

## Official Status

claude-faf-mcp is officially published in the Anthropic MCP Registry (PR #2759). This is the first and only persistent project context server in the official Anthropic ecosystem.

Registry listing: "MCP server for .faf format. The only persistent project context scoring engine in the Anthropic registry."

Published to official Anthropic MCP registry with validation by Anthropic engineering team. Current metrics: 4,100+ total downloads with 462 downloads per week (4.5x growth from 108/week baseline).

---

## What's New in v2.7.0 - The Visibility Revolution

**v2.7.0 introduces `project.faf` as the new standard for every repository.**

![project.faf in file structure](https://cdn.jsdelivr.net/npm/claude-faf-mcp@latest/assets/project-faf-screenshot.png)

**`package.json` for AI.**

Just like `package.json` tells npm what your project needs, `project.faf` tells AI what your project IS.

| File | Purpose | Who Reads It |
|------|---------|--------------|
| `package.json` | Dependencies, scripts, metadata | npm, Node.js, developers |
| `project.faf` | **Context, architecture, purpose** | **AI, Claude, Cursor, any AI tool** |

Same pattern. Same universality. Same necessity.

**What changed:**
- New projects create `project.faf` (not hidden `.faf`)
- Your existing `.faf` files work perfectly
- Rename with `faf migrate` (CLI v3.1.0) for better visibility

**Why it matters:**

```bash
# Before (hidden like secrets)
ls -la
.env          # Hidden (secrets - should be hidden)
.faf          # Hidden (AI context - should be visible!)

# After (visible like package.json)
ls
package.json  # Visible (dependencies)
project.faf   # Visible (AI context)
.env          # Still hidden (secrets stay secret)
```

`.env` hides secrets. `project.faf` shares context.

`.faf` was hiding in the wrong category. `project.faf` fixes that.

You wouldn't skip `package.json`. Don't skip `project.faf`.

Coordinated with faf-cli v3.1.0 for seamless ecosystem integration.

---

## What is claude-faf-mcp?

An MCP server that brings the .faf format to Claude Desktop for persistent project context. The .faf format (Foundational AI-Context Format) is a structured, machine-readable context layer designed as foundational infrastructure—not tools, not documentation, but format.

**Format-Driven Architecture**

Everything flows through structured format. The .faf file is your project's persistent context layer. It survives across sessions, tools, and AI systems without re-explanation. It works with any MCP client, CLI, workflow automation (n8n, Make, etc.), or AI assistant. It supports any language, framework, or project setup. Optimized for Claude Desktop while maintaining compatibility with any AI model or platform.

Format-driven means the architecture is built on data structure first, not tooling first. Your project context becomes machine-readable, persistent, and interoperable. This is foundational infrastructure for AI-context operations.

**Key Features**

Zero configuration required - works out of the box after installation. Includes 33+ tools for format operations. Operations average under 11 milliseconds. Synchronizes .faf files with CLAUDE.md automatically (keeping human-readable docs in sync with machine-readable persistent context). Built with 100% TypeScript strict mode. All 35 tests passing with production readiness confirmed.

---

## Scoring System

Track your project's AI-readiness with a tiered scoring system:

Trophy (100%) - Podium. Perfect AI and human balance. Gold (99%) - Gold standard. Silver (95-98%) - Excellence. Bronze (85-94%) - Production ready. Green (70-84%) - Good foundation. Yellow (55-69%) - Getting there. Red (0-54%) - Needs attention.

Live output in Claude Desktop shows your score with a progress bar, current tier, and next milestone guidance.

---

## Quick Start

Install globally via npm:
```bash
npm install -g claude-faf-mcp
```

Or via Homebrew:
```bash
brew install wolfe-jam/faf/claude-faf-mcp
```

Add to Claude Desktop configuration. On macOS and Linux, edit ~/Library/Application Support/Claude/claude_desktop_config.json. On Windows, edit %APPDATA%\Claude\claude_desktop_config.json.

```json
{
  "mcpServers": {
    "claude-faf-mcp": {
      "command": "claude-faf-mcp"
    }
  }
}
```

Restart Claude Desktop to load the server.

---

## Scoring System Experience

This is what persistent project context looks like in action. When you run `faf_auto`, Claude scores your project's AI-readiness with a visual breakdown showing exactly where you stand and what to improve next.

![FAF Scoring Dashboard](https://cdn.jsdelivr.net/npm/claude-faf-mcp@latest/assets/faf-championship-scorecard.png)

Live in Claude Desktop. Persistent across sessions. Your foundational context layer, measured and actionable.

---

## Available Tools

**Core Tools**

faf_init - Initialize project context. faf_auto - Auto-detect and populate context. faf_score - Calculate AI readiness. faf_status - Project health check.

**Enhancement Tools**

faf_enhance - Optimize scoring. faf_sync - Sync files. faf_bi_sync - Bidirectional synchronization.

**File Operations**

faf_read - Read files. faf_write - Write files. faf_list - List directories. faf_search - Search file content.

**Skills Integration**

faf_skills - List Claude Code skills from .faf file.

Full tool documentation available at https://faf.one/docs/tools.

---

## Usage Example

1. Drop any project file into Claude Desktop
2. Type: "Run faf_auto to analyze this project"
3. Get instant context - Claude understands your codebase
4. Access 33+ commands naturally in conversation

The .faf file persists across conversations - no need to re-explain your project each time.

---

## Technical Specifications

Performance: Sub-11ms average operation time. TypeScript: 100% strict mode. Dependencies: 1 (MCP SDK only). Testing: 730 C.O.R.E empirical tests (part of 12,500+ FAF ecosystem validation). Build: Zero errors. Coverage: 4,400+ lines of code.

---

## Development

Clone the repository:
```bash
git clone https://github.com/Wolfe-Jam/claude-faf-mcp.git
cd claude-faf-mcp
```

Install dependencies and build:
```bash
npm install
npm run build
```

Run tests:
```bash
npm test
```

Link locally:
```bash
npm link
```

---

## Requirements

Node.js 18 or later. Claude Desktop (latest version). Operating system: macOS, Linux, or Windows.

---

## The FAF Ecosystem

faf-cli (npm) - Command line tool for local context management. claude-faf-mcp - This MCP server for Claude Desktop integration. faf.one - Documentation and guides. Chrome Extension - Browser integration for context collection.

---

## Author

James Wolfe (Wolfe-Jam), creator of the .faf format. ORCID: 0009-0007-0801-3841.

---

## License

MIT License. See LICENSE file for details.

Note: The .faf-Engine is proprietary and available under separate license.

---

## Contributing

Contributions are welcome. Join community discussions at https://github.com/Wolfe-Jam/claude-faf-mcp/discussions or submit issues and pull requests on GitHub.
