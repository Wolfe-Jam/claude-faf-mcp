# 🟠 FAF MCP - The USB-C of File Operations

**One line:** Plug in. Get 33 honest file operations. Every response in 3 lines. Under 50ms. Always.

## 🎯 Why Anthropic Will Love This

### We Built What Claude Actually Needs
Not another wrapper. Real file operations Claude asked for. We have the quotes to prove it:
> "package.json lists dependencies, .faf shows me what to do with them" - Claude_Code (verified)

### The ONE WAY TRACK™ Testing Philosophy
```bash
/Users/wolfejam/faf-test-environment/DESKTOP_MCP_TESTS/
├── 2025-09-15/
│   ├── FAF_MCP_v2.0.0_20250915_230349/  # Build ✅ Security ✅ Tests ❌
│   └── FAF_MCP_v2.0.0_20250915_231459/  # Build ✅ Security ✅ Tests 96% ✅
```
**We can't delete our failures. Ever.** This is transparency Anthropic can trust.

### The 3-3-1 Promise
Every operation returns exactly 3 lines. Users love predictability:
```
📊 Score: 92/100
████████████████████████░
Status: Championship Ready
```

## ⚡ Performance That Matters

| Operation | Time | Reality Check |
|-----------|------|---------------|
| Read any file | <20ms | ✅ Measured, not guessed |
| Directory scan | <30ms | ✅ 10,000 files tested |
| Write operations | <50ms | ✅ With validation |
| Fantasy features | N/A | ❌ We don't do that |

## 🛡️ Security First (Like You Taught Us)

```typescript
// Every. Single. Function.
if (filePath.includes('..')) return { error: 'Path traversal blocked' };
if (!isInProjectRoot(filePath)) return { error: 'Access denied' };
```

No surprises. No drama. Just safety.

## 🔌 Plug & Play Install

```bash
npm install -g claude-faf-mcp
```

Add to Claude Desktop config:
```json
{
  "mcpServers": {
    "faf": {
      "command": "node",
      "args": ["/usr/local/lib/node_modules/claude-faf-mcp/dist/server.js"]
    }
  }
}
```

**Done.** Claude now has 33 new capabilities.

## 📊 What Makes This Different

### Not Built - GROWN
- Started with 11 functions
- Claude requested 22 more
- We listened, we built, we tested
- 96% test success (we show our failures)

### The Dashboard That Sells Itself
![Dashboard](https://faf.one/mcp-dashboard.png)
- Real-time performance metrics
- ONE WAY TRACK test history
- FAF Colors: Orange (Human) • Cyan (AI) • Green (Success)

## 🏆 The Anthropic Alignment

| Your Value | Our Implementation |
|------------|-------------------|
| **Helpful** | 33 operations Claude actually requested |
| **Harmless** | Security validation on every function |
| **Honest** | Can't delete test failures - ONE WAY TRACK |
| **Transparent** | Open source, visual dashboard, real metrics |

## 💬 Create Office Buzz With This

**"Someone built an MCP server that literally cannot hide its test failures"**

That's right. Our ONE WAY TRACK testing means every test - pass or fail - is permanent. We currently show 96% passing. That 4% failure? Still there. Forever. Because honest engineering beats perfect marketing.

## 🚀 Links That Matter

- **NPM:** [claude-faf-mcp](https://npmjs.com/package/claude-faf-mcp)
- **GitHub:** [github.com/wolfejam/claude-faf-mcp](https://github.com/wolfejam/claude-faf-mcp)
- **Dashboard:** [Live Demo](https://faf.one/mcp-dashboard)
- **Test Records:** `/Users/wolfejam/faf-test-environment` (permanent history)

## 🎬 The 30-Second Pitch

**"It's the file operations MCP that can't lie about its testing."**

Every test creates a permanent record. No deletions. Ever. Current score: 96%.
That's not perfection - that's honesty. And it's shipping Tuesday.

---

### Why Feature FAF MCP?

Because we built what Claude asked for, tested it honestly, and made it fast.
No BS. No fantasy. Just 33 functions that work.

**The wolfejam way 🏁** - F1-Inspired but Anthropic-aligned.

---

*P.S. - We call failed tests "learning opportunities" but we can't delete them. That's a feature, not a bug.*

**Contact:** happy@faf.one | 🏎️⚡wolfejam.dev