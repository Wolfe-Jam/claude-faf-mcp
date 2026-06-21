import { describe, test, expect } from 'bun:test';
import { fafCli } from '../src/utils/faf-cli-bridge.js';

// WJTTC — the human/sourced boundary lock for faf_go.
//
// faf_go runs the INTERVIEW technique to collect the HUMAN 6Ws only. The sourced
// slots (main_language + the stack.*) are NEVER asked of a human — faf_init seeds
// the language, faf_auto sources the stack. This is the exact boundary the
// "Interview-16" drift crossed (a sourced slot leaked into the human interview).
// This suite makes that un-reintroducible: the day someone drags a sourced slot
// into SIX_WS_INTERVIEW, this goes red. The lesson lives in the test, not in a
// comment or someone's memory — "I'll remember" is not a fix, a red test is.

const SOURCED_PATHS = [
  'project.main_language',
  'stack.frontend', 'stack.backend', 'stack.database', 'stack.runtime',
  'stack.hosting', 'stack.build', 'stack.cicd',
];

const HUMAN_PATHS = [
  'human_context.how', 'human_context.what', 'human_context.when',
  'human_context.where', 'human_context.who', 'human_context.why',
  'project.goal', 'project.name',
];

describe('BRAKE — faf_go human/sourced boundary (Interview-16 lock)', () => {
  test('SIX_WS_INTERVIEW is EXACTLY the human slots (the 6Ws + name + goal)', async () => {
    const { SIX_WS_INTERVIEW } = await fafCli;
    const paths = SIX_WS_INTERVIEW.map((q) => q.path).sort();
    expect(paths).toEqual([...HUMAN_PATHS].sort());
  });

  test('NO sourced slot ever appears in the human interview', async () => {
    const { SIX_WS_INTERVIEW } = await fafCli;
    const paths = new Set(SIX_WS_INTERVIEW.map((q) => q.path));
    for (const sourced of SOURCED_PATHS) {
      expect(paths.has(sourced)).toBe(false);
    }
    // Nothing under stack.* at all, and language is never on the human side.
    expect([...paths].some((p) => p.startsWith('stack.'))).toBe(false);
    expect(paths.has('project.main_language')).toBe(false);
  });

  test('the human (6Ws) and sourced (stack) interviews are DISJOINT', async () => {
    const { SIX_WS_INTERVIEW, STACK_INTERVIEW } = await fafCli;
    const human = new Set(SIX_WS_INTERVIEW.map((q) => q.path));
    for (const p of STACK_INTERVIEW.map((q) => q.path)) {
      expect(human.has(p)).toBe(false);
    }
  });
});
