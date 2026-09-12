# Privacy Policy

**claude-faf-mcp** — Privacy Policy

## Summary

claude-faf-mcp runs on your machine and sends nothing to FAF. Its one network use is `faf_git`, and only when you ask it to read a repo: git clones it from the URL you give.

## What FAF Does

- Reads and writes `project.faf` files in your project directories
- Writes `CLAUDE.md`'s faf-managed block from `project.faf` — and, on request, `AGENTS.md`, `.cursorrules`, `GEMINI.md`, `.github/copilot-instructions.md`, the Conductor files and `MEMORY.md`
- Scores your project's AI-readiness based on local file content
- Detects frameworks and languages by scanning local files (package.json, Cargo.toml, pyproject.toml, go.mod, README.md and the like, in the project folder)

## What FAF Does NOT Do

- **No network requests, except one you ask for** — `faf_git` runs `git clone --depth 1` of the repository URL you give (github.com for `owner/repo`) into a temporary folder, reads it on your machine, and removes the folder. git connects to that host with your own git configuration; claude-faf-mcp adds no token. Nothing is sent to FAF.
- **No analytics or telemetry** — we don't track usage
- **No data collection** — nothing is sent to FAF
- **No user accounts** — no authentication, no sign-up
- **No cookies or local storage** — beyond the files you ask it to create
- **No third-party services at runtime** — except the git host `faf_git` clones from, user-initiated only. The npm dependencies (the MCP SDK, faf-cli and yaml) run inside the server process on your machine.

## File Access

FAF only accesses files you explicitly point it to (via `path` parameters or the active project). It creates and modifies:

- `project.faf` — your project's AI context (faf_init, faf_auto, faf_go, faf_quick, faf_readme, faf_human_add, faf_git)
- `project.faf.bak-<time>` — a copy of the old file, written only when you ask `faf_init` to replace it (`force: true`)
- `.faf-dna` — the project's score lineage (faf_init writes it with a new project.faf; faf_auto and faf_go add each new score)
- `CLAUDE.md` — Anthropic Claude instructions (via faf_sync, faf_auto and the SessionStart hook; only the faf-managed block is written)
- `AGENTS.md` — OpenAI/Codex instructions (via export; only the faf-managed block)
- `.cursorrules` — Cursor IDE instructions (via export; only the faf-managed block)
- `GEMINI.md` — Google Gemini instructions (via export; only the faf-managed block)
- `.github/copilot-instructions.md` — GitHub Copilot instructions (via export; only the faf-managed block)
- `conductor/product.md`, `tech-stack.md`, `workflow.md`, `product-guidelines.md` — Google Conductor (via faf_conductor; only the faf-managed block)
- `soul.fafm` — the project soul, in the project folder (via faf_etch)
- `MEMORY.md` — Claude Code memory, at `~/.claude/projects/<project>/memory/MEMORY.md`, or under `CLAUDE_CONFIG_DIR` when set (via faf_tri_sync; only the faf-managed block)
- `<project>/.claude/settings.json` — the project's Claude Code settings, only faf's SessionStart hook entry (via faf_setup, after a preview, with `confirm: true`). Your user settings in the home folder are never written.

No files are read or written outside your project directory without your explicit request.

## Hosted Version

The hosted endpoint (`mcpaas.live/claude/mcp/v1`) runs on FAF's servers and receives the tool arguments you send. What it keeps is listed at https://faf.one/privacy, which covers every FAF product.

## Open Source

This project is MIT-licensed and fully open source. You can verify every claim in this policy by reading the source code:

https://github.com/Wolfe-Jam/claude-faf-mcp

## Contact

Questions about privacy: team@faf.one

---

*Last updated: 2026-09-12*
