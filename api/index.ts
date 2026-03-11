import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { CallToolRequestSchema, ListResourcesRequestSchema, ListToolsRequestSchema, ReadResourceRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { FafResourceHandler } from '../src/handlers/resources.js';
import { FafToolHandler } from '../src/handlers/tools.js';
import { FafEngineAdapter } from '../src/handlers/engine-adapter.js';
import express from 'express';
import cors from 'cors';

// Hardcode version for Vercel serverless compatibility (import assert crashes)
const VERSION = '5.2.0';

// Full MCP server for Vercel deployment
const app = express();

// Enable CORS
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept']
}));

app.use(express.json());

// Initialize MCP server
const mcpServer = new Server(
  {
    name: 'claude-faf-mcp',
    version: VERSION,
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

// Setup handlers
const engineAdapter = new FafEngineAdapter('faf');
const resourceHandler = new FafResourceHandler(engineAdapter);
const toolHandler = new FafToolHandler(engineAdapter);

mcpServer.setRequestHandler(ListResourcesRequestSchema, async () => {
  return resourceHandler.listResources();
});

mcpServer.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  return resourceHandler.readResource(request.params.uri);
});

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
  return toolHandler.listTools();
});

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
  return toolHandler.callTool(
    request.params.name,
    request.params.arguments ?? {}
  );
});

// Health endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: 'claude-faf-mcp',
    version: VERSION,
    transport: 'http-sse',
    timestamp: new Date().toISOString(),
    platform: 'vercel',
    tools: 33,
    format: 'application/vnd.faf+yaml'
  });
});

// Info endpoint
app.get('/info', async (req, res) => {
  const toolsList = await toolHandler.listTools();

  res.json({
    name: 'claude-faf-mcp',
    version: VERSION,
    description: 'Persistent project context for Claude — IANA-registered format (application/vnd.faf+yaml)',
    transport: 'http-sse',
    platform: 'vercel',
    capabilities: {
      resources: { subscribe: true, listChanged: true },
      tools: { listChanged: true }
    },
    tools: toolsList.tools.map(t => t.name),
    toolCount: toolsList.tools.length,
    endpoints: {
      health: '/health',
      info: '/info',
      sse: '/sse'
    }
  });
});

