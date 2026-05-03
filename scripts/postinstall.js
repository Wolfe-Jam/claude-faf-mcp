#!/usr/bin/env node

/**
 * Post-install message: Confirm successful installation
 *
 * Shows clear success message with version, tool count, quick test
 * command, and a quiet star CTA. If you found this useful, a star
 * compounds — helps other devs find FAF.
 *
 * Writes directly to /dev/tty to bypass npm output suppression.
 */

const packageJson = require('../package.json');
const fs = require('fs');

const message = `
\x1b[32m✓\x1b[0m claude-faf-mcp@${packageJson.version} installed successfully
  32 MCP tools ready

Test in Claude Desktop:
  "Extract context from my README"

\x1b[33m⭐\x1b[0m If this helps, a star compounds:
  https://github.com/Wolfe-Jam/claude-faf-mcp
`;

try {
  // Write directly to terminal, bypassing npm's output suppression
  fs.writeSync(fs.openSync('/dev/tty', 'w'), message);
} catch (e) {
  // Fallback to stderr if /dev/tty not available (Windows, etc.)
  console.error(message);
}
