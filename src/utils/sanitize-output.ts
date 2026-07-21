import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Strip ANSI escape sequences (SGR colour codes, cursor moves, etc.) from text.
 *
 * Terminal colour codes are meaningless over MCP — Claude Desktop and other
 * GUI clients render them as raw escape bytes (e.g. `[36m`), which looks
 * like garbage. Tool output must be clean text. This is the single place we
 * guarantee that, applied to every tool result before it leaves the server.
 */
const ESC = String.fromCharCode(27); // 0x1B, the ANSI escape lead byte
const ANSI_PATTERN = new RegExp(ESC + '\\[[0-9;?]*[ -/]*[@-~]', 'g');

export function stripAnsi(text: string): string {
  // 1) Remove well-formed CSI sequences (ESC[...final), e.g. colour codes.
  // 2) Remove any remaining lone ESC bytes — some subprocess output (e.g. the
  //    faf CLI's colourised stdout) emits bare 0x1B that isn't a valid CSI.
  //    A raw ESC is never legitimate content over MCP, so strip it outright.
  return text.replace(ANSI_PATTERN, '').split(ESC).join('');
}

// ── Quiet mode (The Trust Edition) ───────────────────────────────────────────
//
// Tool RESULT text is parsed by agents and read by humans; emoji are noise to
// both. We strip emoji at the wire boundary so every tool is quiet by default —
// one place, no per-tool opt-in, no toggle (a flag that changes output shape is
// a footgun for anything parsing it). Brand voice lives in MARKETING surfaces,
// never in tool results.
//
// TWO marks, by surface:
//   🏆  — rich/marketing trophy (web badges, README, blog). NEVER in tool output.
//   ✪  (U+272A) — the quiet trust SEAL. Renders identically everywhere (unlike
//       emoji, which shapeshift per platform), so it can anchor falsifiable
//       receipts (TAF / WJTTC / CI logs). The 🏆 in tool output becomes ✪.
//
// PRESERVED (these are geometric Unicode, NOT emoji — the quiet tier ladder):
//   ♡ U+2661 · ○ U+25CB · ● U+25CF · ◇ U+25C7 · ◆ U+25C6 · ★ U+2605 · ✪ U+272A

const RICH_TROPHY = '\u{1F3C6}'; // 🏆
export const QUIET_TROPHY = '✪'; // ✪ — the quiet trust seal

// Emoji code points to strip. Built from two zones, with HOLES punched out for
// the tier seals we keep (★ 2605, ☆ 2606, ♡ 2661, ✪ 272A):
//   • Supplementary plane  U+1F000–U+1FAFF  (🏎 🧡 🐘 🤖 🚀 … — no tier glyph here)
//   • BMP symbols/dingbats U+2600–U+27BF     (✅ ⚡ ⚠ ✨ ❌ … — minus the four seals)
//     split into 2600-2604, 2607-2660, 2662-2729, 272B-27BF to skip 2605/2606/2661/272A.
// Trailing joiners/selectors (VS16 FE0F, ZWJ 200D, keycap 20E3) and skin-tone
// modifiers, plus an optional adjacent space, are consumed too — so "✅ Done"
// becomes "Done" rather than " Done".
const EMOJI_BASE =
  '[\\u{1F000}-\\u{1FAFF}]' +                                       // supplementary plane
  '|[\\u2600-\\u2604\\u2607-\\u2660\\u2662-\\u2729\\u272B-\\u27BF]' + // misc symbols + dingbats (seals held out)
  '|[\\u2B00-\\u2BFF]';                                             // ⭐ ⭕ ⬛ ⬜ ⬆-⬇ etc (no tier glyph here)
// VS16 / ZWJ / keycap / skin-tone — alternation (not a misleading character class)
const JOINERS =
  '(?:\\uFE0F|\\u200D|\\u20E3|\\u{1F3FB}|\\u{1F3FC}|\\u{1F3FD}|\\u{1F3FE}|\\u{1F3FF})';
const EMOJI_PATTERN = new RegExp(`(?:${EMOJI_BASE})${JOINERS}*[ \\t]?`, 'gu');

// Any joiners/selectors left orphaned after their base emoji was removed.
const ORPHAN_JOINERS = new RegExp(JOINERS, 'gu');

/**
 * Quiet a string: map the rich trophy to the trust seal, then strip all other
 * emoji while preserving the geometric tier ladder (♡ ○ ● ◇ ◆ ★ ✪).
 */
export function quietText(text: string): string {
  return text
    .split(RICH_TROPHY).join(QUIET_TROPHY) // 🏆 → ✪ before the strip removes it
    .replace(EMOJI_PATTERN, '')
    .replace(ORPHAN_JOINERS, '')
    .replace(/[ \t]+$/gm, ''); // trim whitespace orphaned at line ends
}

/**
 * Quiet the descriptions (and titles) of a tools/list response in place, so the
 * tool catalogue reads as plainly as the tool output. Names and schemas are
 * left exactly as-is — only human-facing prose is quieted.
 */
export function quietToolList<T extends { tools?: unknown[] }>(list: T): T {
  if (!list || !Array.isArray(list.tools)) return list;
  for (const tool of list.tools as Array<Record<string, unknown>>) {
    if (typeof tool.description === 'string') tool.description = quietText(tool.description);
    if (typeof tool.title === 'string') tool.title = quietText(tool.title);
  }
  return list;
}

/**
 * Sanitise a CallToolResult in place: strip ANSI, then quiet emoji, on every
 * text content block. Returns the same object for convenient inline use at the
 * return boundary. structuredContent (machine data) is intentionally untouched.
 */
export function sanitizeToolResult(result: CallToolResult): CallToolResult {
  if (!result || !Array.isArray(result.content)) return result;
  for (const item of result.content) {
    if (item && (item as { type?: string }).type === 'text'
        && typeof (item as { text?: unknown }).text === 'string') {
      const cleaned = quietText(stripAnsi((item as { text: string }).text));
      (item as { text: string }).text = cleaned;
    }
  }
  return result;
}
