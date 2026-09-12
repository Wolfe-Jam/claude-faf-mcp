# Privacy Policy

**claude-faf-mcp** — Privacy Policy

## Summary

claude-faf-mcp runs on your machine and sends nothing to FAF. Its one network use is `faf_git`, and only when you ask it to read a repo: git clones it from the URL you give.

## What FAF Does

- Reads and writes `project.faf` files in your project directories
- Writes `CLAUDE.md`'s faf-managed block from `project.faf` — and, on request, `AGENTS.md`, `.cursorrules`, `GEMINI.md`, `.github/copilot-instructions.md` and `MEMORY.md`
- Scores your project's AI-readiness based on local file content
- Detects frameworks and languages by scanning local files

## What FAF Does NOT Do

- **No network requests, except one you ask for** — `faf_git` runs `git clone --depth 1` of the repository URL you give (github.com for `owner/repo`) into a temporary folder, reads it on your machine, and removes the folder. git connects to that host with your own git configuration; claude-faf-mcp adds no token. Nothing is sent to FAF.
- **No analytics or telemetry** — we don't track usage
- **No data collection** — nothing is sent to FAF
- **No user accounts** — no authentication, no sign-up
- **No cookies or local storage** — beyond the files you ask it to create
- **No third-party services** — zero external dependencies at runtime (except the git host `faf_git` clones from, user-initiated only)

## File Access

FAF only accesses files you explicitly point it to (via `path` parameters or your current working directory). It creates and modifies:

- `project.faf` — your project's AI context
- `.faf-dna` — the project's score lineage (faf_init writes it with a new project.faf; faf_auto and faf_go add each new score)
- `CLAUDE.md` — Anthropic Claude instructions (via faf_sync; only the faf-managed block is written)
- `AGENTS.md` — OpenAI/Codex instructions (via export)
- `.cursorrules` — Cursor IDE instructions (via export)
- `GEMINI.md` — Google Gemini instructions (via export)
- `.github/copilot-instructions.md` — GitHub Copilot instructions (via export)
- `MEMORY.md` — Claude Code memory, at `~/.claude/projects/<project>/memory/MEMORY.md` (via faf_tri_sync)

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
