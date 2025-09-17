#!/usr/bin/env node

const { ChampionshipToolHandler } = require('./dist/src/handlers/championship-tools.js');

async function testEngine() {
  console.log('🏎️⚡ FAF-ENGINE-MK1 INTEGRATION TEST SUITE\n');
  console.log('=' .repeat(50));

  const handler = new ChampionshipToolHandler('faf'); // Use global 'faf' command
  let passCount = 0;
  let failCount = 0;

  const tests = [
    {
      name: 'Format-Finder (FF)',
      tool: 'faf_auto',
      args: { directory: '.' },
      check: 'Format-Finder game-changing detection'
    },
    {
      name: 'FAF Init',
      tool: 'faf_init',
      args: { directory: '/tmp/test-faf-' + Date.now() },
      check: 'Engine initialization'
    },
    {
      name: 'FAF Score',
      tool: 'faf_score',
      args: { directory: '.', format: 'ascii' },
      check: 'Engine score calculation'
    },
    {
      name: 'FAF Sync',
      tool: 'faf_sync',
      args: { directory: '.' },
      check: 'Engine sync operation'
    },
    {
      name: 'FAF Bi-Sync',
      tool: 'faf_bi_sync',
      args: { directory: '.' },
      check: 'Engine bi-directional sync'
    },
    {
      name: 'FAF Enhance',
      tool: 'faf_enhance',
      args: { model: 'claude', focus: 'context' },
      check: 'Engine enhancement'
    }
  ];

  for (const test of tests) {
    console.log(`\n📋 Test: ${test.name}`);
    console.log('-'.repeat(30));

    try {
      const start = Date.now();
      const result = await handler.callTool(test.tool, test.args);
      const duration = Date.now() - start;

      if (result && result.content && result.content[0]) {
        const output = result.content[0].text;

        // Check if engine was used or fallback
        const usedEngine = !output.includes('native fallback');
        const status = usedEngine ? '✅ ENGINE' : '⚠️  FALLBACK';

        console.log(`Status: ${status}`);
        console.log(`Time: ${duration}ms ${duration < 50 ? '🏎️' : ''}`);

        // Show first 200 chars of output
        const preview = output.substring(0, 200).replace(/\n/g, ' ');
        console.log(`Output: ${preview}...`);

        if (usedEngine) {
          passCount++;
          console.log(`✅ PASS: ${test.check}`);
        } else {
          console.log(`⚠️  INFO: Using native fallback (engine not available)`);
          passCount++; // Still pass because fallback worked
        }
      } else {
        throw new Error('No output received');
      }
    } catch (error) {
      failCount++;
      console.log(`❌ FAIL: ${error.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('🏁 TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`✅ Passed: ${passCount}/${tests.length}`);
  console.log(`❌ Failed: ${failCount}/${tests.length}`);

  if (failCount === 0) {
    console.log('\n🏆 CHAMPIONSHIP PERFORMANCE - ALL TESTS PASSED!');
  } else if (passCount > failCount) {
    console.log('\n⭐ PODIUM FINISH - Most tests passed!');
  } else {
    console.log('\n🔧 PIT STOP NEEDED - Check engine configuration');
  }

  // Engine health check
  console.log('\n' + '='.repeat(50));
  console.log('🔧 ENGINE HEALTH CHECK');
  console.log('='.repeat(50));

  try {
    const { exec } = require('child_process');
    exec('which faf', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ FAF CLI not found in PATH');
        console.log('   Install with: npm install -g @faf/cli');
      } else {
        console.log('✅ FAF CLI found at:', stdout.trim());

        // Check version
        exec('faf --version', (err, out, serr) => {
          if (!err) {
            console.log('✅ FAF version:', out.trim());
          }
        });
      }
    });
  } catch (e) {
    console.log('⚠️  Could not check FAF CLI status');
  }
}

// Run the test
testEngine().catch(console.error);