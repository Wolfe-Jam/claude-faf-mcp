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

/**
 * Sanitise a CallToolResult in place: strip ANSI from every text content block.
 * Returns the same object for convenient inline use at the return boundary.
 */
export function sanitizeToolResult(result: CallToolResult): CallToolResult {
  if (!result || !Array.isArray(result.content)) return result;
  for (const item of result.content) {
    if (item && (item as { type?: string }).type === 'text'
        && typeof (item as { text?: unknown }).text === 'string') {
      (item as { text: string }).text = stripAnsi((item as { text: string }).text);
    }
  }
  return result;
}
