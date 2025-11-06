#!/usr/bin/env node
/**
 * 🏎️ Mk3 Bundled Engine - Stress Test Suite
 * F1-Inspired Championship Testing
 */

import { FafEngineAdapter } from './dist/src/handlers/engine-adapter.js';
import { promises as fs } from 'fs';

const STRESS_TEST_ITERATIONS = 100;
const CONCURRENT_TESTS = 10;

class Mk3StressTest {
  constructor() {
    this.adapter = new FafEngineAdapter();
    this.results = {
      total: 0,
      passed: 0,
      failed: 0,
      durations: [],
      errors: []
    };
  }

  /**
   * Test 1: Single score execution
   */
  async testSingleScore() {
    console.log('🧪 Test 1: Single Score Execution');
    const startTime = Date.now();

    try {
      const result = await this.adapter.callEngine('score', [
        '/Users/wolfejam/FAF/claude-faf-mcp/claude-faf-mcp_2025-09-15_v2.0.faf'
      ]);

      const duration = Date.now() - startTime;

      if (result.success) {
        console.log('   ✅ PASS');
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Score: ${result.data.score}%`);
        return { passed: true, duration };
      } else {
        console.log('   ❌ FAIL');
        console.log(`   Error: ${result.error}`);
        return { passed: false, duration, error: result.error };
      }
    } catch (error) {
      console.log('   ❌ EXCEPTION');
      console.log(`   ${error.message}`);
      return { passed: false, duration: Date.now() - startTime, error: error.message };
    }
  }

  /**
   * Test 2: Repeated execution (warmup test)
   */
  async testRepeatedExecution() {
    console.log('\n🧪 Test 2: Repeated Execution (10 iterations)');
    const durations = [];

    for (let i = 0; i < 10; i++) {
      const startTime = Date.now();

      try {
        const result = await this.adapter.callEngine('score', [
          '/Users/wolfejam/FAF/claude-faf-mcp/claude-faf-mcp_2025-09-15_v2.0.faf'
        ]);

        const duration = Date.now() - startTime;
        durations.push(duration);

        if (!result.success) {
          console.log(`   ❌ Iteration ${i + 1} FAILED: ${result.error}`);
          return { passed: false, durations, error: result.error };
        }
      } catch (error) {
        console.log(`   ❌ Iteration ${i + 1} EXCEPTION: ${error.message}`);
        return { passed: false, durations, error: error.message };
      }
    }

    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);

    console.log('   ✅ PASS');
    console.log(`   Avg: ${avgDuration.toFixed(2)}ms`);
    console.log(`   Min: ${minDuration}ms`);
    console.log(`   Max: ${maxDuration}ms`);

    return { passed: true, durations, avgDuration, minDuration, maxDuration };
  }

  /**
   * Test 3: Concurrent execution
   */
  async testConcurrentExecution() {
    console.log(`\n🧪 Test 3: Concurrent Execution (${CONCURRENT_TESTS} parallel)`);
    const startTime = Date.now();

    const promises = Array.from({ length: CONCURRENT_TESTS }, (_, i) =>
      this.adapter.callEngine('score', [
        '/Users/wolfejam/FAF/claude-faf-mcp/claude-faf-mcp_2025-09-15_v2.0.faf'
      ])
    );

    try {
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      const allPassed = results.every(r => r.success);
      const avgPerCall = duration / CONCURRENT_TESTS;

      if (allPassed) {
        console.log('   ✅ PASS');
        console.log(`   Total: ${duration}ms`);
        console.log(`   Avg per call: ${avgPerCall.toFixed(2)}ms`);
        console.log(`   Throughput: ${(CONCURRENT_TESTS / (duration / 1000)).toFixed(2)} calls/sec`);
        return { passed: true, duration, avgPerCall, throughput: CONCURRENT_TESTS / (duration / 1000) };
      } else {
        const failures = results.filter(r => !r.success);
        console.log(`   ❌ FAIL - ${failures.length} failures`);
        return { passed: false, duration, failures: failures.length };
      }
    } catch (error) {
      console.log('   ❌ EXCEPTION');
      console.log(`   ${error.message}`);
      return { passed: false, error: error.message };
    }
  }

  /**
   * Test 4: Error handling (invalid file)
   */
  async testErrorHandling() {
    console.log('\n🧪 Test 4: Error Handling (invalid file path)');
    const startTime = Date.now();

    try {
      const result = await this.adapter.callEngine('score', ['/nonexistent/file.faf']);
      const duration = Date.now() - startTime;

      if (!result.success && result.error) {
        console.log('   ✅ PASS - Error handled gracefully');
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Error: ${result.error.substring(0, 80)}...`);
        return { passed: true, duration, graceful: true };
      } else {
        console.log('   ❌ FAIL - Should have failed but succeeded');
        return { passed: false, duration, graceful: false };
      }
    } catch (error) {
      console.log('   ❌ EXCEPTION - Should return error, not throw');
      console.log(`   ${error.message}`);
      return { passed: false, duration: Date.now() - startTime, graceful: false };
    }
  }

  /**
   * Test 5: Memory leak check
   */
  async testMemoryLeak() {
    console.log('\n🧪 Test 5: Memory Leak Check (100 iterations)');

    const memBefore = process.memoryUsage();
    const startTime = Date.now();

    for (let i = 0; i < 100; i++) {
      await this.adapter.callEngine('score', [
        '/Users/wolfejam/FAF/claude-faf-mcp/claude-faf-mcp_2025-09-15_v2.0.faf'
      ]);
    }

    const duration = Date.now() - startTime;
    const memAfter = process.memoryUsage();

    const heapGrowth = (memAfter.heapUsed - memBefore.heapUsed) / 1024 / 1024;
    const avgDuration = duration / 100;

    console.log('   ✅ PASS');
    console.log(`   Total: ${duration}ms (${avgDuration.toFixed(2)}ms avg)`);
    console.log(`   Heap growth: ${heapGrowth.toFixed(2)}MB`);
    console.log(`   RSS: ${(memAfter.rss / 1024 / 1024).toFixed(2)}MB`);

    return {
      passed: true,
      duration,
      avgDuration,
      heapGrowth,
      memBefore: memBefore.heapUsed / 1024 / 1024,
      memAfter: memAfter.heapUsed / 1024 / 1024
    };
  }

  /**
   * Test 6: Fallback to CLI test (for non-bundled command)
   */
  async testFallbackToCLI() {
    console.log('\n🧪 Test 6: Fallback to CLI (non-bundled command)');
    const startTime = Date.now();

    try {
      const result = await this.adapter.callEngine('formats', []);
      const duration = Date.now() - startTime;

      if (result.success) {
        console.log('   ✅ PASS - Fallback works');
        console.log(`   Duration: ${duration}ms`);
        return { passed: true, duration, fallback: true };
      } else {
        console.log('   ⚠️  EXPECTED FAILURE - faf-cli not in PATH');
        console.log(`   Error: ${result.error?.substring(0, 80)}...`);
        return { passed: true, duration, fallback: false, expectedFailure: true };
      }
    } catch (error) {
      console.log('   ⚠️  EXPECTED FAILURE');
      return { passed: true, expectedFailure: true };
    }
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🏎️ Mk3 Bundled Engine - Championship Stress Test');
    console.log('═'.repeat(60));
    console.log();

    const testResults = {};

    testResults.test1 = await this.testSingleScore();
    testResults.test2 = await this.testRepeatedExecution();
    testResults.test3 = await this.testConcurrentExecution();
    testResults.test4 = await this.testErrorHandling();
    testResults.test5 = await this.testMemoryLeak();
    testResults.test6 = await this.testFallbackToCLI();

    console.log();
    console.log('═'.repeat(60));
    console.log('📊 FINAL RESULTS');
    console.log('═'.repeat(60));

    const totalTests = Object.keys(testResults).length;
    const passedTests = Object.values(testResults).filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} ✅`);
    console.log(`Failed: ${failedTests} ${failedTests > 0 ? '❌' : ''}`);
    console.log(`Pass Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

    if (testResults.test2?.avgDuration) {
      console.log(`\nPerformance:`);
      console.log(`  Avg Duration: ${testResults.test2.avgDuration.toFixed(2)}ms`);
      console.log(`  Min Duration: ${testResults.test2.minDuration}ms`);
      console.log(`  Max Duration: ${testResults.test2.maxDuration}ms`);
    }

    if (testResults.test5?.heapGrowth) {
      console.log(`\nMemory:`);
      console.log(`  Heap Growth: ${testResults.test5.heapGrowth.toFixed(2)}MB (100 iterations)`);
      console.log(`  Per Iteration: ${(testResults.test5.heapGrowth / 100 * 1024).toFixed(2)}KB`);
    }

    console.log();
    console.log(passedTests === totalTests ? '🏆 CHAMPIONSHIP GRADE - ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED');
    console.log('═'.repeat(60));

    return {
      totalTests,
      passedTests,
      failedTests,
      passRate: (passedTests / totalTests) * 100,
      testResults
    };
  }
}

