/**
 * Server instructions: sent in initialize, short, and every tool they name
 * is on the default (Core) tool list, so a rename can't leave them stale.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { ClaudeFafMcpServer } from '../src/server.js';
import { SERVER_INSTRUCTIONS } from '../src/instructions.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

let server: ClaudeFafMcpServer;
let client: Client;

beforeAll(async () => {
  delete process.env.FAF_TOOLS;
  server = new ClaudeFafMcpServer({ transport: 'stdio', fafEnginePath: 'native' } as any);
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.getServer().connect(serverTransport);
  client = new Client({ name: 'instructions-test', version: '1.0.0' }, { capabilities: {} });
  await client.connect(clientTransport);
});

afterAll(async () => {
  await client.close();
  await server.getServer().close();
});

describe('server instructions', () => {
  test('initialize carries them', () => {
    expect(client.getInstructions()).toBe(SERVER_INSTRUCTIONS);
  });

  test('stay under 1,000 characters', () => {
    expect(SERVER_INSTRUCTIONS.length).toBeLessThan(1000);
  });

  test('every tool they name is on the default tool list', async () => {
    const { tools } = await client.listTools();
    const listed = new Set(tools.map((t) => t.name));
    const named = [...new Set(SERVER_INSTRUCTIONS.match(/\bfaf_[a-z_]+/g) ?? [])];
    expect(named.length).toBeGreaterThan(0);
    expect(named.filter((n) => !listed.has(n))).toEqual([]);
  });
});
