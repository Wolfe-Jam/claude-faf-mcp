#!/usr/bin/env node

/**
 * Post-install check: Verify faf-cli is installed
 *
 * This script runs after npm install to ensure users installed
 * faf-cli BEFORE claude-faf-mcp (required installation order).
 */

const { execSync } = require('child_process');
const os = require('os');

function checkFafCli() {
  try {
    // Try to find faf CLI
    const command = os.platform() === 'win32' ? 'where faf' : 'which faf';
    execSync(command, { stdio: 'ignore' });

    // CLI found - success!
    console.log('✅ faf-cli detected - installation order correct');
    console.log('');
    console.log('⭐ Love it? Star us: https://github.com/Wolfe-Jam/claude-faf-mcp');
    console.log('💬 Questions? https://github.com/Wolfe-Jam/claude-faf-mcp/discussions');
    console.log('');
    return true;
  } catch (error) {
    // CLI not found - warn user
    console.error('');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('⚠️  WARNING: faf-cli NOT DETECTED');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    console.error('claude-faf-mcp requires faf-cli to be installed FIRST.');
    console.error('');
    console.error('CORRECT INSTALLATION ORDER:');
    console.error('  1️⃣  npm install -g faf-cli        (DO THIS FIRST)');
    console.error('  2️⃣  npm install -g claude-faf-mcp  (ALREADY DONE)');
    console.error('');
    console.error('Please install faf-cli now:');
    console.error('  npm install -g faf-cli');
    console.error('');
    console.error('Then restart Claude Desktop to use all MCP features.');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('');
    return false;
  }
}

// Run check
checkFafCli();
