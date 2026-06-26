/**
 * CFM Copilot-grade emitter (transfer #1 from faf-cli 6.16.0).
 *
 * CFM's copilot-instructions.md was the AGENTS.md content reused verbatim
 * (`copilotExportCommand` → `agentsExport`) — a clone, lacking the Copilot-spec
 * touches. This locks the CFM-native `generateCopilotInstructions`: a distinct,
 * Copilot-grade file — "every request" framing, prose overview, a `## Build & run`
 * command section — reusing CFM's existing (good) hardcoded stack labels.
 *
 * Per the WJTTC/TAF boundary intel: build/cicd come from FAF context; testing is
 * NOT a FAF slot, so there is intentionally no test command sourced here.
 */
import { describe, test, expect } from 'bun:test';
import { generateCopilotInstructions } from '../src/faf-core/commands/copilot.js';

const FAF = {
  project: { name: 'demo-mcp', goal: 'Persistent project context for Claude' },
  stack: {
    backend: 'MCP SDK', runtime: 'Node.js', build: 'tsc',
    cicd: 'GitHub Actions', hosting: 'npm', database: 'None',
  },
  human_context: { who: 'Claude Desktop + Code devs', why: 'define once, never re-explain' },
};

describe('CFM copilot-grade emitter', () => {
  test('Copilot header + every-request framing (distinct from AGENTS.md "# name")', () => {
    const out = generateCopilotInstructions(FAF);
    expect(out).toContain('# GitHub Copilot Instructions — demo-mcp');
    expect(out.toLowerCase()).toContain('on every request');
  });

  test('goal leads as a prose overview, not a bullet', () => {
    const out = generateCopilotInstructions(FAF);
    expect(out).toContain('Persistent project context for Claude');
    expect(out).not.toContain('- Persistent project context for Claude'); // not a bullet
  });

  test('## Build & run surfaces build/cicd as imperative commands', () => {
    const out = generateCopilotInstructions(FAF);
    expect(out).toContain('## Build & run');
    expect(out).toContain('Build with `tsc`');
    expect(out).toContain('CI runs on GitHub Actions');
    expect(out).not.toContain('- Build: tsc'); // build is a command, not a stack bullet
  });

  test('Tech stack keeps CFM’s good labels; excludes the command slots', () => {
    const out = generateCopilotInstructions(FAF);
    expect(out).toContain('## Tech stack');
    expect(out).toContain('- Backend: MCP SDK');
    expect(out).toContain('- Runtime: Node.js');
    expect(out).toContain('- Hosting: npm');
    expect(out).not.toContain('Database: None'); // 'None' filtered
    expect(out).not.toContain('## Tech Stack\n\n- Build:'); // build moved to Build & run
  });

  test('6Ws render as Project context when present', () => {
    const out = generateCopilotInstructions(FAF);
    expect(out).toContain('## Project context');
    expect(out).toContain('- **Who:** Claude Desktop + Code devs');
    expect(out).toContain('- **Why:** define once, never re-explain');
  });

  test('is NOT a clone — carries the Copilot header AGENTS.md never produces', () => {
    const out = generateCopilotInstructions(FAF);
    expect(out).toContain('# GitHub Copilot Instructions');
    expect(out).not.toMatch(/^# demo-mcp$/m);           // not the AGENTS.md "# name" header
    expect(out).not.toContain('by claude-faf-mcp —');   // not the AGENTS.md dated footer
  });

  test('no testing slot — build/cicd only (FAF≠testing boundary)', () => {
    const out = generateCopilotInstructions(FAF);
    expect(out).not.toContain('Test with');
    expect(out).not.toContain('Lint with');
  });

  test('degrades gracefully on a near-empty .faf', () => {
    expect(() => generateCopilotInstructions({ project: { name: 'x' } })).not.toThrow();
    const out = generateCopilotInstructions({ project: { name: 'x' } });
    expect(out).toContain('# GitHub Copilot Instructions — x');
  });
});
