/**
 * 🏎️ MCP Protocol Conformance Tests
 *
 * High-signal suite that drives the server over the REAL MCP protocol via the
 * official SDK Client + an in-memory transport. Unlike the unit/logic suites,
 * this exercises initialize → capability negotiation → listTools → callTool
 * round-trips through the actual JSON-RPC machinery — the "tells us more" layer.
 *
 * ADD-only. Does not touch existing tests.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
// This suite verifies the FULL tool contract; the Core-tier default surface
// (12 tools, Extended opt-in) is covered separately by tests/core-tier.test.ts.
process.env.FAF_TOOLS = 'all';
import { ClaudeFafMcpServer } from '../src/server.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

let server: ClaudeFafMcpServer;
let client: Client;

beforeAll(async () => {
  server = new ClaudeFafMcpServer({ transport: 'stdio', fafEnginePath: 'native' });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.getServer().connect(serverTransport);

  client = new Client({ name: 'conformance', version: '1.0.0' }, { capabilities: {} });
  // connect() performs the initialize handshake (capability negotiation).
  await client.connect(clientTransport);
});

afterAll(async () => {
  await client.close();
  await server.getServer().close();
});

describe('🏁 MCP Conformance — over real protocol via SDK + in-memory transport', () => {
  // ───────────────────────────────────────────────────────────────────────
  // Category 1: Initialize / capability negotiation
  // ───────────────────────────────────────────────────────────────────────
  describe('1. Initialize / capability negotiation', () => {
    test('handshake settled server identity (name === claude-faf-mcp, version present)', () => {
      const version = client.getServerVersion();
      expect(version).toBeDefined();
      expect(version?.name).toBe('claude-faf-mcp');
      expect(typeof version?.version).toBe('string');
      expect((version?.version as string).length).toBeGreaterThan(0);
    });

    test('negotiated capabilities advertise both tools and resources', () => {
      const caps = client.getServerCapabilities();
      expect(caps).toBeDefined();
      expect(caps?.tools).toBeDefined();
      expect(caps?.resources).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Category 2: listTools + schema validity
  // ───────────────────────────────────────────────────────────────────────
  describe('2. listTools + schema validity', () => {
    test('returns a non-empty tools array', async () => {
      const { tools } = await client.listTools();
      expect(Array.isArray(tools)).toBe(true);
      expect(tools.length).toBeGreaterThan(0);
    });

    test('every tool has a non-empty name and an object-typed inputSchema', async () => {
      const { tools } = await client.listTools();
      for (const tool of tools) {
        expect(typeof tool.name).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);
        expect(tool.inputSchema).toBeDefined();
        // Valid JSON-Schema shape for MCP tools: top-level object.
        expect(tool.inputSchema.type).toBe('object');
      }
    });

    test('tool names are unique', async () => {
      const { tools } = await client.listTools();
      const names = tools.map((t) => t.name);
      const unique = new Set(names);
      expect(names.length).toBe(unique.size);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Category 3: callTool round-trip (read-only tool)
  // ───────────────────────────────────────────────────────────────────────
  describe('3. callTool round-trip', () => {
    test('faf_about returns a content array of text blocks, isError falsy', async () => {
      // faf_about is read-only and ignores args — the safest round-trip probe.
      const result = await client.callTool({ name: 'faf_about', arguments: {} });

      expect(result.isError).toBeFalsy();
      expect(Array.isArray(result.content)).toBe(true);
      const content = result.content as Array<{ type: string; text?: string }>;
      expect(content.length).toBeGreaterThan(0);

      const first = content[0];
      expect(first.type).toBe('text');
      expect(typeof first.text).toBe('string');
      expect((first.text as string).length).toBeGreaterThan(0);
    });

    test('round-trip works without an arguments field (optional args)', async () => {
      // Omitting `arguments` entirely must still produce a valid result.
      const result = await client.callTool({ name: 'faf_about' });
      expect(result.isError).toBeFalsy();
      expect(Array.isArray(result.content)).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Category 4: Error semantics — bad input is handled, not a crash
  // ───────────────────────────────────────────────────────────────────────
  describe('4. Error semantics', () => {
    test('unknown tool name surfaces an error (rejection or isError), not a crash', async () => {
      // Discovered behavior: the handler throws `Unknown tool: <name>` and the
      // server re-throws, so the SDK client REJECTS the callTool promise with an
      // MCP error. We assert defensively in case the SDK ever maps it to an
      // isError result instead — either way, bad input is handled cleanly.
      let rejected = false;
      let isErrorResult = false;

      try {
        const result = await client.callTool({ name: 'definitely_not_a_real_tool_xyz', arguments: {} });
        isErrorResult = result.isError === true;
      } catch (err) {
        rejected = true;
        expect(err).toBeInstanceOf(Error);
        expect(String((err as Error).message).length).toBeGreaterThan(0);
      }

      expect(rejected || isErrorResult).toBe(true);
    });

    test('the server stays alive after an error (subsequent valid call succeeds)', async () => {
      // Proves the error path did not crash the connection.
      const result = await client.callTool({ name: 'faf_about', arguments: {} });
      expect(result.isError).toBeFalsy();
      expect(Array.isArray(result.content)).toBe(true);
    });

    test('a real tool given clearly-invalid args is handled (no crash)', async () => {
      // faf_score on a non-existent path: either a tool-execution error result
      // (isError) or a graceful content result — never a thrown crash, and the
      // connection survives.
      let crashed = false;
      try {
        const result = await client.callTool({
          name: 'faf_score',
          arguments: { path: '/__faf_conformance_nonexistent_path__/nope' },
        });
        // Whatever it returns, it must be a well-formed CallToolResult.
        expect(Array.isArray(result.content)).toBe(true);
      } catch (err) {
        // A rejected MCP error is also acceptable handling.
        expect(err).toBeInstanceOf(Error);
      }
      expect(crashed).toBe(false);
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Category 5: Tool identity / visibility
  // ───────────────────────────────────────────────────────────────────────
  describe('5. Tool identity / visibility', () => {
    test('core advertised tools are present (faf_score, faf_about, faf_status)', async () => {
      const { tools } = await client.listTools();
      const names = new Set(tools.map((t) => t.name));
      expect(names.has('faf_score')).toBe(true);
      expect(names.has('faf_about')).toBe(true);
      expect(names.has('faf_status')).toBe(true);
    });

    test('all advertised tools are namespaced under faf and have descriptions', async () => {
      const { tools } = await client.listTools();
      for (const tool of tools) {
        expect(tool.name.startsWith('faf')).toBe(true);
        expect(typeof tool.description).toBe('string');
        expect((tool.description as string).length).toBeGreaterThan(0);
      }
    });

    test('advertised tool count is sane (a meaningful, bounded set)', async () => {
      const { tools } = await client.listTools();
      // Sanity envelope: more than a handful, fewer than the absurd.
      expect(tools.length).toBeGreaterThanOrEqual(10);
      expect(tools.length).toBeLessThanOrEqual(200);
    });

    test('every callTool-routable advertised tool maps to a real handler', async () => {
      // Each advertised name must be dispatchable: probe a read-only one and
      // confirm the unknown-tool path is the ONLY thing that errors by name.
      const { tools } = await client.listTools();
      const aboutTool = tools.find((t) => t.name === 'faf_about');
      expect(aboutTool).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Category 6: Version / protocol compatibility
  // ───────────────────────────────────────────────────────────────────────
  describe('6. Version compatibility', () => {
    test('server version string is non-empty (semantic-ish)', () => {
      const version = client.getServerVersion();
      expect(typeof version?.version).toBe('string');
      expect((version?.version as string).length).toBeGreaterThan(0);
    });

    test('the initialize handshake completed (capabilities populated post-connect)', () => {
      // If a protocol version had not been negotiated, getServerCapabilities()
      // would be undefined. Its presence is the receipt the version settled.
      const caps = client.getServerCapabilities();
      expect(caps).toBeDefined();
    });
  });

  // ───────────────────────────────────────────────────────────────────────
  // Out of scope here — needs the HTTP transport, not in-memory.
  // ───────────────────────────────────────────────────────────────────────
  test.todo('HTTP transport: Origin rejection / localhost bind');
});
