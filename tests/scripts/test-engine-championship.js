#!/usr/bin/env node

const { ChampionshipToolHandler } = require('./dist/src/handlers/championship-tools.js');

async function runChampionshipTest() {
  console.log('🏁🏁🏁 FAF-ENGINE-MK1 CHAMPIONSHIP TEST SUITE 🏁🏁🏁\n');
  console.log('🏎️⚡ Testing ALL 33+ Tools with Engine Integration\n');
  console.log('=' .repeat(60));

  const handler = new ChampionshipToolHandler('faf');

  const results = {
    engine: 0,
    fallback: 0,
    failed: 0,
    times: []
  };

  // All 33+ tools to test
  const tools = [
    // Core FAF Tools
    { name: 'faf_auto', args: { directory: '.' }, critical: true },
    { name: 'faf_init', args: { directory: '/tmp/test-' + Date.now() }, critical: true },
    { name: 'faf_score', args: { directory: '.', format: 'ascii' }, critical: true },
    { name: 'faf_sync', args: { directory: '.' }, critical: true },
    { name: 'faf_bi_sync', args: { directory: '.' }, critical: true },
    { name: 'faf_enhance', args: { model: 'claude', focus: 'context' }, critical: true },
    { name: 'faf_trust', args: { team: '@wolfejam' }, critical: true },
    { name: 'faf_clear', args: { directory: '.' }, critical: false },

    // File Operations
    { name: 'faf_read', args: { path: '.faf' }, critical: false },
    { name: 'faf_write', args: { path: '/tmp/test.faf', content: 'test' }, critical: false },
    { name: 'faf_debug', args: { directory: '.', level: 'detailed' }, critical: false },

    // Display Tools
    { name: 'faf_status', args: { directory: '.' }, critical: false },
    { name: 'faf_stats', args: { directory: '.' }, critical: false },
    { name: 'faf_progress', args: { directory: '.' }, critical: false },
    { name: 'faf_choose', args: {}, critical: false },

    // Analysis Tools
    { name: 'faf_analyze', args: { directory: '.', depth: 3 }, critical: false },
    { name: 'faf_validate', args: { directory: '.' }, critical: false },
    { name: 'faf_benchmark', args: { directory: '.' }, critical: false },

    // Development Tools
    { name: 'faf_component', args: { name: 'test', type: 'svelte' }, critical: false },
    { name: 'faf_optimize', args: { directory: '.', target: 'performance' }, critical: false },
    { name: 'faf_monitor', args: { directory: '.', interval: 5000 }, critical: false },

    // Git Tools
    { name: 'faf_git', args: { command: 'status' }, critical: false },
    { name: 'faf_commit', args: { message: 'test commit', dryRun: true }, critical: false },
    { name: 'faf_branch', args: { name: 'test-branch', create: false }, critical: false },

    // Championship Tools
    { name: 'faf_championship', args: { mode: 'status' }, critical: false },
    { name: 'faf_podium', args: { directory: '.' }, critical: false },
    { name: 'faf_telemetry', args: { directory: '.' }, critical: false },

    // Special Tools
    { name: 'faf_wolfejam', args: {}, critical: false },
    { name: 'faf_orange', args: { level: 105 }, critical: false },
    { name: 'faf_emoji', args: { style: 'championship' }, critical: false },

    // Export Tools
    { name: 'faf_export', args: { format: 'json', directory: '.' }, critical: false },
    { name: 'faf_archive', args: { directory: '.', destination: '/tmp/archive.zip', dryRun: true }, critical: false },
    { name: 'faf_backup', args: { directory: '.', destination: '/tmp/backup', dryRun: true }, critical: false }
  ];

  console.log(`\n📋 Testing ${tools.length} tools...\n`);

  for (const tool of tools) {
    process.stdout.write(`Testing ${tool.name}... `);

    try {
      const start = Date.now();
      const result = await handler.callTool(tool.name, tool.args);
      const duration = Date.now() - start;

      results.times.push(duration);

      if (result && result.content && result.content[0]) {
        const output = result.content[0].text;
        const usedEngine = !output.includes('native fallback') && !output.includes('Native implementation');

        if (usedEngine) {
          results.engine++;
          console.log(`✅ ENGINE (${duration}ms)`);
        } else {
          results.fallback++;
          console.log(`☑️ FALLBACK (${duration}ms)`);
        }
      } else {
        throw new Error('No output');
      }
    } catch (error) {
      results.failed++;
      console.log(`❌ FAILED: ${error.message.substring(0, 50)}`);
    }
  }

  // Calculate statistics
  const avgTime = results.times.reduce((a, b) => a + b, 0) / results.times.length;
  const maxTime = Math.max(...results.times);
  const minTime = Math.min(...results.times);
  const sub10ms = results.times.filter(t => t < 10).length;
  const sub50ms = results.times.filter(t => t < 50).length;

  // Display results
  console.log('\n' + '═'.repeat(60));
  console.log('🏆 CHAMPIONSHIP RESULTS 🏆');
  console.log('═'.repeat(60));

  console.log('\n📊 Tool Results:');
  console.log(`   🏎️ Engine Used: ${results.engine}/${tools.length} (${Math.round(results.engine/tools.length*100)}%)`);
  console.log(`   ⚡ Fallback Used: ${results.fallback}/${tools.length} (${Math.round(results.fallback/tools.length*100)}%)`);
  console.log(`   ❌ Failed: ${results.failed}/${tools.length}`);

  console.log('\n⌚ Performance Metrics:');
  console.log(`   Average: ${Math.round(avgTime)}ms`);
  console.log(`   Fastest: ${minTime}ms 🏁`);
  console.log(`   Slowest: ${maxTime}ms`);
  console.log(`   Sub-10ms: ${sub10ms}/${tools.length} (${Math.round(sub10ms/tools.length*100)}%) ⚡`);
  console.log(`   Sub-50ms: ${sub50ms}/${tools.length} (${Math.round(sub50ms/tools.length*100)}%)`);

  // Championship status
  console.log('\n' + '═'.repeat(60));
  if (results.failed === 0 && avgTime < 50) {
    console.log('🍊 105% BIG ORANGE CHAMPIONSHIP STATUS! 🍊');
    console.log('All tools working, performance EXCEPTIONAL!');
  } else if (results.failed === 0) {
    console.log('🏆 CHAMPIONSHIP PERFORMANCE!');
    console.log('All tools operational!');
  } else if (results.failed < 5) {
    console.log('⭐ PODIUM FINISH!');
    console.log('Most tools working well!');
  } else {
    console.log('🔧 PIT STOP NEEDED');
    console.log('Some tools need attention');
  }
  console.log('═'.repeat(60));

  // Engine health
  console.log('\n🔧 ENGINE HEALTH:');
  const { exec } = require('child_process');
  exec('faf --version', (err, stdout) => {
    if (!err) {
      console.log(`✅ FAF Engine: v${stdout.trim()}`);
      console.log(`✅ Engine Integration: ${results.engine > 0 ? 'ACTIVE' : 'INACTIVE'}`);
      console.log(`✅ Fallback System: ${results.fallback > 0 ? 'WORKING' : 'UNTESTED'}`);
    } else {
      console.log('❌ FAF Engine: NOT FOUND');
      console.log('   Install: npm install -g @faf/cli');
    }

    console.log('\n🏎️⚡ The Wolfejam Way - Championship Software!');
  });
}

// Run the championship test
runChampionshipTest().catch(console.error);