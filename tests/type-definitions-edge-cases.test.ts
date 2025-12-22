/**
 * TYPE_DEFINITIONS Edge Case Tests
 *
 * Tests similar types, alias resolution, slot_ignore edge cases,
 * and potential failure modes for type-aware scoring.
 */

import { FafCompiler } from '../src/faf-core/compiler/faf-compiler';
import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'yaml';

const tmpDir = '/tmp/faf-edge-case-tests';

// Ensure temp directory exists
beforeAll(() => {
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }
});

// Cleanup after all tests
afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// Helper to create .faf file and compile it
async function compileTestFaf(name: string, content: object): Promise<{
  score: number;
  filled: number;
  total: number;
  slots: number;
}> {
  const filePath = path.join(tmpDir, `${name}.faf`);
  fs.writeFileSync(filePath, yaml.stringify(content));

  const compiler = new FafCompiler();
  const result = await compiler.compile(filePath);

  return {
    score: result.score,
    filled: result.filled,
    total: result.total,
    slots: result.ir?.slots?.length || 0
  };
}

describe('TYPE_DEFINITIONS Edge Cases', () => {

  describe('Similar Type Differentiation', () => {

    test('cli vs cli-tool alias should resolve to same slots', async () => {
      const cliResult = await compileTestFaf('cli-direct', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'cli' },
        human_context: { who: 'dev', what: 'cli', why: 'test', where: 'term', when: 'now', how: 'npm' }
      });

      const cliToolResult = await compileTestFaf('cli-tool-alias', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'cli-tool' },
        human_context: { who: 'dev', what: 'cli', why: 'test', where: 'term', when: 'now', how: 'npm' }
      });

      expect(cliResult.slots).toBe(9);  // CLI = 9 slots
      expect(cliToolResult.slots).toBe(9);  // cli-tool -> cli
      expect(cliResult.total).toBe(cliToolResult.total);
    });

    test('frontend vs react vs vue should all have 16 slots', async () => {
      const frontendResult = await compileTestFaf('frontend-generic', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'frontend' },
        stack: { frontend: 'React', css_framework: 'Tailwind', ui_library: 'Radix', state_management: 'Zustand', hosting: 'Vercel', build: 'Vite', cicd: 'GHA' },
        human_context: { who: 'dev', what: 'app', why: 'test', where: 'web', when: 'now', how: 'browser' }
      });

      const reactResult = await compileTestFaf('react-specific', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'react' },
        stack: { frontend: 'React', css_framework: 'Tailwind', ui_library: 'Radix', state_management: 'Zustand', hosting: 'Vercel', build: 'Vite', cicd: 'GHA' },
        human_context: { who: 'dev', what: 'app', why: 'test', where: 'web', when: 'now', how: 'browser' }
      });

      const vueResult = await compileTestFaf('vue-specific', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'vue' },
        stack: { frontend: 'Vue', css_framework: 'Tailwind', ui_library: 'Vuetify', state_management: 'Pinia', hosting: 'Vercel', build: 'Vite', cicd: 'GHA' },
        human_context: { who: 'dev', what: 'app', why: 'test', where: 'web', when: 'now', how: 'browser' }
      });

      expect(frontendResult.slots).toBe(16);
      expect(reactResult.slots).toBe(16);
      expect(vueResult.slots).toBe(16);
    });

    test('backend-api vs node-api vs python-api should all have 17 slots', async () => {
      const backendResult = await compileTestFaf('backend-generic', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'backend-api' },
        stack: { backend: 'Node', runtime: 'Node', api_type: 'REST', database: 'PG', connection: 'pg', hosting: 'AWS', build: 'tsc', cicd: 'GHA' },
        human_context: { who: 'dev', what: 'api', why: 'test', where: 'cloud', when: 'now', how: 'http' }
      });

      const nodeResult = await compileTestFaf('node-api-specific', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'node-api' },
        stack: { backend: 'Node', runtime: 'Node', api_type: 'REST', database: 'PG', connection: 'pg', hosting: 'AWS', build: 'tsc', cicd: 'GHA' },
        human_context: { who: 'dev', what: 'api', why: 'test', where: 'cloud', when: 'now', how: 'http' }
      });

      const pythonResult = await compileTestFaf('python-api-specific', {
        project: { name: 'test', goal: 'test', main_language: 'Python', type: 'python-api' },
        stack: { backend: 'FastAPI', runtime: 'Python', api_type: 'REST', database: 'PG', connection: 'psycopg2', hosting: 'AWS', build: 'pip', cicd: 'GHA' },
        human_context: { who: 'dev', what: 'api', why: 'test', where: 'cloud', when: 'now', how: 'http' }
      });

      expect(backendResult.slots).toBe(17);
      expect(nodeResult.slots).toBe(17);
      expect(pythonResult.slots).toBe(17);
    });

    test('mcp-server should have 14 slots (backend only, no universal)', async () => {
      const mcpResult = await compileTestFaf('mcp-server-test', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'mcp-server' },
        stack: { backend: 'Node', runtime: 'Node', api_type: 'MCP', database: 'None', connection: 'stdio' },
        human_context: { who: 'dev', what: 'mcp', why: 'test', where: 'claude', when: 'now', how: 'mcp' }
      });

      expect(mcpResult.slots).toBe(14);  // project(3) + backend(5) + human(6)
    });
  });

  describe('Alias Resolution', () => {

    test('k8s -> kubernetes', async () => {
      const k8sResult = await compileTestFaf('k8s-alias', {
        project: { name: 'test', goal: 'test', main_language: 'YAML', type: 'k8s' },
        human_context: { who: 'dev', what: 'infra', why: 'test', where: 'cloud', when: 'now', how: 'kubectl' }
      });

      expect(k8sResult.slots).toBe(9);  // kubernetes = 9 slots (project + human)
    });

    test('tf -> terraform', async () => {
      const tfResult = await compileTestFaf('tf-alias', {
        project: { name: 'test', goal: 'test', main_language: 'HCL', type: 'tf' },
        human_context: { who: 'dev', what: 'infra', why: 'test', where: 'aws', when: 'now', how: 'terraform' }
      });

      expect(tfResult.slots).toBe(9);  // terraform = 9 slots
    });

    test('rn -> react-native', async () => {
      const rnResult = await compileTestFaf('rn-alias', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'rn' },
        stack: { frontend: 'React Native', css_framework: 'None', ui_library: 'RN Paper', state_management: 'Redux' },
        human_context: { who: 'dev', what: 'app', why: 'test', where: 'mobile', when: 'now', how: 'expo' }
      });

      expect(rnResult.slots).toBe(13);  // react-native = 13 slots (project + frontend + human)
    });

    test('expo -> react-native', async () => {
      const expoResult = await compileTestFaf('expo-alias', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'expo' },
        stack: { frontend: 'Expo', css_framework: 'None', ui_library: 'RN Paper', state_management: 'Zustand' },
        human_context: { who: 'dev', what: 'app', why: 'test', where: 'mobile', when: 'now', how: 'expo' }
      });

      expect(expoResult.slots).toBe(13);  // expo -> react-native = 13 slots
    });

    test('flask -> python-api', async () => {
      const flaskResult = await compileTestFaf('flask-alias', {
        project: { name: 'test', goal: 'test', main_language: 'Python', type: 'flask' },
        stack: { backend: 'Flask', runtime: 'Python', api_type: 'REST', database: 'SQLite', connection: 'sqlite3', hosting: 'Heroku', build: 'pip', cicd: 'GHA' },
        human_context: { who: 'dev', what: 'api', why: 'test', where: 'cloud', when: 'now', how: 'http' }
      });

      expect(flaskResult.slots).toBe(17);  // flask -> python-api = 17 slots
    });

    test('fastapi -> python-api', async () => {
      const fastapiResult = await compileTestFaf('fastapi-alias', {
        project: { name: 'test', goal: 'test', main_language: 'Python', type: 'fastapi' },
        stack: { backend: 'FastAPI', runtime: 'Python', api_type: 'REST', database: 'PG', connection: 'psycopg2', hosting: 'AWS', build: 'pip', cicd: 'GHA' },
        human_context: { who: 'dev', what: 'api', why: 'test', where: 'cloud', when: 'now', how: 'http' }
      });

      expect(fastapiResult.slots).toBe(17);  // fastapi -> python-api = 17 slots
    });

    test('express -> node-api', async () => {
      const expressResult = await compileTestFaf('express-alias', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'express' },
        stack: { backend: 'Express', runtime: 'Node', api_type: 'REST', database: 'MongoDB', connection: 'mongoose', hosting: 'Heroku', build: 'tsc', cicd: 'GHA' },
        human_context: { who: 'dev', what: 'api', why: 'test', where: 'cloud', when: 'now', how: 'http' }
      });

      expect(expressResult.slots).toBe(17);  // express -> node-api = 17 slots
    });

    test('next -> nextjs', async () => {
      const nextResult = await compileTestFaf('next-alias', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'next' },
        stack: { frontend: 'React', css_framework: 'Tailwind', ui_library: 'Radix', state_management: 'Zustand', backend: 'Node', runtime: 'Node', api_type: 'REST', database: 'PG', connection: 'pg', hosting: 'Vercel', build: 'Next', cicd: 'GHA' },
        human_context: { who: 'dev', what: 'app', why: 'test', where: 'web', when: 'now', how: 'browser' }
      });

      expect(nextResult.slots).toBe(21);  // next -> nextjs = 21 slots (fullstack)
    });

    test('turbo -> turborepo', async () => {
      const turboResult = await compileTestFaf('turbo-alias', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'turbo' },
        stack: { frontend: 'React', css_framework: 'Tailwind', ui_library: 'Radix', state_management: 'Zustand', backend: 'Node', runtime: 'Node', api_type: 'REST', database: 'PG', connection: 'pg', hosting: 'Vercel', build: 'Turbo', cicd: 'GHA' },
        human_context: { who: 'dev', what: 'monorepo', why: 'test', where: 'cloud', when: 'now', how: 'npm' }
      });

      expect(turboResult.slots).toBe(21);  // turbo -> turborepo = 21 slots
    });

    test('gha -> github-action', async () => {
      const ghaResult = await compileTestFaf('gha-alias', {
        project: { name: 'test', goal: 'test', main_language: 'YAML', type: 'gha' },
        human_context: { who: 'dev', what: 'action', why: 'test', where: 'github', when: 'now', how: 'ci' }
      });

      expect(ghaResult.slots).toBe(9);  // gha -> github-action = 9 slots
    });
  });

  describe('slot_ignore Edge Cases', () => {

    test('slot_ignore as array', async () => {
      const result = await compileTestFaf('slot-ignore-array', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'cli' },
        slot_ignore: ['human.who', 'human.what'],
        human_context: { why: 'test', where: 'term', when: 'now', how: 'npm' }
      });

      expect(result.slots).toBe(7);  // 9 - 2 ignored
    });

    test('slot_ignore as comma-separated string', async () => {
      const result = await compileTestFaf('slot-ignore-string', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'cli' },
        slot_ignore: 'human.who, human.what',
        human_context: { why: 'test', where: 'term', when: 'now', how: 'npm' }
      });

      expect(result.slots).toBe(7);  // 9 - 2 ignored
    });

    test('slot_ignore with shorthand (who -> human.who)', async () => {
      const result = await compileTestFaf('slot-ignore-shorthand', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'cli' },
        slot_ignore: ['who', 'what'],  // Should expand to human.who, human.what
        human_context: { why: 'test', where: 'term', when: 'now', how: 'npm' }
      });

      expect(result.slots).toBe(7);  // 9 - 2 ignored
    });

    test('slot_ignore ignoring stack slots', async () => {
      const result = await compileTestFaf('slot-ignore-stack', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'backend-api' },
        slot_ignore: ['stack.database', 'stack.connection'],
        stack: { backend: 'Node', runtime: 'Node', api_type: 'REST', hosting: 'AWS', build: 'tsc', cicd: 'GHA' },
        human_context: { who: 'dev', what: 'api', why: 'test', where: 'cloud', when: 'now', how: 'http' }
      });

      expect(result.slots).toBe(15);  // 17 - 2 ignored
    });

    test('slot_ignore with empty array should not affect slots', async () => {
      const result = await compileTestFaf('slot-ignore-empty', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'cli' },
        slot_ignore: [],
        human_context: { who: 'dev', what: 'cli', why: 'test', where: 'term', when: 'now', how: 'npm' }
      });

      expect(result.slots).toBe(9);  // No slots ignored
    });

    test('slot_ignore with non-existent slot should be ignored', async () => {
      const result = await compileTestFaf('slot-ignore-nonexistent', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'cli' },
        slot_ignore: ['nonexistent.slot', 'human.who'],
        human_context: { what: 'cli', why: 'test', where: 'term', when: 'now', how: 'npm' }
      });

      expect(result.slots).toBe(8);  // 9 - 1 (only human.who is valid)
    });
  });

  describe('Fallback Behavior', () => {

    test('unknown type should fall back to generic (project + universal + human)', async () => {
      const result = await compileTestFaf('unknown-type', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'unknown-project-type' },
        stack: { hosting: 'AWS', build: 'tsc', cicd: 'GHA' },
        human_context: { who: 'dev', what: 'app', why: 'test', where: 'cloud', when: 'now', how: 'http' }
      });

      // Generic type = project(3) + universal(3) + human(6) = 12 slots
      expect(result.slots).toBe(12);
    });

    test('missing type should fall back to generic', async () => {
      const result = await compileTestFaf('missing-type', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript' },
        // No type specified
        stack: { hosting: 'AWS', build: 'tsc', cicd: 'GHA' },
        human_context: { who: 'dev', what: 'app', why: 'test', where: 'cloud', when: 'now', how: 'http' }
      });

      // Should detect or fall back to generic
      expect(result.slots).toBeGreaterThanOrEqual(9);  // At least project + human
    });

    test('null type should fall back to generic', async () => {
      const result = await compileTestFaf('null-type', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: null },
        stack: { hosting: 'AWS', build: 'tsc', cicd: 'GHA' },
        human_context: { who: 'dev', what: 'app', why: 'test', where: 'cloud', when: 'now', how: 'http' }
      });

      expect(result.slots).toBeGreaterThanOrEqual(9);
    });
  });

  describe('Monorepo and Container Types', () => {

    test('monorepo should have all 21 slots', async () => {
      const result = await compileTestFaf('monorepo-full', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'monorepo' },
        stack: { frontend: 'React', css_framework: 'Tailwind', ui_library: 'Radix', state_management: 'Zustand', backend: 'Node', runtime: 'Node', api_type: 'REST', database: 'PG', connection: 'pg', hosting: 'Vercel', build: 'Turbo', cicd: 'GHA' },
        human_context: { who: 'team', what: 'mono', why: 'test', where: 'cloud', when: 'now', how: 'npm' }
      });

      expect(result.slots).toBe(21);
    });

    test('nx -> monorepo equivalent (21 slots)', async () => {
      const result = await compileTestFaf('nx-monorepo', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'nx' },
        stack: { frontend: 'React', css_framework: 'Tailwind', ui_library: 'Radix', state_management: 'Zustand', backend: 'Node', runtime: 'Node', api_type: 'REST', database: 'PG', connection: 'pg', hosting: 'Vercel', build: 'Nx', cicd: 'GHA' },
        human_context: { who: 'team', what: 'mono', why: 'test', where: 'cloud', when: 'now', how: 'npm' }
      });

      expect(result.slots).toBe(21);
    });

    test('lerna should have 21 slots', async () => {
      const result = await compileTestFaf('lerna-monorepo', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'lerna' },
        stack: { frontend: 'React', css_framework: 'Tailwind', ui_library: 'Radix', state_management: 'Zustand', backend: 'Node', runtime: 'Node', api_type: 'REST', database: 'PG', connection: 'pg', hosting: 'Vercel', build: 'Lerna', cicd: 'GHA' },
        human_context: { who: 'team', what: 'mono', why: 'test', where: 'cloud', when: 'now', how: 'npm' }
      });

      expect(result.slots).toBe(21);
    });
  });

  describe('Score Calculations', () => {

    test('100% score when all slots filled', async () => {
      const result = await compileTestFaf('full-score', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'cli' },
        human_context: { who: 'dev', what: 'cli', why: 'test', where: 'term', when: 'now', how: 'npm' }
      });

      expect(result.score).toBe(100);
      expect(result.filled).toBe(result.total);
    });

    test('partial score when some slots missing', async () => {
      const result = await compileTestFaf('partial-score', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'cli' },
        human_context: { who: 'dev', what: 'cli', why: 'test' }  // Missing where, when, how
      });

      expect(result.score).toBeLessThan(100);
      expect(result.filled).toBeLessThan(result.total);
    });

    test('score denominator matches type slots', async () => {
      const cliResult = await compileTestFaf('cli-denominator', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'cli' },
        human_context: { who: 'dev', what: 'cli', why: 'test', where: 'term', when: 'now', how: 'npm' }
      });

      const fullstackResult = await compileTestFaf('fullstack-denominator', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'fullstack' },
        stack: { frontend: 'React', css_framework: 'Tailwind', ui_library: 'Radix', state_management: 'Zustand', backend: 'Node', runtime: 'Node', api_type: 'REST', database: 'PG', connection: 'pg', hosting: 'Vercel', build: 'Vite', cicd: 'GHA' },
        human_context: { who: 'dev', what: 'app', why: 'test', where: 'web', when: 'now', how: 'browser' }
      });

      expect(cliResult.total).toBe(9);
      expect(fullstackResult.total).toBe(21);
    });
  });

  describe('Special Type Cases', () => {

    test('chrome-extension should have 9 slots', async () => {
      const result = await compileTestFaf('chrome-ext', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'chrome-extension' },
        human_context: { who: 'dev', what: 'ext', why: 'test', where: 'chrome', when: 'now', how: 'webext' }
      });

      expect(result.slots).toBe(9);
    });

    test('smart-contract should have 9 slots', async () => {
      const result = await compileTestFaf('smart-contract', {
        project: { name: 'test', goal: 'test', main_language: 'Solidity', type: 'smart-contract' },
        human_context: { who: 'dev', what: 'contract', why: 'test', where: 'eth', when: 'now', how: 'hardhat' }
      });

      expect(result.slots).toBe(9);
    });

    test('jupyter should have 9 slots', async () => {
      const result = await compileTestFaf('jupyter', {
        project: { name: 'test', goal: 'test', main_language: 'Python', type: 'jupyter' },
        human_context: { who: 'scientist', what: 'notebook', why: 'research', where: 'local', when: 'now', how: 'jupyter' }
      });

      expect(result.slots).toBe(9);
    });

    test('data-science should have 14 slots (backend)', async () => {
      const result = await compileTestFaf('data-science', {
        project: { name: 'test', goal: 'test', main_language: 'Python', type: 'data-science' },
        stack: { backend: 'Python', runtime: 'Python', api_type: 'None', database: 'PostgreSQL', connection: 'psycopg2' },
        human_context: { who: 'scientist', what: 'analysis', why: 'insights', where: 'cloud', when: 'now', how: 'pandas' }
      });

      expect(result.slots).toBe(14);  // project + backend + human
    });

    test('ml-model should have 14 slots (backend)', async () => {
      const result = await compileTestFaf('ml-model', {
        project: { name: 'test', goal: 'test', main_language: 'Python', type: 'ml-model' },
        stack: { backend: 'PyTorch', runtime: 'Python', api_type: 'None', database: 'None', connection: 'None' },
        human_context: { who: 'ml-eng', what: 'model', why: 'prediction', where: 'cloud', when: 'now', how: 'pytorch' }
      });

      expect(result.slots).toBe(14);
    });

    test('dapp should have 13 slots (frontend)', async () => {
      const result = await compileTestFaf('dapp', {
        project: { name: 'test', goal: 'test', main_language: 'TypeScript', type: 'dapp' },
        stack: { frontend: 'React', css_framework: 'Tailwind', ui_library: 'Chakra', state_management: 'Zustand' },
        human_context: { who: 'dev', what: 'dapp', why: 'web3', where: 'eth', when: 'now', how: 'metamask' }
      });

      expect(result.slots).toBe(13);  // project + frontend + human
    });
  });
});
