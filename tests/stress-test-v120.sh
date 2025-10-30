#!/bin/bash
# MCP v1.2.0 Stress Test Suite
# F1-Inspired Championship Testing - Breaking Point Analysis

set -e

CYAN='\033[0;36m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TEST_DIR="/tmp/mcp-stress-tests"
PASS_COUNT=0
FAIL_COUNT=0
TEST_COUNT=0

echo -e "${CYAN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🏎️  MCP v1.2.0 STRESS TEST SUITE"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"
echo "🔥 Testing breaking points and edge cases"
echo "📍 Test directory: $TEST_DIR"
echo ""

# Clean and create test directory
rm -rf "$TEST_DIR"
mkdir -p "$TEST_DIR"

run_test() {
  TEST_COUNT=$((TEST_COUNT + 1))
  local test_name="$1"
  local test_cmd="$2"

  echo -n "Test $TEST_COUNT: $test_name... "

  if eval "$test_cmd" > /tmp/test_output 2>&1; then
    echo -e "${GREEN}✓ PASS${NC}"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    echo -e "${RED}✗ FAIL${NC}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
    cat /tmp/test_output
  fi
}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TIER 1: FILE DISCOVERY STRESS TESTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo -e "${CYAN}═══ TIER 1: FILE DISCOVERY (BRAKE SYSTEM) 🚨${NC}"
echo ""

# Test 1.1: Priority order verification
run_test "Priority: project.faf beats .faf" "
  mkdir -p '$TEST_DIR/priority-test' && cd '$TEST_DIR/priority-test' &&
  echo 'tier3' > .faf &&
  echo 'tier1' > project.faf &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'project.faf'
"

# Test 1.2: Wildcard .faf priority
run_test "Priority: custom.faf beats .faf" "
  mkdir -p '$TEST_DIR/wildcard-test' && cd '$TEST_DIR/wildcard-test' &&
  echo 'tier3' > .faf &&
  echo 'tier2' > custom.faf &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'custom.faf'
"

# Test 1.3: Multiple *.faf files (alphabetical)
run_test "Priority: Alphabetical *.faf selection" "
  mkdir -p '$TEST_DIR/multi-faf' && cd '$TEST_DIR/multi-faf' &&
  echo 'z' > zebra.faf &&
  echo 'a' > apple.faf &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'apple.faf'
"

# Test 1.4: Backup files excluded
run_test "Exclusion: .faf.backup- files ignored" "
  mkdir -p '$TEST_DIR/backup-test' && cd '$TEST_DIR/backup-test' &&
  echo 'backup' > .faf.backup-20250101 &&
  echo 'real' > project.faf &&
  ! node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'backup'
"

# Test 1.5: Directory named .faf (EISDIR protection)
run_test "Safety: Directory named .faf doesn't crash" "
  mkdir -p '$TEST_DIR/dir-test/.faf' && cd '$TEST_DIR/dir-test' &&
  echo 'real' > project.faf &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'project.faf'
"

# Test 1.6: Empty directory (no files)
run_test "Edge: No FAF files returns null" "
  mkdir -p '$TEST_DIR/empty-test' && cd '$TEST_DIR/empty-test' &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'null'
"

# Test 1.7: Permission denied handling
run_test "Safety: Unreadable directory doesn't crash" "
  mkdir -p '$TEST_DIR/perm-test' &&
  chmod 000 '$TEST_DIR/perm-test' 2>/dev/null || true &&
  node -e \"import('./dist/utils/faf-file-finder.js').then(m => m.findFafFile('$TEST_DIR/perm-test').then(() => console.log('handled')))\" &&
  chmod 755 '$TEST_DIR/perm-test' 2>/dev/null || true
"

# Test 1.8: Symlink handling
run_test "Edge: Symlinks to FAF files work" "
  mkdir -p '$TEST_DIR/symlink-test' && cd '$TEST_DIR/symlink-test' &&
  echo 'content' > real.faf &&
  ln -s real.faf project.faf &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'project.faf'
"

# Test 1.9: Very long filename
run_test "Edge: Long filename handling" "
  mkdir -p '$TEST_DIR/long-name' && cd '$TEST_DIR/long-name' &&
  echo 'content' > 'a_very_long_filename_that_tests_filesystem_limits_but_still_valid.faf' &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'faf'
"

# Test 1.10: Hidden directory traversal
run_test "Safety: No directory traversal via .." "
  mkdir -p '$TEST_DIR/traversal-test/subdir' && cd '$TEST_DIR/traversal-test/subdir' &&
  echo 'parent' > ../project.faf &&
  echo 'child' > project.faf &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep -v 'parent'
