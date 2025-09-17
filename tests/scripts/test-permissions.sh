#!/bin/bash

echo "🏁 Testing Permission Fixes for v2.2.0"
echo "========================================"
echo ""

# Test resource declaration
echo "📋 Checking resource declarations:"
echo '{"jsonrpc":"2.0","method":"resources/list","params":{},"id":1}' | \
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/src/cli.js --transport stdio 2>/dev/null | \
  head -1 | grep -q 'file://' && echo "✅ File system resources declared" || echo "❌ No file resources found"

echo ""
echo "🔧 Permission Fix Applied:"
echo "- Added file:// resource declaration"
echo "- Working directory: /Users/wolfejam/FAF"
echo "- Resource type: text/directory"
echo ""

echo "📝 To test in Claude Desktop:"
echo "1. Restart Claude Desktop"
echo "2. Open a new conversation"
echo "3. Type: faf_init ."
echo "4. When permission modal appears, click 'Always Allow'"
echo "5. Type: faf_score ."
echo "6. Verify no additional permission modals appear"
echo ""
echo "⚡ The permission should be remembered after 'Always Allow'!"