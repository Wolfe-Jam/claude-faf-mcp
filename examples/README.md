# Test Project for FAF Evaluation

This directory contains a sample project for testing claude-faf-mcp tools.

## Quick Test (3 minutes)

Install the extension, then open Claude Desktop and try these prompts:

### 1. Initialize context
```
Run faf_init on ~/path/to/claude-faf-mcp/examples/test-project
```
Creates `project.faf` — detects Next.js, React, TypeScript, Anthropic SDK.

### 2. Score AI-readiness
```
Run faf_score on the test project
```
Returns a 0-100% score with tier (Bronze/Silver/Gold/Trophy).

### 3. Sync to CLAUDE.md
```
Run faf_sync on the test project
```
Generates `CLAUDE.md` from the `.faf` context.

### 4. Check health
```
Run faf_doctor on the test project
```
Diagnoses any issues with the `.faf` setup.

### 5. Full auto
```
Run faf_auto on the test project
```
Runs the complete pipeline: init + detect + sync + score.

## Expected Results

- `project.faf` created with detected stack (Next.js, React, TypeScript, Drizzle)
- Score starts around 40-60% (Bronze/Silver) with README context
- `faf_go` interview drives it to 85%+ (Gold)
- All 32 tools respond without errors
