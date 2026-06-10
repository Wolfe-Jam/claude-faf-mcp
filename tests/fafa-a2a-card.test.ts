import { describe, test, expect } from 'bun:test';
import * as fs from 'fs';
import * as YAML from 'yaml';
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

// ── Test A: the SHIPPED artifact (.well-known/a2a-agent-card.json) — conformance + parity ──
describe('A2A AgentCard artifact: A2A v1.0 conformance + parity', () => {
  const card = JSON.parse(fs.readFileSync('.well-known/a2a-agent-card.json', 'utf8'));
  const fafa = YAML.parse(fs.readFileSync('agent.fafa', 'utf8'));

  test('A2A v1.0 required top-level fields', () => {
    expect(card.protocolVersion).toBe('1.0');
    expect(typeof card.name).toBe('string');
    expect(card.url).toMatch(/^https:\/\//);
    expect(typeof card.capabilities.streaming).toBe('boolean');
    expect(typeof card.capabilities.pushNotifications).toBe('boolean');
    expect(typeof card.capabilities.extendedAgentCard).toBe('boolean');
  });

  test('every skill has required id + name; ids unique', () => {
    expect(Array.isArray(card.skills)).toBe(true);
    expect(card.skills.length).toBeGreaterThan(0);
    for (const s of card.skills) {
      expect(typeof s.id).toBe('string');
      expect(typeof s.name).toBe('string');
    }
    const ids = card.skills.map((s: any) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('PARITY: card skills === agent.fafa capabilities (no drift from its source)', () => {
    const cardIds = card.skills.map((s: any) => s.id).sort();
    const fafaIds = fafa.capabilities.map((c: any) => c.name).sort();
    expect(cardIds).toEqual(fafaIds);
  });

  test('FAF context extension is one.faf/context — NEVER io.faf', () => {
    const ext = (card.extensions || []).find((e: any) => /one\.faf\/context/.test(e.uri));
    expect(ext).toBeDefined();
    expect(JSON.stringify(card)).not.toContain('io.faf');
    expect(ext.params.faf).toBeTruthy();
    expect(ext.params.mediaType).toBe('application/vnd.faf+yaml');
  });

  test('provider + IO modes present; round-trips through JSON unchanged', () => {
    expect(card.provider.organization).toBeTruthy();
    expect(card.defaultInputModes).toContain('application/json');
    expect(JSON.parse(JSON.stringify(card))).toEqual(card);
  });
});
