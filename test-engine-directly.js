/**
 * Test the Mk3 bundled engine directly - no MCP handler
 */

const { initFafFile } = require('./dist/src/faf-core/commands/init.js');
const { autoCommand } = require('./dist/src/faf-core/commands/auto.js');
const { FafEngineAdapter } = require('./dist/src/handlers/engine-adapter.js');
const fs = require('fs');
const path = require('path');

async function testEngineDirect() {
  const testDir = '/tmp/test-engine-direct';

  // Clean up
  if (fs.existsSync(testDir)) {
    fs.rmSync(testDir, { recursive: true });
  }
  fs.mkdirSync(testDir, { recursive: true });
  fs.writeFileSync(path.join(testDir, 'package.json'), '{"name":"test"}');

  console.log('🧪 Testing Mk3 Engine Directly\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test 1: Call initFafFile directly (like test-mk3.js does)
  console.log('TEST 1: initFafFile() direct call');
  try {
    const result = await initFafFile(testDir, { force: true });
    console.log('   Success:', result.success);
    console.log('   File created:', fs.existsSync(path.join(testDir, 'project.faf')));
    console.log('   Error:', result.error || 'none');
    console.log('');
  } catch (err) {
    console.log('   FAILED:', err.message);
    console.log('');
  }

  // Test 2: Call through FafEngineAdapter (like MCP handlers do)
  console.log('TEST 2: FafEngineAdapter.callEngine("init")');
  const testDir2 = '/tmp/test-engine-adapter';
  if (fs.existsSync(testDir2)) {
    fs.rmSync(testDir2, { recursive: true });
  }
  fs.mkdirSync(testDir2, { recursive: true });
  fs.writeFileSync(path.join(testDir2, 'package.json'), '{"name":"test2"}');

  try {
    const adapter = new FafEngineAdapter();
    adapter.setWorkingDirectory(testDir2);
    const result = await adapter.callEngine('init', ['--force']);
    console.log('   Success:', result.success);
    console.log('   File created:', fs.existsSync(path.join(testDir2, 'project.faf')));
    console.log('   Error:', result.error || 'none');
    console.log('   Data:', JSON.stringify(result.data, null, 2).substring(0, 200));
    console.log('');
  } catch (err) {
    console.log('   FAILED:', err.message);
    console.log('');
  }

  // Test 3: autoCommand direct
  console.log('TEST 3: autoCommand() direct call');
  const testDir3 = '/tmp/test-auto-direct';
  if (fs.existsSync(testDir3)) {
    fs.rmSync(testDir3, { recursive: true });
  }
  fs.mkdirSync(testDir3, { recursive: true });
  fs.writeFileSync(path.join(testDir3, 'package.json'), '{"name":"test3"}');

  try {
    const result = await autoCommand(testDir3, { force: true });
    console.log('   Success:', result.success);
    console.log('   File created:', fs.existsSync(path.join(testDir3, 'project.faf')));
    console.log('   Error:', result.error || 'none');
    console.log('');
  } catch (err) {
    console.log('   FAILED:', err.message);
    console.log('');
  }

  // Test 4: autoCommand through adapter
  console.log('TEST 4: FafEngineAdapter.callEngine("auto")');
  const testDir4 = '/tmp/test-auto-adapter';
  if (fs.existsSync(testDir4)) {
    fs.rmSync(testDir4, { recursive: true });
  }
  fs.mkdirSync(testDir4, { recursive: true });
  fs.writeFileSync(path.join(testDir4, 'package.json'), '{"name":"test4"}');

  try {
    const adapter = new FafEngineAdapter();
    adapter.setWorkingDirectory(testDir4);
    const result = await adapter.callEngine('auto', ['--force']);
    console.log('   Success:', result.success);
    console.log('   File created:', fs.existsSync(path.join(testDir4, 'project.faf')));
    console.log('   Error:', result.error || 'none');
    console.log('   Data:', JSON.stringify(result.data, null, 2).substring(0, 200));
    console.log('');
  } catch (err) {
    console.log('   FAILED:', err.message);
    console.log('');
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

testEngineDirect().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
