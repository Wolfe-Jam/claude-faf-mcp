<div style="display: flex; align-items: center; gap: 12px;">
  <img src="https://www.faf.one/orange-smiley.svg" alt="FAF" width="40" />
  <div>
    <h1 style="margin: 0; color: #FF8C00;">claude-faf-mcp</h1>
    <p style="margin: 4px 0 0 0;"><strong>IANA-Registered Format for AI Context</strong> · <code>application/vnd.faf+yaml</code></p>
  </div>
</div>

> **.FAF optimizes AI for your codebase.** At 100% (Gold Code), AI stops guessing and starts knowing. Live bi-sync between `.faf` ↔ `CLAUDE.md` means zero context-drift — your project DNA stays aligned with AI, forever.

[![Anthropic MCP](https://img.shields.io/badge/Anthropic_MCP-merged_%232759-blueviolet)](https://github.com/modelcontextprotocol/servers/pull/2759)
[![Claude Code](https://img.shields.io/badge/Claude_Code-enabled-00D4D4)](https://github.com/anthropics/claude-code-action)
[![CI](https://github.com/Wolfe-Jam/claude-faf-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Wolfe-Jam/claude-faf-mcp/actions/workflows/ci.yml)
[![NPM Downloads](https://img.shields.io/npm/dt/claude-faf-mcp?label=total%20downloads&color=00CCFF)](https://www.npmjs.com/package/claude-faf-mcp)
[![npm version](https://img.shields.io/npm/v/claude-faf-mcp?color=00CCFF)](https://www.npmjs.com/package/claude-faf-mcp)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-4285F4?logo=googlechrome&logoColor=white)](https://chromewebstore.google.com/detail/lnecebepmpjpilldfmndnaofbfjkjlkm)
[![Website](https://img.shields.io/badge/Website-faf.one-orange)](https://faf.one)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![project.faf](https://img.shields.io/badge/project.faf-inside-00D4D4)](https://github.com/Wolfe-Jam/faf)

<p align="center">
<a href="#-quick-start">Quick Start</a> · <a href="https://faf.one">Website</a> · <a href="https://faf.one/daaft">DAAFT Analysis</a> · <a href="https://www.npmjs.com/package/claude-faf-mcp">npm</a> · <a href="#%EF%B8%8F-32-mcp-tools">Tools</a> · <a href="#tier-system-from-blind-to-optimized">Tiers</a> · <a href="https://www.npmjs.com/package/faf-cli">CLI Companion</a> · <a href="./CHANGELOG.md">Changelog</a>
</p>

---

## 📋 The 6 Ws — Quick Reference

| Question | Answer |
|----------|--------|
| **👥 WHO** is this for? | Claude Desktop & Claude Code users, MCP server operators, any MCP client |
| **📦 WHAT** is it? | 32-tool MCP server for AI context — IANA-registered format (`application/vnd.faf+yaml`) |
| **🌍 WHERE** does it work? | Claude Desktop, Claude Code, any MCP-compatible client |
| **🎯 WHY** do you need it? | 91% token waste eliminated, zero context-drift — saves $5,460/year per developer |
| **⏰ WHEN** should you use it? | New projects (day one), existing projects (now), exploring repos (instantly) |
| **🚀 HOW** does it work? | `npx claude-faf-mcp` — one line in your MCP config |

**For AI:** Read the detailed sections below for full context.
**For humans:** Use this pattern in YOUR README. **[Build yours →](https://faf.one/6ws)**

---

## Not a Developer?

No problem. FAF works for anyone using Claude Desktop.

**3 steps:**
1. Install FAF from Claude Desktop → Settings → Extensions
2. Tell Claude about your project: "I'm building [describe your idea]"
3. Claude creates your project DNA — context that never drifts

No terminal. No code. Just describe what you're building.

**Try it:** Tell Claude *"Score my project's AI-readiness and tell me how to improve"* — it works on any project, any language, any framework.

---

## The Problem: Context-Drift

AI assistants forget. They misunderstand. They drift.

Every new session, every new file, every new developer — AI starts guessing again. Your codebase context leaks away. Yesterday's perfect assistant becomes today's confused intern.

**The cost:** 91% of tokens wasted on rediscovery. $5,460/year per developer. At 50 devs, that's $273k–$507k annually — before counting project failures from compounding context loss. **[Full DAAFT analysis →](https://faf.one/daaft)**

**.FAF fixes this permanently.**

---

## The Solution: Gold Code

```
🏆 FAF AI-READINESS: 100/100 — GOLD CODE

├─ Project DNA locked in     ├─ Zero context-drift
├─ Architecture understood   ├─ Eternal bi-sync active
└─ Every session starts smart └─ AI works WITH you
```

**Gold Code = AI Optimized.** Your project DNA lives in `project.faf`. AI reads it instantly. Context never drifts.

---

## 🔄 Eternal Bi-Sync

The magic: `.faf` ↔ `CLAUDE.md` stay synchronized in milliseconds.

```
project.faf  ←──── 8ms ────→  CLAUDE.md
     │                            │
     └── Single source of truth ──┘
```

- Update either file → both stay aligned
- Zero manual maintenance
- Works across teams, branches, sessions
- **Context never goes stale**

---

## Tier System: From Blind to Optimized

| Tier | Score | Status |
|------|-------|--------|
| 🏆 **Trophy** | 100% | **AI Optimized** — Gold Code |
| 🥇 **Gold** | 99%+ | Near-perfect context |
| 🥈 **Silver** | 95%+ | Excellent |
| 🥉 **Bronze** | 85%+ | Production ready |
| 🟢 **Green** | 70%+ | Solid foundation |
| 🟡 **Yellow** | 55%+ | AI flipping coins |
| 🔴 **Red** | <55% | AI working blind |
| 🤍 **White** | 0% | No context at all |

**At 55%, AI is guessing half the time.** At 100%, AI is optimized.

---

## 💎 Lifecycle Value

Setup savings get you started. Lifecycle optimization keeps you ahead.

| When | Without FAF | With FAF |
|------|-------------|----------|
| **Day 1** | 20 min setup per dev | 0 min — instant context |
| **Month 1** | AI forgets between sessions | AI remembers everything |
| **Year 1** | New devs re-explain everything | New devs inherit full context |
| **Year 3+** | Institutional knowledge lost | Project DNA preserved forever |

**Setup savings: 20 minutes. Lifecycle savings: Infinite.**

---

## ⚡ Quick Start

**Copy and paste this to Claude/your AI:**

> Install the FAF MCP server: `npm install -g claude-faf-mcp`, then add this to my claude_desktop_config.json: `{"mcpServers": {"faf": {"command": "npx", "args": ["-y", "claude-faf-mcp"]}}}` and restart Claude Desktop.

**One-Click Alternative:** [Desktop Extension (.mcpb)](https://github.com/Wolfe-Jam/claude-faf-mcp/releases/latest)

---

## 🛠️ 32 MCP Tools

All tools run standalone — zero CLI dependencies, 16.2x faster than process spawning.

| Tool | Purpose |
|------|---------|
| `faf_init` | Initialize project DNA |
| `faf_score` | Check AI-readiness (0-100%) |
| `faf_sync` | Bi-sync .faf ↔ CLAUDE.md |
| `faf_auto` | Auto-detect and populate context |
| `faf_enhance` | Intelligent enhancement |
| `faf_quick` | Lightning-fast creation (3ms) |
| `faf_readme` | Extract 6 Ws from README (+25-35% boost) |
| `faf_human_add` | Add human context (Claude Code compatible) |
| `faf_agents` | Import/export/sync AGENTS.md (OpenAI Codex) |
| `faf_cursor` | Import/export/sync .cursorrules (Cursor IDE) |
| `faf_gemini` | Import/export/sync GEMINI.md (Google Gemini) |
| `faf_git` | Extract context from any GitHub repo URL |
| `faf_conductor` | Import/export Conductor directory |

**Performance:** 19ms average execution. Fastest: 1ms.

### ✨ New in v4.5.0: AI Format Interop

Define once in `.faf`, generate all four AI instruction formats:

```
project.faf → CLAUDE.md    (Anthropic)
            → AGENTS.md    (OpenAI / Linux Foundation)
            → .cursorrules (Cursor IDE)
            → GEMINI.md    (Google Gemini CLI)
```

**Bi-sync all at once:**
```
faf_bi_sync { all: true }
```

**GitHub context extraction:**
```
faf_git { url: "https://github.com/owner/repo" }
→ Generates .faf from any public GitHub repo
```

### 6Ws Builder

Answer 6 questions (WHO/WHAT/WHERE/WHY/WHEN/HOW) to boost AI-readiness by +25-35%. Two ways:

- **Web:** [faf.one/6ws](https://faf.one/6ws) — Fill form, copy YAML, paste into Claude with `faf_human_add`
- **CLI:** `faf 6ws` — Interactive terminal workflow

### README Auto-Extract

Already have a README? Extract context automatically:

```javascript
faf_readme                              // Preview extracted context
faf_readme { merge: true }              // Merge into project.faf
faf_readme { merge: true, overwrite: true }  // Overwrite existing fields
```

Same +25-35% score boost, zero manual work.

---

## 🎯 The .FAF Position

```
  Model        Context          Protocol
  ─────        ───────          ────────
  Claude    →   .faf        →    MCP
  Gemini    →   .faf        →    MCP
  Codex     →   .faf        →    MCP
  Any LLM   →   .faf        →    MCP
```

**.FAF is the foundational layer.** Universal context format. IANA-registered (`application/vnd.faf+yaml`). Works with any AI.

---

## 📦 Ecosystem

- **[faf-cli](https://www.npmjs.com/package/faf-cli)** — CLI companion (v4.5.0) — terminal, scripts, CI/CD
- **[faf.one/6ws](https://faf.one/6ws)** — 6Ws Builder (Web + CLI integration)
- **[MCPaaS](https://mcpaas.live)** — MCP as a Service (The Endpoint for Context)
- **[faf-wasm](https://www.npmjs.com/package/faf-wasm)** — WASM SDK (<5ms scoring)
- **[Chrome Extension](https://chromewebstore.google.com/detail/lnecebepmpjpilldfmndnaofbfjkjlkm)** — Browser integration
- **[faf.one](https://faf.one)** — Official website

### 🤝 CLI vs MCP

| Tool | Use Case |
|------|----------|
| **claude-faf-mcp** (this) | Claude Desktop, Claude Code, any MCP client |
| **faf-cli** | Terminal, scripts, CI/CD, automation |

Same `project.faf`. Same scoring. Same result. Different execution layer.

---

## 📚 Documentation

- **[Full Documentation](https://wolfe-jam.github.io/claude-faf-mcp/)**
- **[MCP Tools Reference](https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/mcp-tools.md)**

---

## 🔒 Privacy

FAF processes everything locally. No data leaves your machine. No analytics, no telemetry, no tracking, no accounts. [Full privacy policy →](./PRIVACY.md)

---

## 📄 License

MIT License — Free and open source

---

> **.faf is the format. `project.faf` is the file. 100% 🏆 AI Readiness is the result.**

*"It's so logical if it didn't exist, AI would have built it itself" — Claude*
