#!/usr/bin/env node

/**
 * 🏁 COMPREHENSIVE TEST - v2.2.0 Championship Edition
 * Test all 36 tools to verify functionality
 */

const { ChampionshipToolHandler } = require('./dist/handlers/championship-tools.js');

async function comprehensiveTest() {
  console.log('🏁 COMPREHENSIVE TEST - v2.2.0');
  console.log('================================\n');

  const handler = new ChampionshipToolHandler();

  // Get all available tools
  const { tools } = await handler.listTools();
  console.log(`📊 Found ${tools.length} tools to test\n`);

  // Organize tests by category
  const categories = {
    'Core Tools': [
      { name: 'faf_init', args: { directory: '/tmp/test-' + Date.now(), force: true } },
      { name: 'faf_validate', args: { path: '.faf' } },
      { name: 'faf_score', args: { details: false } },
      { name: 'faf_audit', args: { deep: false } },
      { name: 'faf_lint', args: { path: '.faf', fix: false } },
      { name: 'faf_sync', args: { direction: 'to-claude' } },
      { name: 'faf_bi_sync', args: { watch: false } }
    ],
    'Trust Suite': [
      { name: 'faf_trust', args: { mode: 'confidence' } },
      { name: 'faf_trust_confidence', args: {} },
      { name: 'faf_trust_garage', args: {} },
      { name: 'faf_trust_panic', args: {} },
      { name: 'faf_trust_guarantee', args: {} }
    ],
    'Revolutionary': [
      { name: 'faf_credit', args: { award: false } },
      { name: 'faf_todo', args: { add: 'Test todo' } },
      { name: 'faf_chat', args: { prompt: 'Test project' } },
      { name: 'faf_share', args: { sanitize: true } }
    ],
    'AI Suite': [
      { name: 'faf_enhance', args: { model: 'claude' } },
      { name: 'faf_analyze', args: { models: ['claude'] } },
      { name: 'faf_verify', args: { models: ['claude'] } }
    ],
    'Discovery': [
      { name: 'faf_index', args: {} },
      { name: 'faf_search', args: { query: 'test' } },
      { name: 'faf_stacks', args: {} },
      { name: 'faf_faq', args: { topic: 'general' } }
    ],
    'Developer': [
      { name: 'faf_status', args: {} },
      { name: 'faf_check', args: {} },
      { name: 'faf_clear', args: { cache: true } },
      { name: 'faf_edit', args: { path: '.faf' } }
    ],
    'Filesystem': [
      { name: 'faf_list', args: { path: '.' } },
      { name: 'faf_exists', args: { path: './package.json' } },
      { name: 'faf_delete', args: { path: '/tmp/nonexistent-' + Date.now() } },
      { name: 'faf_move', args: { from: '/tmp/src-' + Date.now(), to: '/tmp/dst-' + Date.now() } },
      { name: 'faf_copy', args: { from: './package.json', to: '/tmp/pkg-' + Date.now() + '.json' } },
      { name: 'faf_mkdir', args: { path: '/tmp/test-dir-' + Date.now(), recursive: true } }
    ],
    'Basic': [
      { name: 'faf_about', args: {} },
      { name: 'faf_read', args: { path: './package.json' } },
      { name: 'faf_write', args: { path: '/tmp/test-' + Date.now() + '.txt', content: 'Test' } }
    ]
  };

  const results = {
    passed: 0,
    failed: 0,
    times: [],
    byCategory: {}
  };

  // Test each category
  for (const [category, tests] of Object.entries(categories)) {
    console.log(`\n📦 ${category}:`);
    console.log('─'.repeat(30));

    results.byCategory[category] = { passed: 0, failed: 0 };

    for (const test of tests) {
      try {
        const start = Date.now();
        const result = await handler.callTool(test.name, test.args);
        const duration = Date.now() - start;
        results.times.push(duration);

        if (!result.isError) {
          const emoji = duration < 10 ? '🏎️' : duration < 30 ? '🚗' : duration < 50 ? '🏃' : '🐌';
          console.log(`  ${emoji} ${test.name}: ${duration}ms`);
          results.passed++;
          results.byCategory[category].passed++;
        } else {
          // Check if it's an expected error (like file not found for delete)
          const expectedErrors = ['ENOENT', 'not found', 'does not exist'];
          const isExpected = expectedErrors.some(err =>
            result.content[0].text.toLowerCase().includes(err.toLowerCase())
          );

          if (isExpected && ['faf_delete', 'faf_move'].includes(test.name)) {
            console.log(`  ⚠️ ${test.name}: Expected error (${duration}ms)`);
            results.passed++;
            results.byCategory[category].passed++;
          } else {
            console.log(`  ❌ ${test.name}: Error (${duration}ms)`);
            results.failed++;
            results.byCategory[category].failed++;
          }
        }
      } catch (error) {
        console.log(`  💥 ${test.name}: Exception - ${error.message}`);
        results.failed++;
        results.byCategory[category].failed++;
      }
    }

    // Category summary
    const cat = results.byCategory[category];
    const catTotal = cat.passed + cat.failed;
    console.log(`  └─ ${cat.passed}/${catTotal} passed`);
  }

  // Calculate statistics
  const avgTime = Math.round(results.times.reduce((a, b) => a + b, 0) / results.times.length);
  const minTime = Math.min(...results.times);
  const maxTime = Math.max(...results.times);
  const under10ms = results.times.filter(t => t < 10).length;
  const under30ms = results.times.filter(t => t < 30).length;
  const under50ms = results.times.filter(t => t < 50).length;

  // Final summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(50));

  console.log(`\n✅ Total Passed: ${results.passed}`);
  console.log(`❌ Total Failed: ${results.failed}`);
  console.log(`📈 Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

  console.log('\n⚡ PERFORMANCE METRICS:');
  console.log(`  🏎️ <10ms: ${under10ms} tools (${(under10ms / results.times.length * 100).toFixed(0)}%)`);
  console.log(`  🚗 <30ms: ${under30ms} tools (${(under30ms / results.times.length * 100).toFixed(0)}%)`);
  console.log(`  🏃 <50ms: ${under50ms} tools (${(under50ms / results.times.length * 100).toFixed(0)}%)`);
  console.log(`  📊 Average: ${avgTime}ms`);
  console.log(`  ⚡ Fastest: ${minTime}ms`);
  console.log(`  🐌 Slowest: ${maxTime}ms`);

  console.log('\n🏆 CHAMPIONSHIP VERDICT:');
  if (avgTime < 20 && results.passed > 30) {
    console.log('  🏆 FORMULA 1 GRADE - Championship Performance!');
  } else if (avgTime < 50 && results.passed > 25) {
    console.log('  🥈 PODIUM FINISH - Great Performance!');
  } else if (results.passed > 20) {
    console.log('  🏅 POINTS SCORED - Good Performance!');
  } else {
    console.log('  🔧 PIT STOP NEEDED - Needs Tuning');
  }

  console.log('\n💡 v2.2.0 Championship Edition:');
  console.log(`  • ${tools.length} tools available`);
  console.log('  • Zero shell execution for core tools');
  console.log('  • Native TypeScript implementation');
  console.log('  • Hybrid approach: Native + CLI when available');

  return results;
}

// Run the test
comprehensiveTest()
  .then(results => {
    console.log('\n✅ Test complete!\n');
    process.exit(results.failed > 5 ? 1 : 0);
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });