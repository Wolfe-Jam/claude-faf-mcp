#!/bin/bash

echo "🏆 FAF AUTO Championship Test"
echo "=============================="
echo ""

# Clean test environment
echo "⚡ Preparing test track..."
rm -f /Users/wolfejam/tshirt-demo/.faf
rm -f /Users/wolfejam/tshirt-demo/CLAUDE.md
echo "✅ Clean slate ready"
echo ""

# Test faf_auto
echo "🏎️ Testing FAF AUTO on tshirt-demo..."
echo '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"faf_auto","arguments":{"directory":"/Users/wolfejam/tshirt-demo"}},"id":1}' | \
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/src/cli.js --transport stdio 2>/dev/null | \
  head -1 | grep -q "105%" && echo "✅ Big Orange achieved!" || echo "❌ Score check failed"

echo ""
echo "📋 Verifying created files..."
[ -f /Users/wolfejam/tshirt-demo/.faf ] && echo "✅ .faf created" || echo "❌ .faf missing"
[ -f /Users/wolfejam/tshirt-demo/CLAUDE.md ] && echo "✅ CLAUDE.md created" || echo "❌ CLAUDE.md missing"

echo ""
echo "🎯 Claude Desktop Test Instructions:"
echo "1. Restart Claude Desktop"
echo "2. Open new conversation"
echo "3. Type: faf_auto /Users/wolfejam/tshirt-demo"
echo "4. Watch the magic - ONE command does it all!"
echo ""
echo "Expected output:"
echo "- Directory scanned ⚡"
echo "- Stack detected (React) 🔧"
echo "- .faf created with data 📄"
echo "- CLAUDE.md generated 📝"
echo "- Bi-sync activated ↔️"
echo "- Score: 🍊 105% Big Orange!"
echo ""
echo "No faffing about - just championship performance! 🏁"