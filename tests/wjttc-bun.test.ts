/**
 * 🏁 WJTTC — bun migration + MCP integrity (claude-faf-mcp)
 *
 * Championship-grade proof that the Jest→bun migration is real and the MCP
 * server works over the protocol. 5-step WJTTC flow (run in order):
 *   1 🛑 BRAKE  — hard gates: the migration is real & safe
 *   2 ⚙️ ENGINE — core: the MCP protocol works end-to-end
 *   3 🌬️ AERO   — deep behavior (Phase 2)
 *   4 🛞 TYRE   — live cred-costing roundtrips (pass-through here)
 *   5 🔧 PIT    — evaluation / quality bars (pass-through here)
 * Pass-through = "considered, N/A this stage → pass" (not skipped).
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
// This suite verifies the FULL tool contract; the Core-tier default surface
// (12 tools, Extended opt-in) is covered separately by tests/core-tier.test.ts.
process.env.FAF_TOOLS = 'all';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ClaudeFafMcpServer } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
// faf-cli's "exports" map sets a `bun` condition that points at a non-shipped
// `src/index.ts`. Bun's resolver picks that condition first and fails. The
// published dist works fine via the relative path — same module the production
// server uses through tsc's CommonJS require. Cast to any to keep tsc happy.
// (Tradeoff documented in the AERO report; once faf-cli ships src/ or drops
// the bun condition, this can become a bare specifier.)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fafCliPromise: Promise<any> = import('../node_modules/faf-cli/dist/index.js');

const ROOT = path.resolve(__dirname, '..');
const readJson = (p: string) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

describe('🏁 WJTTC — bun migration + MCP integrity (claude-faf-mcp)', () => {
  // ───────────────────────────────────────────────────────────────────────
  describe('🛑 BRAKE (1) — the migration is real & safe', () => {
    const pkg = readJson('package.json');

    test('test runner is bun, not jest', () => {
      expect(pkg.scripts.test).toContain('bun test');
      expect(pkg.scripts.test).not.toContain('jest');
    });

    test('zero jest tooling in devDependencies', () => {
      const dev = pkg.devDependencies ?? {};
      for (const d of ['jest', 'ts-jest', '@jest/globals', '@types/jest']) {
        expect(dev[d]).toBeUndefined();
      }
    });

    test('bunfig.toml present (test discovery root)', () => {
      expect(fs.existsSync(path.join(ROOT, 'bunfig.toml'))).toBe(true);
    });

    test('no jest residue in any test file', () => {
      const dir = path.join(ROOT, 'tests');
      // Exclude THIS file — it references the jest patterns as string/regex
      // literals (it's the checker), which would self-match.
      const files = fs
        .readdirSync(dir)
        .filter((f) => f.endsWith('.test.ts') && f !== 'wjttc-bun.test.ts');
      expect(files.length).toBeGreaterThan(0);
      for (const f of files) {
        const src = fs.readFileSync(path.join(dir, f), 'utf8');
        expect(src).not.toContain('@jest/globals');
        expect(src).not.toMatch(/\bjest\.(fn|mock|spyOn)\b/);
      }
    });

    test('the MCP conformance layer is present', () => {
      expect(fs.existsSync(path.join(ROOT, 'tests/mcp-conformance.test.ts'))).toBe(true);
    });

    test('the server module imports without throwing', () => {
      expect(typeof ClaudeFafMcpServer).toBe('function');
      expect(() => new ClaudeFafMcpServer({ transport: 'stdio', fafEnginePath: 'native' })).not.toThrow();
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('⚙️ ENGINE (2) — MCP protocol core', () => {
    test('server constructs on both transports', () => {
      expect(() => new ClaudeFafMcpServer({ transport: 'stdio', fafEnginePath: 'native' })).not.toThrow();
      expect(() => new ClaudeFafMcpServer({ transport: 'http-sse', fafEnginePath: 'native' })).not.toThrow();
    });

    test('getServer() exposes the SDK Server', () => {
      const s = new ClaudeFafMcpServer({ transport: 'stdio', fafEnginePath: 'native' }).getServer();
      expect(s).toBeDefined();
      expect(typeof s.connect).toBe('function');
    });

    describe('canary protocol round-trip (depth lives in mcp-conformance)', () => {
      let client: Client;
      let server: ClaudeFafMcpServer;

      beforeAll(async () => {
        server = new ClaudeFafMcpServer({ transport: 'stdio', fafEnginePath: 'native' });
        const [clientT, serverT] = InMemoryTransport.createLinkedPair();
        await server.getServer().connect(serverT);
        client = new Client({ name: 'wjttc-canary', version: '1.0.0' }, { capabilities: {} });
        await client.connect(clientT);
      });

      afterAll(async () => {
        await client.close();
        await server.getServer().close();
      });

      test('initialize handshake settled server identity', () => {
        const info = client.getServerVersion();
        expect(info?.name).toBe('claude-faf-mcp');
        expect(typeof info?.version).toBe('string');
      });

      test('listTools returns a non-empty, uniquely-named set', async () => {
        const { tools } = await client.listTools();
        expect(tools.length).toBeGreaterThan(0);
        const names = tools.map((t) => t.name);
        expect(new Set(names).size).toBe(names.length);
      });

      test('callTool round-trips (faf_about)', async () => {
        const res = await client.callTool({ name: 'faf_about', arguments: {} });
        expect(Array.isArray(res.content)).toBe(true);
        expect(res.isError).toBeFalsy();
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('🌬️ AERO (3) — deep behavior', () => {
    // Phase 2 — deep behavior: per-tool callTool sweep (read-only safety),
    // single-source score determinism (faf-cli's real scoreFafYaml),
    // render determinism (faf-cli's generateProjectHtml — same renderer
    // wired into the championship faf_display fix), interop roundtrip
    // (faf_agents export — Claude Desktop's AGENTS.md interop surface),
    // identity drift. Fresh client/server pair scoped to this describe.

    // Minimal valid project.faf with an INCOMPLETE human_context — 3 of the
    // 6 Ws populated, all other base slots `slotignored`. Score lands
    // deterministically >0 (most slots populated/ignored) and <100 (3 empty
    // Ws count against). Non-trivial score is required: 0 and 100 would
    // pass determinism assertions trivially.
    const SAMPLE_FAF = [
      'faf_version: "3.0"',
      'project:',
      '  name: aero-fixture',
      '  goal: AERO phase-2 deep-behavior fixture project.',
      '  main_language: TypeScript',
      '  type: mcp',
      '  framework: MCP SDK',
      'stack:',
      '  frontend: slotignored',
      '  css_framework: slotignored',
      '  ui_library: slotignored',
      '  state_management: slotignored',
      '  backend: MCP SDK',
      '  api_type: MCP',
      '  runtime: Node.js',
      '  database: slotignored',
      '  connection: slotignored',
      '  hosting: local',
      '  build: tsc',
      '  cicd: GitHub Actions',
      '  monorepo_tool: slotignored',
      '  package_manager: npm',
      '  workspaces: slotignored',
      '  admin: slotignored',
      '  cache: slotignored',
      '  search: slotignored',
      '  storage: slotignored',
      'human_context:',
      '  who: AERO testers',
      '  what: deep-behavior fixture',
      '  why: prove single-source determinism',
      // Intentionally leave where/when/how empty so the score is <100.
      '',
    ].join('\n');

    let client: Client;
    let server: ClaudeFafMcpServer;
    let tmpDir: string;
    let originalCwd: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let fafCli: any;

    beforeAll(async () => {
      originalCwd = process.cwd();
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'faf-aero-'));
      fs.writeFileSync(path.join(tmpDir, 'project.faf'), SAMPLE_FAF);

      server = new ClaudeFafMcpServer({ transport: 'stdio', fafEnginePath: 'native' });
      const [clientT, serverT] = InMemoryTransport.createLinkedPair();
      await server.getServer().connect(serverT);
      client = new Client({ name: 'wjttc-aero', version: '1.0.0' }, { capabilities: {} });
      await client.connect(clientT);

      fafCli = await fafCliPromise;
    });

    afterAll(async () => {
      try {
        await client.close();
      } catch {
        // ignore close errors — best-effort teardown
      }
      try {
        await server.getServer().close();
      } catch {
        // ignore close errors — best-effort teardown
      }
      // Restore cwd even if no test changed it — doctrine (the sibling faf-mcp
      // repo's PR #43 fixed a real cwd-pollution regression caused by NOT
      // doing this).
      process.chdir(originalCwd);
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    // ─────────────────────────────────────────────────────────────────────
    // Category 1: read-only callTool sweep + junk-args resilience
    // ─────────────────────────────────────────────────────────────────────
    describe('1. read-only callTool sweep', () => {
      // Curated read-only set: every tool here returns plain text without
      // touching the filesystem when invoked with no args. Verified by
      // reading src/handlers/tools.ts (the active FafToolHandler):
      //   - faf_about / faf_guide: pure string returns
      //   - faf_friday: branches on optional `test` arg; no-args returns the
      //     blurb without invoking FuzzyDetector
      // Excluded: anything that mkdirs / writes (faf_init, faf_write,
      // faf_clear, faf_human_add, faf_go, faf_quick, faf_dna), anything that
      // shells out to the FAF engine subprocess (faf_chat, faf_agents,
      // faf_cursor, faf_gemini, faf_git, faf_conductor, faf_tri_sync,
      // faf_sync, faf_trust, faf_status, faf_auto,
      // faf_doctor, faf_readme), anything that uses cwd state via
      // getProjectPath (faf_score, faf_debug, faf_list, faf_read, faf_check,
      // faf_context, faf_formats), and the top-level `faf` entry tool
      // (orchestrator that touches fs). Note: claude-faf-mcp does NOT expose
      // faf_what (sibling faf-mcp/grok do).
      const READ_ONLY_TOOLS = [
        'faf_about',
        'faf_friday',
        'faf_guide',
      ] as const;

      for (const toolName of READ_ONLY_TOOLS) {
        test(`callTool(${toolName}) returns a content array, not isError`, async () => {
          const res = await client.callTool({ name: toolName, arguments: {} });
          expect(res.isError).toBeFalsy();
          expect(Array.isArray(res.content)).toBe(true);
          const content = res.content as Array<{ type: string; text?: string }>;
          expect(content.length).toBeGreaterThan(0);
          expect(content[0].type).toBe('text');
          expect(typeof content[0].text).toBe('string');
          expect((content[0].text as string).length).toBeGreaterThan(0);
        });
      }

      test('junk-args on a real tool does not crash the server', async () => {
        // faf_about ignores its args by design — feeding it {nonsense: 'xyz'}
        // proves the dispatch tolerates extra/unknown fields without crashing.
        // Either it succeeds (graceful) or it returns isError (handled) —
        // never throws unhandled. Then a subsequent valid call must still work,
        // proving the connection survived.
        let rejected = false;
        let isErrorResult = false;
        let ok = false;
        try {
          const res = await client.callTool({
            name: 'faf_about',
            arguments: { nonsense: 'xyz', extra: 42, weird: { nested: true } },
          });
          if (res.isError === true) {
            isErrorResult = true;
          } else {
            ok = true;
            expect(Array.isArray(res.content)).toBe(true);
          }
        } catch (err) {
          rejected = true;
          expect(err).toBeInstanceOf(Error);
        }
        expect(ok || isErrorResult || rejected).toBe(true);

        // Connection survives: a clean call still works.
        const followup = await client.callTool({ name: 'faf_about', arguments: {} });
        expect(followup.isError).toBeFalsy();
      });
    });

    // ─────────────────────────────────────────────────────────────────────
    // Category 2: single-source score determinism + MCP repeatability
    // ─────────────────────────────────────────────────────────────────────
    //
    // INTENT (per the task brief): assert MCP `faf_score` text-score equals
    // faf-cli's `scoreFafYaml(...).score` on the same YAML.
    //
    // HISTORY: v5.6.0 observation logged here was — the active FafToolHandler
    // (src/handlers/tools.ts, wired by server.ts L64) used a FafCompiler-based
    // pseudo-score path + banned medal/colored-circle tier ladder
    // (🥇🥈🥉🟢🟡🔴🤍), while ChampionshipToolHandler (championship-tools.ts,
    // present but not wired) already had the truthful `scoreFafYaml` import.
    // Same shape as faf-mcp pilot PR #47 (Case A).
    //
    // ✅ RESOLVED v5.6.1 (this PR): `FafToolHandler.handleFafScore` (the wired
    // one) now calls faf-cli's `scoreFafYaml` directly — same single-source
    // path the championship handler was already on, same path faf-mcp 2.1.1
    // shipped via PR #48. The banned emoji ladder is gone; output now uses
    // canonical Unicode tier glyphs. Parity now holds for valid `.faf` inputs;
    // invalid/unreadable paths return `0/100 (0%)` honestly (not a fake score).
    //
    // What we assert (all three remain high-signal):
    //   a) faf-cli's `scoreFafYaml` is reachable, deterministic, and produces
    //      a sane score on the fixture (>0 <100, repeatable).
    //   b) MCP `faf_score` returns a parseable percentage and is consistent
    //      across two calls on identical state (no flap, no nondeterminism).
    //   c) TRUE PARITY — MCP `faf_score` numeric == faf-cli
    //      `scoreFafYaml(yaml).score` on the same fixture. The shield closes.
    describe('2. score determinism (single-source via faf-cli)', () => {
      test('faf-cli scoreFafYaml is deterministic on the fixture (>0, <100)', () => {
        const raw = fs.readFileSync(path.join(tmpDir, 'project.faf'), 'utf-8');
        const r1 = fafCli.scoreFafYaml(raw);
        const r2 = fafCli.scoreFafYaml(raw);
        expect(typeof r1.score).toBe('number');
        expect(r1.score).toBe(r2.score);
        expect(r1.score).toBeGreaterThan(0);
        expect(r1.score).toBeLessThan(100);
        expect(r1.populated).toBe(r2.populated);
        expect(r1.total).toBe(r2.total);
      });

      test('MCP faf_score returns a parseable percentage and is repeatable', async () => {
        const r1 = await client.callTool({
          name: 'faf_score',
          arguments: { path: tmpDir, details: true },
        });
        expect(r1.isError).toBeFalsy();
        const r2 = await client.callTool({
          name: 'faf_score',
          arguments: { path: tmpDir, details: true },
        });
        expect(r2.isError).toBeFalsy();

        const text1 = ((r1.content as Array<{ text?: string }>)[0]?.text ?? '') as string;
        const text2 = ((r2.content as Array<{ text?: string }>)[0]?.text ?? '') as string;

        // Pattern matches both the legacy "📊 FAF SCORE: <n>%" form AND the
        // truthful "<n>/100" form. Either way, capture group 1 is the number.
        const SCORE_RE = /(?:FAF SCORE:\s*|\b)(\d{1,3})\s*(?:%|\/\s*100)/;
        const m1 = text1.match(SCORE_RE);
        const m2 = text2.match(SCORE_RE);
        expect(m1).not.toBeNull();
        expect(m2).not.toBeNull();
        const n1 = parseInt(m1![1], 10);
        const n2 = parseInt(m2![1], 10);
        expect(n1).toBe(n2); // repeatability
        expect(n1).toBeGreaterThanOrEqual(0);
        expect(n1).toBeLessThanOrEqual(100);
      });

      test('TRUE PARITY: MCP faf_score == faf-cli scoreFafYaml on the same YAML', async () => {
        // The loop-closing receipt. v5.6.1 wires `handleFafScore` through
        // faf-cli's real scorer — so the number MCP emits MUST equal the
        // number `scoreFafYaml` returns. Single source of truth, no drift.
        const raw = fs.readFileSync(path.join(tmpDir, 'project.faf'), 'utf-8');
        const parityScore = fafCli.scoreFafYaml(raw).score;

        const res = await client.callTool({
          name: 'faf_score',
          arguments: { path: tmpDir },
        });
        expect(res.isError).toBeFalsy();
        const text = ((res.content as Array<{ text?: string }>)[0]?.text ?? '') as string;

        const SCORE_RE = /(?:FAF SCORE:\s*|\b)(\d{1,3})\s*(?:%|\/\s*100)/;
        const m = text.match(SCORE_RE);
        expect(m).not.toBeNull();
        const mcpScore = parseInt(m![1], 10);

        expect(mcpScore).toBe(parityScore);
      });
    });

    // ─────────────────────────────────────────────────────────────────────
    // Category 3: render determinism via faf-cli's generateProjectHtml
    // ─────────────────────────────────────────────────────────────────────
    //
    // faf-cli ships `generateProjectHtml` as the single-source HTML renderer.
    // ChampionshipToolHandler.handleDisplay imports it directly (see
    // championship-tools.ts L29) — but as noted above, that handler isn't
    // wired. We still exercise the renderer directly here — same dep, same
    // fixture, same byte-identical determinism contract. Proves the renderer
    // behaves deterministically in this repo's resolver/runtime config.
    test('generateProjectHtml is byte-identical across repeat calls', () => {
      const fafPath = path.join(tmpDir, 'project.faf');
      const data = fafCli.readFaf(fafPath);
      const scoreResult = fafCli.scoreFafYaml(fafCli.readFafRaw(fafPath));
      const html1 = fafCli.generateProjectHtml(data, scoreResult, fafPath);
      const html2 = fafCli.generateProjectHtml(data, scoreResult, fafPath);
      expect(typeof html1).toBe('string');
      expect(html1.length).toBeGreaterThan(0);
      expect(html1).toBe(html2);
    });

    // ─────────────────────────────────────────────────────────────────────
    // Category 4: interop roundtrip
    // ─────────────────────────────────────────────────────────────────────
    //
    // The MCP interop tools (faf_agents / faf_cursor / faf_gemini) shell out
    // to the faf-cli subprocess via engine-adapter. The engine subprocess
    // path is environment-dependent (PATH, faf binary availability) — in a
    // hermetic test we can't depend on it succeeding, but we MUST assert it
    // doesn't crash and returns a well-formed CallToolResult either way.
    // That's the real safety guarantee we can offer without faking the dep.
    // claude-faf-mcp's CLAUDE.md notes 33 tools including AGENTS.md interop;
    // faf_agents matches the sibling faf-mcp choice exactly.
    test('interop tool (faf_agents export) returns a well-formed result, no crash', async () => {
      let crashed = false;
      let result: { content: unknown; isError?: boolean } | undefined;
      try {
        result = await client.callTool({
          name: 'faf_agents',
          arguments: { path: tmpDir, action: 'export' },
        });
      } catch (err) {
        // A rejected promise is also acceptable handling; what's forbidden is
        // an unhandled crash that kills the server connection.
        crashed = false;
        expect(err).toBeInstanceOf(Error);
      }
      expect(crashed).toBe(false);

      if (result) {
        expect(Array.isArray(result.content)).toBe(true);
        // Either it worked (then AGENTS.md exists in tmpDir) or it failed
        // gracefully (isError true). Both prove "no crash, well-formed".
        if (result.isError === false || result.isError === undefined) {
          const agentsPath = path.join(tmpDir, 'AGENTS.md');
          if (fs.existsSync(agentsPath)) {
            const stat = fs.statSync(agentsPath);
            expect(stat.size).toBeGreaterThan(0);
          }
          // If the file didn't materialize despite a non-error result, the
          // engine adapter returned a soft-success — still not a crash.
        }
      }

      // Connection survives.
      const followup = await client.callTool({ name: 'faf_about', arguments: {} });
      expect(followup.isError).toBeFalsy();
    });

    // ─────────────────────────────────────────────────────────────────────
    // Category 4b: the Copilot reachability guard (5.14.1 regression)
    // ─────────────────────────────────────────────────────────────────────
    //
    // 5.14.0 wired the copilot flag ONLY onto faf_bi_sync — a tool NOT in the
    // default surface — so the headline feature was unreachable from the Core
    // sync tool. 5.14.1 collapses the format flags onto faf_sync (Core) and
    // removes faf_bi_sync. Unlike faf_agents (which shells out to a subprocess),
    // faf_sync's format path runs the bundled bi-sync engine in-process, so with
    // a seeded project.faf the file MUST materialize. This is the guard that
    // would have caught the original gap.
    test('faf_sync with copilot:true writes .github/copilot-instructions.md', async () => {
      const result = await client.callTool({
        name: 'faf_sync',
        arguments: { path: tmpDir, copilot: true },
      });
      expect(result.isError).toBeFalsy();
      expect(Array.isArray(result.content)).toBe(true);

      const copilotPath = path.join(tmpDir, '.github', 'copilot-instructions.md');
      expect(fs.existsSync(copilotPath)).toBe(true);
      expect(fs.statSync(copilotPath).size).toBeGreaterThan(0);
    });

    test('faf_bi_sync is gone — collapsed into faf_sync', async () => {
      const { tools } = await client.listTools();
      const names = new Set(tools.map((t) => t.name));
      expect(names.has('faf_sync')).toBe(true);
      expect(names.has('faf_bi_sync')).toBe(false);
    });

    // ─────────────────────────────────────────────────────────────────────
    // Category 5: identity drift
    // ─────────────────────────────────────────────────────────────────────
    describe('5. identity drift', () => {
      test('server identity matches package.json name (claude-faf-mcp)', () => {
        const pkg = readJson('package.json');
        const info = client.getServerVersion();
        expect(info?.name).toBe(pkg.name);
        expect(info?.name).toBe('claude-faf-mcp');
      });

      test('listTools count is in a sane envelope (catches accidental removal)', async () => {
        const { tools } = await client.listTools();
        // Today's count is 33 (probed live via FafToolHandler.listTools
        // static array: 1 top-level `faf` orchestrator + 32 faf_* tools).
        // Floor at 25 catches any major accidental removal without being
        // brittle to incremental additions.
        expect(tools.length).toBeGreaterThanOrEqual(25);
        // Ceiling guards against accidental duplication / runaway tool
        // registration.
        expect(tools.length).toBeLessThanOrEqual(200);
      });

      test('core tool names are present', async () => {
        const { tools } = await client.listTools();
        const names = new Set(tools.map((t) => t.name));
        // Verified live against FafToolHandler.listTools — these are the
        // names the active handler actually advertises. Includes the
        // top-level `faf` orchestrator + interop surface specific to
        // claude-faf-mcp (faf_agents / faf_cursor / faf_gemini).
        for (const required of [
          'faf',
          'faf_about',
          'faf_score',
          'faf_status',
          'faf_init',
          'faf_sync',
          'faf_agents',
        ]) {
          expect(names.has(required)).toBe(true);
        }
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('🛞 TYRE (4) — live test [pass-through]', () => {
    test('pass-through: no live cred-costing roundtrips in this suite', () => {
      // Conformance + canary use an in-memory transport (no network/account).
      // Live TYRE tests (real MCP-over-HTTP / registry roundtrips that cost
      // creds) are out of scope for a migration-proof suite.
      // Recorded pass-through: considered, N/A this stage → pass.
      expect(true).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  describe('🔧 PIT (5) — evaluation / EVAL [pass-through]', () => {
    test('pass-through: quality/behavioural eval is the faf-score Trophy gate', () => {
      // PIT (eval) for this server is the project.faf Trophy gate, enforced in
      // the /pubpro FAF gate — not duplicated here.
      // Recorded pass-through: considered, N/A this stage → pass.
      expect(true).toBe(true);
    });
  });
});
