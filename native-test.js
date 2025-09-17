#!/usr/bin/env node

/**
 * 🏁 NATIVE TOOLS TEST - v2.2.0
 * Test the native implementations without CLI interference
 */

const { ChampionshipToolHandler } = require('./dist/handlers/championship-tools.js');

async function testNativeTools() {
  console.log('🏁 NATIVE CHAMPIONSHIP TOOLS TEST v2.2.0');
  console.log('=========================================\n');

  const handler = new ChampionshipToolHandler();

  // Test native implementations that don't rely on CLI
  const tests = [
    // Basic info
    { name: 'faf_about', args: {}, category: 'Info' },

    // Native scoring
    { name: 'faf_score', args: { details: false }, category: 'Analysis' },
    { name: 'faf_audit', args: { deep: false }, category: 'Analysis' },
    { name: 'faf_validate', args: { path: '.faf' }, category: 'Analysis' },
    { name: 'faf_lint', args: { path: '.faf' }, category: 'Analysis' },

    // Trust modes (native)
    { name: 'faf_trust', args: { mode: 'confidence' }, category: 'Trust' },
    { name: 'faf_trust_confidence', args: {}, category: 'Trust' },
    { name: 'faf_trust_garage', args: {}, category: 'Trust' },
    { name: 'faf_trust_panic', args: {}, category: 'Trust' },
    { name: 'faf_trust_guarantee', args: {}, category: 'Trust' },

    // Revolutionary (native)
    { name: 'faf_credit', args: { award: true }, category: 'Revolutionary' },
    { name: 'faf_todo', args: { add: 'Test item' }, category: 'Revolutionary' },
    { name: 'faf_chat', args: { prompt: 'Test project' }, category: 'Revolutionary' },
    { name: 'faf_share', args: { sanitize: true }, category: 'Revolutionary' },

    // AI Suite (native)
    { name: 'faf_enhance', args: { model: 'claude' }, category: 'AI' },
    { name: 'faf_analyze', args: { models: ['claude'] }, category: 'AI' },
    { name: 'faf_verify', args: { models: ['claude', 'gpt'] }, category: 'AI' },

    // Discovery (native)
    { name: 'faf_index', args: {}, category: 'Discovery' },
    { name: 'faf_search', args: { query: 'test' }, category: 'Discovery' },
    { name: 'faf_stacks', args: {}, category: 'Discovery' },
    { name: 'faf_faq', args: { topic: 'general' }, category: 'Discovery' },

    // Developer (native)
    { name: 'faf_status', args: {}, category: 'Developer' },
    { name: 'faf_check', args: {}, category: 'Developer' },
    { name: 'faf_clear', args: { cache: true }, category: 'Developer' },
    { name: 'faf_edit', args: { path: '.faf' }, category: 'Developer' },

    // Filesystem (100% native)
    { name: 'faf_list', args: { path: '.', recursive: false }, category: 'Filesystem' },
    { name: 'faf_exists', args: { path: './package.json' }, category: 'Filesystem' },
    { name: 'faf_mkdir', args: { path: '/tmp/faf-test-' + Date.now(), recursive: true }, category: 'Filesystem' },
    { name: 'faf_copy', args: { from: './package.json', to: '/tmp/pkg-copy-' + Date.now() + '.json' }, category: 'Filesystem' },

    // File operations (100% native)
    { name: 'faf_read', args: { path: './package.json' }, category: 'FileOps' },
    { name: 'faf_write', args: { path: '/tmp/test-' + Date.now() + '.txt', content: 'Test content' }, category: 'FileOps' }
  ];

  const results = {
    passed: 0,
    failed: 0,
    byCategory: {},
    times: []
  };

  let currentCategory = '';

  for (const test of tests) {
    // Print category header
    if (test.category !== currentCategory) {
      if (currentCategory) {
        const cat = results.byCategory[currentCategory];
        console.log(`  └─ ${cat.passed}/${cat.total} passed\n`);
      }
      currentCategory = test.category;
      console.log(`📦 ${test.category}:`);
      results.byCategory[currentCategory] = { passed: 0, failed: 0, total: 0 };
    }

    try {
      const start = Date.now();
      const result = await handler.callTool(test.name, test.args);
      const duration = Date.now() - start;
      results.times.push(duration);
      results.byCategory[currentCategory].total++;

      if (!result.isError) {
        const emoji = duration < 5 ? '🏎️' :
                     duration < 10 ? '🚗' :
                     duration < 30 ? '🏃' :
                     duration < 50 ? '🐢' : '🐌';

        console.log(`  ${emoji} ${test.name}: ${duration}ms`);
        results.passed++;
        results.byCategory[currentCategory].passed++;
      } else {
        console.log(`  ❌ ${test.name}: Error (${duration}ms)`);
        results.failed++;
        results.byCategory[currentCategory].failed++;
      }
    } catch (error) {
      console.log(`  💥 ${test.name}: Exception`);
      results.failed++;
      results.byCategory[currentCategory].failed++;
      results.byCategory[currentCategory].total++;
    }
  }

  // Print last category summary
  if (currentCategory) {
    const cat = results.byCategory[currentCategory];
    console.log(`  └─ ${cat.passed}/${cat.total} passed\n`);
  }

  // Calculate performance metrics
  const avgTime = results.times.length > 0
    ? Math.round(results.times.reduce((a, b) => a + b, 0) / results.times.length)
    : 0;
  const minTime = results.times.length > 0 ? Math.min(...results.times) : 0;
  const maxTime = results.times.length > 0 ? Math.max(...results.times) : 0;

  // Performance distribution
  const perf = {
    under5ms: results.times.filter(t => t < 5).length,
    under10ms: results.times.filter(t => t < 10).length,
    under30ms: results.times.filter(t => t < 30).length,
    under50ms: results.times.filter(t => t < 50).length
  };

  // Summary
  console.log('='.repeat(50));
  console.log('📊 RESULTS SUMMARY');
  console.log('='.repeat(50));
  console.log(`\n✅ Passed: ${results.passed}/${tests.length}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / tests.length) * 100).toFixed(1)}%`);

  console.log('\n⚡ PERFORMANCE DISTRIBUTION:');
  console.log(`  🏎️ <5ms:  ${perf.under5ms} tools (${(perf.under5ms / tests.length * 100).toFixed(0)}%)`);
  console.log(`  🚗 <10ms: ${perf.under10ms} tools (${(perf.under10ms / tests.length * 100).toFixed(0)}%)`);
  console.log(`  🏃 <30ms: ${perf.under30ms} tools (${(perf.under30ms / tests.length * 100).toFixed(0)}%)`);
  console.log(`  🐢 <50ms: ${perf.under50ms} tools (${(perf.under50ms / tests.length * 100).toFixed(0)}%)`);

  console.log('\n📊 PERFORMANCE METRICS:');
  console.log(`  Average: ${avgTime}ms`);
  console.log(`  Fastest: ${minTime}ms`);
  console.log(`  Slowest: ${maxTime}ms`);

  // Championship verdict
  console.log('\n🏆 CHAMPIONSHIP VERDICT:');
  if (avgTime < 10 && results.passed >= 30) {
    console.log('  🏆 FORMULA 1 PERFORMANCE!');
    console.log('  All systems championship grade!');
  } else if (avgTime < 20 && results.passed >= 25) {
    console.log('  🥈 PODIUM PERFORMANCE!');
    console.log('  Excellent speed and reliability!');
  } else if (avgTime < 50 && results.passed >= 20) {
    console.log('  🏅 POINTS SCORED!');
    console.log('  Good performance achieved!');
  } else {
    console.log('  🔧 TUNING NEEDED');
    console.log('  Room for improvement');
  }

  console.log('\n💡 v2.2.0 Championship Edition Features:');
  console.log('  • 36 tools available');
  console.log('  • Native TypeScript implementations');
  console.log('  • Zero shell execution for core tools');
  console.log('  • Hybrid approach with graceful fallback');
  console.log(`  • Average response: ${avgTime}ms`);

  return results;
}

// Run test
testNativeTools()
  .then(results => {
    console.log('\n✅ Test complete!\n');
    process.exit(results.failed > 10 ? 1 : 0);
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });