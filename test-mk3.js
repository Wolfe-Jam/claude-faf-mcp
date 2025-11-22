const { initFafFile } = require('./dist/src/faf-core/commands/init.js');
const { scoreFafFile } = require('./dist/src/faf-core/commands/score.js');
const { autoCommand } = require('./dist/src/faf-core/commands/auto.js');
const fs = require('fs');
const path = require('path');

async function testMk3() {
  const testDir = '/tmp/test-mk3-commands';
  const results = {
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    engine: 'Mk3 Bundled',
    tests: []
  };

  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'package.json'), '{"name":"test-mk3"}');

  console.log('🏎️ WJTTC Testing - Mk3 Bundled Engine v3.0.0\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: init
  console.log('TEST 1: init command');
  const initStart = Date.now();
  try {
    const initResult = await initFafFile(testDir, { force: true });
    const initDuration = Date.now() - initStart;

    const projectFafPath = path.join(testDir, 'project.faf');
    const fafExists = fs.existsSync(projectFafPath);
    const isProjectFaf = fafExists && path.basename(projectFafPath) === 'project.faf';

    results.tests.push({
      name: 'init',
      passed: initResult.success && fafExists && isProjectFaf,
      duration: initDuration,
      details: {
        success: initResult.success,
        fileCreated: fafExists,
        correctFilename: isProjectFaf,
        apiDuration: initResult.duration
      }
    });

    console.log('   Status: ' + (initResult.success && isProjectFaf ? '✅ PASS' : '❌ FAIL'));
    console.log('   Duration: ' + initDuration + 'ms');
    console.log('   File: ' + (isProjectFaf ? 'project.faf ✅' : 'WRONG NAME ❌'));
    console.log('');
  } catch (err) {
    results.tests.push({ name: 'init', passed: false, error: err.message });
    console.log('   Status: ❌ FAIL - ' + err.message + '\n');
  }

  // Test 2: score
  console.log('TEST 2: score command');
  const scoreStart = Date.now();
  try {
    const projectFafPath = path.join(testDir, 'project.faf');
    const scoreResult = await scoreFafFile(projectFafPath);
    const scoreDuration = Date.now() - scoreStart;

    const validScore = typeof scoreResult.score === 'number' && scoreResult.score >= 0 && scoreResult.score <= 100;

    results.tests.push({
      name: 'score',
      passed: validScore,
      duration: scoreDuration,
      details: {
        score: scoreResult.score,
        filled: scoreResult.filled,
        total: scoreResult.total
      }
    });

    console.log('   Status: ' + (validScore ? '✅ PASS' : '❌ FAIL'));
    console.log('   Duration: ' + scoreDuration + 'ms');
    console.log('   Score: ' + scoreResult.score + '/100 (' + scoreResult.filled + '/' + scoreResult.total + ' filled)');
    console.log('');
  } catch (err) {
    results.tests.push({ name: 'score', passed: false, error: err.message });
    console.log('   Status: ❌ FAIL - ' + err.message + '\n');
  }

  // Test 3: auto
  console.log('TEST 3: auto command');
  const autoStart = Date.now();
  try {
    const testDir2 = '/tmp/test-mk3-auto';
    if (fs.existsSync(testDir2)) {
      fs.rmSync(testDir2, { recursive: true });
    }
    fs.mkdirSync(testDir2, { recursive: true });
    fs.writeFileSync(path.join(testDir2, 'package.json'), '{"name":"test-auto"}');

    const autoResult = await autoCommand(testDir2, { force: true });
    const autoDuration = Date.now() - autoStart;

    const autoFafPath = path.join(testDir2, 'project.faf');
    const autoFafExists = fs.existsSync(autoFafPath);
    const isProjectFaf = autoFafExists && path.basename(autoFafPath) === 'project.faf';
    const hasScore = autoResult.scoreResult && typeof autoResult.scoreResult.score === 'number';

    results.tests.push({
      name: 'auto',
      passed: autoResult.success && autoFafExists && isProjectFaf && hasScore,
      duration: autoDuration,
      details: {
        success: autoResult.success,
        fileCreated: autoFafExists,
        correctFilename: isProjectFaf,
        score: autoResult.scoreResult ? autoResult.scoreResult.score : null,
        apiDuration: autoResult.duration
      }
    });

    console.log('   Status: ' + (autoResult.success && isProjectFaf && hasScore ? '✅ PASS' : '❌ FAIL'));
    console.log('   Duration: ' + autoDuration + 'ms');
    console.log('   File: ' + (isProjectFaf ? 'project.faf ✅' : 'WRONG NAME ❌'));
    console.log('   Score: ' + (autoResult.scoreResult ? autoResult.scoreResult.score : 'N/A') + '/100');
    console.log('');
  } catch (err) {
    results.tests.push({ name: 'auto', passed: false, error: err.message });
    console.log('   Status: ❌ FAIL - ' + err.message + '\n');
  }

  // Test 4: Legacy .faf support
  console.log('TEST 4: Legacy .faf support (read with warning)');
  const legacyStart = Date.now();
  try {
    const testDir3 = '/tmp/test-mk3-legacy';
    if (fs.existsSync(testDir3)) {
      fs.rmSync(testDir3, { recursive: true });
    }
    fs.mkdirSync(testDir3, { recursive: true });

    const legacyFafPath = path.join(testDir3, '.faf');
    fs.writeFileSync(legacyFafPath, 'version: 1.0.0\nproject:\n  name: legacy-test\n');

    const { findFafFile } = require('./dist/src/faf-core/utils/file-utils.js');
    const foundPath = await findFafFile(testDir3);
    const canReadLegacy = foundPath && foundPath.includes('.faf');
    const legacyDuration = Date.now() - legacyStart;

    results.tests.push({
      name: 'legacy_faf_support',
      passed: canReadLegacy,
      duration: legacyDuration,
      details: {
        foundFile: foundPath ? path.basename(foundPath) : null,
        canRead: canReadLegacy
      }
    });

    console.log('   Status: ' + (canReadLegacy ? '✅ PASS' : '❌ FAIL'));
    console.log('   Duration: ' + legacyDuration + 'ms');
    console.log('   Found: ' + (foundPath ? path.basename(foundPath) : 'NONE'));
    console.log('');
  } catch (err) {
    results.tests.push({ name: 'legacy_faf_support', passed: false, error: err.message });
    console.log('   Status: ❌ FAIL - ' + err.message + '\n');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
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

  console.log('\n🏁 WJTTC TEST RESULTS - Mk3 Bundled Engine v3.0.0');
  console.log('   Tests: ' + passed + '/' + total + ' passed (' + results.summary.passRate + ')');
  console.log('   Avg Duration: ' + results.summary.avgDuration);
  console.log('   Status: ' + (allPassed ? '🏆 CHAMPIONSHIP GRADE' : '⚠️  NEEDS ATTENTION'));
  console.log('');

  const reportPath = '/Users/wolfejam/FAF/claude-faf-mcp/WJTTC-MK3-v3.0.0-REPORT.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log('📊 Report saved: ' + reportPath + '\n');

  process.exit(allPassed ? 0 : 1);
}

testMk3().catch(err => {
  console.error('❌ Test suite failed:', err);
  process.exit(1);
});
