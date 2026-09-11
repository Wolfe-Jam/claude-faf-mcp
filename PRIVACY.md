# Privacy Policy

**claude-faf-mcp** — Privacy Policy

## Summary

claude-faf-mcp runs on your machine and sends nothing to FAF. Its one network call goes to GitHub, and only when you ask `faf_git` to read a repo.

## What FAF Does

- Reads and writes `project.faf` files in your project directories
- Syncs context between `.faf`, `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, and `GEMINI.md`
- Scores your project's AI-readiness based on local file content
- Detects frameworks and languages by scanning local files

## What FAF Does NOT Do

- **No network requests, except one you ask for** — `faf_git` reads a public repository from the GitHub API (`api.github.com`) when you ask it to author context from a GitHub URL. The request carries the owner/repo you name, plus your `GITHUB_TOKEN` or `GH_TOKEN` if one is set. Nothing is sent to FAF.
- **No analytics or telemetry** — we don't track usage
- **No data collection** — nothing is sent to FAF
- **No user accounts** — no authentication, no sign-up
- **No cookies or local storage** — beyond the files you ask it to create
- **No third-party services** — zero external dependencies at runtime (except GitHub API for `faf_git`, user-initiated only)

## File Access

FAF only accesses files you explicitly point it to (via `path` parameters or your current working directory). It creates and modifies:

- `project.faf` — your project's AI context
- `CLAUDE.md` — Anthropic Claude instructions (via bi-sync)
- `AGENTS.md` — OpenAI/Codex instructions (via export)
- `.cursorrules` — Cursor IDE instructions (via export)
- `GEMINI.md` — Google Gemini instructions (via export)

No files are read or written outside your project directory without your explicit request.

## Hosted Version

The hosted endpoint (`mcpaas.live/claude/mcp/v1`) runs on FAF's servers and receives the tool arguments you send. What it keeps is listed at https://faf.one/privacy, which covers every FAF product.

## Open Source

This project is MIT-licensed and fully open source. You can verify every claim in this policy by reading the source code:

https://github.com/Wolfe-Jam/claude-faf-mcp

## Contact

Questions about privacy: team@faf.one

---

*Last updated: 2026-09-11*
