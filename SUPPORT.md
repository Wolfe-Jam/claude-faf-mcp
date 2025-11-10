# Getting Support

Thank you for using claude-faf-mcp. This document explains how to get help with the project.

## Documentation

Before seeking help, please check our documentation:

- **README.md** - Installation, quick start, and basic usage
- **GitHub Wiki** - Detailed guides and tutorials (coming soon)
- **CHANGELOG.md** - Version history and release notes
- **API Documentation** - Tool reference and parameters

## Common Issues

### Installation Problems

**Issue**: `command not found: claude-faf-mcp`

**Solution**: Ensure global install completed:
```bash
npm install -g claude-faf-mcp
which claude-faf-mcp  # Should show installation path
```

**Issue**: Claude Desktop not detecting MCP server

**Solution**: Check your config file:
- macOS/Linux: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

Verify JSON syntax and restart Claude Desktop.

**Issue**: `Cannot find module` errors

**Solution**: Rebuild after updates:
```bash
cd /path/to/claude-faf-mcp
npm install
npm run build
```

### Usage Problems

**Issue**: Low context scores (below 85%)

**Solution**: 
- Run `faf_enhance` with focus on missing areas
- Check that key files are included (README, package.json, .faf)
- Ensure file format is valid YAML

**Issue**: `faf_auto` not detecting project type

**Solution**:
- Verify you're in the project root directory
- Check that characteristic files exist (package.json, requirements.txt, etc.)
- Try manual initialization with `faf_init`

**Issue**: Sync issues between .faf and CLAUDE.md

**Solution**:
- Verify both files are in project root
- Check file permissions (must be writable)
- Run `faf_bi_sync` to force synchronization

## Getting Help

### GitHub Issues

For bugs and feature requests:

1. **Search existing issues** first: [github.com/Wolfe-Jam/claude-faf-mcp/issues](https://github.com/Wolfe-Jam/claude-faf-mcp/issues)

2. **Open a new issue** if needed:
   - Use the issue template
   - Include version information (`npm list -g claude-faf-mcp`)
   - Provide reproduction steps
   - Share relevant error messages
   - Describe expected vs actual behavior

**For bugs, include**:
- Operating system and version
- Node.js version (`node --version`)
- Claude Desktop version
- Steps to reproduce
- Error messages or logs

**For feature requests, include**:
- Use case description
- Expected behavior
- Potential implementation approach (optional)

### GitHub Discussions

For questions, ideas, and community support:

[github.com/Wolfe-Jam/faf/discussions](https://github.com/Wolfe-Jam/faf/discussions)

**Use discussions for**:
- "How do I...?" questions
- Best practices and tips
- Project showcase
- General feedback
- Community chat

**Discussion categories**:
- **Q&A** - Ask and answer questions
- **Ideas** - Feature suggestions and brainstorming
- **Show and Tell** - Share your .faf implementations
- **General** - Everything else

### Email Support

For private inquiries or security issues:

**team@faf.one**

Please allow 1-3 business days for response. For faster help, use GitHub issues or discussions.

**Use email for**:
- Security vulnerabilities (see [SECURITY.md](SECURITY.md))
- Partnership inquiries
- Private or sensitive matters
- Media requests

**Do not use email for**:
- General questions (use discussions)
- Bug reports (use issues)
- Feature requests (use issues)

## Self-Help Resources

### Debug Mode

Enable verbose logging:
```bash
export DEBUG=claude-faf-mcp:*
claude-faf-mcp
```

### Check Installation Health

```bash
# Verify global installation
npm list -g claude-faf-mcp

# Check for outdated packages
npm outdated -g claude-faf-mcp

# Test MCP connection
# In Claude Desktop, ask: "Can you list available faf tools?"
```

### Performance Issues

If experiencing slow performance:

1. Check project size (very large projects may take longer)
2. Verify filesystem permissions
3. Run with profiling: `NODE_ENV=production claude-faf-mcp`
4. Check system resources (CPU, memory)

## Community Guidelines

When seeking help:

- Be respectful and patient
- Provide clear, detailed information
- Follow up if you solve your own issue
- Help others when you can
- Read our [Code of Conduct](CODE_OF_CONDUCT.md)

## Version Support

- **Current version (2.x)**: Full support
- **Previous minor versions (2.x-1)**: Security fixes only
- **Versions < 2.0**: No longer supported

Always update to the latest version:
```bash
npm update -g claude-faf-mcp
```

## Response Times

Expected response times:

- **Critical security issues**: 24 hours
- **Bugs**: 2-5 business days
- **Feature requests**: Reviewed in planning cycles
- **Questions in discussions**: Community-driven, typically 24-48 hours
- **Email inquiries**: 1-3 business days

## Contributing

If you want to help improve the project:

- Fix bugs and submit PRs
- Improve documentation
- Answer questions in discussions
- Share your use cases
- Spread the word

See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## Commercial Support

For enterprise deployments or custom integrations:

Contact team@faf.one with:
- Organization name
- Use case description
- Support requirements
- Timeline and budget

## Related Projects

- **faf-cli** - Command-line tool ([npm](https://npmjs.com/package/faf-cli))
- **.faf format** - Specification ([github.com/Wolfe-Jam/faf](https://github.com/Wolfe-Jam/faf))
- **Chrome Extension** - Browser integration ([Chrome Web Store](https://chromewebstore.google.com/detail/lnecebepmpjpilldfmndnaofbfjkjlkm))

## Stay Updated

- **Watch the repository** for release notifications
- **Star the project** to show support
- **Follow releases** for update announcements
- **Check CHANGELOG.md** for version details

## License

This project is MIT licensed. See [LICENSE](LICENSE) for details.

---

**Project created by Wolfe James**  
ORCID: [0009-0007-0801-3841](https://orcid.org/0009-0007-0801-3841)

**Community first. Championship quality.**

🧡 Made with care for the Claude community
