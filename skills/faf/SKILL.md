---
name: faf
description: Take a project to a verified 100% with this server's tools — score it, fill what the repo states, ask the human only for what it cannot, then verify, sync and keep it fresh. Use when the user wants project context set up, scored, improved or synced to CLAUDE.md.
license: MIT
---

# faf — persistent project context, end to end

project.faf is the project's context, in the IANA-registered `.faf` format
(`application/vnd.faf+yaml`). FAF defines. MD instructs. AI codes: project.faf
is the source, and CLAUDE.md and MEMORY.md are written from it, one way.

Every step below is a tool on this server. Each tool's own description says
what it does; `references/tools.md` says which tool answers which question.

## The rule

Fill a slot only from evidence: the user's files, README, manifest or git, or
the user's own answer. Never guess, never use a placeholder to make a number
go up. An honest empty slot handed back to the human is correct.

## The flow

1. **Find the project** — `faf_context` names the active folder and the .faf
   faf-cli finds for it. Tools called without a path use that folder.
2. **Score** — `faf_score` with `details: true`. It lists every slot as
   populated, empty or slotignored. `faf_doctor` says why a slot is empty.
3. **Source** — `faf_auto`. It creates project.faf if there is none and
   writes what the repo states into empty slots. Values already there are kept.
   Score again.
4. **Ask** — `faf_go` returns the Table-of-8 (name, goal and the 6Ws) and a
   `next` line. Run `faf_auto` again only when `next` names it. Otherwise
   tell the user, in one message, what FAF filled and the few things only they
   can answer. Write their answers with `faf_go`
   (`answers: { "<slot path>": "<their words>" }`). Score again. Repeat
   until 100%, or until the user stops.
5. **Verify** — `faf_trust` returns a receipt: faf-cli's score and a
   faf-parity/v1 hash anyone can check.
6. **Sync** — `faf_sync` writes the faf-managed block in CLAUDE.md;
   `faf_tri_sync` writes the faf block in the MEMORY.md Claude Code loads.
   Content outside those blocks is kept.
7. **Keep it fresh** — `faf_setup` installs a SessionStart hook in the
   project's `.claude/settings.json`. It previews first and writes only with
   `confirm: true`. Ask before confirming.

## Reporting

One short report:

- The score `faf_score` reports, as reported. Never round up.
- What FAF filled from the repo, and what the user supplied, kept separate.
- What is still empty, if anything.

## Memory, only when asked

`faf_etch` writes something the user asks to remember; `faf_recall` reads
it back. Do not etch on your own initiative.
