#!/bin/sh
# Test runner with a bounded, discriminating retry for the Linux bun --isolate
# epoll flake. (Ported from the grok-faf-mcp fix, 2026-06-26.)
#
# Background: `bun test --isolate` on Ubuntu intermittently errors with
#   "EEXIST: file already exists, epoll_ctl"
# — a runner-shutdown race, not a code bug (green on macOS + Windows in the same
# matrix, re-runs pass). It manifests TWO ways: a fast error (epoll_ctl in
# output) OR a HARNESS HANG (no output, never exits).
#
# This wrapper:
#   1. On Linux, bounds the run with `timeout` so a HANG is killed (exit 124)
#      instead of running unbounded → cancelled CI run → RED npm badge.
#   2. Retries ONCE on the flake — whether it failed fast (epoll_ctl) or hung (124).
#   3. Propagates any real failure immediately — does NOT mask.
# macOS/Windows run bare (no flake, no portable `timeout`).
#
# Doctrine: targeted retry, not blind retry. Real test failures still fail.

set -u

TMP=$(mktemp -t faf-tests.XXXXXX)
trap 'rm -f "$TMP"' EXIT

if [ "$(uname)" = "Linux" ] && command -v timeout >/dev/null 2>&1; then
  TIMEOUT="timeout 600"
else
  TIMEOUT=""
fi

# Capture exit via file + $? (not `| tee` + PIPESTATUS, a bashism that masks the
# real exit under sh/dash → a timeout-killed hang would read as a false green).
$TIMEOUT bun test --isolate --timeout=120000 --path-ignore-patterns="**/performance.test.ts" "$@" > "$TMP" 2>&1
RC=$?
cat "$TMP"

if [ "$RC" -eq 0 ]; then
  exit 0
fi

# Discriminating retry — the epoll flake, whether it fails fast (epoll_ctl in
# output) or HANGS (timeout kills it, exit 124). Real failures still propagate.
if grep -q "epoll_ctl" "$TMP" || [ "$RC" -eq 124 ]; then
  echo ""
  echo "============================================================"
  echo "Detected Linux bun --isolate epoll flake (fail or hang) — retrying ONCE."
  echo "============================================================"
  echo ""
  $TIMEOUT bun test --isolate --timeout=120000 --path-ignore-patterns="**/performance.test.ts" "$@"
  exit $?
fi

# Real failure — propagate original exit code, do NOT mask
exit "$RC"
