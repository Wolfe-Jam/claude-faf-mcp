/**
 * WJTTC — faf-cli Language Edition rail composed into CFM tools.
 *
 * Doctrine: Editions (Go · C# · JVM · Ruby · Swift · Dart) live in faf-cli.
 * CFM inherits them by bumping `faf-cli` and composing Turbo-Cat — no forked
 * detectors. These tests prove the **MCP tool path** (faf_auto / faf_formats)
 * surfaces Edition signals, not only the low-level composedTurboCatSlots helper.
 *
 * Floor: faf-cli >= 7.7.0 (see docs/compose-faf-cli.md).
 *
 * Isolation: every case uses a tmp sandbox + path: dir. Repo-root project.faf
 * must never change (sticky-cwd trap).
 */
import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { FafToolHandler } from '../src/handlers/tools.js';
import { FafEngineAdapter } from '../src/handlers/engine-adapter.js';

process.env.FAF_TOOLS = 'all';

const repoRoot = path.resolve(import.meta.dir, '..');
const repoFaf = path.join(repoRoot, 'project.faf');
let repoFafBefore = '';

beforeAll(() => {
  if (fs.existsSync(repoFaf)) {
    repoFafBefore = fs.readFileSync(repoFaf, 'utf-8');
  }
});

afterAll(() => {
  if (repoFafBefore && fs.existsSync(repoFaf)) {
    const after = fs.readFileSync(repoFaf, 'utf-8');
    if (after !== repoFafBefore) {
      fs.writeFileSync(repoFaf, repoFafBefore, 'utf-8');
      throw new Error(
        'ISOLATION BREACH: edition-compose tests mutated repo-root project.faf — restored',
      );
    }
  }
});

type Case = {
  name: string;
  files: Record<string, string>;
  /** Signals that must appear in auto + formats + optional written project.faf */
  expect: RegExp[];
  /** Kill-line: must NOT appear (e.g. Spring on bare pom) */
  forbid?: RegExp[];
};

const CASES: Case[] = [
  {
    name: 'go-gin',
    files: {
      'go.mod':
        'module example.com/x\n\ngo 1.22\n\nrequire github.com/gin-gonic/gin v1.9.0\n',
      'main.go': 'package main\nfunc main() {}\n',
    },
    expect: [/go/i, /gin/i],
  },
  {
    name: 'ruby-rails',
    files: {
      Gemfile: 'source "https://rubygems.org"\ngem "rails", "~> 7.1"\n',
      'config/application.rb':
        'module App\n  class Application < Rails::Application\n  end\nend\n',
    },
    expect: [/ruby|rails/i],
  },
  {
    name: 'swift-lib',
    files: {
      'Package.swift':
        '// swift-tools-version: 5.9\nimport PackageDescription\nlet package = Package(name: "Lib", products: [.library(name: "Lib", targets: ["Lib"])], targets: [.target(name: "Lib")])\n',
    },
    expect: [/swift/i],
  },
  {
    name: 'csharp-web',
    files: {
      'App.csproj':
        '<Project Sdk="Microsoft.NET.Sdk.Web">\n  <PropertyGroup><TargetFramework>net8.0</TargetFramework></PropertyGroup>\n</Project>\n',
    },
    expect: [/c#|csharp|\.net|asp/i],
  },
  {
    name: 'jvm-bare-pom',
    files: {
      'pom.xml':
        '<?xml version="1.0"?><project><modelVersion>4.0.0</modelVersion><groupId>x</groupId><artifactId>lib</artifactId><version>1</version></project>\n',
    },
    // Kill line: pom alone ≠ Spring on tech_stack
    expect: [/java|jvm/i],
    forbid: [/spring/i],
  },
];

function toolText(result: { content?: unknown[]; isError?: boolean }): string {
  const block = result.content?.[0] as { type?: string; text?: string } | undefined;
  return block?.text ?? '';
}

function makeHandler(dir: string): FafToolHandler {
  const engine = new FafEngineAdapter('native');
  engine.setWorkingDirectory(dir);
  return new FafToolHandler(engine);
}

describe('AERO — Language Edition rail via CFM tools (faf-cli compose floor 7.7)', () => {
  for (const c of CASES) {
    test(`E2E ${c.name}: faf_auto + faf_formats surface Edition signals`, async () => {
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), `cfm-edition-${c.name}-`));
      try {
        for (const [rel, body] of Object.entries(c.files)) {
          const p = path.join(dir, rel);
          fs.mkdirSync(path.dirname(p), { recursive: true });
          fs.writeFileSync(p, body);
        }

        const h = makeHandler(dir);
        const auto = await h.callTool('faf_auto', { path: dir });
        const formats = await h.callTool('faf_formats', { path: dir });

        expect(auto.isError).not.toBe(true);
        expect(formats.isError).not.toBe(true);

        let faf = '';
        const fafPath = path.join(dir, 'project.faf');
        if (fs.existsSync(fafPath)) {
          faf = fs.readFileSync(fafPath, 'utf-8');
        }

        const blob = `${toolText(auto)}\n${toolText(formats)}\n${faf}`;

        for (const re of c.expect) {
          expect(blob).toMatch(re);
        }
        for (const re of c.forbid ?? []) {
          expect(blob).not.toMatch(re);
        }

        // Isolation: repo DNA untouched
        if (repoFafBefore) {
          expect(fs.readFileSync(repoFaf, 'utf-8')).toBe(repoFafBefore);
        }
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    });
  }
});
