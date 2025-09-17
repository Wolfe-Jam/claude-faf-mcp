#!/usr/bin/env node

// Quick test for the new scorecard functionality
const { ChampionshipToolHandler } = require('./dist/src/handlers/championship-tools.js');

async function testScorecard() {
  console.log('🏁 Testing FAF Championship Scorecard...\n');

  const handler = new ChampionshipToolHandler();

  // Test 1: Basic score
  console.log('Test 1: Basic markdown scorecard');
  console.log('================================');
  const result1 = await handler.callTool('faf_score', { directory: '.' });
  console.log(result1.content[0].text);

  console.log('\n\nTest 2: ASCII format');
  console.log('====================');
  const result2 = await handler.callTool('faf_score', {
    directory: '.',
    format: 'ascii'
  });
  console.log(result2.content[0].text);

  console.log('\n\nTest 3: JSON format');
  console.log('===================');
  const result3 = await handler.callTool('faf_score', {
    directory: '.',
    format: 'json'
  });
  console.log(result3.content[0].text);

  console.log('\n\n🏆 All scorecard tests complete!');
}

testScorecard().catch(console.error);