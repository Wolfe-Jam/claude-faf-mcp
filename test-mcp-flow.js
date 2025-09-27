#!/usr/bin/env node

/**
 * MCP Tool Testing Script
 * Tests all major flows and captures results
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test directory
const TEST_DIR = '/tmp/mcp-test-flow';

// Colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runCommand(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, {
      cwd: TEST_DIR,
      shell: true
    });

    let output = '';
    proc.stdout.on('data', (data) => output += data);
    proc.stderr.on('data', (data) => output += data);

    proc.on('close', (code) => {
      if (code === 0) resolve(output);
      else reject(new Error(`Command failed: ${output}`));
    });
  });
}

async function testScenarioA() {
  log('\n=== SCENARIO A: New Project Setup ===', 'bright');

  // Setup
  if (fs.existsSync(TEST_DIR)) {
    fs.rmSync(TEST_DIR, { recursive: true });
  }
  fs.mkdirSync(TEST_DIR, { recursive: true });
  process.chdir(TEST_DIR);

  // Test flow
  const tests = [
    {
      name: 'Initial State',
      cmd: () => {
        const files = fs.readdirSync(TEST_DIR);
        log(`Files: ${files.length}`, 'blue');
        return `Empty directory with ${files.length} files`;
      }
    },
    {
      name: 'Run FAF Init',
      cmd: () => runCommand('faf', ['init'])
    },
    {
      name: 'Check Score After Init',
      cmd: () => runCommand('faf', ['score'])
    },
    {
      name: 'Run FAF Enhance',
      cmd: () => runCommand('faf', ['enhance'])
    },
    {
      name: 'Check Score After Enhance',
      cmd: () => runCommand('faf', ['score'])
    },
    {
      name: 'Add README',
      cmd: () => {
        fs.writeFileSync(path.join(TEST_DIR, 'README.md'), '# Test Project\nMCP Testing');
        return 'README.md created';
      }
    },
    {
      name: 'Final Score',
      cmd: () => runCommand('faf', ['score'])
    }
  ];

  const results = [];
  for (const test of tests) {
    try {
      log(`\n📍 ${test.name}...`, 'yellow');
      const result = await test.cmd();
      log(`✅ Success`, 'green');

      // Extract score if present
      const scoreMatch = result.toString().match(/Score:\s*(\d+)%/);
      if (scoreMatch) {
        log(`   Score: ${scoreMatch[1]}%`, 'blue');
      }

      results.push({
        test: test.name,
        success: true,
        score: scoreMatch ? scoreMatch[1] : null
      });
    } catch (error) {
      log(`❌ Failed: ${error.message}`, 'red');
      results.push({
        test: test.name,
        success: false,
        error: error.message
      });
    }
  }

  return results;
}

async function testScenarioB() {
  log('\n=== SCENARIO B: Tool Response Times ===', 'bright');

  const commands = [
    ['faf', ['score']],
    ['faf', ['trust']],
    ['faf', ['formats']],
  ];

  const results = [];
  for (const [cmd, args] of commands) {
    const start = Date.now();
    try {
      await runCommand(cmd, args);
      const time = Date.now() - start;
      log(`${args[0]}: ${time}ms`, time < 50 ? 'green' : 'yellow');
      results.push({ command: args[0], time, target: '<50ms' });
    } catch (error) {
      log(`${args[0]}: Failed`, 'red');
    }
  }

  return results;
}

async function testScenarioC() {
  log('\n=== SCENARIO C: File Operations ===', 'bright');

  const results = [];

  // Test file operations
  try {
    // Create test file
    fs.writeFileSync(path.join(TEST_DIR, 'test.txt'), 'MCP Test Content');
    log('✅ File write successful', 'green');

    // Read test file
    const content = fs.readFileSync(path.join(TEST_DIR, 'test.txt'), 'utf8');
    if (content === 'MCP Test Content') {
      log('✅ File read successful', 'green');
    }

    // List directory
    const files = fs.readdirSync(TEST_DIR);
    log(`✅ Directory has ${files.length} files`, 'green');

    results.push({ operation: 'file-ops', success: true, fileCount: files.length });
  } catch (error) {
    log('❌ File operations failed', 'red');
    results.push({ operation: 'file-ops', success: false });
  }

  return results;
}

async function generateReport(allResults) {
  log('\n=== TEST REPORT ===', 'bright');

  const report = {
    timestamp: new Date().toISOString(),
    scenarios: allResults,
    summary: {
      totalTests: 0,
      passed: 0,
      failed: 0,
      avgResponseTime: 0
    }
  };

  // Calculate summary
  allResults.forEach(scenario => {
    scenario.results.forEach(result => {
      report.summary.totalTests++;
      if (result.success) report.summary.passed++;
      else report.summary.failed++;
    });
  });

  // Save report
  const reportPath = path.join(process.cwd(), 'mcp-test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  log(`\n📊 Summary:`, 'bright');
  log(`   Total Tests: ${report.summary.totalTests}`, 'blue');
  log(`   Passed: ${report.summary.passed}`, 'green');
  log(`   Failed: ${report.summary.failed}`, report.summary.failed > 0 ? 'red' : 'green');
  log(`\n📄 Full report saved to: ${reportPath}`, 'yellow');

  return report;
}

// Main execution
async function main() {
  log('🏁 Starting MCP Tool Testing Suite', 'bright');
  log('================================\n', 'blue');

  const allResults = [];

  try {
    // Run all scenarios
    const scenarioA = await testScenarioA();
    allResults.push({ name: 'Scenario A', results: scenarioA });

    const scenarioB = await testScenarioB();
    allResults.push({ name: 'Scenario B', results: scenarioB });

    const scenarioC = await testScenarioC();
    allResults.push({ name: 'Scenario C', results: scenarioC });

    // Generate report
    const report = await generateReport(allResults);

    // Video script points
    log('\n🎬 VIDEO SCRIPT POINTS:', 'bright');
    log('1. Start with empty directory (0% score)', 'yellow');
    log('2. Run faf init → jumps to 40%', 'yellow');
    log('3. Run faf enhance → reaches 70%', 'yellow');
    log('4. Add README → hits 85%', 'yellow');
    log('5. Run faf sync → achieves 99%! 🏆', 'yellow');

    log('\n✨ Testing Complete!', 'green');

  } catch (error) {
    log(`\n❌ Testing failed: ${error.message}`, 'red');
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testScenarioA, testScenarioB, testScenarioC };