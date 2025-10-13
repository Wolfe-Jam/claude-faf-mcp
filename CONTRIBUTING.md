# Contributing to claude-faf-mcp 🧡⚡️

Thank you for your interest in contributing! We love the community and welcome all contributions.

## 🚀 Quick Start

### Development Setup

```bash
# Clone the repo
git clone https://github.com/Wolfe-Jam/claude-faf-mcp.git
cd claude-faf-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Link locally for testing
npm link
```

### Testing Your Changes

After linking locally, add to your Claude Desktop config:

```json
{
  "mcpServers": {
    "claude-faf-mcp-dev": {
      "command": "node",
      "args": ["/path/to/your/clone/dist/src/index.js"]
    }
  }
}
```

Restart Claude Desktop and test your changes!

---

## 📋 Ways to Contribute

### 🐛 Report Bugs
- Use the [Bug Report template](https://github.com/Wolfe-Jam/claude-faf-mcp/issues/new?template=bug_report.yml)
- Include version, OS, Node.js version, and steps to reproduce
- Check existing issues first to avoid duplicates

### 💡 Suggest Features
- Use the [Feature Request template](https://github.com/Wolfe-Jam/claude-faf-mcp/issues/new?template=feature_request.yml)
- Explain the problem you're trying to solve
- Describe your proposed solution

### 💬 Join Discussions
- Ask questions in [GitHub Discussions](https://github.com/Wolfe-Jam/claude-faf-mcp/discussions)
- Share your .faf scores and use cases
- Help other users

### 📚 Improve Documentation
- Fix typos or unclear explanations
- Add examples and use cases
- Improve code comments

### 🔧 Submit Code
- Fix bugs
- Implement features
- Improve performance
- Add tests

---

## 🎯 Code Guidelines

### TypeScript Standards
- **100% strict mode** - No `any` types allowed
- Use explicit types for function parameters and returns
- Follow existing code style

### Testing Requirements
- Add tests for new features
- Ensure existing tests pass: `npm test`
- Aim for high coverage

### Commit Messages
Follow the existing style:
```
Add feature for X

- Detailed point 1
- Detailed point 2

🧡⚡️ Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
```

---

## 🔄 Pull Request Process

1. **Fork the repo** and create your branch from `main`
2. **Make your changes** following the code guidelines
3. **Test thoroughly** - Run `npm test` and `npm run build`
4. **Update documentation** if needed
5. **Create a PR** with a clear title and description
6. **Wait for review** - We'll review as soon as possible!

### PR Checklist
- [ ] Code follows TypeScript strict mode
- [ ] Tests added/updated and passing
- [ ] Documentation updated
- [ ] Commit messages are clear
- [ ] No merge conflicts

---

## 🏆 Championship Standards

We follow F1-inspired engineering principles:

### Performance
- **<11ms** target for core operations
- Profile before optimizing
- No premature optimization

### Quality
- **Zero tolerance** for type errors
- **100% TypeScript strict** mode
- Comprehensive error handling

### Testing
- **730+ C.O.R.E tests** passing
- Test edge cases
- Test error conditions

---

## 📞 Getting Help

- **Questions?** Open a [Discussion](https://github.com/Wolfe-Jam/claude-faf-mcp/discussions)
- **Bug?** File an [Issue](https://github.com/Wolfe-Jam/claude-faf-mcp/issues)
- **Not sure?** Ask in discussions first!

---

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## 🙏 Thank You!

Every contribution, no matter how small, makes this project better. We appreciate your time and effort! 🧡

**Made with 🧡 by the FAF community**
