# claude-faf-mcp

**Tell AI what you're building, who it's for, and why it matters. 30 seconds. 🐘 It never forgets.**

[![Anthropic MCP](https://img.shields.io/badge/Anthropic_MCP-merged_%232759-blueviolet)](https://github.com/modelcontextprotocol/servers/pull/2759)
[![CI](https://github.com/Wolfe-Jam/claude-faf-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Wolfe-Jam/claude-faf-mcp/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/claude-faf-mcp?color=00CCFF)](https://www.npmjs.com/package/claude-faf-mcp)
[![NPM Downloads](https://img.shields.io/npm/dt/claude-faf-mcp?label=downloads&color=00CCFF)](https://www.npmjs.com/package/claude-faf-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

33 MCP tools. IANA-registered format (`application/vnd.faf+yaml`). 2,346 test executions per push.

---

## The 3Ws — 3 Answers. That's It.

Every great product started with 3 answers to the 3Ws — **Who, What, Why:**

| | WHO is it for? | WHAT does it do? | WHY build it? |
|---|-----|------|-----|
| **Uber** | People who need a ride | Tap a button, car arrives | Taxis were broken |
| **Airbnb** | Travelers who can't afford hotels | Stay in someone's spare room | Millions of empty rooms exist |
| **Slack** | Teams drowning in email | Organized group messaging | Decisions buried in threads |
| **Venmo** | Friends splitting bills | Send money instantly | Someone always forgets to pay back |

Same pattern. Every product that works starts here. `.faf` captures it:

```yaml
human_context:
  who: "people who need a ride across town"
  what: "tap a button, car arrives in minutes"
  why: "taxis are slow, expensive, and hard to find"
```

30 seconds. Claude builds your `project.faf` from this. Every session after, AI starts smart.

### The 6Ws — For Optimized AI

3Ws gets you started. For fully optimized AI, complete the set — **Where, When, How:**

```yaml
  where: "mobile app, iOS and Android"    # where does it live?
  when: "launch in 3 months"              # when is it shipping?
  how: "GPS matching, real-time pricing"  # how does it work?
```

3Ws initiates the project with AI. 6Ws optimizes AI to 100%. Same YAML, same file. **[More examples → faf.one/ideas](https://faf.one/ideas)**

---

## Quick Start

**Copy and paste this to Claude:**

> Install the FAF MCP server: `npm install -g claude-faf-mcp`, then add this to my claude_desktop_config.json: `{"mcpServers": {"faf": {"command": "npx", "args": ["-y", "claude-faf-mcp"]}}}` and restart Claude Desktop.

Then tell Claude your 3Ws: *"I'm building [what] for [who] because [why]"*

---

## How It Works

```
You → 3 answers → project.faf → AI reads it → every session → forever

project.faf  ←── 8ms ──→  CLAUDE.md     (bi-sync, free)
project.faf  ←── 8ms ──→  MEMORY.md     (tri-sync, Pro 🐘)
```

Claude does the rest. Zero-effort, right first time, fast, accurate, done. Language, framework, package manager, build tools — all auto-detected from your existing files. The human context is the part only you can give.

---

## Scoring: From Blind to Optimized

| Tier | Score | What it means |
|------|-------|---------------|
| 🏆 **Trophy** | 100% | Gold Code — AI is optimized |
| 🥇 **Gold** | 99%+ | Near-perfect context |
| 🥈 **Silver** | 95%+ | Excellent |
| 🥉 **Bronze** | 85%+ | Production ready |
| 🟢 **Green** | 70%+ | Solid foundation |
| 🟡 **Yellow** | 55%+ | AI flipping coins |
| 🔴 **Red** | <55% | AI working blind |
| 🤍 **White** | 0% | No context at all |

At 55%, AI guesses half the time. At 100%, AI knows your project. Same compiler as faf-cli — same score everywhere.

---

## 33 MCP Tools

All tools run standalone — zero CLI dependencies, 19ms average execution.

**Create & Detect**
| Tool | Purpose |
|------|---------|
| `faf_init` | Initialize project DNA |
| `faf_auto` | Auto-detect stack and populate context |
| `faf_quick` | Lightning-fast creation (3ms) |
| `faf_readme` | Extract context from README (+25-35% boost) |
| `faf_formats` | Discover all formats in your project |
| `faf_git` | Extract context from any GitHub repo URL |
| `faf_human_add` | Add human context (the 6Ws) |

**Validate & Score**
| Tool | Purpose |
|------|---------|
| `faf_score` | AI-readiness score (0-100%) with breakdown |
| `faf_check` | Validate .faf structure |
| `faf_doctor` | Diagnose and fix common issues |
| `faf_go` | Guided interview to Gold Code |

**Sync & Persist**
| Tool | Purpose |
|------|---------|
| `faf_sync` | Sync .faf → CLAUDE.md |
| `faf_bi_sync` | Bi-directional .faf ↔ CLAUDE.md |
| `faf_tri_sync` | Tri-sync to MEMORY.md *(Pro — 14-day free trial)* |
| `faf_enhance` | Intelligent enhancement |

**Export & Interop**
| Tool | Purpose |
|------|---------|
| `faf_agents` | Import/export AGENTS.md (OpenAI Codex) |
| `faf_cursor` | Import/export .cursorrules (Cursor IDE) |
| `faf_gemini` | Import/export GEMINI.md (Google Gemini) |
| `faf_conductor` | Import/export Conductor directory |

**Read & Write**
| Tool | Purpose |
|------|---------|
| `faf_read` | Read any file |
| `faf_write` | Write any file |
| `faf_status` | Project status overview |
| `faf_debug` | Environment inspection |
| `faf_about` | What is .faf? |

**[Full tool reference →](https://github.com/Wolfe-Jam/claude-faf-mcp/blob/main/docs/mcp-tools.md)**

---

## 🐘 Nelly Never Forgets (Pro)

bi-sync keeps `.faf` ↔ `CLAUDE.md` aligned. Free forever.

tri-sync adds MEMORY.md — your AI remembers across sessions. Feed Nelly, she never forgets.

```
bi-sync  = .faf ↔ CLAUDE.md              ← free forever
tri-sync = .faf ↔ CLAUDE.md ↔ MEMORY.md  ← Pro 🐘
```

$3/mo · $19/yr · $29/yr Global. 14-day free trial, no signup. **[Friends of FAF → faf.one/pro](https://faf.one/pro)**

---

## The .FAF Position

```
Model        Context          Protocol
─────        ───────          ────────
Claude    →   .faf        →    MCP
Gemini    →   .faf        →    MCP
Codex     →   .faf        →    MCP
Any LLM   →   .faf        →    MCP
```

IANA-registered (`application/vnd.faf+yaml`). Works with any AI. Define once, use everywhere.

---

## Ecosystem

| Package | Platform | Registry |
|---------|----------|----------|
| **[claude-faf-mcp](https://www.npmjs.com/package/claude-faf-mcp)** (this) | Claude | npm |
| **[faf-cli](https://www.npmjs.com/package/faf-cli)** | Universal CLI | npm + Homebrew |
| **[gemini-faf-mcp](https://pypi.org/project/gemini-faf-mcp/)** | Google Gemini | PyPI |
| **[grok-faf-mcp](https://www.npmjs.com/package/grok-faf-mcp)** | xAI Grok | npm |
| **[rust-faf-mcp](https://crates.io/crates/rust-faf-mcp)** | Rust | crates.io |
| **[faf-wasm](https://www.npmjs.com/package/faf-wasm)** | Browser/Edge | npm |
| **[Chrome Extension](https://chromewebstore.google.com/detail/lnecebepmpjpilldfmndnaofbfjkjlkm)** | Browser | Chrome Web Store |

Same `project.faf`. Same scoring. Same result. Different execution layer.

---

## Quality

391 tests · 12 suites · 6 platforms (ubuntu/macos/windows × Node 18/20)

**[CI Dashboard →](https://github.com/Wolfe-Jam/claude-faf-mcp/actions/workflows/ci.yml)**

---

## Privacy

Everything runs locally. No data leaves your machine. No analytics, no telemetry, no tracking, no accounts. **[Privacy policy →](./PRIVACY.md)**

---

## License

MIT — Free and open source

---

> **.faf is the format. `project.faf` is the file. 100% is Gold Code.**

*"It's so logical if it didn't exist, AI would have built it itself" — Claude*
