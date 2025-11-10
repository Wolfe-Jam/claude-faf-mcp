# Frequently Asked Questions

## General

### What is FAF MCP Server?

A Model Context Protocol server that enhances Claude Desktop with project intelligence capabilities. It analyzes your project structure and provides an AI-readiness score without requiring external tools.

### Do I need the FAF CLI installed?

No. Core features work natively. Some advanced features currently require the CLI but are being migrated to native implementations.

### What's the difference between FAF and FAF MCP?

- **FAF CLI**: Command-line tool for project context management
- **FAF MCP Server**: Claude Desktop integration providing native FAF features

## Installation

### How do I install the MCP server?

```bash
npm install -g claude-faf-mcp
```

Then add the configuration to Claude Desktop's settings.

### Where do I find Claude Desktop configuration?

On macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
On Windows: `%APPDATA%\Claude\claude_desktop_config.json`

### Can I use this with other AI tools?

Currently designed specifically for Claude Desktop. Other MCP-compatible tools may work but are untested.

## Scoring

### How is the FAF Score calculated?

| Component | Points | Requirement |
|-----------|--------|-------------|
| .faf file | 40 | Project context file |
| CLAUDE.md | 30 | AI instructions |
| README.md | 15 | Documentation |
| Project file | 14 | package.json, etc. |
| Maximum | 99 | Technical limit |

### Why is my score capped at 99%?

The final 1% represents perfect human-AI collaboration, which only Claude can grant based on actual interaction quality.

### What is the 105% "Big Orange" score?

An Easter egg that triggers when you have exceptionally rich documentation. Requirements:
- .faf file with 500+ characters and sections
- CLAUDE.md with 500+ characters and sections
- README.md present
- All files well-structured

### How often should I check my score?

Check after significant changes to documentation or project structure. The score updates instantly based on current files.

## Features

### Which commands work without the CLI?

Native features (no CLI required):
- `faf_score` - Project scoring
- `faf_detect` - Project detection
- `faf_list` - Directory listing
- `faf_read` - File reading
- `faf_write` - File writing
- `faf_debug` - Diagnostics

### Why do some commands show "command not found"?

These commands currently require the FAF CLI:
- `faf_init`
- `faf_enhance`
- `faf_sync`
- `faf_bi_sync`
- `faf_trust`
- `faf_status`
- `faf_clear`

We're actively migrating these to native implementations.

### What is bi-directional sync?

A feature (currently in development) that keeps .faf and CLAUDE.md files synchronized automatically. The current version is being redesigned.

## Troubleshooting

### My score isn't updating

1. Ensure files are saved to disk
2. Check you're in the correct directory
3. Run `faf_detect()` to refresh context

### Project type not detected

Ensure you have one of these files in your project root:
- package.json (Node.js)
- requirements.txt (Python)
- Cargo.toml (Rust)
- go.mod (Go)
- pom.xml (Java)

### Commands are slow

Normal response times:
- `faf_score`: ~50ms
- `faf_detect`: ~200ms
- `faf_list`: ~30ms

If slower, check system resources or file system permissions.

### Error: "Cannot read directory"

Check:
1. Directory exists
2. You have read permissions
3. Path doesn't contain special characters

## Project Structure

### What should be in .faf?

Project context including:
- Project name and description
- Main technologies
- Key features
- Development guidelines

### What should be in CLAUDE.md?

AI-specific instructions:
- Coding preferences
- Project conventions
- Areas to focus on
- Things to avoid

### Do I need both .faf and CLAUDE.md?

For maximum score, yes. But the system works with either:
- .faf alone: 40 points
- CLAUDE.md alone: 30 points
- Both: 70 points

## Privacy & Security

### What data is sent externally?

None. All operations are local to your machine. The MCP server only accesses files you explicitly reference.

### Can it access files outside my project?

The server can only access files you specifically request through commands. It has no automatic scanning or uploading capabilities.

### Is my code safe?

Yes. The MCP server:
- Runs locally on your machine
- Doesn't send data externally
- Only reads files you explicitly access
- Has no network capabilities

## Updates

### How do I update the MCP server?

```bash
npm update -g claude-faf-mcp
```

### Will updates break my setup?

We follow semantic versioning. Minor updates are backward compatible. Check release notes for breaking changes in major versions.

### How do I know which version I have?

Run `faf_debug()` in Claude Desktop to see version information.

## Support

### Where can I report issues?

GitHub Issues: https://github.com/Wolfe-Jam/claude-faf-mcp/issues

### How can I contribute?

Contributions welcome! See CONTRIBUTING.md in the repository.

### Is there a roadmap?

Check the repository's project board for planned features and progress.

---

*For additional help, see the [User Guide](./USER_GUIDE.md) or visit our [GitHub repository](https://github.com/Wolfe-Jam/claude-faf-mcp).*