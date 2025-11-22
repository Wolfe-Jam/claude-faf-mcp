/**
 * Test MCP v3.0.0 Tools End-to-End
 * Tests the actual MCP tool handlers, not just the bundled functions
 */

const { ChampionshipToolHandler } = require('./dist/src/handlers/championship-tools.js');
const fs = require('fs');
const path = require('path');

async function testMcpTools() {
  const testDir = '/tmp/test-mcp-tools';
  const results = {
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    tests: []
  };

  // Clean up test directory
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir, { recursive: true });

  console.log('🏎️ Testing MCP v3.0.0 Tools - End-to-End\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Initialize handler
  const handler = new ChampionshipToolHandler();

  // Test 1: faf_init
  console.log('TEST 1: faf_init tool');
  const initStart = Date.now();
  try {
    const result = await handler.callTool('faf_init', {
      directory: testDir,
      force: true
    });
    const initDuration = Date.now() - initStart;

    const projectFafPath = path.join(testDir, 'project.faf');
    const fafExists = fs.existsSync(projectFafPath);

    results.tests.push({
      name: 'faf_init',
      passed: fafExists && result.isError !== true,
      duration: initDuration,
      details: {
        fileCreated: fafExists,
        resultContent: result.content ? result.content[0]?.text?.substring(0, 100) : 'no content'
      }
    });

    console.log('   Status: ' + (fafExists ? '✅ PASS' : '❌ FAIL'));
    console.log('   Duration: ' + initDuration + 'ms');
    console.log('   File created: ' + (fafExists ? 'YES' : 'NO'));
    console.log('');
  } catch (err) {
    results.tests.push({ name: 'faf_init', passed: false, error: err.message });
    console.log('   Status: ❌ FAIL - ' + err.message + '\n');
  }

  // Test 2: faf_score (on the file we just created)
  console.log('TEST 2: faf_score tool');
  const scoreStart = Date.now();
  try {
    const result = await handler.callTool('faf_score', {
      directory: testDir
    });
    const scoreDuration = Date.now() - scoreStart;

    const hasScore = result.content && result.content[0]?.text?.includes('Score');

    results.tests.push({
      name: 'faf_score',
      passed: hasScore && result.isError !== true,
      duration: scoreDuration,
      details: {
        resultContent: result.content ? result.content[0]?.text?.substring(0, 200) : 'no content'
      }
    });

    console.log('   Status: ' + (hasScore ? '✅ PASS' : '❌ FAIL'));
    console.log('   Duration: ' + scoreDuration + 'ms');
    console.log('');
  } catch (err) {
    results.tests.push({ name: 'faf_score', passed: false, error: err.message });
    console.log('   Status: ❌ FAIL - ' + err.message + '\n');
  }

  // Test 3: faf_auto (fresh directory)
  console.log('TEST 3: faf_auto tool');
  const autoStart = Date.now();
  try {
    const testDir2 = '/tmp/test-mcp-auto';
    if (fs.existsSync(testDir2)) {
      fs.rmSync(testDir2, { recursive: true });
    }
    fs.mkdirSync(testDir2, { recursive: true });
    fs.writeFileSync(path.join(testDir2, 'package.json'), '{"name":"test-auto"}');

    const result = await handler.callTool('faf_auto', {
      directory: testDir2,
      force: true
    });
    const autoDuration = Date.now() - autoStart;

    const autoFafPath = path.join(testDir2, 'project.faf');
    const autoFafExists = fs.existsSync(autoFafPath);

    results.tests.push({
      name: 'faf_auto',
      passed: autoFafExists && result.isError !== true,
      duration: autoDuration,
      details: {
        fileCreated: autoFafExists,
        resultContent: result.content ? result.content[0]?.text?.substring(0, 100) : 'no content'
      }
    });

    console.log('   Status: ' + (autoFafExists ? '✅ PASS' : '❌ FAIL'));
    console.log('   Duration: ' + autoDuration + 'ms');
    console.log('   File created: ' + (autoFafExists ? 'YES' : 'NO'));
    console.log('');
  } catch (err) {
    results.tests.push({ name: 'faf_auto', passed: false, error: err.message });
    console.log('   Status: ❌ FAIL - ' + err.message + '\n');
  }

  // Test 4: faf_status
  console.log('TEST 4: faf_status tool');
  const statusStart = Date.now();
  try {
    const result = await handler.callTool('faf_status', {
      directory: testDir
    });
    const statusDuration = Date.now() - statusStart;

    const hasStatus = result.content && result.content[0]?.text?.includes('Score');

    results.tests.push({
      name: 'faf_status',
      passed: hasStatus && result.isError !== true,
      duration: statusDuration
    });

    console.log('   Status: ' + (hasStatus ? '✅ PASS' : '❌ FAIL'));
    console.log('   Duration: ' + statusDuration + 'ms');
    console.log('');
  } catch (err) {
    results.tests.push({ name: 'faf_status', passed: false, error: err.message });
    console.log('   Status: ❌ FAIL - ' + err.message + '\n');
  }

  // Test 5: faf_about
  console.log('TEST 5: faf_about tool');
  const aboutStart = Date.now();
  try {
    const result = await handler.callTool('faf_about', {});
    const aboutDuration = Date.now() - aboutStart;

    const hasAbout = result.content && result.content[0]?.text?.includes('FAF');

    results.tests.push({
      name: 'faf_about',
      passed: hasAbout && result.isError !== true,
      duration: aboutDuration
    });

    console.log('   Status: ' + (hasAbout ? '✅ PASS' : '❌ FAIL'));
    console.log('   Duration: ' + aboutDuration + 'ms');
    console.log('');
  } catch (err) {
    results.tests.push({ name: 'faf_about', passed: false, error: err.message });
    console.log('   Status: ❌ FAIL - ' + err.message + '\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  const passed = results.tests.filter(t => t.passed).length;
  const total = results.tests.length;
  const allPassed = passed === total;

  results.summary = {
    total,
    passed,
    failed: total - passed,
    passRate: ((passed / total) * 100).toFixed(1) + '%',
    avgDuration: (results.tests.reduce((sum, t) => sum + (t.duration || 0), 0) / total).toFixed(2) + 'ms'
  };

  console.log('\n🏁 MCP TOOLS TEST RESULTS - v3.0.0');
  console.log('   Tests: ' + passed + '/' + total + ' passed (' + results.summary.passRate + ')');
  console.log('   Avg Duration: ' + results.summary.avgDuration);
  console.log('   Status: ' + (allPassed ? '🏆 ALL TOOLS WORKING' : '⚠️  SOME TOOLS FAILING'));
  console.log('');

  const reportPath = '/Users/wolfejam/FAF/claude-faf-mcp/WJTTC-MCP-TOOLS-v3.0.0-REPORT.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log('📊 Report saved: ' + reportPath + '\n');

  process.exit(allPassed ? 0 : 1);
}

testMcpTools().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
