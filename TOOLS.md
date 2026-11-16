# claude-faf-mcp tools

Every tool, one section each: what it does, a real call, and what it returns. Outputs were captured from claude-faf-mcp 7.2.1 (faf-cli 8.10.0 inside) over stdio, in a small Express + TypeScript project (`orders-api`). Long paths are shortened to `~/orders-api`, and long outputs are trimmed where marked `…`.

A core set is listed by default. Set `FAF_TOOLS=all` in the server's environment to list the rest. Every tool can be called by name either way.

Most tools take an optional `path`: the project folder, or a file inside it. Without it, the tool uses the active project (see [`faf_context`](#faf_context-active-project)).

- [The usual order](#the-usual-order)
- [Core tools](#core-tools): `faf_about` · `faf_init` · `faf_auto` · `faf_score` · `faf_go` · `faf_doctor` · `faf_trust` · `faf_bench` · `faf_sync` · `faf_tri_sync` · `faf_setup` · `faf_context` · `faf_etch` · `faf_recall`
- [With FAF_TOOLS=all](#with-faf_toolsall): `faf` · `faf_status` · `faf_formats` · `faf_check` · `faf_readme` · `faf_human_add` · `faf_quick` · `faf_git` · `faf_dna` · `faf_agents` · `faf_cursor` · `faf_gemini` · `faf_conductor` · `faf_read` · `faf_list` · `faf_debug`

## The usual order

```text
faf_auto       create or fill project.faf from the repo
faf_score      the score, and which slots are empty   (details: true lists them)
faf_go         the goal and six W's, confirmed by the user, until 100%
faf_trust      a receipt for the score
faf_sync       CLAUDE.md from project.faf
faf_tri_sync   faf's block in the MEMORY.md Claude Code loads
```

There's also a `faf` prompt that walks the same steps.

---

## Core tools

### `faf_about`: About .faf

What the `.faf` format is, and how this server uses it. Reads nothing from the project.

```json
{ "name": "faf_about", "arguments": {} }
```

```text
WHAT IS .FAF?
- .faf = Foundational AI-context Format: one YAML file with your project's DNA — its name, goal, stack and the 6Ws (who, what, why, where, when, how).
- IANA-registered as application/vnd.faf+yaml. Memory lives beside it in soul.fafm (application/vnd.fafm+yaml).
…
HOW IT WORKS
1. faf_auto creates project.faf from your repo's own files (or fills the one you have).
2. faf_go asks for the goal and the 6Ws — the part only you can give.
3. faf_score reports faf-cli's score; faf_trust returns a receipt for it.
4. faf_sync writes CLAUDE.md's faf-managed block; faf_tri_sync writes the one in MEMORY.md.
```

### `faf_init`: Create project.faf

Creates `project.faf` for a folder from what faf-cli detects, and writes `.faf-dna` (the first score). An existing `project.faf` is left as it is; `force: true` replaces it, after copying the old file to a backup.

```json
{ "name": "faf_init", "arguments": { "path": "~/orders-api" } }
```

```text
Created ~/orders-api/project.faf
29/100 (5/17 slots populated) — RED
Birth DNA 29% written to .faf-dna (faf_dna shows the journey)
…
1 suggestion for the goal and the six W's (README.md) — confirm it in faf_go
```

### `faf_auto`: Fill from the Repo

Creates `project.faf` if it's missing, or fills its empty slots from the repo's own files (values already there are kept), then writes CLAUDE.md and scores. The goal and the six W's are left to `faf_go`.

```json
{ "name": "faf_auto", "arguments": { "path": "~/orders-api" } }
```

```text
project.faf unchanged; CLAUDE.md created
…
Nothing to fill: every slot the repo answers already holds a value (file not rewritten)
Created CLAUDE.md
.faf-dna: 29% → 47%
…
4 of the goal and six W's are empty: faf_go asks for them.
Next: faf_score (details: true) | faf_go
```

### `faf_score`: Score .faf

faf-cli's score for `project.faf`, 0–100%, with the tier. `details: true` lists every slot: populated, empty (with who can fill it) and `slotignored`.

```json
{ "name": "faf_score", "arguments": { "path": "~/orders-api", "details": true } }
```

```text
FAF SCORE: 29/100 (29%)  ○ RED
███████░░░░░░░░░░░░░░░░░ 29%
5/17 slots populated · 16 slotignored  ·  next: YELLOW (55%)

--- Slot breakdown ---
Populated (5): project.name, project.main_language, stack.backend, stack.runtime, stack.build
Empty (12): project.goal, human_context.who, … stack.hosting, stack.cicd
…
Empty slots:
  project.goal — yours: faf_go asks
  stack.database — no fact in repo: answer it (faf_go), or fix project.type if it doesn't apply
```

Tiers: ✪ Trophy 100 · ★ Gold 99 · ◆ Silver 95 · ◇ Bronze 85 · ● Green 70 · ● Yellow 55 · ○ Red 1 · ♡ White 0.

### `faf_go`: Guided Interview

The human half of `project.faf`. Without `answers` it returns the table of eight (name, goal and the six W's) with what's filled, what's empty, and suggestions from the repo with their source. With `answers` (slot path → the text the user confirmed) it writes them and re-scores.

```json
{ "name": "faf_go", "arguments": { "path": "~/orders-api" } }
```

```json
{
  "needsInput": true,
  "currentScore": 29,
  "targetScore": 100,
  "needsAnswer": ["project.goal", "human_context.who", "human_context.what", "…"],
  "table": [
    { "n": 1, "header": "Name", "field": "project.name", "value": "orders-api", "status": "filled" },
    { "n": 2, "header": "Goal", "field": "project.goal", "value": "", "status": "empty" },
    …
  ]
}
```

```json
{
  "name": "faf_go",
  "arguments": {
    "path": "~/orders-api",
    "answers": {
      "project.goal": "Track customer orders through a REST API",
      "human_context.who": "Backend developers on the orders team"
    }
  }
}
```

```text
FAF Go - Answers Applied

Updated 2 field(s) in ~/orders-api/project.faf: project.goal, human_context.who
Score: 41% (faf-cli)
.faf-dna: 29% → 41%
```

Send only what the user confirmed. Suggestions are never written on their own.

### `faf_doctor`: Diagnose .faf

Checks `project.faf` and the files around it, and names the tool that fixes each finding.

```json
{ "name": "faf_doctor", "arguments": { "path": "~/orders-api" } }
```

```text
claude-faf-mcp version: 7.2.1 (faf-cli 8.10.0)
Found .faf at: ~/orders-api/project.faf
faf-cli's validateFaf accepts it
Score: 29% RED (faf-cli) — 5/17 slots populated; empty: project.goal, …
No CLAUDE.md file
   faf_sync (or faf_auto) writes CLAUDE.md's faf-managed block from project.faf.
…
```

### `faf_trust`: Trust Receipt

Validates `project.faf` and returns a receipt for its score: the score, a parity hash anyone can recompute, the source file's hash, and which scorer produced it.

```json
{ "name": "faf_trust", "arguments": { "path": "~/orders-api" } }
```

```text
○ FAF TRUST RECEIPT — orders-api
────────────────────────────────────────────
score:   47/100  ○ RED
parity:  faf-parity/v1 (claude-faf-mcp)  83bf7be2e15637881fdd4570d199958483fb531f3956b0fae92ffe751bd9c4bc
source:  sha256 0687e0126428bee3d069f1446890b8981cae7cbcacc2405703cedd70f079fb2e
scorer:  faf-cli  (single deterministic source)
by:      claude-faf-mcp@7.2.1
verify:  sha256(projection) === parityHash
```

### `faf_bench`: Grounding Benchmark

Measures what `project.faf` is worth on this repo. `action: "questions"` returns questions built from the file's own populated slots. You answer each one twice: cold (without the file) and with the file. `action: "grade"` then grades both sets mechanically against `project.faf`.

```json
{ "name": "faf_bench", "arguments": { "path": "~/orders-api", "action": "questions" } }
```

```text
faf_bench — 8 grounding questions  (qset d19d1ca96505… · faf-bench/1)
…
Then call: faf_bench { action: "grade", cold: { "1": "…", … }, faf: { "1": "…", … } }

  1. [project.name] What is the project's name?
  2. [project.goal] What is the project's goal — what is it for?
  3. [project.main_language] What is the primary programming language?
  …
```

### `faf_sync`: Sync .faf to CLAUDE.md

Writes faf's block in CLAUDE.md from `project.faf` and keeps your own text around it. It runs one way: CLAUDE.md never writes back. With `agents`, `cursor`, `gemini`, `copilot` or `all: true`, it also writes those files.

```json
{ "name": "faf_sync", "arguments": { "path": "~/orders-api" } }
```

```text
CLAUDE.md refreshed from ~/orders-api/project.faf. FAF Score: 47%

Files written:
• ~/orders-api/CLAUDE.md
```

### `faf_tri_sync`: Tri-Sync to MEMORY.md

Writes `project.faf` as faf's block in the MEMORY.md Claude Code loads for this project (`~/.claude/projects/<project-id>/memory/MEMORY.md`, or under `CLAUDE_CONFIG_DIR`). Claude's own notes in that file are kept byte for byte. `action: "status"` only reads.

```json
{ "name": "faf_tri_sync", "arguments": { "path": "~/orders-api", "action": "export" } }
```

```text
tri-sync: .faf → MEMORY.md

  From: ~/orders-api/project.faf
  Written to: ~/.claude/projects/<project-id>/memory/MEMORY.md
  Lines: 30
  Mode: Created (there was no MEMORY.md)
  Claude's own notes: kept byte for byte (read back and checked)
```

### `faf_setup`: Session Hook Setup

Adds a SessionStart hook to the project's `.claude/settings.json`, so every Claude Code session there starts with fresh `.faf` context. Without `confirm: true` it only shows what it would write. `remove: true` takes the hook out.

```json
{ "name": "faf_setup", "arguments": { "path": "~/orders-api" } }
```

````text
PREVIEW — nothing written. faf_setup would add the faf SessionStart hook to the project settings (~/orders-api/.claude/settings.json); …

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [ { "type": "command", "command": "npx -y claude-faf-mcp --session-refresh" } ] }
    ]
  }
}
```

Nothing has been written. To write the project settings: faf_setup { confirm: true }
````

### `faf_context`: Active Project

Shows or sets the project the other tools work on. `detail: true` also returns the `.faf` text.

```json
{ "name": "faf_context", "arguments": { "path": "~/orders-api" } }
```

```text
FAF Context Set:

Active project: ~/orders-api
.faf: ~/orders-api/project.faf

Subsequent faf_* calls will use this context
```

### `faf_etch`: Etch Memory

Remembers a decision across sessions in the project's `soul.fafm` (`.fafm` memory). `type` is one of `project`, `reference`, `user` or `feedback`; `priority` and `tags` are optional.

```json
{
  "name": "faf_etch",
  "arguments": { "path": "~/orders-api", "text": "The orders API returns JSON only", "type": "project", "priority": "high" }
}
```

```text
Etched to soul.fafm: "The orders API returns JSON only" (high)
1 memory in the soul.
```

### `faf_recall`: Recall Memory

Finds memories in `soul.fafm` by text, tags, type or minimum priority.

```json
{ "name": "faf_recall", "arguments": { "path": "~/orders-api", "query": "json" } }
```

```text
1 memory recalled:
- [high] The orders API returns JSON only
```

---

## With FAF_TOOLS=all

### `faf`: Start Here

Names the project and the `.faf` faf-cli finds for it, then the steps to 100%. Reads only.

```json
{ "name": "faf", "arguments": { "path": "~/orders-api" } }
```

```text
Project: orders-api
Folder: ~/orders-api
.faf: none yet

Confirm this is the project (or pass its path), then run:
1. faf_auto — creates project.faf from the repo.
2. faf_score (details: true) — the score, and every slot still empty.
3. faf_go — the goal and the 6Ws only a person can give; repeat until faf_score says 100%.
4. faf_trust — the receipt for that score.
5. faf_sync and faf_tri_sync — CLAUDE.md and MEMORY.md from project.faf.
```

### `faf_status`: .faf Status

Whether the project has a `.faf`, with its first lines.

```json
{ "name": "faf_status", "arguments": { "path": "~/orders-api" } }
```

```text
No project.faf (or .faf) in ~/orders-api or the folder above it
Run faf_init to create project.faf
```

### `faf_formats`: Formats Found

The formats faf-cli finds in the folder, and exactly what `faf_auto` would write. A dry run: nothing is written.

```json
{ "name": "faf_formats", "arguments": { "path": "~/orders-api" } }
```

```text
Formats faf-cli found in this folder (3):
  • package.json (package-manager)
  • README.md (config)
  • tsconfig.json (language)

faf_auto would create ~/orders-api/project.faf with:
  • faf_version: 3.0
  • project.name: orders-api
  • project.main_language: TypeScript
  • project.type: backend
  • stack.backend: Express
  • stack.runtime: Node.js
  • stack.build: TypeScript (tsc)
  …
It would mark slotignored (the app-type leaves them out): stack.frontend, stack.css_framework, …
```

### `faf_check`: Check .faf

faf-cli's validation, the score, and the state of each of the six W's.

```json
{ "name": "faf_check", "arguments": { "path": "~/orders-api" } }
```

```text
valid — faf-cli's validateFaf accepts it

Score: 29% ○ RED — 5/17 slots populated · 16 slotignored

The 6Ws:
  who    empty
  what   empty
  …
```

### `faf_readme`: 6Ws from README

Suggests the goal and six W's from README.md, package.json and Cargo.toml, each with its source. Writes nothing: confirm with the user, then send the answers through `faf_go`.

```json
{ "name": "faf_readme", "arguments": { "path": "~/orders-api" } }
```

```text
Suggested from the repo, for the user to confirm (nothing is written):
  project.goal: Small REST API for tracking orders.  (README.md § first paragraph)

Confirm each with the user, then call faf_go with answers (slot path → the confirmed text).
```

### `faf_human_add`: Set a 6W Slot

Sets one of the six W's to text the user confirmed.

```json
{
  "name": "faf_human_add",
  "arguments": { "path": "~/orders-api", "field": "what", "value": "REST API for orders: create, list, update status" }
}
```

```text
Set WHAT = "REST API for orders: create, list, update status"
Updated: ~/orders-api/project.faf
```

### `faf_quick`: Quick Create

Creates `project.faf` from one line: name, goal, language (and framework, hosting).

```json
{ "name": "faf_quick", "arguments": { "path": "~/quick-demo", "input": "quick-demo, A CLI that prints the weather, TypeScript" } }
```

```text
Project: quick-demo
Goal: A CLI that prints the weather
Language: TypeScript
Score: 25/100 (3/12 slots populated) — RED
Birth DNA: 25% (.faf-dna)

Created: ~/quick-demo/project.faf
```

### `faf_git`: Author from a Git Repo

Writes a `project.faf` for a public repo from its URL. It uses the network: a shallow `git clone` into a temp folder, removed afterwards. The goal and six W's stay empty; suggestions from the repo come back for the user to confirm.

```json
{ "name": "faf_git", "arguments": { "path": "~/git-demo", "url": "https://github.com/Wolfe-Jam/faf" } }
```

```text
Wrote ~/git-demo/project.faf for https://github.com/Wolfe-Jam/faf.git — faf-cli scores it 22% (RED). The goal and six W's are empty: 4 suggestions wait in the repo, for the user to confirm with faf_go answers:
  project.goal: Portable, shareable AI-Context for any AI, …  (README.md § first paragraph)
  human_context.what: .faf (Foundational AI-context Format) - Official format specification  (package.json description)
  …
```

### `faf_dna`: Project DNA

The project's `.faf-dna`: its first score, the current one, and each recorded change. Reads only.

```json
{ "name": "faf_dna", "arguments": { "path": "~/orders-api" } }
```

```text
   29% → 47%

Born: 2026-11-16  ·  FAF-2026-ORDERSAP-OFIU
Birth DNA: 29%  ·  Now: 47%  ·  Growth: +18%

Scores recorded (3):
  v1.0.0 — 29% (2026-11-16) Birth — initial context
  v1.0.1 — 41% (2026-11-16) faf_go
  v1.0.2 — 47% (2026-11-16) faf_auto
```

### `faf_agents`: Write AGENTS.md

Writes `project.faf` into AGENTS.md as faf's block. Text already there outside the block is kept. `action` is `export` (or `sync`, the same).

```json
{ "name": "faf_agents", "arguments": { "path": "~/orders-api", "action": "export" } }
```

```text
AGENTS.md export:

Wrote ~/orders-api/AGENTS.md from ~/orders-api/project.faf
```

### `faf_cursor`: Write .cursorrules

The same for Cursor's `.cursorrules`.

```json
{ "name": "faf_cursor", "arguments": { "path": "~/orders-api", "action": "export" } }
```

```text
Wrote ~/orders-api/.cursorrules from ~/orders-api/project.faf
```

### `faf_gemini`: Write GEMINI.md

The same for Gemini CLI's GEMINI.md.

```json
{ "name": "faf_gemini", "arguments": { "path": "~/orders-api", "action": "export" } }
```

```text
Wrote ~/orders-api/GEMINI.md from ~/orders-api/project.faf
```

### `faf_conductor`: Write Conductor Files

Writes faf's block into Google Conductor's `conductor/` files; every line outside each block is kept.

```json
{ "name": "faf_conductor", "arguments": { "path": "~/orders-api", "action": "export" } }
```

```text
Wrote faf's block into ~/orders-api/conductor/ (product.md, tech-stack.md, workflow.md, product-guidelines.md) from ~/orders-api/project.faf; every line outside each block is kept
```

### `faf_read`: Read Project File

Reads a file inside the active project.

```json
{ "name": "faf_read", "arguments": { "path": "~/orders-api/README.md" } }
```

```text
# orders-api

Small REST API for tracking orders.
```

### `faf_list`: List Project Folders

Lists a folder inside the active project. `filter`, `depth` and `showHidden` are optional.

```json
{ "name": "faf_list", "arguments": { "path": "~/orders-api" } }
```

```text
~/orders-api

conductor
src
tests

Total: 3 items
```

### `faf_debug`: Debug Info

The active project, whether it can be written, and the bundled faf-cli version.

```json
{ "name": "faf_debug", "arguments": {} }
```

```text
Working Directory: ~/orders-api
Write Permissions: Yes
FAF Engine: faf-cli v8.10.0, bundled with claude-faf-mcp 7.2.1. No faf on PATH is ever run.
FAF File: ~/orders-api/project.faf
```
