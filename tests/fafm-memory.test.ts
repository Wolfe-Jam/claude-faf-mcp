import { test, expect } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { Soul, canonicalPriority } from '../src/fafm/faf-memory';

test('canonicalPriority: legacy aliases + unknown default', () => {
  expect(canonicalPriority('low')).toBe('ephemeral');
  expect(canonicalPriority('medium')).toBe('standard');
  expect(canonicalPriority('critical')).toBe('critical');
  expect(canonicalPriority('bogus')).toBe('standard');
  expect(canonicalPriority(undefined)).toBe('standard');
});

test('etch + recall round-trip', () => {
  const s = new Soul('@test:demo');
  s.etch({ text: 'we use Vitest because Jest chokes on ESM', id: 'test-runner', type: 'project', priority: 'high', tags: ['decision'] });
  const hits = s.recall({ query: 'vitest' });
  expect(hits.length).toBe(1);
  expect(hits[0].text).toContain('Vitest');
  expect(hits[0].priority).toBe('high');
});

test('etch dedup by id updates in place (no duplicate)', () => {
  const s = new Soul('@test:demo');
  s.etch({ text: 'first', id: 'x' });
  s.etch({ text: 'second', id: 'x' });
  expect(s.facts.length).toBe(1);
  expect(s.getFact('x')!.text).toBe('second');
});

test('recall ranks priority desc, then recency, then insertion index', () => {
  const s = new Soul('@test:demo');
  s.etch({ text: 'a low', id: 'a', priority: 'ephemeral' });
  s.etch({ text: 'b crit', id: 'b', priority: 'critical' });
  s.etch({ text: 'c std', id: 'c', priority: 'standard' });
  s.etch({ text: 'd crit later', id: 'd', priority: 'critical' });
  const order = s.recall().map((f) => f.id);
  // two criticals first (newest-etched 'd' before 'b' on tie), then standard, then ephemeral
  expect(order[0]).toBe('d');
  expect(order[1]).toBe('b');
  expect(order[2]).toBe('c');
  expect(order[3]).toBe('a');
});

test('recall filters: tags, type, minPriority floor', () => {
  const s = new Soul('@test:demo');
  s.etch({ text: 'gotcha one', id: 'g', priority: 'high', tags: ['gotcha'], type: 'project' });
  s.etch({ text: 'note two', id: 'n', priority: 'ephemeral', tags: ['note'], type: 'reference' });
  expect(s.recall({ tags: ['gotcha'] }).map((f) => f.id)).toEqual(['g']);
  expect(s.recall({ type: 'reference' }).map((f) => f.id)).toEqual(['n']);
  expect(s.recall({ minPriority: 'standard' }).map((f) => f.id)).toEqual(['g']); // ephemeral filtered out
});

test('save / load round-trip preserves facts + v1.1 shape', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fafm-'));
  const p = path.join(dir, 'soul.fafm');
  const s = new Soul('@test:demo', { profile: 'knowledge' });
  s.etch({ text: 'remember this', id: 'r', priority: 'high', tags: ['decision'], links: ['[[other]]'] });
  s.save(p);
  const raw = fs.readFileSync(p, 'utf-8');
  expect(raw).toMatch(/version:\s*['"]?1\.1['"]?/);
  const loaded = Soul.load(p);
  expect(loaded.namepoint).toBe('@test:demo');
  expect(loaded.facts.length).toBe(1);
  expect(loaded.getFact('r')!.tags).toEqual(['decision']);
  expect(loaded.getFact('r')!.links).toEqual(['[[other]]']);
  fs.rmSync(dir, { recursive: true, force: true });
});

test('index returns lean one-liners', () => {
  const s = new Soul('@test:demo');
  s.etch({ text: 'one', id: 'a', priority: 'high' });
  s.etch({ text: 'two', id: 'b' });
  const idx = s.index();
  expect(idx.length).toBe(2);
  expect(idx[0]).toEqual({ id: 'a', text: 'one', priority: 'high' });
});
