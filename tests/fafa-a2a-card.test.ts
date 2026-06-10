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

test('maps required A2A fields', () => {
  const c = fafaToA2ACard(FAFA, { url: URL });
  expect(c.protocolVersion).toBe(A2A_PROTOCOL_VERSION);
  expect(c.name).toBe('claude-faf-mcp');
  expect(c.url).toBe(URL);
  expect(c.capabilities).toEqual({ streaming: false, pushNotifications: false, extendedAgentCard: false });
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

test('FAF context block rides as a one.faf extension (NEVER io.faf)', () => {
  const c = fafaToA2ACard(FAFA, { url: URL });
  expect(c.extensions).toHaveLength(1);
  expect(c.extensions![0].uri).toBe('https://one.faf/context');
  expect(c.extensions![0].uri).not.toContain('io.faf');
  expect(c.extensions![0].params).toEqual(FAFA.provenance);
});

test('no provenance → no extensions (clean omission)', () => {
  const c = fafaToA2ACard({ ...FAFA, provenance: undefined }, { url: URL });
  expect(c.extensions).toBeUndefined();
});

test('default I/O modes present + valid JSON-serializable', () => {
  const c = fafaToA2ACard(FAFA, { url: URL });
  expect(c.defaultInputModes).toContain('application/json');
  expect(() => JSON.stringify(c)).not.toThrow();
});
