# Test Project for FAF Evaluation

`test-project/` is a small Next.js app ("Acme Dashboard") with a README, a
package.json and a tsconfig — and no project.faf. Step 1 creates it.

## Quick Test (3 minutes)

Install claude-faf-mcp (see the main README), open Claude Desktop or Claude
Code, and try these prompts on the `examples/test-project` folder of your
clone. Each tool writes only inside that folder.

### 1. Create the context
```
Run faf_init on <your clone>/examples/test-project
```
Creates `project.faf` (and its `.faf-dna` birth record). faf-cli detects the
project from its files: the name, TypeScript, Next.js and React.

### 2. Score AI-readiness
```
Run faf_score on the test project, with details
```
Returns faf-cli's 0–100% score and tier, and lists the empty slots. A fresh
file starts below Bronze (85%): the 6Ws the repo cannot tell are still empty.

### 3. Fill it
```
Run faf_auto on the test project, then faf_go
```
`faf_auto` fills every slot the repo's own files answer and writes CLAUDE.md;
`faf_go` asks for the goal and the 6Ws that only you can give, and writes your
answers into project.faf.

### 4. Sync to CLAUDE.md
```
Run faf_sync on the test project
```
Writes CLAUDE.md's faf-managed block from `project.faf`.

### 5. Check health
```
Run faf_doctor on the test project
```
Lists each finding with the tool that fixes it.

## Expected Results

- `project.faf` created with the detected stack (TypeScript, Next.js, React)
- The score and tier come from faf-cli, the same number `faf score` prints; the tiers are in the main README
- `faf_go` drives it up as you answer; a verified 100% is `faf_trust`'s receipt
- Every Core tool answers on this folder; `FAF_TOOLS=all` lists the rest

To start over, delete `project.faf`, `.faf-dna` and `CLAUDE.md` in `test-project/`.
