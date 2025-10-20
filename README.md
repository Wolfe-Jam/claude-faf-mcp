# claude-faf-mcp v2.6.2 🏆

<div align="center">

<img src="https://cdn.jsdelivr.net/npm/claude-faf-mcp@latest/assets/icons/faf-icon-64.png" alt="Orange Smiley" width="48" />

**🏆 Anthropic-Approved MCP Server** • **94.4/100 Gold Standard** • **Project DNA ✨ for ANY AI**

</div>

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/claude-faf-mcp)](https://www.npmjs.com/package/claude-faf-mcp)
[![Downloads](https://img.shields.io/npm/dt/claude-faf-mcp)](https://www.npmjs.com/package/claude-faf-mcp)
[![Weekly Downloads](https://img.shields.io/npm/dw/claude-faf-mcp)](https://www.npmjs.com/package/claude-faf-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[![TypeScript](https://img.shields.io/badge/TypeScript-100%25%20Strict-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Node Version](https://img.shields.io/node/v/claude-faf-mcp)](https://nodejs.org)
[![GitHub Stars](https://img.shields.io/github/stars/Wolfe-Jam/claude-faf-mcp?style=social)](https://github.com/Wolfe-Jam/claude-faf-mcp)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

[![Official MCP Registry](https://img.shields.io/badge/Anthropic-Official%20MCP%20Registry-success?logo=github)](https://github.com/modelcontextprotocol/servers)
[![Production Ready](https://img.shields.io/badge/Status-Production%20Ready-success)](https://wolfe-jam.github.io/claude-faf-mcp/)
[![Gold Standard](https://img.shields.io/badge/Evaluation-94.4%2F100%20Gold-FFD700)](./docs/evaluations/WJTTC-Comprehensive-Evaluation-2025-10-12.md)
[![Tests](https://img.shields.io/badge/Tests-730%20C.O.R.E-success)](./docs/evaluations/)
[![Performance](https://img.shields.io/badge/Performance-%3C11ms-success)](./docs/evaluations/)

**[Website](https://faf.one)** • **[Docs](https://wolfe-jam.github.io/claude-faf-mcp/)** • **[Community](https://github.com/Wolfe-Jam/claude-faf-mcp/discussions)** • **[Contributing](./CONTRIBUTING.md)**

</div>

---

## 🏆 Championship Scoring System

![FAF Championship Score Card](https://cdn.jsdelivr.net/npm/claude-faf-mcp@latest/assets/faf-championship-scorecard.png)

Track your project's AI-readiness with F1-inspired tiers:

```
🏆 Trophy (100%)    - Championship - Perfect AI|HUMAN balance
🥇 Gold (99%)       - Gold standard
🥈 Silver (95-98%)  - Excellence
🥉 Bronze (85-94%)  - Production ready
🟢 Green (70-84%)   - Good foundation
🟡 Yellow (55-69%)  - Getting there
🔴 Red (0-54%)      - Needs attention
```

**Live output in Claude Desktop:**

```
🥉 Score: 88/100
█████████████████████░░░ 88%
Status: Bronze - Production Ready

Next milestone: 95% 🥈 Silver (7 points to go!)
```

---

## 🚀 Quick Start

```bash
# Install globally
npm install -g claude-faf-mcp

# Add to Claude Desktop config
# macOS/Linux: ~/Library/Application Support/Claude/claude_desktop_config.json
# Windows: %APPDATA%\Claude\claude_desktop_config.json

{
  "mcpServers": {
    "claude-faf-mcp": {
      "command": "claude-faf-mcp"
    }
  }
}
```

Restart Claude Desktop → Ready! 🏁

---

## 🏆 Anthropic-Approved MCP Server

**claude-faf-mcp** is officially published in the [Anthropic MCP Registry](https://github.com/modelcontextprotocol/servers).

☑️ **Published to official Anthropic MCP registry** - Validated by Anthropic engineering team
☑️ **[PR #2759](https://github.com/modelcontextprotocol/servers/pull/2759)** - Approved and available in registry
☑️ **3,600+ total downloads** - Growing adoption across the Claude community

Registry listing: *"MCP server for .faf format. Context scoring engine with project context management."*

**The first .faf format server in the official Anthropic ecosystem.** 🧡⚡🏎️

---

## 🎯 What is claude-faf-mcp?

**The first and only AI Context MCP introducing Persistent Project Context.**

MCP server that brings `.faf` format to Claude Desktop for instant project understanding.

**.faf = Foundational AI-Context Format | Project DNA ✨ for AI-Context, On-Demand**

**Format-Driven Architecture:**
- **Persistent** - Context survives across sessions, tools, and AIs
- **Universal** - Works with any MCP client, CLI, workflow automation (n8n, Make, etc.), or AI assistant
- **Stack-Agnostic** - Any language, framework, or setup
- **Built with Claude** - Optimized for Claude Desktop while maintaining compatibility with ANY AI model or platform

No limits. No restrictions. No boundaries. The only true format-first architecture for the AI era.

### Key Features

- ✅ **Zero Config** - Works out of the box
- ✅ **33+ Tools** - Complete project management
- ✅ **<11ms Speed** - Championship performance
- ✅ **Bi-Sync** - .faf ↔ CLAUDE.md synchronization
- ✅ **Type Safe** - 100% TypeScript strict mode
- ✅ **Production Ready** - 35/35 tests passing

---

## 🛠️ Available Tools

### Core Tools
- `faf_init` - Initialize project context
- `faf_auto` - Auto-detect and populate
- `faf_score` - Calculate AI readiness
- `faf_status` - Project health check

### Enhancement Tools
- `faf_enhance` - Optimize scoring
- `faf_sync` - Sync files
- `faf_bi_sync` - Bidirectional sync

### File Operations
- `faf_read` - Read files
- `faf_write` - Write files
- `faf_list` - List directories
- `faf_search` - Search content

[See all 33+ tools →](https://faf.one/docs/tools)

---

## 💡 Usage Example

1. **Drop any project file** into Claude Desktop
2. **Type**: "Run faf_auto to analyze this project"
3. **Get instant context** - Claude understands your codebase
4. **Use tools** - Access 33+ commands naturally in conversation

The `.faf` file persists across conversations - no need to re-explain your project!

---

## 📊 Technical Specs

```
Performance:   <11ms operations
TypeScript:    100% strict mode
Dependencies:  1 (MCP SDK only)
Testing:       730 C.O.R.E empirical tests (part of 12,500+ FAF ecosystem validation)
Build:         Zero errors
Coverage:      4,400+ lines
```

---

## ✨ What's New

### v2.6.2 - Documentation Improvements
- **DRY Principle** - Version management simplified
- **Single Source of Truth** - Version appears once in title
- **Easier Maintenance** - Streamlined documentation updates

### v2.6.1 - Official MCP Registry Publication
- ☑️ **Published to Anthropic MCP Registry** - [PR #2759](https://github.com/modelcontextprotocol/servers/pull/2759) MERGED
- **server.json** added for official registry listing
- **mcpName** updated with correct capitalization format
- **Registry validation** - First .faf format server in official ecosystem

### v2.6.0 - Post-Evaluation Release (94.4/100 Gold Standard)

🏆 **Post-Evaluation Release (94.4/100 Gold Standard)**
- Type-safe tool handlers with proper TypeScript definitions
- Community contribution framework (templates, guidelines, funding)
- Repository cleanup: Removed 17K+ lines of legacy docs
- Improved TypeScript strict mode compliance across all handlers

### v2.5.2 - Visual Championship Experience
- **Orange Smiley branding** - Complete visual identity on NPM
- **Score card screenshot** - See the actual terminal output
- **Championship polish** - Professional presentation

### v2.5.1 - Documentation Polish
- **Championship README** - Trophy section leads for immediate impact
- **Optimized description** - Cleaner NPM presence
- **Professional structure** - Scannable, modern layout

### v2.5.0 - Championship Edition
- **7-tier medal system** for AI-readiness scoring
- **Visual progress bars** in terminal output
- **Milestone tracking** with next-level guidance
- **Enhanced scoring** for better project analysis

---

## 🏗️ Development

```bash
# Clone
git clone https://github.com/Wolfe-Jam/claude-faf-mcp.git
cd claude-faf-mcp

# Install & Build
npm install
npm run build

# Test
npm test

# Link locally
npm link
```

---

## 📋 Requirements

- **Node.js** 18+
- **Claude Desktop** (latest version)
- **OS**: macOS, Linux, or Windows

---

## 🔗 The FAF Ecosystem

- [🩵 **faf-cli**](https://npmjs.com/package/faf-cli) - Command line tool (v3.0.2 - Championship Edition 🏆 with Turbo Cat 😽)
- [🧡 **claude-faf-mcp**](https://npmjs.com/package/claude-faf-mcp) - This MCP server
- [💚 **faf.one**](https://faf.one) - Documentation & guides
- [🖥️ **Chrome Extension**](https://chromewebstore.google.com/detail/lnecebepmpjpilldfmndnaofbfjkjlkm) - Browser integration

---

## 👤 Author

**James Wolfe (Wolfe-Jam)**
Creator, .faf Format
ORCID: [0009-0007-0801-3841](https://orcid.org/0009-0007-0801-3841)

---

## 📄 License

MIT License - See [LICENSE](./LICENSE) file

**Note**: The .faf-Engine is proprietary and available under separate license.

---

## 🤝 Contributing

We welcome contributions! Join our [community discussions](https://github.com/Wolfe-Jam/claude-faf-mcp/discussions) or submit issues/PRs.

---

<div align="center">

**AI? Context? faf innit ✨**

Made with 🧡 by wolfejam.dev

**100% FREE Forever** • **Zero Dependencies** • **Zero Faff™**

[⭐ Star on GitHub](https://github.com/Wolfe-Jam/claude-faf-mcp) • [📦 View on NPM](https://www.npmjs.com/package/claude-faf-mcp)

</div>