// Root endpoint - HTML landing page
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>claude-faf-mcp | Persistent Project Context</title>
  <meta name="description" content="33 MCP tools. Persistent project context. IANA-registered .faf format for Claude Desktop.">
  <meta property="og:title" content="claude-faf-mcp | Persistent Project Context">
  <meta property="og:description" content="33 MCP tools. Zero config. Persistent AI context for Claude Desktop.">
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>&#x1F9E1;</text></svg>">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;800;900&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, sans-serif;
      background: #0a0a0a;
      color: #fff;
      min-height: 100vh;
      position: relative;
    }
    body::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: radial-gradient(ellipse at 50% 30%, rgba(255, 140, 0, 0.06) 0%, transparent 60%);
      pointer-events: none;
    }
    .accent-line {
      position: fixed;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent 0%, #333 20%, #ff8c00 50%, #333 80%, transparent 100%);
      z-index: 10;
    }
    .container {
      position: relative;
      z-index: 1;
      max-width: 800px;
      margin: 0 auto;
      padding: 60px 40px 40px;
      text-align: center;
    }
    .logo {
      font-size: 100px;
      margin-bottom: 12px;
      filter: drop-shadow(0 0 30px rgba(255, 140, 0, 0.3));
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }
    h1 {
      font-size: 2.5rem;
      font-weight: 900;
      letter-spacing: -1px;
      margin-bottom: 8px;
      color: #fff;
    }
    .tagline {
      font-size: 1.1rem;
      color: #ff8c00;
      font-weight: 600;
      margin: 0.5rem 0 2rem 0;
    }
    .stats {
      display: flex;
      justify-content: center;
      gap: 48px;
      margin-bottom: 32px;
    }
    .stat-value { font-size: 2rem; font-weight: 800; color: #fff; }
    .stat-label { font-size: 11px; font-weight: 600; color: #555; text-transform: uppercase; letter-spacing: 1px; }
    .endpoints {
      background: rgba(255, 140, 0, 0.04);
      border: 1px solid rgba(255, 140, 0, 0.2);
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 32px;
      text-align: left;
    }
    .endpoints h2 { font-size: 14px; color: #ff8c00; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; }
    .endpoint {
      display: flex;
      justify-content: space-between;
      padding: 10px 12px;
      margin: 6px 0;
      background: rgba(0, 0, 0, 0.4);
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-size: 14px;
    }
    .endpoint-name { color: #ccc; }
    .endpoint-path { color: #ff8c00; }
    .deploy { margin-bottom: 32px; }
    .deploy h2 { font-size: 14px; color: #ff8c00; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 16px; }
    .deploy-grid {
      display: flex;
      gap: 16px;
      justify-content: center;
    }
    .deploy-option {
      background: rgba(255, 140, 0, 0.04);
      border: 1px solid rgba(255, 140, 0, 0.15);
      border-radius: 8px;
      padding: 16px 24px;
      flex: 1;
      max-width: 220px;
    }
    .deploy-option .label { font-size: 13px; font-weight: 700; color: #fff; margin-bottom: 4px; }
    .deploy-option .desc { font-size: 12px; color: #666; }
    .deploy-option code { font-size: 12px; color: #ff8c00; font-family: 'Courier New', monospace; }
    .bottom-bar {
      border-top: 1px solid rgba(255, 140, 0, 0.1);
      padding-top: 24px;
      text-align: center;
      font-size: 12px;
      color: #555;
    }
    .bottom-bar .links { margin-bottom: 8px; }
    .bottom-bar .iana { color: #777; font-style: italic; }
    a { color: #ff8c00; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="accent-line"></div>
  <div class="container">
    <div class="logo">\u{1F9E1}</div>
    <h1>claude-faf-mcp</h1>
    <div class="tagline">33 MCP tools &middot; Persistent project context &middot; IANA-registered format</div>

    <div class="stats">
      <div><div class="stat-value">33</div><div class="stat-label">MCP Tools</div></div>
      <div><div class="stat-value">0</div><div class="stat-label">Config Required</div></div>
      <div><div class="stat-value">19ms</div><div class="stat-label">Avg Response</div></div>
    </div>

    <div class="endpoints">
      <h2>Endpoints</h2>
      <div class="endpoint"><span class="endpoint-name">MCP SSE</span><span class="endpoint-path">/sse</span></div>
      <div class="endpoint"><span class="endpoint-name">Health Check</span><span class="endpoint-path">/health</span></div>
      <div class="endpoint"><span class="endpoint-name">Server Info</span><span class="endpoint-path">/info</span></div>
      <div class="endpoint"><span class="endpoint-name">Server Card</span><span class="endpoint-path">/.well-known/mcp/server-card.json</span></div>
    </div>

    <div class="deploy">
      <h2>Three Ways to Deploy</h2>
      <div class="deploy-grid">
        <div class="deploy-option">
          <div class="label">Hosted</div>
          <div class="desc">Point to this URL</div>
          <code>/sse</code>
        </div>
        <div class="deploy-option">
          <div class="label">Claude Desktop</div>
          <div class="desc">Zero config</div>
          <code>npx claude-faf-mcp</code>
        </div>
        <div class="deploy-option">
          <div class="label">Self-Deploy</div>
          <div class="desc">Your own Vercel</div>
          <code>vercel --prod</code>
        </div>
      </div>
    </div>

    <div class="bottom-bar">
      <div class="links">v\${VERSION} &bull; <a href="https://github.com/Wolfe-Jam/claude-faf-mcp">GitHub</a> &bull; <a href="https://npmjs.com/package/claude-faf-mcp">npm</a> &bull; <a href="https://faf.one">faf.one</a></div>
      <div class="iana">IANA-registered: application/vnd.faf+yaml</div>
    </div>
  </div>
</body>
</html>
  `);
});

// Smithery server-card.json — allows Smithery to discover capabilities without scanning
app.get('/.well-known/mcp/server-card.json', async (req, res) => {
  const toolsList = await toolHandler.listTools();
  res.json({
    serverInfo: { name: 'claude-faf-mcp', version: VERSION },
    authentication: { required: false },
    tools: toolsList.tools,
    resources: [],
    prompts: []
  });
});

// SSE endpoint - Full MCP with per-request transport
app.get('/sse', async (req, res) => {
  const transport = new SSEServerTransport('/sse', res);
  await mcpServer.connect(transport);

  req.on('close', () => {
    // Connection closed
  });
});

export default app;
