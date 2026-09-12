import { ErrorCode, McpError, ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';

/**
 * The two prompts: `faf` (the whole flow) and `faf-bench` (the two-pass
 * grounding benchmark). Every tool they name is in the default Core tools/list
 * (tests/wjttc-600-truth-contracts.test.ts holds that).
 *
 * The names carry no slash: a host adds its own (Claude Code shows
 * `/mcp__claude-faf-mcp__faf`). Before 6.0.0 they were '/faf' and
 * '/faf-bench', which hosts showed with a doubled slash; those names still
 * answer prompts/get for the 6.x releases, and are no longer listed.
 */
const PROMPT_ALIASES: Record<string, string> = {
  '/faf': 'faf',
  '/faf-bench': 'faf-bench',
};

const PATH_ARGUMENT = {
  name: 'path',
  description: 'Project directory path (optional — uses the active project if not provided)',
  required: false,
};

export const FAF_PROMPT_DESCRIPTION = 'Relentless pursuit of a verified 100% — FAF does all it can, you do only what only you can. One source of truth for every AI, every MD. FAF defines. MD instructs. AI codes.';
export const FAF_BENCH_PROMPT_DESCRIPTION = 'Prove the .faf earns its place — run the AI-grounding benchmark honestly, in two passes (cold, then with the .faf), and report the cold→with-faf delta with its receipt. The delta is the product.';

export class FafPromptHandler {

  listPrompts() {
    return {
      prompts: [
        { name: 'faf', description: FAF_PROMPT_DESCRIPTION, arguments: [PATH_ARGUMENT] },
        { name: 'faf-bench', description: FAF_BENCH_PROMPT_DESCRIPTION, arguments: [PATH_ARGUMENT] },
      ]
    };
  }

  getPrompt(requested: string, args?: Record<string, string>) {
    const name = PROMPT_ALIASES[requested] ?? requested;
    const pathClause = args?.path
      ? `The project is at: ${args.path}`
      : 'Use the active project (faf_context shows it) as the project path.';

    if (name === 'faf-bench') {
      return this.benchPrompt(pathClause);
    }

    if (name !== 'faf') {
      throw new McpError(ErrorCode.InvalidParams, `Unknown prompt: ${requested}. The prompts are faf and faf-bench.`);
    }

    const promptText = `The user ran the faf prompt. That is the only command they need. Your job: do everything FAF can do — automatically — and then tell the human, plainly, exactly what only they can do. Drive to a verified ✪ 100% and keep it there.

The rule above all: FAF don't lie. Fill a slot ONLY from real, sourced evidence (their files, README, manifest, git). Never guess, never infer, never use a placeholder to fake completeness. An honest empty slot you hand back to the human is right; a guessed one is a lie.

${pathClause}

Run this sequence yourself, end to end:

1. **Score** — \`faf_score\` (details: true). It says whether the project has a project.faf, and lists every empty slot.

2. **Source** — \`faf_auto\`. It creates project.faf if there is none, and otherwise fills the empty slots of the one there from the repo (package.json, Cargo.toml, pyproject.toml, go.mod…) — values already there are kept. Re-score with \`faf_score\`.

3. **Do FAF's part, then hand over the human's part:**
   - What is left is the human-only context: the goal and the 6Ws (who, what, why, where, when, how). Don't guess it. \`faf_go\` returns the Table-of-8 — what is filled, what is seeded from the goal, what is empty — and says when the repo can still fill slots (run \`faf_auto\` again then).
   - Tell them, in one plain message: here's what FAF already did, and here are the few things only you can answer. Then write their answers with \`faf_go\` (answers: slot path → text).
   - Re-score. Repeat until ✪ 100%. The human's part stays the human's; FAF never fabricates it.

4. **Verify** — \`faf_trust\`. It checks the .faf with faf-cli's validateFaf and returns a receipt: faf-cli's score and a faf-parity/v1 hash (claude-faf-mcp's own spec) anyone can check — sha256(projection) === parityHash. A receipt, not a claim.

5. **Lock** — \`faf_sync\` writes CLAUDE.md's faf-managed block; \`faf_tri_sync\` writes the faf block in the MEMORY.md Claude Code loads for this project. Not finished until both are written.

6. **Keep it that way** — \`faf_setup\` installs the SessionStart hook in the project settings (<project>/.claude/settings.json), so the context refreshes every session and they never run this again. It previews first and writes only with confirm: true — never silent.

7. **Done** — one short, honest report:
   - "[project name]: ✪ 100% — verified and locked. Stays fresh every session."
   - What FAF filled automatically, and what the human supplied. Keep the line between the two honest.
   - If it stopped short of 100%, say the score faf_score reports and what is still empty — never round it up.

They ran one prompt. FAF did all it could; the human did only what only they could.`;

    return {
      description: FAF_PROMPT_DESCRIPTION,
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: promptText
          }
        }
      ]
    };
  }

  /**
   * faf-bench — the honest two-pass session protocol.
   *
   * faf_bench can't measure the host's tokens itself, so the integrity lives in
   * HOW the run is driven: a genuinely-blind cold pass, then a with-faf pass,
   * with token numbers reported ONLY if the host actually surfaces them. A staged
   * benchmark proves nothing — FAF don't lie, and neither does its benchmark.
   */
  private benchPrompt(pathClause: string) {
    const promptText = `The user ran the faf-bench prompt. Run the FAF AI-grounding benchmark honestly, in two passes, and report the delta. The delta is the product: what structured context is worth. A low cold score is the ABSENCE of context — never a verdict on FAF.

${pathClause}

The integrity rule, above all: the cold pass must be GENUINELY blind, and any token numbers must be REAL. A staged benchmark proves nothing. FAF don't lie — neither does its benchmark.

Run this protocol exactly:

1. **Get the questions** — call \`faf_bench\` { action: "questions" }. You get N questions, each tied to a .faf slot. DO NOT read project.faf yet.

2. **COLD pass — answer blind.** Answer every question from your general knowledge of this repo ONLY — what you can infer from the code, file names, and manifests (package.json, tsconfig, .github…). You have NOT read project.faf. Give your honest best answer; if you genuinely don't know, say so — do not peek. (The 6Ws — who/what/why/where/when/how — are usually NOT derivable from code. Coming up short there is expected; that gap is the point.) Record answers keyed by question number.
   - If, and only if, your host surfaces token usage, note what this pass cost.

3. **WITH-FAF pass — now read it.** Read project.faf: \`faf_context\` { detail: true } returns its text. Answer the same N questions again, grounded in it. Record them keyed by question number.
   - Note what this pass cost, if your host reports it.

4. **Grade** — call \`faf_bench\` { action: "grade", cold: { …blind answers }, faf: { …grounded answers }, model: <your model id> }.
   - Pass \`coldTokens\`/\`fafTokens\` ONLY if your host actually reported real numbers. NEVER invent token counts — an invented number is a lie, and the accuracy delta stands on its own without them.

5. **Report** — show the pair (without context → with FAF), the delta, and the receipt hash faf_bench returns. Frame the delta plainly: it is the context the code cannot carry — the intent. End with the prescription faf_bench returns; never present the cold number alone as a verdict.`;

    return {
      description: FAF_BENCH_PROMPT_DESCRIPTION,
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: promptText
          }
        }
      ]
    };
  }
}

// Export schemas for use in server.ts
export { ListPromptsRequestSchema, GetPromptRequestSchema };
