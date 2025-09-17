#!/bin/bash

echo "🏁 Testing v2.2.0 MCP Server"
echo "============================"
echo ""

# Test the server with sample MCP commands
echo '{"jsonrpc":"2.0","method":"initialize","params":{"capabilities":{}},"id":1}' | \
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/src/cli.js --transport stdio 2>/dev/null | \
  head -1 | jq -r '.result.name' | \
  xargs -I {} echo "✅ Server name: {}"

echo ""
echo '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}' | \
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/src/cli.js --transport stdio 2>/dev/null | \
  head -1 | jq -r '.result.tools | length' | \
  xargs -I {} echo "📊 Total tools: {}"

echo ""
echo "Ready to test in Claude Desktop!"
echo ""
echo "Steps to test:"
echo "1. Restart Claude Desktop"
echo "2. Open a new conversation"
echo "3. Type: faf_about"
echo "4. Type: faf_score"
echo "5. Type: faf_list with path '.'"
echo ""
echo "The tools should work directly in Claude!"