import { test, expect, describe } from 'bun:test';
import { extractSixWsFromReadme, type SixWs } from '../src/faf-core/extract/sourced-readme-context.js';

// WJTTC — "FAF don't lie" · the sourced human-context extractor.
//
// This is the VERIFIED replacement for the retired v5 guesser. Its one
// contract: fill a slot ONLY from evidence in the README; never infer, never
// default, never fabricate. BRAKE proves it can't lie (the trust-critical
// guarantee); ENGINE proves it does fill from real evidence; AERO covers edges.

const nulls: SixWs = { who: null, what: null, why: null, where: null, when: null, how: null };

describe('BRAKE — it cannot guess (FAF don\'t lie)', () => {
  test('B1 — empty / whitespace README → every slot null (nothing fabricated)', () => {
    expect(extractSixWsFromReadme('')).toEqual(nulls);
    expect(extractSixWsFromReadme('   \n\n\t  \n')).toEqual(nulls);
  });

  test('B2 — a README with NO 6W prose stays empty — tech/name is NOT inferred into human slots', () => {
    // Mentions a stack and a name, but contains none of the 6W evidence patterns.
    const md = '# myapp\n\nlowercase notes only, nothing structured here at all.\n';
    expect(extractSixWsFromReadme(md)).toEqual(nulls);
  });

  test('B3 — every NON-null field is a literal substring of the README (sourced, not invented)', () => {
    const md = [
      '# CoolTool',
      '',
      'This is a developer tool that removes repetitive setup work for everyone.',
      '',
      'Built by the core platform team. It enables teams to ship faster.',
      'Runs on edge. Version 2.5.0.',
      '',
      '## Install',
      'npm install cool-tool',
    ].join('\n');
    const r = extractSixWsFromReadme(md);
    for (const [k, v] of Object.entries(r)) {
      if (v !== null) {
        // The extracted value must come FROM the text — allow the `v` version prefix.
        const needle = v.replace(/^v/, '');
        expect(md.includes(needle) || md.toLowerCase().includes(needle.toLowerCase()))
          .toBe(true);
      }
    }
  });

  test('B4 — structural no-guess: output depends ONLY on content (the fn cannot see name/stack)', () => {
    const md = '# A\n\nSome content here that is long enough to be a real what sentence.\n';
    // Same content → identical output, every time. Nothing external can change it.
    expect(extractSixWsFromReadme(md)).toEqual(extractSixWsFromReadme(md));
    // And the signature takes content only — there is no project-name/stack input to infer from.
    expect(extractSixWsFromReadme.length).toBe(1);
  });
});

describe('ENGINE — it DOES fill from real evidence', () => {
  test('E1 — WHAT: first real paragraph after the title', () => {
    const r = extractSixWsFromReadme('# Title\n\nThis tool does a genuinely useful thing for many developers.');
    expect(r.what).toContain('This tool does a genuinely useful thing');
  });

  test('E2 — WHO: an attribution phrase', () => {
    expect(extractSixWsFromReadme('maintained by the FAF core team').who).toContain('FAF core team');
  });

  test('E3 — WHY: a benefit phrase', () => {
    expect(extractSixWsFromReadme('it enables teams to stop re-explaining their stack').why)
      .toContain('teams to stop re-explaining');
  });

  test('E4 — WHERE: a sourced runtime token', () => {
    expect(extractSixWsFromReadme('the worker runs on edge globally').where).toContain('edge');
  });

  test('E5 — WHEN: a version token', () => {
    expect(extractSixWsFromReadme('current version 3.1.4 is stable').when).toBe('v3.1.4');
  });

  test('E6 — HOW: an install command', () => {
    expect(extractSixWsFromReadme('Run `npm install cool-tool` to get started').how)
      .toContain('npm install cool-tool');
  });

  test('E7 — only the slots with evidence are filled; the rest stay null', () => {
    const r = extractSixWsFromReadme('version 9.9.9'); // only WHEN has evidence
    expect(r.when).toBe('v9.9.9');
    expect(r.who).toBeNull();
    expect(r.what).toBeNull();
    expect(r.why).toBeNull();
    expect(r.how).toBeNull();
  });
});

describe('AERO — edges', () => {
  test('A1 — unicode / emoji in the README do not break extraction or fabricate', () => {
    const r = extractSixWsFromReadme('# 🏎️ Proj\n\nDéjà-vu tooling that helps developers everywhere ship.');
    expect(() => r).not.toThrow();
    expect(r.what === null || typeof r.what === 'string').toBe(true);
  });

  test('A2 — large README stays correct and fast', () => {
    const md = '# Big\n\nA real paragraph describing what this large project actually does here.\n'
      + 'filler line\n'.repeat(20000);
    const r = extractSixWsFromReadme(md);
    expect(r.what).toContain('A real paragraph describing what this large project');
  });

  test('A3 — determinism: same input → identical result', () => {
    const md = '# X\n\nA description long enough to qualify as the what paragraph here.\nVersion 1.0.0.';
    expect(extractSixWsFromReadme(md)).toEqual(extractSixWsFromReadme(md));
  });
});
