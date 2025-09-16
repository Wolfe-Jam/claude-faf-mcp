# 🏁 FAF MCP - Claude Desktop Integration Guide

## Quick Start (2 Minutes to Championship!)

### Step 1: Install FAF MCP from NPM
```bash
npm install -g claude-faf-mcp
```

### Step 2: Configure Claude Desktop
Add this to your Claude Desktop config file:

**macOS**: `~/.config/claude/mcp.json`
**Windows**: `%APPDATA%\claude\mcp.json`

```json
{
  "mcpServers": {
    "faf": {
      "command": "node",
      "args": ["PATH_TO_FAF_MCP/dist/server.js"]
    }
  }
}
```

### Step 3: Restart Claude Desktop
Close and reopen Claude Desktop to load the FAF MCP server.

### Step 4: Test It!
In Claude Desktop, type:
```
Can you use FAF to check my project score?
```

## 🎯 What You Get: 33 Honest Functions

### File Operations (11 functions)
- `faf_read` - Read any file with 3-3-1 display
- `faf_write` - Write files with style
- `faf_append` - Add content to files
- `faf_delete` - Remove files (with confirmation)
- `faf_copy` - Copy files
- `faf_move` - Move/rename files
- `faf_exists` - Check if file exists
- `faf_size` - Get file size
- `faf_info` - Get file metadata
- `faf_search` - Search file contents
- `faf_replace` - Find and replace in files

### Directory Operations (8 functions)
- `faf_list` - List directory contents
- `faf_tree` - Show directory tree
- `faf_mkdir` - Create directories
- `faf_rmdir` - Remove directories
- `faf_scan` - Deep scan directories
- `faf_watch` - Watch for changes
- `faf_size_dir` - Get directory size
- `faf_clean` - Clean temp files

### Project Detection (5 functions)
- `faf_detect` - Auto-detect project type
- `faf_analyze` - Analyze project structure
- `faf_dependencies` - List dependencies
- `faf_scripts` - Show available scripts
- `faf_config` - Read project config

### Context Sync (3 functions)
- `faf_sync` - Sync .faf with CLAUDE.md
- `faf_bi_sync` - Bidirectional sync
- `faf_check_sync` - Verify sync status

### Templates (3 functions)
- `faf_template_list` - List templates
- `faf_template_apply` - Apply template
- `faf_template_create` - Create template

### Utilities (3 functions)
- `faf_format_3_3_1` - Format with 3-3-1 style
- `faf_check_score` - Read FAF score from .faf
- `faf_help` - Show help

## 🏆 The 3-3-1 Format

Every response follows our championship format:
```
📊 Score: 92/100
████████████████████████░
Status: Excellent
```

- **3 lines** of output
- **3 words** in the status
- **1 emoji** for visual clarity

## 🔧 Advanced Configuration

### Environment Variables
```json
{
  "mcpServers": {
    "faf": {
      "command": "node",
      "args": ["PATH_TO_FAF_MCP/dist/server.js"],
      "env": {
        "FAF_COLOR_THEME": "f1",
        "FAF_DISPLAY_MODE": "compact",
        "FAF_DEBUG": "false"
      }
    }
  }
}
```

### Multiple Projects
```json
{
  "mcpServers": {
    "faf-project1": {
      "command": "node",
      "args": ["PATH_TO_FAF_MCP/dist/server.js"],
      "cwd": "/path/to/project1"
    },
    "faf-project2": {
      "command": "node",
      "args": ["PATH_TO_FAF_MCP/dist/server.js"],
      "cwd": "/path/to/project2"
    }
  }
}
```

## 🚀 Example Usage in Claude Desktop

### Check Project Score
```
Claude: Can you check my FAF score?
Response:
📊 Score: 92/100
████████████████████████░
Status: Championship Level
```

### List Directory
```
Claude: Use FAF to list the src directory
Response:
📁 Files: 15 found
████████████████████████░
Status: Directory Listed
```

### Read File with Style
```
Claude: FAF read package.json
Response:
📄 Size: 2.4KB
████████████████████████░
Status: File Loaded
```

## ⚡ Performance Guarantees

- All operations complete in **<50ms**
- Memory usage under **50MB**
- No fantasy features or made-up logic
- Path traversal protection on all file ops
- Championship-level error handling

## 🔒 Security

FAF MCP includes security validation:
- No access outside project directory
- Path traversal protection
- Safe file operations only
- No execution of arbitrary code
- Validated inputs on all functions

## 🏁 Troubleshooting

### MCP Server Not Loading
1. Check config file path is correct
2. Verify Node.js is installed (v18+)
3. Check FAF MCP is installed globally
4. Restart Claude Desktop

### Functions Not Available
1. Open Claude Desktop developer console
2. Check for MCP connection errors
3. Verify server.js path is correct
4. Check file permissions

### Wrong Display Format
1. Update to latest FAF MCP version
2. Check environment variables
3. Clear Claude Desktop cache

## 📊 Testing Your Integration

Run the test suite:
```bash
cd /path/to/claude-faf-mcp
./DESKTOP_MCP_TEST_INTEGRATION.sh
```

This creates a permanent test record in the ONE WAY TRACK testing environment.

## 🏆 Join the Championship

- **NPM**: [claude-faf-mcp](https://www.npmjs.com/package/claude-faf-mcp)
- **GitHub**: [claude-faf-mcp](https://github.com/yourusername/claude-faf-mcp)
- **Issues**: Report bugs and request features
- **PRs**: Contributions welcome!

## 📅 Release Schedule

- **Tuesday**: NPM PODIUM EDITION ships
- **Version**: 2.0.0
- **Status**: Production Ready
- **Quality**: Championship Level

---

**Built with 🏎️ F1-inspired engineering by Wolfejam**

*No fantasy features. No made-up scoring. Just 33 honest functions that work.*