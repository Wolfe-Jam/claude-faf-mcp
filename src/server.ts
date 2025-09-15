import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { FafEngineAdapter } from './handlers/engine-adapter';
import { FafResourceHandler } from './handlers/resources';
import { FafToolHandler } from './handlers/tools';
import express from 'express';
import cors from 'cors';

export interface ClaudeFafMcpServerConfig {
  transport: 'stdio' | 'http-sse';
  port?: number;
  fafEnginePath: string;
  debug?: boolean;
  cors?: boolean;
  host?: string;
}

export class ClaudeFafMcpServer {
  private server: Server;
  private engineAdapter: FafEngineAdapter;
  private resourceHandler: FafResourceHandler;
  private toolHandler: FafToolHandler;
  private config: ClaudeFafMcpServerConfig;
  private httpServer?: any;

  constructor(config: ClaudeFafMcpServerConfig) {
    this.config = {
      port: 3001,
      host: '0.0.0.0',
      cors: true,
      ...config
    };
    
    this.server = new Server(
      {
        name: 'claude-faf-mcp',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {
            subscribe: true,
            listChanged: true,
          },
          tools: {
            listChanged: true,
          },
        },
      }
    );

    this.engineAdapter = new FafEngineAdapter(config.fafEnginePath);
    this.resourceHandler = new FafResourceHandler(this.engineAdapter);
    this.toolHandler = new FafToolHandler(this.engineAdapter);

    this.setupHandlers();
  }
  
  private setupHandlers(): void {
    // Resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return this.resourceHandler.listResources();
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return this.resourceHandler.readResource(request.params.uri);
    });

    // Tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return this.toolHandler.listTools();
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      try {
        const result = await this.toolHandler.callTool(
          request.params.name,
          request.params.arguments || {}
        );
        
        if (this.config.debug) {
          const duration = Date.now() - startTime;
          console.error(`Tool ${request.params.name} executed in ${duration}ms`);
        }
        
        return result;
      } catch (error) {
        console.error(`Tool execution failed:`, error);
        throw error;
      }
    });
  }

  private createHttpApp(): express.Application {
    const app = express();
    
    // Enable CORS if requested
    if (this.config.cors) {
      app.use(cors({
        origin: true,
        credentials: true,
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
      }));
    }

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        server: 'claude-faf-mcp',
        version: '1.0.0',
        transport: 'http-sse',
        timestamp: new Date().toISOString(),
        fafEngine: this.engineAdapter.getEnginePath()
      });
    });

    // Server info endpoint
    app.get('/info', (req, res) => {
      res.json({
        name: 'claude-faf-mcp',
        version: '1.0.0',
        description: 'Universal FAF MCP Server for Claude - AI Context Intelligence & Project Enhancement',
        transport: 'http-sse',
        capabilities: {
          resources: { subscribe: true, listChanged: true },
          tools: { listChanged: true }
        },
        tools: [
          'faf_status', 'faf_score', 'faf_init', 'faf_trust',
          'faf_sync', 'faf_enhance', 'faf_bi_sync', 'faf_clear', 'faf_debug'
        ]
      });
    });

    return app;
  }

  async start(): Promise<void> {
    if (this.config.transport === 'stdio') {
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      if (this.config.debug) {
        console.error('Claude FAF MCP Server started with stdio transport');
      }
    } else if (this.config.transport === 'http-sse') {
      const app = this.createHttpApp();
      
      // Create SSE transport
      const transport = new SSEServerTransport('/sse', app as any);
      await this.server.connect(transport);
      
      // Start HTTP server (ensure port and host are defined)
      const port = this.config.port || 3001;
      const host = this.config.host || '0.0.0.0';
      this.httpServer = app.listen(port, host, () => {
        if (this.config.debug) {
          console.error(`Claude FAF MCP Server started with HTTP/SSE transport on ${host}:${port}`);
          console.error(`SSE endpoint: http://${this.config.host}:${this.config.port}/sse`);
          console.error(`Health check: http://${this.config.host}:${this.config.port}/health`);
        }
      });

      // Handle server errors
      this.httpServer.on('error', (error: any) => {
        console.error('HTTP server error:', error);
        throw error;
      });
    } else {
      throw new Error(`Unsupported transport: ${this.config.transport}`);
    }
  }

  async stop(): Promise<void> {
    if (this.httpServer) {
      return new Promise((resolve) => {
        this.httpServer.close(() => {
          if (this.config.debug) {
            console.error('Claude FAF MCP Server HTTP/SSE transport stopped');
          }
          resolve();
        });
      });
    }
  }

  getServerInfo() {
    return {
      name: 'claude-faf-mcp',
      version: '1.0.0',
      transport: this.config.transport,
      port: this.config.port,
      host: this.config.host,
      fafEngine: this.engineAdapter.getEnginePath()
    };
  }
}
