#!/usr/bin/env node

/**
 * Test FAF MCP functions
 */

const { spawn } = require('child_process');

// Start the MCP server and send a test command
const server = spawn('node', ['dist/server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Test message for MCP protocol
const testMessage = JSON.stringify({
  jsonrpc: '2.0',
  method: 'tools/list',
  id: 1
}) + '\n';

console.log("🏁 Testing FAF MCP Server...\n");

server.stdout.on('data', (data) => {
  console.log("Server response:", data.toString().substring(0, 200) + "...");
  server.kill();
  console.log("\n✅ Server responding!");
});

server.stderr.on('data', (data) => {
  console.error("Error:", data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Send test after brief delay
setTimeout(() => {
  console.log("Sending test message...");
  server.stdin.write(testMessage);
}, 100);