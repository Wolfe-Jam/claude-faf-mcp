#!/usr/bin/env node

/**
 * 🏆 Medal Display Test for MCP
 * Tests that championship medals render correctly in Claude Desktop
 */

const { getScoreMedal, formatScore, format3Lines } = require('./dist/src/utils/visual-style');

console.log('\n🏁 CHAMPIONSHIP MEDAL DISPLAY TEST\n');
console.log('Testing all medal tiers for Claude Desktop rendering...\n');

const testScores = [
  { score: 100, expected: '🏆 Trophy - Championship' },
  { score: 99, expected: '🥇 Gold' },
  { score: 96, expected: '🥈 Target 2 - Silver' },
  { score: 88, expected: '🥉 Target 1 - Bronze' },
  { score: 77, expected: '🟢 GO! - Ready for Target 1' },
  { score: 62, expected: '🟡 Caution - Getting ready' },
  { score: 48, expected: '🔴 Stop - Needs work' },
];

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

let allPassed = true;

testScores.forEach(({ score, expected }) => {
  const { medal, status } = getScoreMedal(score);
  const result = `${medal} ${status}`;
  const passed = result === expected;

  if (!passed) allPassed = false;

  console.log(`Score: ${score}%`);
  console.log(`Expected: ${expected}`);
  console.log(`Got:      ${result}`);
  console.log(passed ? '✅ PASS' : '❌ FAIL');
  console.log();
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

if (allPassed) {
  console.log('🏆 ALL TESTS PASSED - Medal system ready for Claude Desktop!\n');
} else {
  console.log('❌ SOME TESTS FAILED - Check medal logic\n');
  process.exit(1);
}

// Visual display test
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('📊 VISUAL DISPLAY TEST (how it appears in Claude Desktop)');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

testScores.forEach(({ score }) => {
  const display = formatScore(score);
  console.log(format3Lines(display));
  console.log();
});

console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('✅ Medal display test complete!');
console.log('🎯 Next: Test in actual Claude Desktop to verify rendering');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
