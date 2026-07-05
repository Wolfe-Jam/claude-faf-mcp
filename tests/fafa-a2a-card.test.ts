import { test, expect } from 'bun:test';
import { fafaToA2ACard, A2A_PROTOCOL_VERSION } from '../src/fafa/a2a-card';

const FAFA = {
  version: '0.1',
  agent: { name: 'claude-faf-mcp', id: 'did:web:faf.one:claude-faf-mcp', vendor: 'WolfeJAM', version: '5.7.1', description: 'Persistent project context for Claude', homepage: 'https://faf.one' },
  capabilities: [
    { name: 'faf_score', type: 'tool', description: 'AI-readiness score', tags: ['faf'], apophatic: true },
    { name: 'faf_etch', type: 'tool', description: 'Etch a memory', tags: ['faf'] },
  ],
  provenance: { faf: './project.faf', mediaType: 'application/vnd.faf+yaml', deterministic: true },
};
const URL = 'https://mcpaas.live/claude/a2a';

test('maps required A2A v1.0 fields (supportedInterfaces, not top-level url)', () => {
  const c = fafaToA2ACard(FAFA, { url: URL });
  expect(c.name).toBe('claude-faf-mcp');
  // v1.0: no top-level url / protocolVersion — they live in supportedInterfaces[].
  expect((c as any).url).toBeUndefined();
  expect((c as any).protocolVersion).toBeUndefined();
  expect(c.supportedInterfaces).toEqual([
    { url: URL, protocolBinding: 'JSONRPC', protocolVersion: A2A_PROTOCOL_VERSION },
  ]);
  expect(c.capabilities.streaming).toBe(false);
  expect(c.capabilities.pushNotifications).toBe(false);
  expect(c.capabilities.extendedAgentCard).toBe(false);
});

test('capability → skill (id/name/description/tags), count preserved', () => {
  const c = fafaToA2ACard(FAFA, { url: URL });
  expect(c.skills.length).toBe(2);
  expect(c.skills[0]).toEqual({ id: 'faf_score', name: 'faf_score', description: 'AI-readiness score', tags: ['faf'] });
});

test('provider from vendor + homepage', () => {
  const c = fafaToA2ACard(FAFA, { url: URL });
  expect(c.provider).toEqual({ organization: 'WolfeJAM', url: 'https://faf.one' });
});

test('FAF context block rides as a one.faf extension under capabilities (NEVER io.faf)', () => {
  const c = fafaToA2ACard(FAFA, { url: URL });
  // v1.0: extensions live under capabilities, not top-level.
  expect((c as any).extensions).toBeUndefined();
  expect(c.capabilities.extensions).toHaveLength(1);
  expect(c.capabilities.extensions![0].uri).toBe('https://one.faf/context');
  expect(c.capabilities.extensions![0].uri).not.toContain('io.faf');
  expect(c.capabilities.extensions![0].params).toEqual(FAFA.provenance);
});

test('no provenance → no extensions (clean omission)', () => {
  const c = fafaToA2ACard({ ...FAFA, provenance: undefined }, { url: URL });
  expect(c.capabilities.extensions).toBeUndefined();
});

test('default I/O modes present + valid JSON-serializable', () => {
  const c = fafaToA2ACard(FAFA, { url: URL });
  expect(c.defaultInputModes).toContain('application/json');
  expect(() => JSON.stringify(c)).not.toThrow();
});

// Note: no shipped .well-known A2A card. The local agent is A2A-MAPPABLE (this
// mapper) but not A2A-SERVED — a card is only emitted where a real A2A endpoint
// exists, with that endpoint's real url + tools. Identity (.fafa) ≠ hosting.
test('mapper requires a real url to be supplied (no fabricated default)', () => {
  const c = fafaToA2ACard(FAFA, { url: URL });
  expect(c.supportedInterfaces[0].url).toBe(URL); // url comes from the caller, never baked in
});
