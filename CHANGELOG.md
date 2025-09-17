# Changelog

All notable changes to the Claude FAF MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.2] - 2025-09-17 - The Visibility Victory Release 🏎️

### 🏆 THE BREAKTHROUGH
- **SCORECARDS ARE NOW VISIBLE!** No more hidden outputs in function_results
- Implemented behavioral instruction that tells Claude to always show scores
- Clean display without wrapper tags - just pure markdown beauty
- The "handshake agreement" that actually works!

### ✅ Added
- Behavioral instruction system (`behavioral-instruction.ts`)
- Automatic display of all FAF outputs in conversation
- Clean markdown output without wrapper tags
- "User needs: Score, Description constantly" - and now they get it!

### 🩵⚡️🧡 The Philosophy
- **Trust:** Claude wants to help, just needed permission
- **Speed:** Fixed in hours, not months
- **Heart:** Made for users who said "show me the card in the conversation I'm paying for"

### 📸 Proven
- Tested live with Heritage Club Dubai project
- Screenshots confirm: IT'S FUCKING WORKING!
- "If Carlsberg did MCP's..." - they'd make this

### The Bottom Line
While waiting for Anthropic to fix the architecture, we shipped a solution that works TODAY.
Ship it now, perfect it later. And honestly? It's already perfect.

## [2.2.1] - 2025-09-17

### Changed
- Removed display wrapper tags for cleaner output
- Updated handleShow for clean markdown display
- Improved score formatting

## [2.2.0] - 2025-09-16

### Added
- 33+ FAF tools for comprehensive project management
- Championship scoring system (0-105%)
- Big Orange mode for transcendent scoring
- Sub-50ms performance optimizations

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
