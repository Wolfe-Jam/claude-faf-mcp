/**
 * bunfig [test] preload — the suite runs only with a temp HOME.
 *
 * bun reads HOME once, at process start: setting process.env.HOME here would
 * not move os.homedir(), so a preload cannot make the run hermetic by itself.
 * scripts/hermetic-test.mjs (what `npm test` runs) starts bun with HOME,
 * USERPROFILE and XDG_* in a new temp folder and sets CFM_TEST_HOME to it. This
 * preload refuses to run the suite without that, so no test can ever write
 * into a real home folder (~/.claude, ~/Projects, …).
 *
 * One file: npm test -- tests/<name>.test.ts
 */
import * as os from 'os';
import * as path from 'path';

const expected = process.env.CFM_TEST_HOME;
if (!expected || path.resolve(os.homedir()) !== path.resolve(expected)) {
  throw new Error(
    'claude-faf-mcp tests run only with a temp HOME. Run them through `npm test` ' +
      '(or `node scripts/hermetic-test.mjs bun test <file>`), which starts bun with one.',
  );
}
