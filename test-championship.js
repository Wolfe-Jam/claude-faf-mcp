// Test the championship tools directly
const path = require('path');

// Import the compiled JavaScript
const { ChampionshipToolHandler } = require('./dist/handlers/championship-tools.js');

async function testChampionshipTools() {
  console.log('🏁 TESTING v2.2.0 CHAMPIONSHIP TOOLS\n');

  const handler = new ChampionshipToolHandler();

  // Quick tests for each category
  const tests = [
    // Core
    { name: 'faf_init', args: { directory: process.cwd(), force: false } },
    { name: 'faf_validate', args: { path: '.faf' } },
    { name: 'faf_score', args: {} },
    { name: 'faf_audit', args: {} },
    { name: 'faf_lint', args: {} },
    { name: 'faf_sync', args: {} },
    { name: 'faf_bi_sync', args: {} },

    // Trust modes
    { name: 'faf_trust', args: { mode: 'confidence' } },
    { name: 'faf_trust_confidence', args: {} },
    { name: 'faf_trust_garage', args: {} },
    { name: 'faf_trust_panic', args: {} },
    { name: 'faf_trust_guarantee', args: {} },

    // Revolutionary
    { name: 'faf_credit', args: {} },
    { name: 'faf_todo', args: { add: 'Test' } },
    { name: 'faf_chat', args: { prompt: 'Test' } },
    { name: 'faf_share', args: {} },

    // AI
    { name: 'faf_enhance', args: {} },
    { name: 'faf_analyze', args: {} },
    { name: 'faf_verify', args: {} },

    // Discovery
    { name: 'faf_index', args: {} },
    { name: 'faf_search', args: { query: 'test' } },
    { name: 'faf_stacks', args: {} },
    { name: 'faf_faq', args: {} },

    // Developer
    { name: 'faf_status', args: {} },
    { name: 'faf_check', args: {} },
    { name: 'faf_clear', args: {} },
    { name: 'faf_edit', args: {} },

    // Filesystem
    { name: 'faf_list', args: { path: '.' } },
    { name: 'faf_exists', args: { path: './package.json' } },
    { name: 'faf_mkdir', args: { path: '/tmp/test-' + Date.now() } },

    // Basic
    { name: 'faf_about', args: {} },
    { name: 'faf_read', args: { path: './package.json' } },
    { name: 'faf_write', args: { path: '/tmp/test.txt', content: 'test' } }
  ];

  let passed = 0;
  let failed = 0;
  const times = [];

  for (const test of tests) {
    try {
      const start = Date.now();
      const result = await handler.callTool(test.name, test.args);
      const duration = Date.now() - start;
      times.push(duration);

      const emoji = duration < 10 ? '🏎️' : duration < 30 ? '🚗' : duration < 50 ? '🏃' : '🐌';

      if (!result.isError) {
        console.log(`${emoji} ${test.name}: ${duration}ms`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: Error in ${duration}ms`);
        failed++;
      }
    } catch (error) {
      console.log(`💥 ${test.name}: Exception - ${error.message}`);
      failed++;
    }
  }

  // Calculate stats
  const avgTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  console.log('\n📊 RESULTS');
  console.log('==========');
  console.log(`✅ Passed: ${passed}/${tests.length}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚡ Avg time: ${avgTime}ms`);
  console.log(`🏎️ Fastest: ${minTime}ms`);
  console.log(`🐌 Slowest: ${maxTime}ms`);

  // Performance rating
  console.log('\n🏆 PERFORMANCE RATING');
  if (avgTime < 20) {
    console.log('🏎️ FORMULA 1 GRADE!');
  } else if (avgTime < 50) {
    console.log('🚗 SPORTS CAR GRADE!');
  } else {
    console.log('🏃 RUNNING GRADE');
  }

  return { passed, failed, avgTime };
}

testChampionshipTools().catch(console.error);