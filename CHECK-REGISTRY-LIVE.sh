#!/bin/bash
# Check if claude-faf-mcp is live in MCP Registry

echo "🔍 Checking MCP Registry for claude-faf-mcp..."
echo ""

# Check API
FOUND=$(curl -s "https://registry.modelcontextprotocol.io/v0.1/servers?limit=200" | jq '.servers[] | select(.server.name | contains("claude-faf-mcp"))' 2>/dev/null)

if [ -n "$FOUND" ]; then
    echo "✅ FOUND in registry!"
    echo ""
    echo "$FOUND" | jq '.'
    echo ""
    echo "🚀 YOU CAN NOW POST TO SOCIAL MEDIA!"
else
    echo "⏳ Not indexed yet. Wait a few minutes and try again."
    echo ""
    echo "Run this script again: ./CHECK-REGISTRY-LIVE.sh"
fi
