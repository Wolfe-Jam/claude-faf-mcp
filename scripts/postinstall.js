#!/usr/bin/env node

/**
 * Post-install message: Confirm successful installation
 *
 * Shows clear success message with version, tool count,
 * new features, and quick test command.
 *
 * Writes directly to /dev/tty to bypass npm output suppression.
 */

const packageJson = require('../package.json');
const fs = require('fs');

const message = `
\x1b[32m✓\x1b[0m claude-faf-mcp@${packageJson.version} installed successfully
  52 MCP tools ready
  NEW: faf_human_add, faf_readme

Test in Claude Desktop:
  "Extract context from my README"
`;

try {
  // Write directly to terminal, bypassing npm's output suppression
  fs.writeSync(fs.openSync('/dev/tty', 'w'), message);
} catch (e) {
  // Fallback to stderr if /dev/tty not available (Windows, etc.)
  console.error(message);
}