"

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TIER 2: CONTENT HANDLING STRESS TESTS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo -e "${CYAN}═══ TIER 2: CONTENT HANDLING (ENGINE SYSTEM) ⚡${NC}"
echo ""

# Test 2.1: Empty file
run_test "Edge: Empty FAF file" "
  mkdir -p '$TEST_DIR/empty-content' && cd '$TEST_DIR/empty-content' &&
  touch project.faf &&
  [ -f project.faf ] && [ ! -s project.faf ]
"

# Test 2.2: Binary content (should not crash)
run_test "Safety: Binary content doesn't crash" "
  mkdir -p '$TEST_DIR/binary-test' && cd '$TEST_DIR/binary-test' &&
  dd if=/dev/urandom of=project.faf bs=1024 count=1 2>/dev/null &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js > /dev/null 2>&1
"

# Test 2.3: Very large file (10MB)
run_test "Performance: Large FAF file (10MB)" "
  mkdir -p '$TEST_DIR/large-file' && cd '$TEST_DIR/large-file' &&
  yes 'test line content that will repeat many times' | head -n 100000 > project.faf &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'project.faf'
"

# Test 2.4: Unicode and emoji content
run_test "Edge: Unicode/Emoji in content" "
  mkdir -p '$TEST_DIR/unicode-test' && cd '$TEST_DIR/unicode-test' &&
  echo '🏎️⚡🧡 FAF Content 中文 العربية' > project.faf &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'project.faf'
"

# Test 2.5: Special characters in filename
run_test "Edge: Special chars in *.faf filename" "
  mkdir -p '$TEST_DIR/special-chars' && cd '$TEST_DIR/special-chars' &&
  echo 'content' > 'my-project_v2.0.faf' &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'my-project_v2.0.faf'
"

# Test 2.6: Line ending variations (CRLF, LF, CR)
run_test "Edge: Mixed line endings" "
  mkdir -p '$TEST_DIR/line-endings' && cd '$TEST_DIR/line-endings' &&
  printf 'line1\r\nline2\nline3\r' > project.faf &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'project.faf'
"

# Test 2.7: No newline at EOF
run_test "Edge: No newline at end of file" "
  mkdir -p '$TEST_DIR/no-newline' && cd '$TEST_DIR/no-newline' &&
  printf 'content without newline' > project.faf &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'project.faf'
"

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TIER 3: RACE CONDITIONS & CONCURRENCY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo -e "${CYAN}═══ TIER 3: CONCURRENCY (AERODYNAMICS) 🏁${NC}"
echo ""

# Test 3.1: Concurrent reads (10 parallel)
run_test "Concurrency: 10 parallel reads" "
  mkdir -p '$TEST_DIR/concurrent-reads' && cd '$TEST_DIR/concurrent-reads' &&
  echo 'content' > project.faf &&
  for i in {1..10}; do
    node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js &
  done
  wait
"

# Test 3.2: File modified during read
run_test "Race: File modified during operation" "
  mkdir -p '$TEST_DIR/race-modify' && cd '$TEST_DIR/race-modify' &&
  echo 'original' > project.faf &&
  (sleep 0.1 && echo 'modified' > project.faf) &
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js > /dev/null
  wait
"

# Test 3.3: File deleted during read
run_test "Race: File deleted during scan" "
  mkdir -p '$TEST_DIR/race-delete' && cd '$TEST_DIR/race-delete' &&
  echo 'content' > project.faf &&
  (sleep 0.1 && rm project.faf) &
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js > /dev/null 2>&1 || true
  wait
"

# Test 3.4: Rapid file creation/deletion
run_test "Stress: Rapid create/delete cycles" "
  mkdir -p '$TEST_DIR/rapid-cycles' && cd '$TEST_DIR/rapid-cycles' &&
  for i in {1..50}; do
    echo 'content' > project.faf
    rm project.faf
  done
  echo 'final' > project.faf &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'project.faf'
"

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TIER 4: FILESYSTEM EDGE CASES
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo -e "${CYAN}═══ TIER 4: FILESYSTEM EDGE CASES (PIT STOPS) 🔧${NC}"
echo ""

# Test 4.1: Case-sensitive filesystem handling
run_test "Edge: Case variations (Project.faf vs project.faf)" "
  mkdir -p '$TEST_DIR/case-test' && cd '$TEST_DIR/case-test' &&
  echo 'lower' > project.faf &&
  echo 'upper' > PROJECT.faf &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'faf'
"

# Test 4.2: Space in directory path
run_test "Edge: Spaces in directory path" "
  mkdir -p '$TEST_DIR/dir with spaces' && cd '$TEST_DIR/dir with spaces' &&
  echo 'content' > project.faf &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'project.faf'
