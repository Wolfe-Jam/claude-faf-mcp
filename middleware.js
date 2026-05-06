// Bot-block middleware — returns 403 for known scanner UAs before any compute runs.
// Prevents the agent-quality-index crawler fleet (YellowMCP, Chiark, TacaraBot)
// from holding Fluid Compute slots. Real MCP clients (Claude/Grok/Cursor) pass through.
//
// Edge runtime, fires before the cache and before api/index. Blocked requests
// cost ~middleware-CPU only (no function instance held open).

export const config = {
  matcher: ['/((?!_next/|_vercel/|.*\\.(?:ico|png|svg|jpg|jpeg|webp|wasm|woff2?|css|js|map)$).*)'],
};

const BLOCKED_UA_PATTERNS = [/YellowMCP/i, /Chiark/i, /TacaraBot/i];

export default function middleware(request) {
  const ua = request.headers.get('user-agent') || '';
  if (BLOCKED_UA_PATTERNS.some((re) => re.test(ua))) {
    return new Response('Forbidden', { status: 403 });
  }
}
