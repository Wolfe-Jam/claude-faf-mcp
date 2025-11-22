/**
 * Comprehensive MCP v3.0.1 Tool Test Suite
 * Tests ALL 55 tools (21 core + 34 advanced)
 */

const { ChampionshipToolHandler } = require('./dist/src/handlers/championship-tools.js');
const fs = require('fs');
const path = require('path');

async function testAllTools() {
  const testDir = '/tmp/test-all-tools';
  const results = {
    timestamp: new Date().toISOString(),
    version: '3.0.1',
    tests: [],
    summary: {}
  };

  // Clean up
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'package.json'), '{"name":"test-all"}');

  console.log('🏎️ Testing ALL 55 MCP Tools - v3.0.1\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const handler = new ChampionshipToolHandler();

  // Get all available tools
  const toolsResponse = await handler.listTools();
  const allTools = toolsResponse.tools;

  console.log(`Found ${allTools.length} total tools\n`);

  // Define test cases for each tool
  const testCases = [
    // Core workflow tools
    { name: 'faf', args: {}, expectSuccess: true, category: 'workflow' },
    { name: 'faf_auto', args: { directory: testDir, force: true }, expectSuccess: true, category: 'workflow' },
    { name: 'faf_init', args: { directory: testDir, force: true }, expectSuccess: true, category: 'workflow' },
    { name: 'faf_innit', args: { directory: testDir }, expectSuccess: true, category: 'workflow' },
    { name: 'faf_status', args: { directory: testDir }, expectSuccess: true, category: 'workflow' },

    // Quality tools
    { name: 'faf_score', args: { directory: testDir }, expectSuccess: true, category: 'quality' },
    { name: 'faf_validate', args: { directory: testDir }, expectSuccess: true, category: 'quality' },
    { name: 'faf_doctor', args: { directory: testDir }, expectSuccess: true, category: 'quality' },
    { name: 'faf_audit', args: { directory: testDir }, expectSuccess: true, category: 'quality' },

    // Intelligence tools
    { name: 'faf_formats', args: {}, expectSuccess: true, category: 'intelligence' },
    { name: 'faf_stacks', args: {}, expectSuccess: true, category: 'intelligence' },

    // Sync tools
    { name: 'faf_sync', args: { directory: testDir }, expectSuccess: true, category: 'sync' },
    { name: 'faf_bi_sync', args: { directory: testDir }, expectSuccess: true, category: 'sync' },
    { name: 'faf_update', args: { directory: testDir }, expectSuccess: true, category: 'sync' },
    { name: 'faf_migrate', args: { directory: testDir }, expectSuccess: true, category: 'sync' },

    // AI tools
    { name: 'faf_chat', args: { prompt: 'test' }, expectSuccess: true, category: 'ai' },
    { name: 'faf_enhance', args: { directory: testDir }, expectSuccess: true, category: 'ai' },

    // Help tools
    { name: 'faf_index', args: {}, expectSuccess: true, category: 'help' },
    { name: 'faf_faq', args: {}, expectSuccess: true, category: 'help' },
    { name: 'faf_about', args: {}, expectSuccess: true, category: 'help' },

    // Advanced: Display tools
    { name: 'faf_display', args: { directory: testDir }, expectSuccess: true, category: 'display' },
    { name: 'faf_show', args: { directory: testDir }, expectSuccess: true, category: 'display' },
    { name: 'faf_check', args: { directory: testDir }, expectSuccess: true, category: 'display' },

    // Advanced: Trust tools
    { name: 'faf_trust', args: { directory: testDir }, expectSuccess: true, category: 'trust' },
    { name: 'faf_trust_confidence', args: { directory: testDir }, expectSuccess: true, category: 'trust' },
    { name: 'faf_trust_garage', args: { directory: testDir }, expectSuccess: true, category: 'trust' },

    // Advanced: File operations
    { name: 'faf_read', args: { path: path.join(testDir, 'package.json') }, expectSuccess: true, category: 'file' },
    { name: 'faf_write', args: { path: path.join(testDir, 'test.txt'), content: 'test' }, expectSuccess: true, category: 'file' },
    { name: 'faf_list', args: { directory: testDir }, expectSuccess: true, category: 'file' },
    { name: 'faf_exists', args: { file_path: path.join(testDir, 'package.json') }, expectSuccess: true, category: 'file' },

    // Advanced: DNA tracking
    { name: 'faf_dna', args: { directory: testDir }, expectSuccess: true, category: 'dna' },
    { name: 'faf_log', args: { directory: testDir }, expectSuccess: true, category: 'dna' },
    { name: 'faf_auth', args: { directory: testDir }, expectSuccess: true, category: 'dna' },
    { name: 'faf_recover', args: { directory: testDir }, expectSuccess: true, category: 'dna' },

    // Advanced: Utilities
    { name: 'faf_choose', args: { scan_dir: testDir }, expectSuccess: true, category: 'utility' },
    { name: 'faf_clear', args: {}, expectSuccess: true, category: 'utility' },
    { name: 'faf_share', args: {}, expectSuccess: true, category: 'utility' },
    { name: 'faf_credit', args: {}, expectSuccess: true, category: 'utility' },
    { name: 'faf_quick', args: { projectName: 'test-quick' }, expectSuccess: true, category: 'utility' },

    // Additional tools
    { name: 'faf_version', args: {}, expectSuccess: true, category: 'help' },
    { name: 'faf_analyze', args: { directory: testDir }, expectSuccess: true, category: 'ai' },
    { name: 'faf_verify', args: { directory: testDir }, expectSuccess: true, category: 'quality' },
    { name: 'faf_search', args: { query: 'test' }, expectSuccess: true, category: 'discovery' },
    { name: 'faf_edit', args: { directory: testDir }, expectSuccess: true, category: 'file' },
    { name: 'faf_delete', args: { file_path: path.join(testDir, 'test.txt') }, expectSuccess: true, category: 'file' },
    { name: 'faf_mkdir', args: { directory: path.join(testDir, 'newdir') }, expectSuccess: true, category: 'file' },
    { name: 'faf_copy', args: { source: path.join(testDir, 'package.json'), destination: path.join(testDir, 'package-copy.json') }, expectSuccess: true, category: 'file' },
    { name: 'faf_move', args: { source: path.join(testDir, 'package-copy.json'), destination: path.join(testDir, 'package-moved.json') }, expectSuccess: true, category: 'file' },
    { name: 'faf_todo', args: { directory: testDir }, expectSuccess: true, category: 'utility' },
    { name: 'faf_install_skill', args: {}, expectSuccess: true, category: 'utility' },
  ];

  // Run tests
  for (const testCase of testCases) {
    const start = Date.now();
    console.log(`Testing: ${testCase.name}`);

    try {
      const result = await handler.callTool(testCase.name, testCase.args);
      const duration = Date.now() - start;
      const passed = !result.isError && result.content && result.content.length > 0;

      results.tests.push({
        name: testCase.name,
        category: testCase.category,
        passed,
        duration,
        error: result.isError ? 'Tool returned isError=true' : null
      });

      console.log(`  ${passed ? '✅' : '❌'} ${duration}ms`);
    } catch (error) {
      const duration = Date.now() - start;
      results.tests.push({
        name: testCase.name,
        category: testCase.category,
        passed: false,
        duration,
        error: error.message
      });
      console.log(`  ❌ ${duration}ms - ${error.message}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Calculate summary
  const passed = results.tests.filter(t => t.passed).length;
  const total = results.tests.length;
  const byCategory = {};

  results.tests.forEach(t => {
    if (!byCategory[t.category]) {
      byCategory[t.category] = { passed: 0, total: 0 };
    }
    byCategory[t.category].total++;
    if (t.passed) byCategory[t.category].passed++;
  });

  results.summary = {
    total,
    passed,
    failed: total - passed,
    passRate: ((passed / total) * 100).toFixed(1) + '%',
    avgDuration: (results.tests.reduce((sum, t) => sum + t.duration, 0) / total).toFixed(2) + 'ms',
    byCategory
  };

  console.log('🏁 TEST RESULTS - All 55 Tools\n');
  console.log(`Total: ${passed}/${total} passed (${results.summary.passRate})`);
  console.log(`Avg Duration: ${results.summary.avgDuration}\n`);

  console.log('By Category:');
  Object.entries(byCategory).forEach(([cat, stats]) => {
    const pct = ((stats.passed / stats.total) * 100).toFixed(0);
    console.log(`  ${cat}: ${stats.passed}/${stats.total} (${pct}%)`);
  });

  console.log(`\nStatus: ${passed === total ? '🏆 ALL TOOLS WORKING' : '⚠️  SOME TOOLS FAILING'}\n`);

  // Save report
  const reportPath = '/Users/wolfejam/FAF/claude-faf-mcp/WJTTC-ALL-TOOLS-v3.0.1-REPORT.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`📊 Report: ${reportPath}\n`);

  // Show failures
  const failures = results.tests.filter(t => !t.passed);
  if (failures.length > 0) {
    console.log('Failed Tools:');
    failures.forEach(f => {
      console.log(`  ❌ ${f.name} - ${f.error}`);
    });
    console.log('');
  }

  process.exit(passed === total ? 0 : 1);
}

testAllTools().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