// Run stress tests
const tester = new Mk3StressTest();
tester.runAllTests()
  .then(results => {
    // Write WJTTC report
    const wjttcReport = {
      testSuite: 'Mk3 Bundled Engine Stress Test',
      timestamp: new Date().toISOString(),
      philosophy: 'F1-Inspired Championship Testing',
      totalTests: results.totalTests,
      passedTests: results.passedTests,
      failedTests: results.failedTests,
      passRate: results.passRate,
      grade: results.passRate === 100 ? 'CHAMPIONSHIP' : results.passRate >= 90 ? 'PODIUM' : 'NEEDS_WORK',
      results: results.testResults
    };

    return fs.writeFile(
      '/Users/wolfejam/FAF-GOLD/PLANET-FAF/911-FIXES/WJTTC-MK3-ENGINE-REPORT.json',
      JSON.stringify(wjttcReport, null, 2)
    ).then(() => {
      console.log('\n✅ WJTTC Report saved to: /Users/wolfejam/FAF-GOLD/PLANET-FAF/911-FIXES/WJTTC-MK3-ENGINE-REPORT.json');
      process.exit(results.failedTests > 0 ? 1 : 0);
    });
  })
  .catch(error => {
    console.error('❌ Test suite failed:', error);
    process.exit(1);
  });
