import { describe, test, expect } from 'bun:test';
import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// WJTTC — the server.json emitter (scripts/gen-server-card.js).
//
// server.json's identity half (name + the one.faf/context _meta block) MUST be
// composed from faf-cli, never hand-authored (compose-not-fork directive). This
// suite proves the generator emits those from faf-cli and reproduces the live
// server.json idempotently — so a release can regenerate it without drift.

const ROOT = path.join(__dirname, '..');
const KEY = 'io.modelcontextprotocol.registry/publisher-provided';

function emit(args: string[] = []): Record<string, any> {
  const out = execFileSync('node', [path.join(ROOT, 'scripts', 'gen-server-card.js'), '--check', ...args], { encoding: 'utf-8' });
  return JSON.parse(out);
}
const live = (): Record<string, any> => JSON.parse(fs.readFileSync(path.join(ROOT, 'server.json'), 'utf-8'));

describe('BRAKE — identity is emitted + idempotent', () => {
  test('B1 — emitted server.json reproduces the live file EXACTLY (no drift)', () => {
    expect(emit()).toEqual(live());
  });

  test('B2 — name is the emitted one.faf/* identity (never io.faf, never hand-typed)', () => {
    const s = emit();
    expect(s.name).toBe('one.faf/claude-faf-mcp');
    expect(s.name.startsWith('one.faf/')).toBe(true);
    expect(s.name).not.toContain('io.faf');
  });

  test('B3 — the one.faf/context _meta block is emitted, well-formed', () => {
    const ctx = emit()._meta[KEY]['one.faf/context'];
    expect(ctx.faf).toBe('./project.faf');
    expect(ctx.mediaType).toBe('application/vnd.faf+yaml');
    expect(ctx.iana).toContain('iana.org');
    expect(ctx.deterministic).toBe(true);
    expect(typeof ctx.generated).toBe('string');
  });

  test('B4 — version syncs from package.json', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
    const s = emit();
    expect(s.version).toBe(pkg.version);
    expect(s.packages.find((p: any) => p.registryType === 'npm').version).toBe(pkg.version);
  });
});

describe('ENGINE — release inputs', () => {
  test('E1 — --sha sets the mcpb fileSha256 (the mcpb-sha gate supplies it)', () => {
    const sha = 'a'.repeat(64);
    const mcpb = emit(['--sha', sha]).packages.find((p: any) => p.registryType === 'mcpb');
    expect(mcpb.fileSha256).toBe(sha);
  });

  test('E2 — --generated overrides the context timestamp', () => {
    const s = emit(['--generated', '2099-01-01T00:00:00.000Z']);
    expect(s._meta[KEY]['one.faf/context'].generated).toBe('2099-01-01T00:00:00.000Z');
  });
});
