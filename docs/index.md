---
title: claude-faf-mcp
---

<div style="display: flex; align-items: center; gap: 12px;">
  <img src="https://raw.githubusercontent.com/Wolfe-Jam/faf/main/assets/logos/orange-smiley.svg" alt="FAF" width="40" />
  <div>
    <h1 style="margin: 0; color: #000000;">claude-faf-mcp</h1>
    <p style="margin: 4px 0 0 0;"><strong>IANA-Registered Format for AI Context</strong> · <code>application/vnd.faf+yaml</code></p>
  </div>
</div>

<style>
  /* Make the Jekyll page title orange */
  header h1 a,
  .site-title,
  .page-title {
    color: #ff7557 !important;
  }
</style>

> Official MCP server for FAF (Foundational AI-context Format) — Core 12 tools, 34 with FAF_TOOLS=all - Persistent project context that integrates seamlessly with Claude Desktop workflows

[![NPM Downloads](https://img.shields.io/npm/dt/claude-faf-mcp?label=total%20downloads&color=00CCFF)](https://www.npmjs.com/package/claude-faf-mcp)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/lnecebepmpjpilldfmndnaofbfjkjlkm)
[![Website](https://img.shields.io/badge/Website-faf.one-orange)](https://faf.one)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🏁 AI-Readiness Scorecard

**The closer you get to 100% the better AI can assist you.**

At 55% you are building your project with half a blueprint and basically flipping a coin with AI. .FAF defines, and AI becomes optimized for Context with the project.faf file.

<div align="center">
  <img src="https://raw.githubusercontent.com/Wolfe-Jam/faf/main/assets/Project-faf-pckg-json-README.png" alt="project.faf file positioning" width="600" />
  <p><em>project.faf lives at the project root, between package.json and README.md</em></p>
</div>

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏎️  FAF AI-READINESS SCORE: 100/100 — PODIUM EDITION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 CORE INTELLIGENCE                    🎯 CONTEXT DELIVERY
├─ Project DNA            [██████] 100%  ├─ MCP Protocol      [██████] 100%
├─ Architecture Map       [██████] 100%  ├─ 34 Native Tools   [██████] 100%
├─ Domain Model          [██████] 100%  ├─ IANA Format       [██████] 100%
└─ Version Tracking      [██████] 100%  └─ Universal Context [██████] 100%

🚀 PERFORMANCE                          ⚡ STANDALONE OPERATION
├─ 16.2x CLI Speedup     [██████] 100%  ├─ Zero Dependencies [██████] 100%
├─ 19ms Avg Execution    [██████] 100%  ├─ Bundled Engine    [██████] 100%
├─ 34/34 Tools Active    [██████] 100%  ├─ Direct Function   [██████] 100%
└─ Zero Memory Leaks     [██████] 100%  └─ 14 Bundled Cmds   [██████] 100%

🏆 project.faf score: podium
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## ⚡ Quick Start

```bash
# Install via npx (recommended - always latest)
npx @modelcontextprotocol/inspector npx -y claude-faf-mcp

# Or install globally
npm install -g claude-faf-mcp

# For Claude Code, Gemini, Cursor, Codex, WARP, any AI → npm install -g faf-cli
```

**Claude Desktop Configuration:**
```json
{
  "mcpServers": {
    "faf": {
      "command": "npx",
      "args": ["-y", "claude-faf-mcp"]
    }
  }
}
```

---

## 🎯 What is FAF?

**The .FAF Position in the MCP Ecosystem:**

```
Model        Context          Protocol
─────        ───────          ────────
Claude   →   .faf        →    MCP
Gemini   →   .faf        →    MCP
Codex    →   .faf        →    MCP
Any LLM  →   IANA Format →    Open Protocol
```

**.FAF is the foundational, universal base layer** for any Model using the MCP Protocol. It provides the standardized Context that makes the Model Context Protocol work for everyone.

---

## 🛠️ Core Features

### MCP Tools — Core 12, 34 with FAF_TOOLS=all (100% Standalone)
- **faf_quick** - Lightning-fast project.faf creation (3ms avg)
- **faf_enhance** - Intelligent enhancement with auto-detection
- **faf_read** - Parse and validate FAF files
- **faf_write** - Create/update FAF with validation
- **faf_score** - AI-readiness scoring engine
- **faf_compress** - Intelligent size optimization
- **14 bundled commands** - Zero CLI dependencies, 16.2x faster

### IANA-Registered Standard
- Official MIME type: `application/vnd.faf+yaml`
- W3C-compliant structured format
- Universal AI context protocol
- Cross-platform compatibility

### Championship Performance
- **16.2x faster** than CLI versions (direct function calls vs process spawning)
- **19ms average** execution across all bundled commands
- **Fastest: 1ms** (formats command)
- **Zero memory leaks** with F1-grade engineering

---

## 📚 Documentation

- **[Full README](https://github.com/Wolfe-Jam/claude-faf-mcp#readme)** - Complete documentation
- **[FAQ](https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/FAQ.md)** - Common questions
- **[Getting Started](https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/getting-started.md)** - Installation & setup
- **[MCP Tools Reference](https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/mcp-tools.md)** - Core 12, 34 with FAF_TOOLS=all
- **[Website](https://faf.one)** - faf.one

---

## 🏆 Why FAF?

> "README for the AI era" — Gemini CLI

**Persistent Context** - Your project's DNA lives in `project.faf`, readable by any AI or human

**Universal Format** - IANA-registered standard works across Claude, Gemini, Codex, any LLM

**Zero Setup Tax** - One file (`project.faf`) eliminates AI context setup across your entire team

**Championship Engineering** - F1-inspired performance with strict TypeScript, zero runtime errors

---

## 📦 Ecosystem

- **[FAF Format Spec](https://github.com/Wolfe-Jam/faf)** - Official IANA specification
- **[FAF CLI](https://github.com/Wolfe-Jam/faf-cli)** - Command-line tooling
- **[Chrome Extension](https://chromewebstore.google.com/detail/lnecebepmpjpilldfmndnaofbfjkjlkm)** - Browser integration
- **[faf.one](https://faf.one)** - Official website and documentation

---

## 📄 License

MIT License - Free and open source

---

**Built with F1-inspired engineering principles** 🏎️⚡

*"It's so logical if it didn't exist, AI would have built it itself" — Claude*
