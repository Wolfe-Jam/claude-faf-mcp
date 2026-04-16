import { ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export class FafPromptHandler {

  listPrompts() {
    return {
      prompts: [
        {
          name: '/faf',
          description: 'Relentless pursuit of 100% — one source of truth for every AI, every MD. FAF defines. MD instructs. AI codes.',
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

    const promptText = `FAF is relentless in its pursuit of 100% persistent project context — one source of truth that every AI and every MD can benefit from.

Your job: get this project to 100% and lock it there. Do not stop until it is done.

${pathClause}

Follow this sequence exactly — no steps skipped, no shortcuts:

1. **Check** — Run \`faf_status\` to see if project.faf exists.
   - If it exists: continue to step 2.
   - If it does not exist: run \`faf_auto\` to create one, then continue.

2. **Score** — Run \`faf_score\` with details:true.
   - This reveals the current score and every missing slot.
   - Anything below 100% is incomplete. FAF knows.

3. **Drive to 100%** — If the score is below 100%:
   - Run \`faf_go\` to fill missing context through a guided interview.
   - Re-score after each round of improvements.
   - Repeat until the score is 🏆 100%. No exceptions.
   - FAF is relentless. So are you.

4. **Sync** — At 100%, run \`faf_tri_sync\` to lock context into CLAUDE.md and MEMORY.md.
   - Sync is mandatory. A 100% score without sync is not finished.
   - This is the one source of truth — .faf ↔ CLAUDE.md ↔ MEMORY.md — locked and aligned.

5. **Confirm** — Report:
   - Project name and score: 🏆 100%
   - What was missing and what was filled in
   - "Claude is now optimized for [project name]."
   - "FAF defines. MD instructs. AI codes."

This is what FAF does. Get to 100%. Sync. Lock. Done.`;

    return {
      description: 'Relentless pursuit of 100% — one source of truth. FAF defines. MD instructs. AI codes.',
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
