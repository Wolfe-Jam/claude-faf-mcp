<!-- faf: claude-faf-mcp | TypeScript | mcp-server | FAF MCP server for Claude — persistent project context, Core 14 tools (30 with FAF_TOOLS=all) -->
<!-- faf: doc=readme | canonical=project.faf | score=100 | family=FAF -->

# claude-faf-mcp

[![npm version](https://img.shields.io/npm/v/claude-faf-mcp?color=00CCFF)](https://www.npmjs.com/package/claude-faf-mcp)
[![Smithery](https://img.shields.io/badge/Smithery-listed-00CCFF)](https://smithery.ai/servers/wolfe-jam/claude-faf-mcp)
[![FAF ✪ 100%](https://img.shields.io/badge/FAF-%E2%9C%AA%20100%25-000000?labelColor=FF6B35)](https://faf.one)
[![IANA: vnd.faf+yaml](https://img.shields.io/badge/IANA-vnd.faf%2Byaml-008B8B)](https://www.iana.org/assignments/media-types/application/vnd.faf+yaml)[![IANA: vnd.fafm+yaml](https://img.shields.io/badge/IANA-vnd.fafm%2Byaml-008B8B)](https://www.iana.org/assignments/media-types/application/vnd.fafm+yaml)
[![DOI: Context paper](https://img.shields.io/badge/DOI-Context%20paper-FF6B35)](https://doi.org/10.5281/zenodo.18251362)[![DOI: Memory paper](https://img.shields.io/badge/DOI-Memory%20paper-FF6B35)](https://doi.org/10.5281/zenodo.20348942)

**Home:** [faf.one/mcp](https://faf.one/mcp)
**Site:** [claude.faf.one](https://claude.faf.one)

**Persistent Project Context with Memory, looped for you.** One-click setup. 30 seconds. 🐘 Nelly Never Forgets.

[![MCP Registry: one.faf/claude-faf-mcp](https://img.shields.io/badge/MCP_Registry-one.faf%2Fclaude--faf--mcp-blueviolet)](https://registry.modelcontextprotocol.io/v0.1/servers?search=one.faf%2Fclaude-faf-mcp)
[![CI](https://github.com/Wolfe-Jam/claude-faf-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/Wolfe-Jam/claude-faf-mcp/actions/workflows/ci.yml)
[![NPM Downloads](https://img.shields.io/npm/dt/claude-faf-mcp?label=downloads&color=00CCFF)](https://www.npmjs.com/package/claude-faf-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chat to FAFA live](https://img.shields.io/badge/Chat_to_FAFA_live-008B8B?style=flat&labelColor=000)](https://faf-voice.vercel.app/agent)

**FAF defines. MD instructs. AI codes.**

⭐ Bookmarks it for you, helps other devs find it too.

**v0.2-conformant reader** of the [FAF Context Ingestion Contract](https://github.com/Wolfe-Jam/faf/blob/main/CONTEXT-INGESTION.md).

> 🐘 **tri-sync** | `.faf` → `MEMORY.md` (`faf_tri_sync`), alongside `.faf` → `CLAUDE.md` (`faf_sync`).

> ⚡ **The `faf` prompt** — pick it from your host's prompt list (Claude Code shows it as `/mcp__<server name>__faf`). It scores your project, fills what the repo can, asks you only what only you can answer, verifies, and syncs.

> **6.0.0 is a major release.** It needs Node 22 or later. `faf_clear`, `faf_friday`, `faf_guide` and `faf_write` are retired, and so are the AGENTS.md / .cursorrules / GEMINI.md / conductor imports into project.faf. The `.mcpb` now runs the server bundled inside it. The npx config and the SessionStart hook are not pinned to a version, so an install that runs `npx -y claude-faf-mcp` moves to 6.x on its next start: check your Node before you upgrade. Every change is in the [CHANGELOG](./CHANGELOG.md).

**Context for Claude:** faf-cli writes this repo's CLAUDE.md from its scored `project.faf` — `faf_sync` here, `faf sync` in faf-cli. See [FAF-CLI for Claude Code 👀](https://github.com/Wolfe-Jam/faf-cli/blob/main/docs/faf-cli-for-claude.md).

**Composes faf-cli** (the version is pinned in package.json). Detection, scoring, the renders and every writer are faf-cli's own functions, loaded as a dependency; claude-faf-mcp does not fork them and never runs a `faf` found on your PATH.

Core 14 MCP tools (30 with `FAF_TOOLS=all`). IANA-registered formats (`application/vnd.faf+yaml` · `application/vnd.fafm+yaml`).

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

Needs Node 22 or later.

### Claude Desktop — one click

[**⬇ Download `claude-faf-mcp-5.22.1.mcpb`**](https://github.com/Wolfe-Jam/claude-faf-mcp/releases/download/v5.22.1/claude-faf-mcp-5.22.1.mcpb)

Open it in Claude Desktop. The extension runs the server bundled inside it (no npx, no network at start) and lists the Core 14 tools.

### Claude Desktop — config

Add to `claude_desktop_config.json`, then restart Claude Desktop:

```json
{
  "mcpServers": {
    "faf": { "command": "npx", "args": ["-y", "claude-faf-mcp"] }
  }
}
```

After `npm install -g claude-faf-mcp` you can use the installed bin instead: `{ "command": "claude-faf-mcp" }`. With Bun on Claude Desktop's PATH, `{ "command": "bunx", "args": ["claude-faf-mcp"] }` works too.

### Claude Code

```bash
claude mcp add faf -- npx -y claude-faf-mcp
```

### Hosted

**Smithery:** [wolfe-jam/claude-faf-mcp](https://smithery.ai/servers/wolfe-jam/claude-faf-mcp) — hosted at `https://mcpaas.live/claude/mcp/v1`

### Pinning

The npx config and the SessionStart hook `faf_setup` installs (`npx -y claude-faf-mcp --session-refresh`) are not pinned: they run the latest release, so fixes arrive without a reinstall, and a new major arrives the same way. To stay on a major, write it in your config yourself: `"args": ["-y", "claude-faf-mcp@6"]`. The `.mcpb` runs the version it was built from.

### Then

Run the `faf` prompt — Claude scores your project, fills what the repo can, asks you what only you can answer, verifies and syncs.

Or tell Claude your 3Ws: *"I'm building [what] for [who] because [why]"*

### faf-cli — any terminal

```bash
npx faf-cli auto
```

Same `.faf`, every surface — Claude, Gemini, Grok, Cursor. **[faf-cli on npm →](https://www.npmjs.com/package/faf-cli)**

---

## How It Works

```
You → 3 answers → project.faf → AI reads it → every session → forever

project.faf  ──→  CLAUDE.md     (faf_sync)
project.faf  ──→  MEMORY.md     (faf_tri_sync 🐘)
```

Language, framework, package manager, build tools — faf-cli detects them from your existing files. The human context is the part only you can give.

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

- **One source of truth.** `faf_sync` writes `CLAUDE.md` from `.faf` — only its faf-managed block, so your own notes stay put. Add `MEMORY.md` for cross-session memory (tri-sync 🐘).
- **No drift.** The score is deterministic — same `.faf`, same number, on every machine and in CI. A teammate can't be *accidentally* less grounded than you.
- **Local.** No accounts, no telemetry, nothing sent to FAF. The one network use is cloning a repo you name, only when you ask ([privacy](./PRIVACY.md)). The context is yours; it rides in the repo.

**Onboarding becomes `git clone` → grounded.** The context a new teammate would normally pick up by asking around is already in the repo, machine-readable, from the first clone.

---

## Scoring: From Blind to Optimized

| Tier | Score | What it means |
|------|-------|---------------|
| ✪ **TROPHY** | 100% | Gold Code — AI is optimized |
| ★ **GOLD** | 99%+ | Near-perfect context |
| ◆ **SILVER** | 95%+ | Excellent |
| ◇ **BRONZE** | 85%+ | Production ready |
| ● **GREEN** | 70%+ | Solid foundation |
| ● **YELLOW** | 55%+ | AI flipping coins |
| ○ **RED** | <55% | AI working blind |
| ♡ **WHITE** | 0% | No context at all |

At 55%, AI guesses half the time. At 100%, AI knows your project. The score is faf-cli's `scoreFafYaml` — the number `faf score` prints for the same file.

---

## MCP Tools — Core 14, 30 with `FAF_TOOLS=all`

By default claude-faf-mcp lists the Core 14 — the lifecycle tools you reach for. Set `FAF_TOOLS=all` to list the Extended tools too; every tool is callable by name either way. Retired in 6.0.0: `faf_clear`, `faf_friday`, `faf_guide` and `faf_write` (a call by name returns one line naming what to use instead), the AGENTS.md / .cursorrules / GEMINI.md / conductor imports into project.faf, and `faf_check` protect/unlock.

Every tool runs on the faf-cli this package depends on. Nothing is run from your PATH.

**Core**
| Tool | Purpose |
|------|---------|
| `faf_init` | Create project.faf for a folder (faf-cli detects the stack) |
| `faf_auto` | Fill project.faf from the repo's own files, then CLAUDE.md |
| `faf_go` | The goal and the 6Ws, by question and answer |
| `faf_score` | AI-readiness score (0-100%), from faf-cli |
| `faf_bench` | Benchmark AI grounding — cold vs with the .faf, graded mechanically, with a receipt |
| `faf_doctor` | Diagnose project.faf: each finding with the tool that fixes it |
| `faf_trust` | Validate project.faf and return a trust receipt for its score |
| `faf_sync` | Write CLAUDE.md from project.faf — `agents`/`cursor`/`gemini`/`copilot`/`all` also write AGENTS.md / .cursorrules / GEMINI.md / copilot-instructions.md |
| `faf_tri_sync` | Write faf's block into the MEMORY.md Claude Code loads for this project 🐘 |
| `faf_setup` | Install the SessionStart hook in the project settings (preview first) |
| `faf_context` | Show or set the active project; `detail` returns the .faf text |
| `faf_etch` | Remember a decision across sessions (the project soul, soul.fafm) |
| `faf_recall` | Recall memories from the project soul |
| `faf_about` | What the .faf format is |

**Extended** (`FAF_TOOLS=all`)
| Tool | Purpose |
|------|---------|
| `faf` | Start here: the project, its score and the steps to 100% (reads only) |
| `faf_quick` | Create project.faf from one line: name, goal, language, framework, hosting |
| `faf_readme` | Read the 6Ws from README.md; `apply` fills only empty slots |
| `faf_human_add` | Set one 6W slot in project.faf |
| `faf_formats` | The formats faf-cli finds in the folder, and what faf_auto would write (dry run) |
| `faf_git` | Author a project.faf from a repo URL (clones it with git — uses the network) |
| `faf_check` | faf-cli's validateFaf and the state of every slot |
| `faf_dna` | The project's .faf-dna lineage (reads only) |
| `faf_status` | Whether the project has a .faf, with its first lines |
| `faf_agents` | Write AGENTS.md (OpenAI Codex and other agents) |
| `faf_cursor` | Write .cursorrules (Cursor IDE) |
| `faf_gemini` | Write GEMINI.md (Google Gemini CLI) |
| `faf_conductor` | Write Google Conductor's conductor/ files |
| `faf_read` | Read a file inside the active project |
| `faf_list` | List a folder inside the active project |
| `faf_debug` | The active project, write access and the bundled faf-cli version |

---

## 🐘 Nelly Never Forgets

`faf_sync` writes `CLAUDE.md` from `.faf`, so the two stay aligned.

tri-sync adds MEMORY.md — your AI remembers your project across every session.

```
faf_sync = .faf → CLAUDE.md              ← written from .faf
tri-sync = .faf → MEMORY.md   (faf_sync writes CLAUDE.md)  ← Nelly never forgets 🐘
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

IANA-registered (`application/vnd.faf+yaml`). One file, one format. Define once, use everywhere.

---

## Ecosystem

| Package | Platform | Registry |
|---------|----------|----------|
| **[claude-faf-mcp](https://www.npmjs.com/package/claude-faf-mcp)** (this) | Claude | npm |
| **[faf-cli](https://www.npmjs.com/package/faf-cli)** | CLI | npm + Homebrew |
| **[gemini-faf-mcp](https://pypi.org/project/gemini-faf-mcp/)** | Google Gemini | PyPI |
| **[grok-faf-mcp](https://www.npmjs.com/package/grok-faf-mcp)** | xAI Grok | npm |
| **[rust-faf-mcp](https://crates.io/crates/rust-faf-mcp)** | Rust | crates.io |
| **[faf-wasm](https://www.npmjs.com/package/faf-wasm)** | Browser/Edge | npm |
| **[Chrome Extension](https://chromewebstore.google.com/detail/lnecebepmpjpilldfmndnaofbfjkjlkm)** | Browser | Chrome Web Store |

Same `project.faf`. Same scoring. Same result. Different execution layer.

---

## Quality

Tests run with bun on ubuntu, macOS and Windows; the built package is packed, installed and started on Node 22 and 24 on all three. **[CI →](https://github.com/Wolfe-Jam/claude-faf-mcp/actions/workflows/ci.yml)**

---

## Privacy

claude-faf-mcp runs on your machine. No analytics, no telemetry, no accounts. Its one network use is `faf_git`, and only when you ask it to read a repo: git clones it from the URL you give. The files it writes are listed in the **[privacy policy →](./PRIVACY.md)**

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
| **[faf-skills](https://github.com/Wolfe-Jam/faf-skills)** | Claude Code skills for .faf |
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

**MCP Registry:** `one.faf/claude-faf-mcp` · **2 IANA registrations:** `vnd.faf+yaml` (Context) · `vnd.fafm+yaml` (Memory) · [faf.one](https://faf.one) · [npm](https://www.npmjs.com/package/faf-cli)

---

**Zero-Config. Context that's just there — every session.**
