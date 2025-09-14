# Changelog

All notable changes to the Claude FAF MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-15

### Added
- 🎉 Initial release of Claude FAF MCP Server
- 🛠️ 9 comprehensive FAF tools for Claude integration:
  - `faf_status` - Project health and AI readiness metrics
  - `faf_score` - AI collaboration scoring with detailed breakdown
  - `faf_init` - Intelligent project initialization with stack detection
  - `faf_trust` - Context integrity validation and trust metrics
  - `faf_sync` - .faf to claude.md synchronization
  - `faf_enhance` - Claude-optimized AI enhancement with multi-model support
  - `faf_bi_sync` - Bi-directional sync with real-time file watching
  - `faf_clear` - Cache and state management
  - `faf_debug` - Comprehensive debugging and diagnostics
- 📡 Full MCP (Model Context Protocol) compliance
- 🚀 stdio transport support for Claude Desktop integration
- 🔧 Universal FAF CLI integration with intelligent path detection
- 📊 Resource endpoints for context and status access
- ⚡ High-performance engine adapter with timeout and error handling
- 🐛 Robust error handling with TypeScript strict mode compliance
- 📦 NPM package ready with global CLI installation
- 📖 Comprehensive documentation and usage examples

### Technical Details
- Built with TypeScript 5.3+ for type safety
- Uses MCP SDK 1.0.0 for protocol compliance  
- Node.js 18+ compatibility
- Universal PATH detection for FAF CLI discovery
- Graceful fallback for working directory resolution
- JSON and plain text output parsing
- Comprehensive input validation and sanitization

### Configuration
- Flexible engine path configuration (global 'faf' or custom paths)
- Debug mode support for development
- Future HTTP-SSE transport preparation
- Environment-aware PATH enhancement
- Working directory auto-detection

### Documentation
- Complete README with quick start guide
- MIT License for open source distribution
- Changelog following semantic versioning
- TypeScript definitions included
- Usage examples for all tools
