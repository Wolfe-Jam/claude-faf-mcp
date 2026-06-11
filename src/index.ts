#!/usr/bin/env node

import { ClaudeFafMcpServer } from './server.js';

// Smithery sandbox support — allows Smithery to scan server capabilities
export function createSandboxServer() {
  const wrapper = new ClaudeFafMcpServer({
    transport: 'stdio',
    fafEnginePath: 'faf'
  });
  return wrapper.getServer();
}

// MCP servers run via stdio transport when launched by Claude Desktop
async function main() {
  // Trust Edition Pillar 5 — the SessionStart hook entry. Runs the quiet
  // context refresh and exits; never starts the server, never breaks a
  // session (always exit 0). Silent when nothing changed.
  if (process.argv.includes('--session-refresh')) {
    const { sessionRefresh } = await import('./faf-core/commands/session-refresh.js');
    const result = await sessionRefresh();
    if (result.action === 'error') {
      console.error(result.message); // diagnostic only — stderr, still exit 0
    } else if (result.message) {
      console.log(result.message); // one quiet line → added to session context
    }
    process.exit(0);
  }

  const server = new ClaudeFafMcpServer({
    transport: 'stdio',
    fafEnginePath: 'faf'
  });

  await server.start();
}

main().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});