# Quick Start Guide

## 5-Minute Setup

### 1. Install

```bash
npm install -g @faf/mcp-server
```

### 2. Configure Claude Desktop

Add to your configuration file:

```json
{
  "mcpServers": {
    "faf": {
      "command": "npx",
      "args": ["@faf/mcp-server"]
    }
  }
}
```

**Configuration file locations:**
- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### 3. Restart Claude Desktop

Close and reopen Claude Desktop to load the MCP server.

### 4. Test Your Setup

In Claude Desktop, try:

```
faf_score()
```

You should see a three-line score display. If you get an error, check your configuration.

## Your First FAF Session

### Step 1: Check Your Score

```
faf_score()
```

**Example output:**
```
📊 FAF SCORE: 55%
🚀 Getting Started
🏁 AI-Ready: Building
```

### Step 2: See What's Missing

```
faf_score(details=true)
```

This shows exactly which files would improve your score.

### Step 3: Explore Your Project

```
faf_list()
```

View your project structure with smart file type detection.

### Step 4: Add Missing Files

If you're missing a .faf file:

```
faf_write(".faf", "Project context information here...")
```

### Step 5: Check Improved Score

```
faf_score()
```

Watch your score increase with each improvement!

## Essential Commands

| Command | Purpose | Example |
|---------|---------|---------|
| `faf_score()` | Check AI-readiness | `faf_score()` |
| `faf_detect()` | Identify project type | `faf_detect()` |
| `faf_list()` | View files | `faf_list()` |
| `faf_read(file)` | Read a file | `faf_read("README.md")` |
| `faf_write(file, content)` | Write a file | `faf_write(".faf", "...")` |

## Understanding Scores

- **0-60%**: Getting Started - Add .faf and CLAUDE.md files
- **61-80%**: Good - Project structure recognized
- **81-90%**: Very Good - Well-documented project
- **91-99%**: Excellent - Optimal AI collaboration setup
- **100%**: Perfect - Granted by Claude for exceptional collaboration
- **105%**: Legendary - Easter egg for exceptional documentation

## Tips for Success

1. **Start simple**: Just get a score first
2. **Add incrementally**: Improve one file at a time
3. **Follow suggestions**: Each command suggests what to do next
4. **Check changes**: Score updates instantly with file changes

## Common Issues

### "Command not found"

You're using a CLI-dependent command. Stick to:
- `faf_score`
- `faf_detect`
- `faf_list`
- `faf_read`
- `faf_write`

### Score not changing

Make sure files are saved. The tool reads from disk, not memory.

### Can't see my files

Check you're in the right directory. Use `faf_list()` to confirm location.

## Next Steps

1. Achieve 70%+ score for good AI collaboration
2. Add project-specific instructions to CLAUDE.md
3. Explore the [User Guide](./USER_GUIDE.md) for advanced features
4. Check [FAQ](./FAQ.md) for common questions

---

*Ready to achieve championship-level AI collaboration? Start with `faf_score()` and follow the journey!*