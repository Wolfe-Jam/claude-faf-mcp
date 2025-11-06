#!/usr/bin/env node
/**
 * Test script for bundled score command
 * Tests if MCP can score a .faf file using bundled engine (no CLI dependency)
 */

import { FafEngineAdapter } from './dist/src/handlers/engine-adapter.js';

async function testBundledScore() {
  console.log('🧪 Testing Mk3 Bundled Score Engine\n');

  const adapter = new FafEngineAdapter();

  // Test 1: Score the MCP package itself
  console.log('Test 1: Scoring claude-faf-mcp project.faf...');
  const startTime = Date.now();

  try {
    const result = await adapter.callEngine('score', ['/Users/wolfejam/FAF/claude-faf-mcp/claude-faf-mcp_2025-09-15_v2.0.faf']);
    const duration = Date.now() - startTime;

    if (result.success) {
      console.log('✅ SUCCESS!');
      console.log(`   Score: ${result.data.score}%`);
      console.log(`   Filled: ${result.data.filled}/${result.data.total} slots`);
      console.log(`   Duration: ${result.duration}ms (actual) vs ${duration}ms (measured)`);
      console.log(`   Breakdown:`);
      console.log(`     - Project: ${result.data.breakdown.project.percentage}%`);
      console.log(`     - Stack: ${result.data.breakdown.stack.percentage}%`);
      console.log(`     - Human: ${result.data.breakdown.human.percentage}%`);
      console.log(`     - Discovery: ${result.data.breakdown.discovery.percentage}%`);
    } else {
      console.log('❌ FAILED');
      console.log(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.log('❌ EXCEPTION');
    console.log(`   ${error.message}`);
  }

  console.log('\n🏁 Test complete!');
}

testBundledScore().catch(console.error);
