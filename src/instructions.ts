/**
 * InitializeResult.instructions: how the tools fit together, for the model.
 * Relationships and rules only; each tool's own description covers what it does.
 * Keep it short (under 1,000 characters): tests/server-instructions.test.ts checks
 * the length and that every tool named here is on the default tool list.
 */
export const SERVER_INSTRUCTIONS = [
  'Works on one project at a time: faf_context shows the active folder; tools without a path use it.',
  'For questions about the project (stack, goal, commands), read project.faf first and answer from it. faf_score shows what is missing; faf_doctor says why.',
  "No project.faf yet: faf_auto creates it from the repo. The human slots (name, goal, who, what, why) come from the user through faf_go: ask, don't invent answers.",
  "project.faf is the source, one way: edit it, then faf_sync writes CLAUDE.md and faf_tri_sync also Claude Code's MEMORY.md.",
  'Use faf_etch only when the user asks to remember something; faf_recall reads it back from soul.fafm.',
].join('\n');
