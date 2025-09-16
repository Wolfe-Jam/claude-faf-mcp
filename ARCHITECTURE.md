# 🏎️ Claude FAF MCP - Architecture Documentation

## Hybrid Adapter Pattern for Claude Desktop

### Overview
This MCP server uses a **hybrid adapter pattern** optimized for Claude Desktop integration:
- **Native implementations** for core features (no external dependencies)
- **Adapter pattern** preserved for future CLI integration
- **Claude Desktop-first** design philosophy

### Architecture Layers

```
Claude Desktop
     ↓
MCP Protocol (stdio/sse)
     ↓
Server Core (server.ts)
     ↓
Tool Handler (handlers/tools.ts)
     ↓
[Hybrid Decision Point]
     ├─→ Native Implementation (faf_score, faf_read, faf_write)
     └─→ Engine Adapter → CLI (future/optional)
```

### Current Implementation Status

#### ✅ Native (Working in CD)
1. **faf_score** - Native TypeScript, analyzes project files directly
2. **faf_read** - Direct file system operations
3. **faf_write** - Direct file system operations
4. **faf_debug** - System diagnostics

#### 🔄 CLI-Dependent (Adapter Pattern)
These commands preserve the adapter pattern for future CLI integration:
- faf_status
- faf_init
- faf_trust
- faf_sync
- faf_enhance
- faf_bi_sync
- faf_clear

### Design Decisions

#### Why Hybrid?
1. **Immediate CD compatibility** - Core features work without external dependencies
2. **Clean migration path** - Adapter pattern preserved for gradual enhancement
3. **User experience** - No "command not found" errors for essential features

#### The CD Adapter Philosophy
- **Adapter remains** - We don't remove the adapter pattern
- **Native priority** - Critical features get native implementations
- **Graceful fallback** - If CLI missing, features still work

### Implementation Pattern

```typescript
// Native Implementation (CD-optimized)
private async handleFafScore(args: any): Promise<CallToolResult> {
  // Direct file system operations
  const fs = await import('fs').then(m => m.promises);
  // ... native logic
}

// Adapter Pattern (CLI-ready)
private async handleFafStatus(args: any): Promise<CallToolResult> {
  const result = await this.engineAdapter.callEngine('status');
  // ... handle CLI response
}
```

### Benefits
1. **No CLI required** for core functionality
2. **Clean architecture** maintained
3. **Future-proof** for CLI addition
4. **CD-first** user experience

### Migration Strategy
1. Start with native implementations for core features ✅
2. Keep adapter pattern for complex operations
3. Gradually migrate based on user needs
4. Eventually support both native and CLI modes

## Summary
The hybrid adapter pattern gives us the best of both worlds:
- **Immediate functionality** in Claude Desktop
- **Clean architecture** for future expansion
- **No breaking changes** to the adapter pattern

## Future Engine Evolution

### Feature Discovery → Engine MkII
When we discover **KILLER features** through CD usage that are:
- Well received by users
- Make sense globally
- Proven through real-world usage

These will become **feature requests for Engine MkII** where:
- **Engines take on adapters** for global implementation
- Native CD features graduate to core engine capabilities
- The best patterns bubble up from CD to CLI

This creates a **feedback loop**:
```
CD Native Feature → User Validation → Engine MkII Feature Request → Global CLI Feature
```

*"Slightly naughty, but architecturally sound!"* - wolfejam
*"CD is our F1 testing ground for Engine MkII"*

### The Custom Shop Philosophy 🏎️
This is a **custom shop turbo retrofit** - we bolt on performance enhancements directly:
- **Not naughty**: Custom tuning for performance
- **VERY naughty**: Hiding it from users
- **Championship move**: Documenting everything transparently

Think of it as:
- **Stage 1**: Custom shop turbo (CD native features)
- **Stage 2**: Production version (Engine MkII)
- **Full transparency**: All mods documented in ARCHITECTURE.md

*"It's only naughty if you don't tell anyone. We put it in the docs!"* - wolfejam