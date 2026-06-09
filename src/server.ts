import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListResourcesRequestSchema, ListResourceTemplatesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { FafResourceHandler } from './handlers/resources';
import { FafToolHandler } from './handlers/tools';
import { FafPromptHandler } from './handlers/prompts';
import { FafEngineAdapter } from './handlers/engine-adapter';
import { isError } from './utils/type-guards.js';
import { sanitizeToolResult } from './utils/sanitize-output.js';
import { VERSION } from './version';

export interface ClaudeFafMcpServerConfig {
  transport: 'stdio';
  port?: number;
  fafEnginePath: string;
  debug?: boolean;
  cors?: boolean;
  host?: string;
}

export class ClaudeFafMcpServer {
  private server: Server;
  private resourceHandler: FafResourceHandler;
  private toolHandler: FafToolHandler;
  private promptHandler: FafPromptHandler;
  private config: ClaudeFafMcpServerConfig;

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
        version: VERSION,
      },
      {
        capabilities: {
          // No subscribe/unsubscribe handler is registered, so do NOT advertise
          // `subscribe` — advertising it makes resources/subscribe -32601, which
          // trips strict clients / Glama's capability health-check.
          resources: {
            listChanged: true,
          },
          tools: {
            listChanged: true,
          },
          prompts: {
            listChanged: false,
          },
        },
      }
    );

    // Create engine adapter to pass to handlers
    const engineAdapter = new FafEngineAdapter(config.fafEnginePath);

    this.resourceHandler = new FafResourceHandler(engineAdapter);
    this.toolHandler = new FafToolHandler(engineAdapter);
    this.promptHandler = new FafPromptHandler();

    this.setupHandlers();
  }
  
  /** Expose the raw MCP Server instance (used by Smithery sandbox scanning) */
  getServer(): Server {
    return this.server;
  }

  private setupHandlers(): void {
    // Resource handlers
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return this.resourceHandler.listResources();
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      return this.resourceHandler.readResource(request.params.uri);
    });

    // Resource templates: none defined. The advertised `resources` capability
    // must answer this method with a valid (empty) list rather than -32601 —
    // strict clients and Glama's MCP Inspector probe every advertised capability.
    this.server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => {
      return { resourceTemplates: [] };
    });

    // Prompt handlers
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      return this.promptHandler.listPrompts();
    });

    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      return this.promptHandler.getPrompt(
        request.params.name,
        request.params.arguments as Record<string, string> | undefined
      );
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
          request.params.arguments ?? {}
        );
        
        if (this.config.debug) {
          const duration = Date.now() - startTime;
          console.error(`Tool ${request.params.name} executed in ${duration}ms`);
        }
        
        return sanitizeToolResult(result);
      } catch (error: unknown) {
        const errorMessage = isError(error) ? error.message : 'Unknown error';
        console.error(`Tool execution failed:`, errorMessage);
        throw error;
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    if (this.config.debug) {
      console.error('Claude FAF MCP Server started with stdio transport');
    }
  }

  async stop(): Promise<void> {
    // stdio transport requires no teardown beyond process exit.
  }

  getServerInfo() {
    return {
      name: 'claude-faf-mcp',
      version: VERSION,
      transport: this.config.transport,
      port: this.config.port,
      host: this.config.host,
      championship: 'v5.4.0 - 32 tools + faf prompt'
    };
  }
}
