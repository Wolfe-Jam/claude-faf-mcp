import { test, expect, describe } from 'bun:test';
import { quietText, sanitizeToolResult, quietToolList, stripAnsi, QUIET_TROPHY } from '../src/utils/sanitize-output.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

// WJTTC — The Trust Edition · Pillar 1 (QUIET)
// "We break things so others never have to know they were broken."
//
// The wire-boundary sanitizer is load-bearing: every tool result passes through
// it. If it leaks emoji, the "quiet" promise is a lie; if it eats tier glyphs or
// real content, it corrupts output. BRAKE = the trust-critical guarantees,
// ENGINE = the documented behaviour, AERO = the edge cases that bite in the wild.

const ESC = String.fromCharCode(27);

describe('BRAKE — trust-critical quiet guarantees', () => {
  test('B1 — the rich trophy 🏆 maps to the quiet seal ✪ (never stripped to nothing)', () => {
    expect(quietText('🏆 Trophy')).toBe('✪ Trophy');
    expect(QUIET_TROPHY).toBe('✪');
    expect(quietText('Score: 🏆')).toContain('✪');
    expect(quietText('🏆')).toBe('✪');
  });

  test('B2 — geometric tier ladder survives intact (NOT emoji): ♡ ○ ● ◇ ◆ ★ ✪', () => {
    const ladder = '♡ ○ ● ◇ ◆ ★ ✪';
    expect(quietText(ladder)).toBe(ladder);
  });

  test('B3 — all common output emoji are stripped (no leakage)', () => {
    for (const e of ['✅', '⚡', '⚠️', '✨', '❌', '🏎️', '🧡', '🐘', '🤖', '🚀', '🍊', '⭐', '📊', '🔥', '🎉', '✔️']) {
      const out = quietText(`prefix ${e} suffix`);
      expect(out).not.toContain(e);
    }
  });

  test('B4 — emoji + adjacent space collapses cleanly ("✅ Done" → "Done", no orphan space)', () => {
    expect(quietText('✅ Done')).toBe('Done');
    expect(quietText('🏎️ Fast')).toBe('Fast');
    expect(quietText('Score: 🏆 100%')).toBe('Score: ✪ 100%'); // seal keeps its space
  });

  test('B5 — no orphaned joiners/variation-selectors left behind', () => {
    const zwj = '\u{1F468}‍\u{1F4BB}'; // 👨‍💻
    const vs16 = '✔️';            // ✔️
    const keycap = '1️⃣';         // 1️⃣ (digit stays, decorations go)
    expect(quietText(zwj)).toBe('');
    expect(quietText(`code ${zwj} here`)).toBe('code here');
    expect(quietText(vs16)).toBe('');
    expect(quietText(keycap)).toBe('1');
    // No invisible survivors anywhere:
    expect(quietText(`${zwj}${vs16}${keycap}`)).not.toMatch(/[️‍⃣]/u);
  });

  test('B6 — ANSI is still stripped first (regression guard on the existing contract)', () => {
    expect(stripAnsi(`${ESC}[36mcyan${ESC}[0m`)).toBe('cyan');
    expect(quietText(stripAnsi(`${ESC}[32m✅ ok${ESC}[0m`))).toBe('ok');
  });

  test('B7 — sanitizeToolResult cleans every text block, leaves structuredContent UNTOUCHED', () => {
    const result: CallToolResult = {
      content: [
        { type: 'text', text: '🏆 Score: 100% ✅' },
        { type: 'text', text: 'Tier: ★ GOLD 🧡' },
      ],
      structuredContent: { score: 100, tier: '🏆 TROPHY' } as Record<string, unknown>,
    };
    const out = sanitizeToolResult(result);
    expect((out.content[0] as { text: string }).text).toBe('✪ Score: 100%');
    expect((out.content[1] as { text: string }).text).toBe('Tier: ★ GOLD');
    // structuredContent is machine data — the sanitizer must not rewrite it:
    expect((out.structuredContent as { tier: string }).tier).toBe('🏆 TROPHY');
  });
});

