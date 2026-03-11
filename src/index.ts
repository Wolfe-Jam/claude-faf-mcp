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