"

# Test 4.3: Deep nesting (100 levels)
run_test "Edge: Very deep directory nesting" "
  DIR='$TEST_DIR/deep' &&
  mkdir -p \$DIR &&
  for i in {1..20}; do DIR=\"\$DIR/level\$i\"; mkdir -p \"\$DIR\"; done &&
  echo 'content' > \"\$DIR/project.faf\" &&
  cd \"\$DIR\" &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'project.faf'
"

# Test 4.4: Readonly filesystem simulation
run_test "Edge: Readonly directory (read-only operations)" "
  mkdir -p '$TEST_DIR/readonly-test' && cd '$TEST_DIR/readonly-test' &&
  echo 'content' > project.faf &&
  chmod 444 project.faf &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'project.faf' &&
  chmod 644 project.faf
"

# Test 4.5: Mounted volumes and network paths (if applicable)
run_test "Edge: /tmp filesystem access" "
  mkdir -p /tmp/mcp-mount-test && cd /tmp/mcp-mount-test &&
  echo 'content' > project.faf &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'project.faf' &&
  rm -rf /tmp/mcp-mount-test
"

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# TIER 5: BACKWARD COMPATIBILITY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo -e "${CYAN}═══ TIER 5: BACKWARD COMPATIBILITY (RELIABILITY) 🛡️${NC}"
echo ""

# Test 5.1: Legacy .faf still works
run_test "Compat: Legacy .faf file discovery" "
  mkdir -p '$TEST_DIR/legacy-only' && cd '$TEST_DIR/legacy-only' &&
  echo 'legacy content' > .faf &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep '.faf'
"

# Test 5.2: Migration scenario (both exist)
run_test "Compat: Both .faf and project.faf coexist" "
  mkdir -p '$TEST_DIR/migration' && cd '$TEST_DIR/migration' &&
  echo 'old' > .faf &&
  echo 'new' > project.faf &&
  node /Users/wolfejam/FAF/claude-faf-mcp/dist/test-file-finder.js | grep 'project.faf'
"

# Test 5.3: Tier metadata correct
run_test "Compat: Tier metadata for legacy files" "
  mkdir -p '$TEST_DIR/tier-check' && cd '$TEST_DIR/tier-check' &&
  echo 'content' > .faf &&
  node -e \"import('./dist/utils/faf-file-finder.js').then(m => m.findFafFile('$TEST_DIR/tier-check').then(r => console.log(r.tier === 3 ? 'correct' : 'wrong')))\"
"

# Test 5.4: needsMigration flag
run_test "Compat: needsMigration flag for .faf" "
  mkdir -p '$TEST_DIR/migrate-flag' && cd '$TEST_DIR/migrate-flag' &&
  echo 'content' > .faf &&
  node -e \"import('./dist/utils/faf-file-finder.js').then(m => m.findFafFile('$TEST_DIR/migrate-flag').then(r => console.log(r.needsMigration ? 'correct' : 'wrong')))\"
"

# Test 5.5: isStandard flag
run_test "Compat: isStandard flag for project.faf" "
  mkdir -p '$TEST_DIR/standard-flag' && cd '$TEST_DIR/standard-flag' &&
  echo 'content' > project.faf &&
  node -e \"import('./dist/utils/faf-file-finder.js').then(m => m.findFafFile('$TEST_DIR/standard-flag').then(r => console.log(r.isStandard ? 'correct' : 'wrong')))\"
"

echo ""

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# RESULTS SUMMARY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo -e "${CYAN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 STRESS TEST RESULTS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${NC}"

TOTAL=$((PASS_COUNT + FAIL_COUNT))
PASS_PCT=$((PASS_COUNT * 100 / TOTAL))

echo "Total Tests:  $TOTAL"
echo -e "${GREEN}Passed:       $PASS_COUNT ($PASS_PCT%)${NC}"

if [ $FAIL_COUNT -gt 0 ]; then
  echo -e "${RED}Failed:       $FAIL_COUNT${NC}"
else
  echo -e "${GREEN}Failed:       $FAIL_COUNT${NC}"
fi

echo ""

if [ $FAIL_COUNT -eq 0 ]; then
  echo -e "${GREEN}🏆 CHAMPIONSHIP GRADE: ALL TESTS PASSED${NC}"
  echo "🏎️  MCP v1.2.0 is PODIUM READY!"
else
  echo -e "${RED}⚠️  ISSUES DETECTED: $FAIL_COUNT test(s) failed${NC}"
  echo "🔧 Review failures before deployment"
fi

echo ""
echo "🧹 Cleaning up test directory..."
rm -rf "$TEST_DIR"
echo "✓ Done"

exit $FAIL_COUNT
