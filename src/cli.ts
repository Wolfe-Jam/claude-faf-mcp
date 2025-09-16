#!/usr/bin/env node

import { program } from 'commander';
import { ClaudeFafMcpServer } from './server';
import * as path from 'path';

program
  .name('claude-faf-mcp')
  .description('Universal FAF MCP Server for Claude - AI Context Intelligence & Project Enhancement')
  .version('2.2.0')
  .option('-t, --transport <type>', 'Transport type (stdio|http-sse)', 'stdio')
  .option('-p, --port <number>', 'Port for HTTP-SSE transport', '3001')
  .option('--faf-engine <path>', 'Path to FAF CLI engine', 'faf')
  .option('--debug', 'Enable debug logging')
  .action(async (options) => {
    try {
      const server = new ClaudeFafMcpServer({
        transport: options.transport,
        port: options.transport === 'http-sse' ? parseInt(options.port) : undefined,
        fafEnginePath: options.fafEngine,
        debug: options.debug
      });

      await server.start();
    } catch (error) {
      console.error('Failed to start Claude FAF MCP Server:', error);
      process.exit(1);
    }
  });

program.parse();
