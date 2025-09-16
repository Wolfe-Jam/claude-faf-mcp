#!/bin/bash

# 🏁 WOLFEJAM TESTING CENTER LAUNCHER 🏁

echo "🏁 ============================================= 🏁"
echo "      WOLFEJAM TESTING CENTER"
echo "🏁 ============================================= 🏁"
echo ""
echo "📍 Location: /Users/wolfejam/faf-test-environment"
echo ""
echo "What would you like to do?"
echo ""
echo "1) 📊 Open Testing Dashboard"
echo "2) 🧪 Run Desktop MCP Test (ONE WAY TRACK)"
echo "3) 🤖 Run Big-3 AI Validation"
echo "4) 📁 View Test Records"
echo "5) 📝 Open Testing Center Guide"
echo "6) 🏁 Go to Testing Center Directory"
echo ""
read -p "Select option (1-6): " choice

case $choice in
    1)
        echo "Opening Testing Dashboard..."
        open /Users/wolfejam/FAF/claude-faf-mcp/TESTING_CENTER_DASHBOARD.html
        ;;
    2)
        echo "Running Desktop MCP Test (Creates Permanent Record)..."
        /Users/wolfejam/FAF/claude-faf-mcp/DESKTOP_MCP_TEST_INTEGRATION.sh
        ;;
    3)
        echo "Running Big-3 AI Validation..."
        /Users/wolfejam/FAF/claude-faf-mcp/BIG_3_FAF_MCP_TEST.sh
        ;;
    4)
        echo "Test Records:"
        ls -la /Users/wolfejam/faf-test-environment/DESKTOP_MCP_TESTS/
        ;;
    5)
        echo "Opening Testing Center Guide..."
        open /Users/wolfejam/FAF/claude-faf-mcp/WOLFEJAM_TESTING_CENTER.md
        ;;
    6)
        echo "Going to Testing Center..."
        cd /Users/wolfejam/faf-test-environment
        exec $SHELL
        ;;
    *)
        echo "Invalid option"
        ;;
esac

echo ""
echo "🏁 Championship Testing! 🏁"