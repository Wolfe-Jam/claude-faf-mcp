# Privacy Policy

**claude-faf-mcp** — Privacy Policy

## Summary

FAF processes everything locally on your machine. No data leaves your computer.

## What FAF Does

- Reads and writes `project.faf` files in your project directories
- Syncs context between `.faf`, `CLAUDE.md`, `AGENTS.md`, `.cursorrules`, and `GEMINI.md`
- Scores your project's AI-readiness based on local file content
- Detects frameworks and languages by scanning local files

## What FAF Does NOT Do

- **No external network requests** — all processing is local
- **No analytics or telemetry** — we don't track usage
- **No data collection** — nothing is sent anywhere
- **No user accounts** — no authentication, no sign-up
- **No cookies or local storage** — beyond the files you ask it to create
- **No third-party services** — zero external dependencies at runtime

## File Access

FAF only accesses files you explicitly point it to (via `path` parameters or your current working directory). It creates and modifies:

- `project.faf` — your project's AI context
- `CLAUDE.md` — Anthropic Claude instructions (via bi-sync)
- `AGENTS.md` — OpenAI/Codex instructions (via export)
- `.cursorrules` — Cursor IDE instructions (via export)
- `GEMINI.md` — Google Gemini instructions (via export)

No files are read or written outside your project directory without your explicit request.

## Open Source

This project is MIT-licensed and fully open source. You can verify every claim in this policy by reading the source code:

https://github.com/Wolfe-Jam/claude-faf-mcp

## Contact

Questions about privacy: team@faf.one

---

*Last updated: 2026-03-04*