describe('ENGINE — documented behaviour', () => {
  test('E1 — plain text is unchanged (no false positives)', () => {
    const plain = 'faf_score: 100/100 — all 33 slots populated. Build: tsc. CI: green.';
    expect(quietText(plain)).toBe(plain);
  });

  test('E2 — box-drawing and geometric shapes (tables) survive', () => {
    const table = '┌──────┬──────┐\n│ ● ok │ ◆ hi │\n└──────┴──────┘';
    expect(quietText(table)).toBe(table);
  });

  test('E3 — arrows and punctuation are content, not emoji — kept', () => {
    expect(quietText('Init → Auto → Go')).toBe('Init → Auto → Go');
    expect(quietText('a < b > c | d')).toBe('a < b > c | d');
  });

  test('E4 — multiple emoji on one line all go; surrounding text intact', () => {
    expect(quietText('🚀 Ship 🔥 it 🎉 now')).toBe('Ship it now');
  });

  test('E5 — sanitizeToolResult is a no-op on malformed/empty results (never throws)', () => {
    expect(() => sanitizeToolResult({} as CallToolResult)).not.toThrow();
    expect(() => sanitizeToolResult({ content: null } as unknown as CallToolResult)).not.toThrow();
    const noText: CallToolResult = { content: [{ type: 'image', data: 'x', mimeType: 'image/png' }] };
    expect(sanitizeToolResult(noText)).toEqual(noText);
  });

  test('E6 — quietToolList quiets descriptions/titles, leaves names + schemas intact', () => {
    const list = {
      tools: [
        { name: 'faf_score', description: '🏆 AI-readiness score ✅', inputSchema: { type: 'object' } },
        { name: 'faf_etch', description: '🐘 remember a fact', title: '⚡ Etch' },
      ],
    };
    const out = quietToolList(list);
    expect(out.tools[0].description).toBe('✪ AI-readiness score');
    expect(out.tools[0].name).toBe('faf_score');            // name untouched
    expect(out.tools[0].inputSchema).toEqual({ type: 'object' }); // schema untouched
    expect(out.tools[1].description).toBe('remember a fact');
    expect(out.tools[1].title).toBe('Etch');
  });

  test('E7 — quietToolList is a no-op on malformed input (never throws)', () => {
    expect(() => quietToolList({} as { tools?: unknown[] })).not.toThrow();
    expect(() => quietToolList({ tools: undefined } as { tools?: unknown[] })).not.toThrow();
  });
});

describe('AERO — edge cases that bite in the wild', () => {
  test('A1 — trailing line whitespace orphaned by a removed emoji is trimmed', () => {
    expect(quietText('Done ✅')).toBe('Done');
    expect(quietText('line one ✅  \nline two')).toBe('line one\nline two');
  });

  test('A2 — emoji embedded mid-word boundary', () => {
    expect(quietText('v5.8.0🏆release')).toBe('v5.8.0✪release');
  });

  test('A3 — skin-tone modifiers and regional indicators fully removed', () => {
    expect(quietText('wave \u{1F44B}\u{1F3FF}')).toBe('wave');     // 👋🏿
    expect(quietText('\u{1F1FA}\u{1F1F8} flag')).toBe('flag');      // 🇺🇸
  });

  test('A4 — large input with dense emoji stays correct and fast', () => {
    const line = '🏆 row ✅ data ★ kept ⚡ go\n';
    const big = line.repeat(5000);
    const out = quietText(big);
    expect(out).not.toMatch(/[\u{1F000}-\u{1FAFF}]/u);
    expect(out).toContain('★'); // tier glyph survives at scale
    expect(out).toContain('✪'); // seal survives at scale
    expect(out.split('\n').length).toBe(big.split('\n').length); // line structure intact
  });

  test('A5 — determinism: quieting is idempotent', () => {
    const once = quietText('🏆 ★ ✅ done 🧡');
    expect(quietText(once)).toBe(once);
  });

  test('A6 — the ✪ seal renders as exactly one code point (stable across surfaces)', () => {
    expect([...QUIET_TROPHY].length).toBe(1);
    expect(QUIET_TROPHY.codePointAt(0)).toBe(0x272a);
  });
});
