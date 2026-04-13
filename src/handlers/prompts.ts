import { ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';

export class FafPromptHandler {

  listPrompts() {
    return {
      prompts: [
        {
          name: 'faf',
          description: 'Get to 100% — check, score, improve, sync. FAF defines. MD instructs. AI codes.',
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
    if (name !== 'faf') {
      throw new Error(`Unknown prompt: ${name}`);
    }

    const pathClause = args?.path
      ? `The project is at: ${args.path}`
      : 'Use the current working directory as the project path.';

    const promptText = `You are FAF-optimized. Your job right now is to get this project to 100% AI-readiness and lock it there.

${pathClause}

Follow this sequence — do not skip steps:

1. **Check** — Run \`faf_status\` to see if project.faf exists.
   - If it exists: continue to step 2.
   - If it does not exist: run \`faf_auto\` to create one, then continue.

2. **Score** — Run \`faf_score\` with details:true to see the current score and what's missing.

3. **Drive to 100%** — If the score is below 100%:
   - Run \`faf_go\` to fill in missing context through a guided interview.
   - Re-score after each improvement.
   - Be relentless. Do not stop until the score is 100% 🏆.

4. **Sync** — Once at 100%, run \`faf_tri_sync\` to lock the context into CLAUDE.md and MEMORY.md.
   - This is mandatory. A 100% score not followed by sync is incomplete.

5. **Confirm** — Report back:
   - Project name and score (must be 🏆 100%)
   - What was filled in or improved
   - "Claude is now optimized for [project name]. FAF defines. MD instructs. AI codes."

You are living proof of what FAF does. Get to 100%. Lock it. Let's go.`;

    return {
      description: 'Drive this project to 100% AI-readiness — check, score, improve, sync, lock.',
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
