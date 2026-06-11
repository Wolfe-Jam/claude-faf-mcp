/**
 * Security regression — arbitrary local-file read/write via unconfined `path`.
 *
 * Mirrors the disclosure reproduced against the grok-faf-mcp sibling (Zhihao
 * Zhang, WPI): caller `path` arguments flowed through path.resolve() into
 * fs read/write with no confinement (here via the shared getProjectPath()
 * chokepoint + the faf_read/faf_write file tools). CWE-22 / CWE-73 / CWE-200.
 *
 * Boundary under test (utils/safe-path.ts): the `.faf` tools only ever read
 * `.faf`/`.fafm` context files; the general file tools are confined to the
 * project root(s). `..`/absolute escapes to secrets are refused.
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FafToolHandler } from '../src/handlers/tools';
import { FafEngineAdapter } from '../src/handlers/engine-adapter';
import { confinePath, PathConfinementError, isFafContextFile } from '../src/utils/safe-path';

describe('🔒 SECURITY — path confinement (arbitrary-file-read/write)', () => {
  let secretDir: string;
  let secretFile: string;
  let plantedFaf: string;

  beforeAll(() => {
    secretDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claudefaf-sec-'));
    secretFile = path.join(secretDir, 'fake_id_rsa');
    plantedFaf = path.join(secretDir, 'project.faf');
    fs.writeFileSync(secretFile, 'SECRET-DO-NOT-LEAK fake-private-key\n');
    fs.writeFileSync(plantedFaf, 'project:\n  name: planted\n');
  });

  afterAll(() => {
    try { fs.rmSync(secretDir, { recursive: true, force: true }); } catch { /* */ }
  });

  describe('confinePath() unit', () => {
    test('refuses /etc/passwd', () => {
      expect(() => confinePath('/etc/passwd')).toThrow(PathConfinementError);
    });
    test('refuses ../ traversal to a non-.faf file', () => {
      expect(() => confinePath('../../../../../../etc/passwd')).toThrow(PathConfinementError);
    });
    test('refuses a real existing secret file (any directory)', () => {
      expect(() => confinePath(secretFile)).toThrow(PathConfinementError);
    });
    test('refuses a *.faf symlink that targets a secret (symlink bypass)', () => {
      const link = path.join(secretDir, 'evil.faf');
      fs.symlinkSync(secretFile, link);
      try { expect(() => confinePath(link)).toThrow(PathConfinementError); }
      finally { fs.rmSync(link, { force: true }); }
    });
    test('allows a real .faf context file', () => {
      expect(confinePath(plantedFaf)).toBe(fs.realpathSync(plantedFaf));
    });
    test('isFafContextFile classifies correctly', () => {
      expect(isFafContextFile('/x/project.faf')).toBe(true);
      expect(isFafContextFile('/x/.faf')).toBe(true);
      expect(isFafContextFile('/etc/passwd')).toBe(false);
    });
  });

  describe('handler — PoC must NOT leak', () => {
    const handler = new FafToolHandler(new FafEngineAdapter('native'));
    const textOf = (res: any): string =>
      (res?.content ?? []).map((c: any) => c.text ?? '').join('\n');

    test('faf_score(path=<secret file>) does not read it as a .faf', async () => {
      const res: any = await handler.callTool('faf_score', { path: secretFile });
      expect(textOf(res)).not.toContain('SECRET-DO-NOT-LEAK');
    });

    test('faf_read(path=/etc/passwd) is refused (root-confined)', async () => {
      const res: any = await handler.callTool('faf_read', { path: '/etc/passwd' });
      expect(res.isError).toBeTruthy();
      expect(textOf(res)).not.toContain('root:');
    });

    test('faf_write outside the project root is refused', async () => {
      const target = path.join(os.homedir(), '.claudefaf_should_not_be_written');
      const res: any = await handler.callTool('faf_write', { path: target, content: 'pwned' });
      expect(res.isError).toBeTruthy();
      expect(fs.existsSync(target)).toBe(false);
    });
  });
});
