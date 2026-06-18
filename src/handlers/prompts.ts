import { ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export class FafPromptHandler {

  listPrompts() {
    return {
      prompts: [
        {
          name: '/faf',
          description: 'Relentless pursuit of a verified 100% — FAF does all it can, you do only what only you can. One source of truth for every AI, every MD. FAF defines. MD instructs. AI codes.',
          arguments: [
            {
              name: 'path',
              description: 'Project directory path (optional — uses current directory if not provided)',
              required: false
            }
          ]
        },
        {
          name: '/faf-bench',
          description: 'Prove the .faf earns its place — run the AI-grounding benchmark honestly, in two passes (cold, then with the .faf), and report the cold→with-faf delta with a ✪ receipt. The delta is the product.',
          arguments: [
            {
              name: 'path',
              description: 'Project directory path (optional — uses current directory if not provided)',
              required: false
            }
          ]
        }
      ]
    };
  }

  getPrompt(name: string, args?: Record<string, string>) {
    const pathClause = args?.path
      ? `The project is at: ${args.path}`
      : 'Use the current working directory as the project path.';

    if (name === '/faf-bench') {
      return this.benchPrompt(pathClause);
    }

    if (name !== '/faf') {
      throw new Error(`Unknown prompt: ${name}`);
    }

    const promptText = `The user typed \`/faf\`. That is the only command they need. Your job: do everything FAF can do — automatically — and then tell the human, plainly, exactly what only they can do. Drive to a verified ✪ 100% and keep it there.

The rule above all: FAF don't lie. Fill a slot ONLY from real, sourced evidence (their files, README, manifest, git). Never guess, never infer, never use a placeholder to fake completeness. An honest empty slot you hand back to the human is right; a guessed one is a lie.

${pathClause}

Run this sequence yourself, end to end:

1. **Check & create** — \`faf_status\`. If there's no project.faf, run \`faf_auto\` to create one (sourced fills only — no guesses).

2. **Score** — \`faf_score\` (details:true) to see exactly what is filled and what is missing.

3. **Do FAF's part, then hand over the human's part:**
   - Fill everything you can SOURCE — automatically, no questions.
   - Whatever is left is the human-only context (the who/what/why only they truly know). Don't guess it. Tell them, in one plain message: here's what FAF already did, and here are the few things only you can answer — then let them answer (via \`faf_go\` or directly).
   - Re-score. Repeat until ✪ 100%. The human's part stays the human's; FAF never fabricates it.

4. **Verify** — \`faf_trust\`. Attests the 100% with a determinism parity hash any engine reproduces — a ✪ receipt, not a claim. FAF don't lie, and now it's provable.

5. **Lock** — \`faf_tri_sync\` writes the one source of truth into CLAUDE.md and MEMORY.md. Not finished until synced.

6. **Keep it that way** — run \`faf_setup\` to install the session hook so the verified 100% refreshes every session and they never run this again. (Previews and confirms before writing — never silent.)

7. **Done** — one short, honest report:
   - "[project name]: ✪ 100% — verified and locked. Stays optimized every session."
   - What FAF filled automatically, and what the human supplied. Keep the line between the two honest.

They typed one command. FAF did all it could; the human did only what only they could.`;

    return {
      description: 'Relentless pursuit of a verified 100% — FAF does all it can, you do only what only you can. One source of truth. FAF defines. MD instructs. AI codes.',
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
   * /faf-bench — the honest two-pass session protocol.
   *
   * faf_bench can't measure the host's tokens itself, so the integrity lives in
   * HOW the run is driven: a genuinely-blind cold pass, then a with-faf pass,
   * with token numbers reported ONLY if the host actually surfaces them. A staged
   * benchmark proves nothing — FAF don't lie, and neither does its benchmark.
   */
  private benchPrompt(pathClause: string) {
    const promptText = `The user typed \`/faf-bench\`. Run the FAF AI-grounding benchmark honestly, in two passes, and report the delta. The delta is the product: what structured context is worth. A low cold score is the ABSENCE of context — never a verdict on FAF.

${pathClause}

The integrity rule, above all: the cold pass must be GENUINELY blind, and any token numbers must be REAL. A staged benchmark proves nothing. FAF don't lie — neither does its benchmark.

Run this protocol exactly:

1. **Get the questions** — call \`faf_bench\` { action: "questions" }. You get N questions, each tied to a .faf slot. DO NOT read project.faf yet.

2. **COLD pass — answer blind.** Answer every question from your general knowledge of this repo ONLY — what you can infer from the code, file names, and manifests (package.json, tsconfig, .github…). You have NOT read project.faf. Give your honest best answer; if you genuinely don't know, say so — do not peek. (The 6Ws — who/what/why/where/when/how — are usually NOT derivable from code. Coming up short there is expected; that gap is the point.) Record answers keyed by question number.
   - If, and only if, your host surfaces token usage, note what this pass cost.

3. **WITH-FAF pass — now read it.** Read project.faf (\`faf_context\` or \`faf_read\`). Answer the same N questions again, grounded in it. Record them keyed by question number.
   - Note what this pass cost, if your host reports it.

4. **Grade** — call \`faf_bench\` { action: "grade", cold: { …blind answers }, faf: { …grounded answers }, model: <your model id> }.
   - Pass \`coldTokens\`/\`fafTokens\` ONLY if your host actually reported real numbers. NEVER invent token counts — an invented number is a lie, and the accuracy delta stands on its own without them.

5. **Report** — show the pair (without context → with FAF), the delta, and the ✪ receipt. Frame the delta plainly: it is the context the code cannot carry — the intent. End with the prescription faf_bench returns; never present the cold number alone as a verdict.`;

    return {
      description: 'Prove the .faf earns its place — the honest two-pass AI-grounding benchmark (cold → with-faf), with a ✪ receipt. The delta is the product.',
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
