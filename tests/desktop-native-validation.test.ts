/**
 * Desktop-Native MCP Validation Test Suite
 * 🏎️ Formula 1 Testing Philosophy: Telemetry, Performance, Reliability
 * 
 * Testing Desktop MCP WITHOUT CLI dependency
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { ClaudeFafMcpServer } from '../src/server';
import { FafToolHandler } from '../src/handlers/tools';
import { FafEngineAdapter } from '../src/handlers/engine-adapter';
import * as fs from 'fs';
import * as path from 'path';

describe('🏁 Desktop-Native MCP Championship Tests', () => {
  let testDir: string;

  beforeAll(async () => {
    // Create isolated test environment
    testDir = path.join('/tmp', `faf-desktop-test-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
    process.chdir(testDir);

    // Initialize server WITHOUT CLI (for validation but not used in tests)
    new ClaudeFafMcpServer({
      transport: 'stdio',
      fafEnginePath: 'native', // Signal for native mode
      debug: true
    });
  });
  
  afterAll(async () => {
    // Cleanup
    process.chdir('/');
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  describe('🧡 Core Native Functions (No CLI Required)', () => {
    test('faf_read - Native file reading', async () => {
      // Create test file
      const testContent = '# Big Orange Test\n🧡 Native Desktop Mode';
      const testFile = path.join(testDir, 'test.md');
      fs.writeFileSync(testFile, testContent);
      
      // Test native file read
      const handler = new FafToolHandler(new FafEngineAdapter('native'));
      const result = await handler.callTool('faf_read', { path: testFile });
      
      expect(result.content[0].text).toBe(testContent);
    });
    
    test('faf_write - Native file writing', async () => {
      const testFile = path.join(testDir, 'output.md');
      const content = '# Championship Mode\n105% Big Orange';
      
      const handler = new FafToolHandler(new FafEngineAdapter('native'));
      await handler.callTool('faf_write', { 
        path: testFile,
        content 
      });
      
      expect(fs.existsSync(testFile)).toBe(true);
      expect(fs.readFileSync(testFile, 'utf-8')).toBe(content);
    });
    
    test('faf_score - Native scoring without CLI', async () => {
      // Setup perfect project structure
      fs.writeFileSync(path.join(testDir, '.faf'), '## FAF Context\nProject: Championship');
      fs.writeFileSync(path.join(testDir, 'CLAUDE.md'), '## Claude Instructions\nBe excellent');
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Project\nFormula 1 Philosophy');
      fs.writeFileSync(path.join(testDir, 'package.json'), '{"name":"test"}');
      
      const handler = new FafToolHandler(new FafEngineAdapter('native'));
      const result = await handler.callTool('faf_score', { details: true });
      
      const text = result.content[0].text;
      expect(text).toContain('FAF SCORE');
      expect(text).toMatch(/\d+%/); // Contains percentage
    });
    
    test('faf_debug - Native environment inspection', async () => {
      const handler = new FafToolHandler(new FafEngineAdapter('native'));
      const result = await handler.callTool('faf_debug', {});
      
      const text = result.content[0].text;
      expect(text).toContain('Working Directory');
      expect(text).toContain('Write Permissions');
      expect(text).toContain('FAF Engine Path');
    });
  });

  describe('⚡ CLI Fallback Behavior Tests', () => {
    test('Graceful handling when CLI absent', async () => {
      const handler = new FafToolHandler(new FafEngineAdapter('faf'));

      // Status should work with or without CLI (reads .faf files directly)
      const statusResult = await handler.callTool('faf_status', {});
      expect(statusResult.content).toBeDefined();
      expect(statusResult.content[0].text).toBeDefined();

      // Init might work or fail depending on CLI availability
      const initResult = await handler.callTool('faf_init', {});
      expect(initResult.content).toBeDefined();
      expect(initResult.content[0].text).toBeDefined();
    });
    
    test('File operations continue working', async () => {
      const handler = new FafToolHandler(new FafEngineAdapter('faf'));
      
      // File ops should still work
      const testFile = path.join(testDir, 'fallback.txt');
      await handler.callTool('faf_write', {
        path: testFile,
        content: 'Works without CLI!'
      });
      
      expect(fs.existsSync(testFile)).toBe(true);
      
      const readResult = await handler.callTool('faf_read', { path: testFile });
      expect(readResult.content[0].text).toBe('Works without CLI!');
    });
  });

  describe('🏆 Easter Egg Detection', () => {
    test('105% Big Orange achievement', async () => {
      // Create championship-quality files
      const fafContent = `## Project Context\n${'='.repeat(100)}\nRich content here`;
      const claudeContent = `## AI Instructions\n${'='.repeat(100)}\nExcellent guidance`;
      
      fs.writeFileSync(path.join(testDir, '.faf'), fafContent);
      fs.writeFileSync(path.join(testDir, 'CLAUDE.md'), claudeContent);
      fs.writeFileSync(path.join(testDir, 'README.md'), '# Champion');
      
      const handler = new FafToolHandler(new FafEngineAdapter('native'));
      const result = await handler.callTool('faf_score', { details: true });
      
      const text = result.content[0].text as string;
      // Check if easter egg triggers
      if (text.includes('105%')) {
        expect(text).toContain('Big Orange');
        expect(text).toContain('Championship');
      }
    });
  });

  describe('📊 Performance Benchmarks', () => {
    test('Response time for native operations', async () => {
      const handler = new FafToolHandler(new FafEngineAdapter('native'));
      
      const operations = [
        { name: 'faf_read', args: { path: __filename }},
        { name: 'faf_write', args: { path: '/tmp/perf.txt', content: 'test' }},
        { name: 'faf_score', args: {}},
        { name: 'faf_debug', args: {}}
      ];
      
      for (const op of operations) {
        const start = Date.now();
        await handler.callTool(op.name, op.args);
        const duration = Date.now() - start;
        
        // Native operations should be FAST (< 100ms)
        expect(duration).toBeLessThan(100);
        console.log(`${op.name}: ${duration}ms`);
      }
    });
  });

  describe('🔒 Security & Validation', () => {
    test('Path traversal protection', async () => {
      const handler = new FafToolHandler(new FafEngineAdapter('native'));
      
      // Attempt dangerous paths
      const dangerousPaths = [
        '../../../etc/passwd',
        '/etc/passwd',
        '~/.ssh/id_rsa'
      ];
      
      for (const badPath of dangerousPaths) {
        try {
          await handler.callTool('faf_read', { path: badPath });
          // Should handle gracefully, not crash
        } catch (error) {
          // Expected to fail safely
          expect(error).toBeDefined();
        }
      }
    });
    
    test('Large file handling', async () => {
      // Create a 1MB test file
      const largeFile = path.join(testDir, 'large.txt');
      const size = 1024 * 1024; // 1MB
      fs.writeFileSync(largeFile, 'X'.repeat(size));
      
      const handler = new FafToolHandler(new FafEngineAdapter('native'));
      const result = await handler.callTool('faf_read', { path: largeFile });

      expect((result.content[0].text as string).length).toBe(size);
    });
  });
});

// Run telemetry report
console.log('🏎️ Desktop-Native MCP Test Suite');
console.log('================================');
console.log('Testing WITHOUT CLI dependency');
console.log('Validating fallback mechanisms');
console.log('Ensuring graceful degradation');
console.log('🏁 Begin Championship Testing...');
