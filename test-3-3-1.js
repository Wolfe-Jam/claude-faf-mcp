#!/usr/bin/env node

/**
 * Test the 3-3-1 display format
 */

// Simulate the format function
function format3x3x1(emoji, metric, value, percentage, statusLabel, statusValue) {
  const filled = Math.round(percentage / 4);
  const bar = '█'.repeat(filled) + '░'.repeat(25 - filled);

  return [
    `${emoji} ${metric}: ${value}`,
    bar,
    `${statusLabel}: ${statusValue}`
  ].join('\n');
}

console.log("🏁 TESTING 3-3-1 FORMAT:\n");

// Test Score Display
console.log("SCORE TEST:");
console.log(format3x3x1('📊', 'Score', '88/100', 88, 'Status', 'Excellent'));
console.log("\n---\n");

// Test File Operation
console.log("FILE OPERATION TEST:");
console.log(format3x3x1('📁', 'Copied', '12/15', 80, 'Speed', 'Fast'));
console.log("\n---\n");

// Test Sync
console.log("SYNC TEST:");
console.log(format3x3x1('🔄', 'Synced', '47/47', 100, 'Result', 'Complete'));
console.log("\n---\n");

// Test Error
console.log("ERROR TEST:");
console.log(format3x3x1('❌', 'Failed', 'Not found', 0, 'Action', 'Check path'));
console.log("\n---\n");

// Test Perfect Score
console.log("PERFECT SCORE TEST:");
console.log(format3x3x1('🏆', 'Score', '100/100', 100, 'Status', 'CHAMPION'));

console.log("\n✅ All tests complete!");