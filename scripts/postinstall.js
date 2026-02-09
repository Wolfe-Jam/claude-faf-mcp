#!/usr/bin/env node

/**
 * Post-install message: Confirm successful installation
 *
 * Shows clear success message with version, tool count,
 * new features, and quick test command.
 */

const packageJson = require('../package.json');

console.log('');
console.log('\x1b[32m✓\x1b[0m claude-faf-mcp@' + packageJson.version + ' installed successfully');
console.log('  52 MCP tools ready');
console.log('  NEW: faf_human_add, faf_readme');
console.log('');
console.log('Test in Claude Desktop:');
console.log('  "Extract context from my README"');
console.log('');
