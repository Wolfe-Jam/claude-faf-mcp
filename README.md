<!-- faf: claude-faf-mcp | TypeScript | mcp-server | FAF MCP server for Claude — persistent project context, 12 Core tools (34 total) -->
<!-- faf: doc=readme | canonical=project.faf | score=100 | family=FAF -->

# claude-faf-mcp — The Compose Edition

[![npm version](https://img.shields.io/npm/v/claude-faf-mcp?color=00CCFF)](https://www.npmjs.com/package/claude-faf-mcp)
[![Smithery](https://img.shields.io/badge/Smithery-listed-00CCFF)](https://smithery.ai/servers/wolfe-jam/claude-faf-mcp)
[![FAF Trophy 100%](https://img.shields.io/badge/FAF-%F0%9F%8F%86%20100%25-000000?labelColor=FF6B35)](https://faf.one)
[![IANA: vnd.faf+yaml](https://img.shields.io/badge/IANA-vnd.faf%2Byaml-008B8B)](https://www.iana.org/assignments/media-types/application/vnd.faf+yaml)[![IANA: vnd.fafm+yaml](https://img.shields.io/badge/IANA-vnd.fafm%2Byaml-008B8B)](https://www.iana.org/assignments/media-types/application/vnd.fafm+yaml)
[![DOI: Context paper](https://img.shields.io/badge/DOI-Context%20paper-FF6B35)](https://doi.org/10.5281/zenodo.18251362)[![DOI: Memory paper](https://img.shields.io/badge/DOI-Memory%20paper-FF6B35)](https://doi.org/10.5281/zenodo.20348942)

**Home:** [faf.one/mcp](https://faf.one/mcp)
**Live demo:** [claude.faf.one](https://claude.faf.one)

**Persistent Project Context with Memory, looped for you.** One-click setup. 30 seconds. 🐘 Nelly Never Forgets.

[![Anthropic MCP](https://img.shields.io/badge/Anthropic_MCP-merged_%232759-blueviolet)](https://github.com/modelcontextprotocol/servers/pull/2759)
[![CI](https://github.com/Wolfe-Jam/claude-faf-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Wolfe-Jam/claude-faf-mcp/actions/workflows/ci.yml)
[![NPM Downloads](https://img.shields.io/npm/dt/claude-faf-mcp?label=downloads&color=00CCFF)](https://www.npmjs.com/package/claude-faf-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chat to FAFA live](https://img.shields.io/badge/Chat_to_FAFA_live-008B8B?style=flat&labelColor=000)](https://faf-voice.vercel.app/agent)

**FAF defines. MD instructs. AI codes.**

⭐ Bookmarks it for you, helps other devs find it too.

**v0.2-conformant reader** of the [FAF Context Ingestion Contract](https://github.com/Wolfe-Jam/faf/blob/main/CONTEXT-INGESTION.md).

> 🐘 **tri-sync** | `.faf` ↔ `CLAUDE.md` ↔ `MEMORY.md` in one command.

> ⚡ **New: `/faf` prompt** — type `/faf` in Claude Desktop. It checks your project, scores it, drives it to 100%, and syncs. Relentlessly. One command.

> **v5.21.0 — The Compose Edition.** Language Editions arrive by composition — pin faf-cli ^7.7.0 so Core `faf_auto` inherits the CLI rail (Dart · Go · C# · JVM · Ruby · Swift); Core 12 tools; `faf_enhance` removed. Turbo-Cat stays in faf-cli; CFM does not fork detectors. Permanent E2E: `tests/wjttc-edition-compose.test.ts`. Sibling MCP precedent: [`docs/compose-faf-cli.md`](docs/compose-faf-cli.md).

> **v5.20.0 — The GitHub Registry Edition.** claude-faf-mcp joins GitHub's MCP Registry — discoverable in VS Code — as **Claude FAF**, its display title now emitted from `project.faf`, single-sourced and idempotent. The registry derives a display name from the server-card `title`; CFM now provides it through the emitter (`name` + `_meta` + `title`, all composed from `project.faf`, never hand-authored — the BRAKE B1 test enforces emitted == live).

> **v5.15.0 — The Instructions Edition.** CFM writes the file Copilot reads — done right. `.github/copilot-instructions.md` is now genuine, distinct Copilot *instructions*: a prose overview, a `## Build & run` command section, and "every request" framing — not the AGENTS.md content reused. The file Copilot actually reads, done to GitHub's spec.

> **v5.14.1 — The Copilot Edition.** FAF now writes the file GitHub Copilot reads — from inside Claude. The Core `faf_sync` gains a `copilot` flag (`all` includes it), syncing `.github/copilot-instructions.md` — Copilot's **widest-surface** instruction file, read by default across web chat, code review, VS Code, JetBrains, the CLI, and the coding agent — straight from your scored `.faf`. `faf_sync` now emits every format (`agents`/`cursor`/`gemini`/`copilot`/`all`) from the default surface; the redundant `faf_bi_sync` is retired. Non-destructive, idempotent.

> 🧡 **v5.13.0 — The Heartbeat Edition.** Persistent Project Context with Memory, looped for you. Every Claude Code session now opens with a one-line heartbeat that carries the intent the code can't: `faf: context ✪ 100% — fresh · +7 intent the code can't carry`. The `+N` is the goal and 6Ws only you can **give or confirm** — so Claude starts each session grounded in what your project *means*, not just what it contains.

> 🏆 **v5.12.0 — The Proof Edition.** `faf_bench` proves FAF's grounding lift in-session — it asks Claude about your repo cold (no context) and with the `.faf`, grades mechanically (no judge), and emits a `✪` receipt showing the delta. Promoted to lead the Core tier (13 tools, 36 total). `faf_go` now bootstraps a cold repo (init → auto → 6Ws), and you can still just **type `faf` to start**. Proof, not pitch.

> 🏆 **v5.11.0 — The Distilled Edition.** claude-faf-mcp, distilled — a curated Core of 12 self-documenting tools, with the interview, README extractor, and server-card all composed from faf-cli's single source (no forks), and faf_go's new Table-of-8 where your goal seeds the 6Ws. Fewer tools, nothing forked, nothing guessed.

**Context for Claude:** faf-cli keeps this MCP's CLAUDE.md / AGENTS.md in sync from one scored source — `bunx faf sync`. See [FAF-CLI for Claude Code 👀](https://github.com/Wolfe-Jam/faf-cli/blob/main/docs/faf-cli-for-claude.md).

> 🏆 **Compose floor faf-cli ^7.7.0.** Language Editions (Dart · Go · C# · JVM · Ruby · Swift) arrive **by composition** — Turbo-Cat in faf-cli; CFM does not fork detectors. Bump the dep, retest, ship. Precedent for sibling MCPs: [`docs/compose-faf-cli.md`](docs/compose-faf-cli.md).

> 🏆 **v5.10.0 — The Dart Edition.** claude-faf-mcp now reads Dart & Flutter — it knows a Flutter app from a pure-Dart CLI. Detection by composition: because CFM composes faf-cli's Turbo-Cat (The Sourced Edition), faf-cli 6.13.0's content-aware, pubspec-driven Dart classifier arrives by construction — no forked parser, no drift.

> 🏆 **v5.9.0 — The Sourced Edition.** Every answer comes from one source. `faf_go` and Turbo-Cat detection now **compose faf-cli's single-source engines** instead of carrying their own copies — fills come from real evidence or stay honestly empty, nothing guessed. The legacy guessing extractor is gone; the `/faf` prompt drives to a *verified* 100% (`faf_trust` + `✪` parity receipt) and keeps it fresh. FAF don't lie, by construction.

> 🏆 **v5.8.0 — The Trust Edition.** Claude Code-native context that just works. A native SessionStart hook opens every session with fresh context and a one-line `✪` heartbeat (`faf: context ✪ 100% — fresh`); tool output is quiet (no emoji, parseable) and typed (`structuredContent` everywhere); every score carries a deterministic parity hash any engine reproduces, sealed in a self-verifying `✪` receipt. Installed explicitly via `faf_setup` — preview first, your settings preserved. Built on the Canonical foundation: path-confined file access, edge-direct remote, 35 tools.

12 Core MCP tools (34 with `FAF_TOOLS=all`). IANA-registered formats (`application/vnd.faf+yaml` · `application/vnd.fafm+yaml`). 592 tests per suite.

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

### faf-cli — universal (any AI)

```bash
npx faf-cli auto
```

Same `.faf`, every surface — Claude, Gemini, Grok, Cursor. **[faf-cli on npm →](https://www.npmjs.com/package/faf-cli)**

### Claude Desktop — click, copy, paste, install

**Click** — one-click `.mcpb`

[**⬇ Download `claude-faf-mcp-5.21.0.mcpb`**](https://github.com/Wolfe-Jam/claude-faf-mcp/releases/latest/download/claude-faf-mcp-5.21.0.mcpb)

Double-click. **Zero-Config — no terminal, no JSON config. 12 Core tools live in 10 seconds.**

**Copy** — paste-prompt to Claude

> Install the FAF MCP server: `npm install -g claude-faf-mcp`, then add this to my claude_desktop_config.json: `{"mcpServers": {"faf": {"command": "bunx", "args": ["claude-faf-mcp"]}}}` and restart Claude Desktop.

**Paste** — `claude_desktop_config.json`

```json
{
  "mcpServers": {
    "faf": { "command": "bunx", "args": ["claude-faf-mcp"] }
  }
}
```

**Install** — manual npm

```bash
npm install -g claude-faf-mcp
```

**Smithery:** [wolfe-jam/claude-faf-mcp](https://smithery.ai/servers/wolfe-jam/claude-faf-mcp) — hosted at `https://mcpaas.live/claude/mcp/v1`

Restart Claude Desktop.

### Then

Type `/faf` — Claude checks your project, scores it, drives it to 100%, and syncs. Done.

Or tell Claude your 3Ws: *"I'm building [what] for [who] because [why]"*

---

## How It Works

```
You → 3 answers → project.faf → AI reads it → every session → forever

project.faf  ←── 8ms ──→  CLAUDE.md     (bi-sync, free)
project.faf  ←── 8ms ──→  MEMORY.md     (tri-sync, Pro 🐘)
```

Claude does the rest. Zero-effort, right first time, fast, accurate, done. Language, framework, package manager, build tools — all auto-detected from your existing files. The human context is the part only you can give.

---

## For Claude Code teams

`.faf` lives in the repo. Your context travels with the code — committed, versioned, done.

**Every session starts grounded.** Install the native SessionStart hook once (`faf_setup` — preview first, your settings preserved). After that, every Claude Code session opens with a one-line heartbeat instead of a blank slate:

```
faf: context ✪ 100% — fresh · +7 intent the code can't carry
```

That line is the relay: Claude already knows your stack and your score — and the `+N` is the intent the code **can't carry**: the goal and 6Ws only you can **give or confirm**. No re-explaining "what this project is" at the top of every session.

**It scales to the team by construction:**

```
commit project.faf  →  every teammate's Claude starts with the same context
git clone           →  a new dev's Claude is grounded before they write a line
```

- **One source of truth.** `.faf` ↔ `CLAUDE.md` stay in sync (bi-sync'd). Add `MEMORY.md` for cross-session memory (tri-sync 🐘).
- **No drift.** The score is deterministic — same `.faf`, same number, on every machine and in CI. A teammate can't be *accidentally* less grounded than you.
- **Local and private.** Nothing leaves the machine — no accounts, no telemetry. The context is yours; it just rides in the repo.

**Onboarding becomes `git clone` → grounded.** The context a new teammate would normally pick up by asking around is already in the repo, machine-readable, from the first clone.

---

## Scoring: From Blind to Optimized

| Tier | Score | What it means |
|------|-------|---------------|
| 🏆 **TROPHY** | 100% | Gold Code — AI is optimized |
| ★ **GOLD** | 99%+ | Near-perfect context |
| ◆ **SILVER** | 95%+ | Excellent |
| ◇ **BRONZE** | 85%+ | Production ready |
| ● **GREEN** | 70%+ | Solid foundation |
| ● **YELLOW** | 55%+ | AI flipping coins |
| ○ **RED** | <55% | AI working blind |
| ♡ **WHITE** | 0% | No context at all |

At 55%, AI guesses half the time. At 100%, AI knows your project. Same compiler as faf-cli — same score everywhere.

---

## MCP Tools — 12 Core, 34 with `FAF_TOOLS=all`

By default claude-faf-mcp advertises a distilled **Core of 12** — the lifecycle tools you reach for, each self-documenting. Set `FAF_TOOLS=all` to expose Extended tools (callable by name regardless). **Core 12:** `faf_init` · `faf_auto` · `faf_go` · `faf_bench` · `faf_score` · `faf_doctor` · `faf_sync` · `faf_context` · `faf_trust` · `faf_about` · `faf_etch` · `faf_recall`. (`faf_enhance` removed — no silent AI rewrite of project.faf.)

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
| `faf_bench` | Benchmark AI grounding — cold vs .faf, with a `✪` receipt |
| `faf_check` | Validate .faf structure |
| `faf_doctor` | Diagnose and fix common issues |
| `faf_go` | Guided interview to Gold Code |

**Sync & Persist**
| Tool | Purpose |
|------|---------|
| `faf_sync` | Sync .faf → CLAUDE.md — `agents`/`cursor`/`gemini`/`copilot`/`all` also emit AGENTS.md / .cursorrules / GEMINI.md / copilot-instructions.md |
| `faf_tri_sync` | Tri-sync .faf ↔ CLAUDE.md ↔ MEMORY.md — Pro feature, free for developers 🐘 |

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

## 🐘 Nelly Never Forgets

bi-sync keeps `.faf` ↔ `CLAUDE.md` aligned.

tri-sync adds MEMORY.md — your AI remembers your project across every session.

```
bi-sync  = .faf ↔ CLAUDE.md              ← always in sync
tri-sync = .faf ↔ CLAUDE.md ↔ MEMORY.md  ← Nelly never forgets 🐘
```

Pro feature, free for developers. Teams & Enterprise: **[faf.one/pro](https://faf.one/pro)** (plans)

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

572 tests · 28 suites · 3 platforms (bun on ubuntu/macos/windows)

**[CI Dashboard →](https://github.com/Wolfe-Jam/claude-faf-mcp/actions/workflows/ci.yml)**

---

## Privacy

Everything runs locally. No data leaves your machine. No analytics, no telemetry, no tracking, no accounts. **[Privacy policy →](./PRIVACY.md)**

---

If `claude-faf-mcp` has been useful, consider starring the repo — it helps others find it.

---


## Citation

If you use `claude-faf-mcp` or the `.faf` / `.fafm` / `.fafa` formats in research or production, please cite the format papers:

> Wolfe, J. (2025). *Format-Driven AI Context Architecture: The .faf Standard for Persistent Project Understanding*. Zenodo. https://doi.org/10.5281/zenodo.18251362

> Wolfe, J. (2026). *Permanent Memory and Instant Recall: The .fafm Standard for Multi-Profile AI Agent Memory*. Zenodo. https://doi.org/10.5281/zenodo.20348942

> Wolfe, J. (2026). *Why Agents Need a Passport: .fafa — Portable Identity for the Agentic Era*. Zenodo. https://doi.org/10.5281/zenodo.21951641

### BibTeX

```bibtex
@article{wolfe2025faf,
  title     = {Format-Driven AI Context Architecture: The .faf Standard for Persistent Project Understanding},
  author    = {Wolfe, James},
  year      = {2025},
  month     = {nov},
  publisher = {Zenodo},
  doi       = {10.5281/zenodo.18251362},
  url       = {https://doi.org/10.5281/zenodo.18251362}
}

@article{wolfe2026fafm,
  title     = {Permanent Memory and Instant Recall: The .fafm Standard for Multi-Profile AI Agent Memory},
  author    = {Wolfe, James},
  year      = {2026},
  month     = {may},
  publisher = {Zenodo},
  doi       = {10.5281/zenodo.20348942},
  url       = {https://doi.org/10.5281/zenodo.20348942}
}

@article{wolfe2026fafa,
  title     = {Why Agents Need a Passport: .fafa — Portable Identity for the Agentic Era},
  author    = {Wolfe, James},
  year      = {2026},
  month     = {aug},
  publisher = {Zenodo},
  doi       = {10.5281/zenodo.21951641},
  url       = {https://doi.org/10.5281/zenodo.21951641}
}
```

## License

MIT — Free and open source

---

## FAF Family

| | |
|---|---|
| **[faf-cli](https://www.npmjs.com/package/faf-cli)** | `npx faf-cli init` — create .faf for any project |
| **[claude-faf-mcp](https://www.npmjs.com/package/claude-faf-mcp)** | MCP server for Claude Desktop |
| **[gemini-faf-mcp](https://pypi.org/project/gemini-faf-mcp/)** | MCP server for Gemini CLI |
| **[grok-faf-mcp](https://www.npmjs.com/package/grok-faf-mcp)** | MCP server for Grok |
| **[faf-mcp](https://www.npmjs.com/package/faf-mcp)** | MCP server for Cursor, Windsurf, Cline, VS Code |
| **[rust-faf-mcp](https://crates.io/crates/rust-faf-mcp)** | MCP server in Rust |
| **[faf-skills](https://github.com/Wolfe-Jam/faf-skills)** | 17 Claude Code skills |
| **[faf.one](https://faf.one)** | Blog, downloads, docs |
| **[IANA: vnd.faf+yaml](https://www.iana.org/assignments/media-types/application/vnd.faf+yaml)** | Context format (2025-10-30) |
| **[IANA: vnd.fafm+yaml](https://www.iana.org/assignments/media-types/application/vnd.fafm+yaml)** | Memory format (2026-05-13) |

*format | driven 🏎️⚡️ [wolfejam.dev](https://wolfejam.dev)*

---

### Get the CLI

> **faf-cli** — The original AI-Context CLI. A must-have for every builder.

```bash
npx faf-cli auto
```

**Anthropic MCP [#2759](https://github.com/modelcontextprotocol/servers/pull/2759)** · **2 IANA registrations:** `vnd.faf+yaml` (Context) · `vnd.fafm+yaml` (Memory) · [faf.one](https://faf.one) · [npm](https://www.npmjs.com/package/faf-cli)

---

**Zero-Config. Context that's just there — every session.**
