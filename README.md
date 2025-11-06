# claude-faf-mcp

> **🏆 IANA-Registered Format** - .FAF is now an Internet-standard format.
> MCP server for creating official `application/vnd.faf+yaml` files in Claude Desktop
> Official MCP server for FAF (Foundational AI-context Format) with 50+ tools -
> Persistent project context that integrates seamlessly with Claude Desktop workflows

[![NPM Version](https://img.shields.io/npm/v/claude-faf-mcp?color=FF4500)](https://www.npmjs.com/package/claude-faf-mcp)
[![Downloads](https://img.shields.io/npm/dt/claude-faf-mcp?color=00CCFF)](https://www.npmjs.com/package/claude-faf-mcp)
[![IANA Registered](https://img.shields.io/badge/IANA-application%2Fvnd.faf%2Byaml-blue)](https://faf.one/blog/iana-registration)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🏎️ What's New in v3.0.0-beta.1 (Mk3 Bundled Engine)

**Championship Performance Edition** - CLI engine code now bundled directly into MCP!

- **6-16x faster** for score, init, and auto commands (24.7ms avg, 104 calls/sec)
- **Zero memory leaks** (-1.88MB heap growth over 100 iterations)
- **3 commands bundled** (score, init, auto) - covers 80% of typical usage
- **WJTTC Championship Grade** certified (6/6 stress tests passed)

**⚠️ Beta Compatibility Notice:**
- **With faf-cli installed**: Safe to upgrade (performance boost + full features)
- **Without faf-cli**: Use v2.7.3 instead (wait for Mk3 stable with all commands bundled)

📖 [Full Mk3 Release Notes](https://github.com/Wolfe-Jam/claude-faf-mcp/releases/tag/v3.0.0-beta.1)

---

**Claude Skills BUILT-IN** - 6000+ lines TS-strict code
**faf-expert** is on-hand, 24/7 - your resident faf specialist and Master of
**21 Core Tools** and **30+ Advanced Tools**, **51 in all**

---

## TL;DR

**Problem:** AI needs persistent project context—not just md docs or tools, but foundational infrastructure.

**Solution:** The .faf format is a structured, machine-readable context layer. This MCP server gives Claude 50+ tools to create, score, and improve your project's persistent context through format-driven architecture.

**How it works:** Get a score (0-100%) showing how well AI understands your project. Higher scores = AI more in-tune with your codebase. Use tools to improve your score and context quality. Your .faf context persists across sessions.

**DROP or PASTE, Click & Go!**

🎯 Got .faf? DROP or PASTE it
📦 Got project? DROP or PASTE README or package.json
💬 Starting fresh? Just ask

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
- **faf-cli** ([npm](https://www.npmjs.com/package/faf-cli)): Runs on your machine locally in a terminal
- **claude-faf-mcp** (this): Runs through Claude Desktop as a tool

Same .faf, different way to use. Same Project DNA and scoring. Same capabilities (create, score, improve). Different execution layer.

Use CLI for raw speed and local development; use MCP for AI-integrated workflows. No feature gaps between them - pick based on your flow.

[Website](https://faf.one) | [GitHub](https://github.com/Wolfe-Jam/claude-faf-mcp) | [Discussions](https://github.com/Wolfe-Jam/claude-faf-mcp/discussions)

---

### 📸 See It In Action

<div align="center">
<img src="https://cdn.jsdelivr.net/npm/claude-faf-mcp@latest/assets/project-faf-screenshot.png" alt="project.faf sits between package.json and README.md" width="500" />

**`project.faf` sits right between `package.json` and `README.md`** - exactly where it belongs.

Visible. Discoverable. Universal.
</div>

---

## Official Status

claude-faf-mcp is officially published in the Anthropic MCP Registry (PR #2759). This is the first and only persistent project context server in the official Anthropic ecosystem.

Registry listing: "MCP server for .faf format. The only persistent project context scoring engine in the Anthropic registry."

Published to official Anthropic MCP registry with validation by Anthropic engineering team. Current metrics: 4,700 total downloads with 598 downloads per week.

## Major Milestones

- **Aug 8, 2025** - Format created, first official .faf file is generated
- **Sep 1, 2025** - Developer platform launch (fafdev.tools)
- **Sep 11, 2025** - First Google Chrome Web Store approval
- **Sep 16, 2025** - MCP Server v2.0.0 published to npm
- **Sep 24, 2025** - CLI v2.1.0 published to npm
- **Oct 17, 2025** - Official Anthropic MCP Registry merger (PR #2759)
- **Oct 29, 2025** - Second Google Chrome Web Store approval
- **Oct 31, 2025** - **IANA Registration** 🏆 (`application/vnd.faf+yaml`)

**Quadruple Validation: IANA, Anthropic, Google (2x)**

---

## What's New in v2.8.0 - Tool Visibility System

**v2.8.0 introduces intelligent tool filtering to reduce cognitive load.**

### New Features

**21 Core Tools (Default)**
Essential workflow tools shown by default:
- Workflow: `faf`, `faf_auto`, `faf_init`, `faf_innit`, `faf_status`
- Quality: `faf_score`, `faf_validate`, `faf_doctor`, `faf_audit`
- Intelligence: `faf_formats`, `faf_stacks`, `faf_skills`
- Sync: `faf_sync`, `faf_bi_sync`, `faf_update`, `faf_migrate`
- AI: `faf_chat`, `faf_enhance`
- Help: `faf_index`, `faf_faq`, `faf_about`

**30+ Advanced Tools (Opt-in)**
Expert-level tools available via environment variable:
- Display variants: `faf_display`, `faf_show`, `faf_check`
- Trust system: `faf_trust`, `faf_trust_confidence`, `faf_trust_garage`
- File operations: `faf_read`, `faf_write`, `faf_list`, `faf_exists`
- DNA tracking: `faf_dna`, `faf_log`, `faf_auth`, `faf_recover`
- Utilities: `faf_choose`, `faf_clear`, `faf_share`, `faf_credit`

**Enable Advanced Tools:**
```json
{
  "mcpServers": {
    "claude-faf-mcp": {
      "command": "claude-faf-mcp",
      "env": {
        "FAF_MCP_SHOW_ADVANCED": "true"
      }
    }
  }
}
```

**New! Claude Code Skill**
The `faf-expert` skill is now available - your on-hand 24/7 FAF specialist:
- Expert guidance on .faf files and project DNA
- Tool Visibility System documentation
- MCP server configuration help
- AI-readiness scoring assistance

### Performance
- **<10ms tool filtering** (5x better than 50ms championship target)
- **57 tests passing** - All existing functionality preserved
- **Zero regressions** - Complete validation
- **WJTTC Gold Certified** - F1-inspired testing standards

### Previous: v2.7.2 - IANA Registration

On **October 31, 2025**, IANA officially registered `.faf` as `application/vnd.faf+yaml` - making it an Internet-standard format alongside PDF, JSON, and XML
- API standardization across platforms

This documentation update adds IANA information throughout the README to reflect this major infrastructure-level achievement.

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

## What is FAF?

FAF (Foundational AI-context Format) is the **IANA-registered format** for persistent project context in AI development tools.

**Official Media Type:** `application/vnd.faf+yaml`
**Registration Date:** October 31, 2025
**IANA Status:** Recognized Internet standard

### Why IANA Registration Matters

- **Internet-Scale Legitimacy** - Same recognition as PDF (`application/pdf`), JSON (`application/json`), XML (`application/xml`)
- **Universal Compatibility** - Browsers, email clients, APIs handle `.faf` files properly
- **HTTP Standard Headers** - `Content-Type: application/vnd.faf+yaml` is officially registered
- **Future-Proof** - Format backed by Internet standards body

### The .faf Advantage

Traditional approach:
```bash
# Manual context setup (5+ minutes)
1. Copy README
2. List files
3. Explain architecture
4. Share with AI
```

FAF approach:
```bash
# Automated context (< 1 second)
npx -y claude-faf-mcp
faf init
# Done - complete project DNA in .faf file
```

---

## What is claude-faf-mcp?

An MCP server that brings the .faf format to Claude Desktop for persistent project context. The .faf format (Foundational AI-Context Format) is a structured, machine-readable context layer designed as foundational infrastructure—not tools, not documentation, but format.

**Format-Driven Architecture**

Everything flows through structured format. The .faf file is your project's persistent context layer. It survives across sessions, tools, and AI systems without re-explanation. It works with any MCP client, CLI, workflow automation (n8n, Make, etc.), or AI assistant. It supports any language, framework, or project setup. Optimized for Claude Desktop while maintaining compatibility with any AI model or platform.

Format-driven means the architecture is built on data structure first, not tooling first. Your project context becomes machine-readable, persistent, and interoperable. This is foundational infrastructure for AI-context operations.

**Key Features**

- **IANA-Registered Format** - Official Internet media type `application/vnd.faf+yaml`
  - Proper HTTP Content-Type headers
  - Browser recognition and handling
  - Email client support
  - API standardization across platforms

- **50+ MCP Tools** - Complete project context management
  - Project DNA generation and scoring
  - Bi-directional CLAUDE.md sync
  - Format validation and conversion

- **Podium Quality Scoring** - 0-100% AI-readiness assessment
  - 🏆 Trophy (85%+), 🥇 Gold (70%+), 🥈 Silver (55%+), 🥉 Bronze (40%+)

- **Official Anthropic Registry** - PR #2759 merged
  - Listed in official MCP server catalog
  - 4,700 total downloads (598/week)
  - Production-tested and validated

Zero configuration required - works out of the box after installation. Operations average under 11 milliseconds. Synchronizes .faf files with CLAUDE.md automatically. Built with 100% TypeScript strict mode. All 57 tests passing with production readiness confirmed.

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

faf_init - Initialize project context. faf_innit 🇬🇧 - It's a Brit thing! (works same as init). faf_auto - Auto-detect and populate context. faf_score - Calculate AI readiness. faf_status - Project health check.

**Enhancement Tools**

faf_enhance - Optimize scoring. faf_sync - Sync files. faf_bi_sync - Bidirectional synchronization.

**File Operations**

faf_read - Read files. faf_write - Write files. faf_list - List directories. faf_search - Search file content.

**Skills Integration**

faf_skills - List Claude Code skills from .faf file.

Full tool documentation available at https://faf.one/docs/tools.

---

## Usage Example

**DROP or PASTE, Click & Go!**

1. DROP or PASTE any project file into Claude Desktop
2. Type: "Run faf_auto to analyze this project"
3. Get instant context - Claude understands your codebase
4. Access 50+ commands naturally in conversation

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

## Claude Code Skill Installation

**NEW**: Install the `faf-expert` skill for enhanced FAF support in Claude Code:

```bash
# Install from npm package
mkdir -p ~/.claude/skills/faf-expert
cp node_modules/claude-faf-mcp/skill/SKILL.md ~/.claude/skills/faf-expert/

# Or download directly
curl -o ~/.claude/skills/faf-expert/SKILL.md \
  https://cdn.jsdelivr.net/npm/claude-faf-mcp@latest/skill/SKILL.md
```

Restart Claude Code to activate. The skill provides:
- Expert guidance on .faf files and project DNA
- v2.8.0 Tool Visibility System documentation
- MCP server configuration help
- AI-readiness scoring assistance

---

## The FAF Ecosystem

faf-cli (npm) - Command line tool for local context management. claude-faf-mcp - This MCP server for Claude Desktop integration. faf.one - Documentation and guides. Chrome Extension - Browser integration for context collection. faf-expert skill - Claude Code integration for FAF expertise.

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
