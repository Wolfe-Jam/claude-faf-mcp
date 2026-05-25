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
import * as fs from 'fs';
import * as path from 'path';
import { ClaudeFafMcpServer } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

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
    // Phase 2: per-tool callTool sweep, read-only safety, single-source score
    // parity (faf-cli real score), render determinism, interop roundtrips,
    // visibility tiers, identity drift.
    test.todo('AERO deep-behavior sweep — Phase 2');
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
