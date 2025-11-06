#!/usr/bin/env node
/**
 * Test script for bundled init and auto commands
 */

import { FafEngineAdapter } from './dist/src/handlers/engine-adapter.js';
import { promises as fs } from 'fs';
import * as path from 'path';

async function testInitAuto() {
  console.log('🧪 Testing Mk3 Bundled Init & Auto Commands\n');

  const adapter = new FafEngineAdapter();
  const testDir = '/tmp/faf-test-' + Date.now();

  // Create test directory
  await fs.mkdir(testDir, { recursive: true });

  // Create a simple package.json to make it look like a project
  await fs.writeFile(
    path.join(testDir, 'package.json'),
    JSON.stringify({
      name: 'test-project',
      version: '1.0.0',
      description: 'A test project for Mk3 engine'
    }, null, 2)
  );

  try {
    // Test 1: INIT command
    console.log('Test 1: Bundled INIT command');
    const startInit = Date.now();
    const initResult = await adapter.callEngine('init', [testDir]);
    const initDuration = Date.now() - startInit;

    if (initResult.success) {
      console.log('   ✅ PASS');
      console.log(`   Duration: ${initDuration}ms`);
      console.log(`   Output path: ${initResult.data.outputPath}`);
      console.log(`   Project type: ${initResult.data.projectType}`);
      console.log(`   Score: ${initResult.data.score}%`);
    } else {
      console.log('   ❌ FAIL');
      console.log(`   Error: ${initResult.error}`);
    }

    // Clean up for auto test
    await fs.rm(testDir, { recursive: true, force: true });
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(
      path.join(testDir, 'package.json'),
      JSON.stringify({
        name: 'test-project-2',
        version: '1.0.0',
        description: 'A test project for auto command'
      }, null, 2)
    );

    // Test 2: AUTO command (should init + score)
    console.log('\nTest 2: Bundled AUTO command');
    const startAuto = Date.now();
    const autoResult = await adapter.callEngine('auto', [testDir]);
    const autoDuration = Date.now() - startAuto;

    if (autoResult.success) {
      console.log('   ✅ PASS');
      console.log(`   Duration: ${autoDuration}ms`);
      console.log(`   Phase: ${autoResult.data.phase}`);
      if (autoResult.data.initResult) {
        console.log(`   Init: ${autoResult.data.initResult.success ? 'created' : 'skipped'}`);
      }
      if (autoResult.data.scoreResult) {
        console.log(`   Score: ${autoResult.data.scoreResult.score}%`);
      }
    } else {
      console.log('   ❌ FAIL');
      console.log(`   Error: ${autoResult.error}`);
    }

    // Test 3: AUTO on existing .faf (should skip init)
    console.log('\nTest 3: AUTO on existing .faf file');
    const startAuto2 = Date.now();
    const autoResult2 = await adapter.callEngine('auto', [testDir]);
    const auto2Duration = Date.now() - startAuto2;

    if (autoResult2.success) {
      console.log('   ✅ PASS');
      console.log(`   Duration: ${auto2Duration}ms`);
      console.log(`   Init: ${autoResult2.data.initResult ? 'ran' : 'skipped (already exists)'}`);
      console.log(`   Score: ${autoResult2.data.scoreResult.score}%`);
    } else {
      console.log('   ❌ FAIL');
      console.log(`   Error: ${autoResult2.error}`);
    }

    console.log('\n🏁 Tests complete!');
    console.log(`\n📊 Summary:`);
    console.log(`   Init Duration: ${initDuration}ms`);
    console.log(`   Auto Duration (first): ${autoDuration}ms`);
    console.log(`   Auto Duration (existing): ${auto2Duration}ms`);

  } finally {
    // Cleanup
    await fs.rm(testDir, { recursive: true, force: true });
    console.log(`\n🗑️  Cleaned up test directory: ${testDir}`);
  }
}

testInitAuto().catch(console.error);
