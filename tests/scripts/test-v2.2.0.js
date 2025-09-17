#!/usr/bin/env node

/**
 * 🏎️ v2.2.0 Championship Test Suite
 * Test ALL 36 tools to verify they work
 */

const { ChampionshipToolHandler } = require('./dist/handlers/championship-tools.js');
const fs = require('fs');

async function testAllTools() {
  console.log('🏁 v2.2.0 CHAMPIONSHIP TEST SUITE');
  console.log('==================================\n');

  const handler = new ChampionshipToolHandler();

  // Get all tools
  const { tools } = await handler.listTools();
  console.log(`📊 Testing ${tools.length} tools\n`);

  const results = {
    passed: [],
    failed: [],
    slow: []
  };

  // Test each tool with appropriate args
  const testCases = [
    // Core Tools
    { name: 'faf_init', args: { directory: '/tmp/faf-test-' + Date.now(), force: true } },
    { name: 'faf_validate', args: { path: './package.json' } },
    { name: 'faf_score', args: { details: false } },
    { name: 'faf_audit', args: { deep: false } },
    { name: 'faf_lint', args: { fix: false } },
    { name: 'faf_sync', args: { direction: 'to-claude' } },
    { name: 'faf_bi_sync', args: { watch: false } },

    // Trust Suite
    { name: 'faf_trust', args: { mode: 'confidence' } },
    { name: 'faf_trust_confidence', args: {} },
    { name: 'faf_trust_garage', args: {} },
    { name: 'faf_trust_panic', args: {} },
    { name: 'faf_trust_guarantee', args: {} },

    // Revolutionary Tools
    { name: 'faf_credit', args: { award: true } },
    { name: 'faf_todo', args: { add: 'Test todo item' } },
    { name: 'faf_chat', args: { prompt: 'Test project description' } },
    { name: 'faf_share', args: { sanitize: true } },

    // AI Suite
    { name: 'faf_enhance', args: { model: 'claude', focus: 'context' } },
    { name: 'faf_analyze', args: { models: ['claude'] } },
    { name: 'faf_verify', args: { models: ['claude', 'gpt'] } },

    // Discovery
    { name: 'faf_index', args: {} },
    { name: 'faf_search', args: { query: 'test', type: 'content' } },
    { name: 'faf_stacks', args: {} },
    { name: 'faf_faq', args: { topic: 'general' } },

    // Developer Tools
    { name: 'faf_status', args: {} },
    { name: 'faf_check', args: {} },
    { name: 'faf_clear', args: { cache: true } },
    { name: 'faf_edit', args: { path: '/tmp/test.faf' } },

    // Filesystem Operations
    { name: 'faf_list', args: { path: '.', recursive: false } },
    { name: 'faf_exists', args: { path: './package.json' } },
    { name: 'faf_delete', args: { path: '/tmp/test-delete-' + Date.now() } },
    { name: 'faf_move', args: { from: '/tmp/test1-' + Date.now(), to: '/tmp/test2-' + Date.now() } },
    { name: 'faf_copy', args: { from: './package.json', to: '/tmp/package-copy-' + Date.now() + '.json' } },
    { name: 'faf_mkdir', args: { path: '/tmp/faf-dir-' + Date.now(), recursive: true } },

    // About & File operations
    { name: 'faf_about', args: {} },
    { name: 'faf_read', args: { path: './package.json' } },
    { name: 'faf_write', args: { path: '/tmp/faf-write-test-' + Date.now() + '.txt', content: 'Test content' } }
  ];

  // Run tests
  for (const test of testCases) {
    try {
      const start = Date.now();
      const result = await handler.callTool(test.name, test.args);
      const duration = Date.now() - start;

      if (result.isError) {
        console.log(`❌ ${test.name}: ERROR - ${JSON.stringify(result.content[0].text).substring(0, 50)}`);
        results.failed.push({ name: test.name, error: true, duration });
      } else if (duration > 50) {
        console.log(`🐌 ${test.name}: ${duration}ms (slow)`);
        results.slow.push({ name: test.name, duration });
      } else if (duration < 10) {
        console.log(`🏎️ ${test.name}: ${duration}ms`);
        results.passed.push({ name: test.name, duration });
      } else {
        console.log(`🚗 ${test.name}: ${duration}ms`);
        results.passed.push({ name: test.name, duration });
      }
    } catch (error) {
      console.log(`💥 ${test.name}: EXCEPTION - ${error.message}`);
      results.failed.push({ name: test.name, exception: error.message });
    }
  }

  // Summary
  console.log('\n🏆 TEST RESULTS SUMMARY');
  console.log('=======================');
  console.log(`✅ Passed: ${results.passed.length}/${testCases.length}`);
  console.log(`❌ Failed: ${results.failed.length}`);
  console.log(`🐌 Slow (>50ms): ${results.slow.length}`);

  // Performance breakdown
  const allTests = [...results.passed, ...results.slow];
  const fastTests = allTests.filter(t => t.duration < 10);
  const mediumTests = allTests.filter(t => t.duration >= 10 && t.duration < 30);
  const avgDuration = allTests.length > 0
    ? Math.round(allTests.reduce((sum, t) => sum + (t.duration || 0), 0) / allTests.length)
    : 0;

  console.log('\n⚡ PERFORMANCE METRICS');
  console.log('======================');
  console.log(`🏎️ <10ms: ${fastTests.length} tools`);
  console.log(`🚗 10-30ms: ${mediumTests.length} tools`);
  console.log(`📊 Average: ${avgDuration}ms`);

  // List failures if any
  if (results.failed.length > 0) {
    console.log('\n⚠️ FAILED TOOLS:');
    results.failed.forEach(f => {
      console.log(`  - ${f.name}: ${f.exception || f.error || 'Unknown error'}`);
    });
  }

  // Verdict
  console.log('\n🏁 FINAL VERDICT');
  console.log('================');
  const successRate = (results.passed.length / testCases.length * 100).toFixed(1);

  if (successRate >= 90) {
    console.log(`🏆 CHAMPIONSHIP PERFORMANCE! ${successRate}% success rate`);
  } else if (successRate >= 70) {
    console.log(`🥈 GOOD PERFORMANCE! ${successRate}% success rate`);
  } else {
    console.log(`🔧 NEEDS WORK. ${successRate}% success rate`);
  }

  console.log('\n💡 v2.2.0 Status:');
  console.log('  • 36 tools available');
  console.log('  • Zero shell execution');
  console.log('  • Native TypeScript implementation');
  console.log(`  • Average response time: ${avgDuration}ms`);

  return results;
}

// Run tests
testAllTools()
  .then(results => {
    console.log('\n✅ Test suite complete!');
    process.exit(results.failed.length > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('\n💥 Test suite failed:', error);
    process.exit(1);
  });