export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === "/sse" || pathname === "/mcp" || pathname.startsWith("/mcp/")) {
      return Response.redirect("https://mcpaas.live/claude/mcp/v1", 308);
    }
    return env.ASSETS.fetch(request); // everything else → static landing
  }
};
