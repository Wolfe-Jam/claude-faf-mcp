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
        }
      ]
    };
  }

  getPrompt(name: string, args?: Record<string, string>) {
    if (name !== '/faf') {
      throw new Error(`Unknown prompt: ${name}`);
    }

    const pathClause = args?.path
      ? `The project is at: ${args.path}`
      : 'Use the current working directory as the project path.';

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
}

// Export schemas for use in server.ts
export { ListPromptsRequestSchema, GetPromptRequestSchema };
