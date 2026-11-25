import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListResourcesRequestSchema, ListResourceTemplatesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema, ListPromptsRequestSchema, GetPromptRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { FafResourceHandler } from './handlers/resources';
import { FafSkillsHandler, SKILLS_EXTENSION } from './handlers/skills';
import { FafToolHandler } from './handlers/tools';
import { FafPromptHandler } from './handlers/prompts';
import { FafEngineAdapter } from './handlers/engine-adapter';
import { isError } from './utils/type-guards.js';
import { sanitizeToolResult, quietToolList } from './utils/sanitize-output.js';
import { VERSION } from './version';
import { SERVER_INSTRUCTIONS } from './instructions';

// The SDK has no types for the skills extension's methods; these are its
// request shapes from SEP-2640. A cursor is accepted and ignored: the whole
// catalog fits on one page.
const SkillsListRequestSchema = z.object({
  method: z.literal('skills/list'),
  params: z.object({ cursor: z.string().optional() }).passthrough().optional(),
});
const SkillsGetRequestSchema = z.object({
  method: z.literal('skills/get'),
  params: z.object({ uri: z.string() }).passthrough(),
});
const DirectoryReadRequestSchema = z.object({
  method: z.literal('resources/directory/read'),
  params: z.object({ uri: z.string(), cursor: z.string().optional() }).passthrough(),
});

export interface ClaudeFafMcpServerConfig {
  transport: 'stdio';
  port?: number;
  debug?: boolean;
  cors?: boolean;
  host?: string;
}

export class ClaudeFafMcpServer {
  private server: Server;
  private resourceHandler: FafResourceHandler;
  private toolHandler: FafToolHandler;
  private promptHandler: FafPromptHandler;
  private skillsHandler: FafSkillsHandler;
  private config: ClaudeFafMcpServerConfig;

  constructor(config: ClaudeFafMcpServerConfig) {
    this.config = {
      port: 3001,
      host: '0.0.0.0',
      cors: true,
      ...config
    };

    // Skills over MCP (SEP-2640): the skills in the package's skills/ folder.
    // The extension is declared only when there is a skill to serve.
    this.skillsHandler = new FafSkillsHandler();
    for (const problem of this.skillsHandler.problems) {
      console.error(`Skill skipped: ${problem}`);
    }

    this.server = new Server(
      {
        name: 'claude-faf-mcp',
        version: VERSION,
      },
      {
        capabilities: {
          // No subscribe/unsubscribe handler is registered, so do NOT advertise
          // `subscribe` — advertising it makes resources/subscribe -32601, which
          // trips strict clients / Glama's capability health-check. No list
          // ever changes while the server runs and no list_changed
          // notification is ever sent, so none is advertised.
          resources: {
            listChanged: false,
          },
          tools: {
            listChanged: false,
          },
          prompts: {
            listChanged: false,
          },
          ...(this.skillsHandler.hasSkills()
            ? { extensions: { [SKILLS_EXTENSION]: { directoryRead: true } } }
            : {}),
        },
        instructions: SERVER_INSTRUCTIONS,
      }
    );

    // The session's project and the bundled commands, shared by the handlers.
    const engineAdapter = new FafEngineAdapter();

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
      const { resources } = this.resourceHandler.listResources();
      return { resources: [...resources, ...this.skillsHandler.listResources()] };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      return this.skillsHandler.owns(uri)
        ? this.skillsHandler.readResource(uri)
        : this.resourceHandler.readResource(uri);
    });

    // Skills over MCP (SEP-2640): skills/list, skills/get and
    // resources/directory/read. Registered only when the extension is declared.
    if (this.skillsHandler.hasSkills()) {
      this.server.setRequestHandler(SkillsListRequestSchema, () => {
        return { resultType: 'complete', ...this.skillsHandler.listSkills() };
      });
      this.server.setRequestHandler(SkillsGetRequestSchema, (request) => {
        return { resultType: 'complete', ...this.skillsHandler.getSkill(request.params.uri) };
      });
      this.server.setRequestHandler(DirectoryReadRequestSchema, (request) => {
        return { resultType: 'complete', ...this.skillsHandler.readDirectory(request.params.uri) };
      });
    }

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
        request.params.arguments
      );
    });

    // Tool handlers
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return quietToolList(await this.toolHandler.listTools());
    });

    // callTool answers every failure of a known tool as an isError result the
    // model can read; the one error it throws is McpError InvalidParams
    // (-32602) for a tool name that does not exist.
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const startTime = Date.now();
      try {
        const result = await this.toolHandler.callTool(
          request.params.name,
          request.params.arguments
        );

        if (this.config.debug) {
          const duration = Date.now() - startTime;
          console.error(`Tool ${request.params.name} executed in ${duration}ms`);
        }

        return sanitizeToolResult(result);
      } catch (error: unknown) {
        const errorMessage = isError(error) ? error.message : 'Unknown error';
        console.error(`Tool call refused:`, errorMessage);
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
}

/**
 * Smithery sandbox support — lets Smithery scan the server's capabilities.
 * Builds the server without starting a transport. This module is the
 * package's `main`: importing it has no side effects.
 */
export function createSandboxServer(): Server {
  const wrapper = new ClaudeFafMcpServer({ transport: 'stdio' });
  return wrapper.getServer();
}
