#!/bin/bash

# 🏎️⚡ NPM Pre-Flight Check Script
# Run this before npm publish!

echo "🏎️⚡ ═══════════════════════════════════════════════════ 🏎️⚡"
echo "           NPM PRE-FLIGHT CHECK - v2.0.0                    "
echo "🏎️⚡ ═══════════════════════════════════════════════════ 🏎️⚡"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Checklist results
PASS=0
FAIL=0
WARN=0

# Function to check and report
check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}☑️  $2${NC}"
        ((PASS++))
    else
        echo -e "${RED}❌ $2${NC}"
        ((FAIL++))
    fi
}

warn() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARN++))
}

echo "1️⃣ CHECKING BUILD STATUS..."
echo "================================"
npm run build > /dev/null 2>&1
check $? "TypeScript compilation"

if [ -f "dist/server.js" ]; then
    check 0 "dist/server.js exists"
else
    check 1 "dist/server.js exists"
fi

if [ -f "dist/cli.js" ]; then
    check 0 "dist/cli.js exists"
else
    check 1 "dist/cli.js exists"
fi
echo ""

echo "2️⃣ CHECKING PACKAGE.JSON..."
echo "================================"
VERSION=$(grep '"version"' package.json | cut -d'"' -f4)
if [ "$VERSION" = "2.0.0" ]; then
    check 0 "Version is 2.0.0"
else
    check 1 "Version is 2.0.0 (found: $VERSION)"
fi

grep -q "CLAUDE.md" package.json
check $? "CLAUDE.md in files array"

grep -q ".faf" package.json
check $? ".faf in files array"

grep -q "dist/\*\*/\*" package.json
check $? "dist/* in files array"
echo ""

echo "3️⃣ CHECKING CRITICAL FILES..."
echo "================================"
[ -f "README.md" ] && check 0 "README.md exists" || check 1 "README.md exists"
[ -f "CLAUDE.md" ] && check 0 "CLAUDE.md exists" || check 1 "CLAUDE.md exists"
[ -f ".faf" ] && check 0 ".faf exists" || check 1 ".faf exists"
[ -f "LICENSE" ] && check 0 "LICENSE exists" || check 1 "LICENSE exists"
[ -f "CHANGELOG.md" ] && check 0 "CHANGELOG.md exists" || check 1 "CHANGELOG.md exists"
echo ""

echo "4️⃣ CHECKING BRAND COMPLIANCE..."
echo "================================"
# Check for forbidden Formula 1 usage
VIOLATIONS=$(grep -r "Formula 1\|\\bF1\\b" . --exclude-dir=node_modules --exclude-dir=dist --exclude="*.md" 2>/dev/null | grep -v "F1-Inspired" | wc -l)
if [ $VIOLATIONS -eq 0 ]; then
    check 0 "F1-Inspired terminology (no violations)"
else
    check 1 "F1-Inspired terminology ($VIOLATIONS violations found)"
fi

# Check emoji language in CLAUDE.md
grep -q "🍊" CLAUDE.md && grep -q "🏎️⚡" CLAUDE.md
check $? "Emoji language documented"

# Check colors
grep -q "#ff6b35" CLAUDE.md && grep -q "#00ffff" CLAUDE.md && grep -q "#00bf63" CLAUDE.md
check $? "Color system documented"
echo ""

echo "5️⃣ CHECKING TESTS..."
echo "================================"
echo "Running tests (this may take a moment)..."
npm test > /tmp/test-results.log 2>&1
if [ $? -eq 0 ]; then
    check 0 "All tests pass"
else
    check 1 "All tests pass (see /tmp/test-results.log)"
fi
echo ""

echo "6️⃣ CHECKING DEPENDENCIES..."
echo "================================"
npm audit --audit-level=high > /tmp/audit.log 2>&1
AUDIT_RESULT=$?
if [ $AUDIT_RESULT -eq 0 ]; then
    check 0 "No high/critical vulnerabilities"
else
    warn "npm audit found issues (see /tmp/audit.log)"
fi

# Check node version requirement
grep -q '"node": ">=18.0.0"' package.json
check $? "Node >=18.0.0 requirement set"
echo ""

echo "7️⃣ CHECKING PACKAGE SIZE..."
echo "================================"
npm pack --dry-run 2>/dev/null | tail -5
echo ""

echo "8️⃣ CHECKING GIT STATUS..."
echo "================================"
if git diff-index --quiet HEAD --; then
    check 0 "All changes committed"
else
    warn "Uncommitted changes detected"
fi

CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo "Current branch: $CURRENT_BRANCH"
echo ""

echo "🏎️⚡ ═══════════════════════════════════════════════════ 🏎️⚡"
echo "                     PRE-FLIGHT SUMMARY                     "
echo "🏎️⚡ ═══════════════════════════════════════════════════ 🏎️⚡"
echo ""
echo -e "${GREEN}✅ Passed: $PASS${NC}"
echo -e "${YELLOW}⚠️  Warnings: $WARN${NC}"
echo -e "${RED}❌ Failed: $FAIL${NC}"
echo ""

if [ $FAIL -eq 0 ]; then
    echo -e "${GREEN}🏆 READY FOR NPM PUBLISH!${NC}"
    echo ""
    echo "Next steps:"
    echo "1. npm login (if needed)"
    echo "2. npm publish --access public"
    echo "3. Verify at: https://npmjs.com/package/claude-faf-mcp"
    echo ""
    echo "🍊 105% Big Orange - Championship Ready! 🍊"
else
    echo -e "${RED}❌ FIX ISSUES BEFORE PUBLISHING!${NC}"
    echo "Review the failed checks above."
fi

echo ""
echo "🏎️⚡ wolfejam way - F1-Inspired Excellence! 🏁"
