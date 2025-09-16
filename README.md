# 🏎️⚡️ Claude FAF MCP Server
## F1-Inspired AI Context Management for Planet Claude

> **🏁 TESTING CENTER: [`/Users/wolfejam/faf-test-environment`](./WOLFEJAM_TESTING_CENTER.md) | [View Dashboard](file:///Users/wolfejam/FAF/claude-faf-mcp/TESTING_CENTER_DASHBOARD.html) 🏁**

> **Claude FAF MCP Server | AI-Context on-demand management with bi-sync for Claude Users of all levels, with C.O.R.E performance faf-engine-Mk1**

Transform your projects into AI-optimized collaboration spaces with **C.O.R.E (Comprehensive, Optimized, Relentless, Empirical) performance** powered by the **faf-engine-Mk1** architecture.

[![MCP](https://img.shields.io/badge/MCP-Model%20Context%20Protocol-blue)](https://modelcontextprotocol.io)
[![Claude Desktop](https://img.shields.io/badge/Claude-Desktop%20Ready-purple)](https://claude.ai)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue)](https://www.typescriptlang.org/)
[![F1-Inspired](https://img.shields.io/badge/Philosophy-F1--Inspired-red)](https://github.com/faf-dev/claude-faf-mcp)

## 🍊 ZERO FAF | FAFFLESS AI

**We ARE the C in MCP.** Vitamin Context for healthy AI. I⚡🍊

## 🤖 What is Claude FAF MCP?

The **Claude FAF MCP Server** provides 33 honest file operations for Claude Desktop. **ENJOY this in Desktop - FAF CLI will be right behind it!**

Currently delivers:
- ✅ Native file operations (read, write, list, etc.)
- ✅ <50ms performance guaranteed
- ✅ Works WITHOUT external dependencies
- 🔜 Full FAF CLI integration coming soon for scoring & enhancement

### 💡 PRO TIP: The Perfect Workflow

**Drop a project file → Instant context!** Here's the flow:
1. Drop your `package.json`, `requirements.txt`, or `README.md` into Claude
2. Claude instantly knows what you're working on
3. For new projects: Claude creates `claude.md`, you create `.faf`
4. The AI-Context becomes **permanent glue** - your project understanding persists!

*"Once you drop that first file, the context sticks. No more explaining your project every chat!"*

### Key Benefits

- 🧠 **Intelligent Context**: Automatically analyzes and optimizes your project for AI collaboration
- ⚡ **Real-time Sync**: Bi-directional synchronization between `.faf` context and `claude.md` 
- 📈 **AI Scoring**: Get detailed metrics on your project's AI-readiness
- 🎯 **Claude-Optimized**: Specially tuned for optimal Claude performance
- 🌐 **Universal**: Works with Claude Desktop, Claude Web, and Claude API

## 💭 The World's First AI-Validated Developer Tool?

### What the BIG-3 AI's themselves Say:

| Platform | Score | Verdict |
|----------|-------|---------|
| **Claude (Anthropic)** | 9.5/10 | *"Should become the standard"* |
| **OpenAI Codex** | 9/10 | *"Every project should have one"* |
| **Google Gemini** | 9.5/10 | *"README evolution for AI era"* |

> **"its so logical [.faf] if it didn't exist, AI would have built it itself"** - Claude Code

> **"package.json gives me a list of dependencies, .faf shows me what to do with them"** - Claude Code

> **"package.json wasn't built for this, .faf was"** - .faf Inventor

## 🏁 WOLFEJAM TESTING CENTER

**📍 Location: `/Users/wolfejam/faf-test-environment`**
**📊 Dashboard: [Open Testing Dashboard](file:///Users/wolfejam/FAF/claude-faf-mcp/TESTING_CENTER_DASHBOARD.html)**
**📝 Full Guide: [WOLFEJAM_TESTING_CENTER.md](./WOLFEJAM_TESTING_CENTER.md)**

### Quick Test Commands
```bash
# Run Desktop MCP Test (ONE WAY TRACK - Permanent Record)
./DESKTOP_MCP_TEST_INTEGRATION.sh

# View Test Dashboard
open TESTING_CENTER_DASHBOARD.html

# Check Latest Results
ls -la /Users/wolfejam/faf-test-environment/DESKTOP_MCP_TESTS/
```

**⚠️ ONE WAY TRACK: No deletions allowed - permanent test records only!**

## 🚀 Quick Start

### Prerequisites

- Node.js 18+

### Installation

```bash
npm install -g claude-faf-mcp
```

### Configuration

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "claude-faf": {
      "command": "claude-faf-mcp",
      "args": ["--transport", "stdio"]
    }
  }
}
```

Or for development with a local FAF build:

```json
{
  "mcpServers": {
    "claude-faf": {
      "command": "claude-faf-mcp", 
      "args": [
        "--transport", "stdio",
        "--faf-engine", "/path/to/your/faf/cli"
      ]
    }
  }
}
```

## 🛠️ Available Tools

The server provides 9 powerful tools for AI-enhanced development:

### Core Analysis
- **`faf_status`** - Get comprehensive project status and AI readiness metrics
- **`faf_score`** - Calculate AI collaboration score with detailed breakdown
- **`faf_debug`** - Debug server environment and FAF CLI connectivity

### Project Management  
- **`faf_init`** - Initialize FAF context with intelligent stack detection
- **`faf_trust`** - Validate context integrity and trust metrics
- **`faf_clear`** - Clear caches and reset state

### Context Optimization
- **`faf_enhance`** - Claude-optimized AI enhancement with multi-model support
- **`faf_sync`** - Synchronize .faf context with claude.md
- **`faf_bi_sync`** - Bi-directional sync with real-time watching

## 📖 Usage Examples

### Initialize a New Project

```
Use the faf_init tool to set up FAF context for your project.
```

### Check Project Health

```
Use faf_status to see your project's AI collaboration metrics:
- Context quality score
- AI readiness level  
- Performance metrics
- Claude compatibility rating
```

### Optimize for Claude

```
Use faf_enhance with model="claude" and focus="claude-optimal" 
to get the best possible Claude collaboration experience.
```

### Sync with Claude.md

```
Use faf_bi_sync to maintain automatic synchronization between 
your .faf context and claude.md file for seamless collaboration.
```

## ⚙️ Configuration Options

The server accepts several command-line options:

- `--transport <stdio|http-sse>` - Transport protocol (default: stdio)
- `--port <number>` - Port for HTTP-SSE transport (default: 3001) 
- `--faf-engine <path>` - Path to FAF CLI (default: 'faf' global command)
- `--debug` - Enable debug logging

## 🏗️ Development Setup

### Local Development

1. Clone and install dependencies:
```bash
git clone https://github.com/faf-dev/claude-faf-mcp.git
cd claude-faf-mcp
npm install
```

2. Build the project:
```bash
npm run build
```

3. Test locally:
```bash
npm run dev:stdio
```

4. Add to Claude config with local path:
```json
{
  "mcpServers": {
    "claude-faf-dev": {
      "command": "npx",
      "args": ["ts-node", "src/cli.ts", "--transport", "stdio"],
      "cwd": "/path/to/claude-faf-mcp"
    }
  }
}
```

### Testing

Run the test suite:
```bash
npm test
```

Test MCP protocol compliance:
```bash
npm run test:mcp
```

## 📋 Requirements

- **Node.js**: Version 18 or higher
- **FAF CLI**: Installed and accessible in PATH
- **Claude Desktop**: Latest version with MCP support
- **Operating System**: macOS, Linux, or Windows

## 📊 Real Performance Metrics

```
📈 Project Status: CHAMPION
├─ 💎 Context Quality: 100% 
├─ 🤖 AI Readiness: Universal
├─ ⚡ Performance: 38ms average
├─ 🧡 Community: Growing daily
└─ 📈 Enterprise Ready: Day One
```

## 🏁 The F1-Inspired Philosophy

We build software with F1-Inspired principles:

1. **Precision Engineering** - Every line purposeful
2. **Performance Obsession** - Milliseconds matter
3. **Continuous Innovation** - Always improving
4. **Championship Standards** - Only the best survives

*Created by 🏎️⚡️wolfejam, F1-fanatic and inventor of .faf*

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

## 🙋 Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/faf-dev/claude-faf-mcp/issues)
- **Documentation**: [Full documentation](https://faf.dev/docs/claude-mcp)
- **Community**: [Join our Discord](https://discord.gg/faf-dev)

## 🔗 Related Projects

- **[FAF CLI](https://www.npmjs.com/package/faf-cli)** - The core FAF engine
- **[Claude Desktop](https://claude.ai/download)** - Anthropic's desktop application  
- **[MCP SDK](https://github.com/modelcontextprotocol/typescript-sdk)** - Model Context Protocol SDK

---

**Made with ❤️ for the Claude community**

Transform your projects into AI-collaboration powerhouses with Claude FAF MCP Server!
