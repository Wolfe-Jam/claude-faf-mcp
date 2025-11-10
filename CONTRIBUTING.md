# Contributing to claude-faf-mcp

Thank you for your interest in contributing to claude-faf-mcp. This document provides guidelines for contributing to the project.

## Development Philosophy

This project follows F1-inspired engineering standards:

- **Championship-grade quality** - No compromises on reliability or performance
- **Sub-50ms performance targets** - Speed matters
- **100% TypeScript strict mode** - Type safety is non-negotiable
- **Zero errors** - Every build must be clean
- **Test everything** - If it's not tested, it doesn't work

## Before You Start

- Read the [Code of Conduct](CODE_OF_CONDUCT.md)
- Check [existing issues](https://github.com/Wolfe-Jam/claude-faf-mcp/issues) to avoid duplicates
- For major changes, open an issue first to discuss your proposal

## Getting Started

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- Git
- Claude Desktop (for testing)

### Setup

```bash
# Clone the repository
git clone https://github.com/Wolfe-Jam/claude-faf-mcp.git
cd claude-faf-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Link for local testing
npm link
```

### Development Workflow

1. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** following our coding standards

3. **Test thoroughly**:
   ```bash
   npm test
   npm run build
   ```

4. **Commit your changes** using our commit format:
   ```
   <type>: <what changed>
   
   - <specific detail>
   - <specific detail>
   ```
   
   Types: `feat`, `fix`, `docs`, `test`, `refactor`, `perf`, `chore`
   
   Example:
   ```
   feat: add faf_enhance tool for context optimization
   
   - Implements scoring algorithm with 21-slot system
   - Adds TypeScript interfaces for tool parameters
   - Includes test coverage for edge cases
   ```

5. **Push to your fork** and submit a pull request

## Code Standards

### TypeScript

- Use TypeScript strict mode (already configured)
- All functions must have explicit return types
- No `any` types (use `unknown` if truly needed)
- Prefer interfaces over types for object shapes

### Testing

- All new features require tests
- Maintain or improve code coverage
- Test both success and error cases
- Include edge case testing

### Performance

- Profile performance-critical code
- Target sub-50ms for operations
- No blocking operations in hot paths
- Document any performance considerations

### Documentation

- Update README.md for user-facing changes
- Add JSDoc comments for exported functions
- Update CHANGELOG.md following Keep a Changelog format
- Include examples for new features

## Pull Request Process

1. **Ensure tests pass**:
   ```bash
   npm test
   npm run build
   ```

2. **Update documentation** as needed

3. **Add your changes** to CHANGELOG.md under "Unreleased"

4. **Fill out the PR template** completely

5. **Request review** from maintainers

### PR Guidelines

- One feature or fix per PR
- Keep PRs focused and small when possible
- Link related issues
- Include screenshots for UI changes
- Respond to review feedback promptly

## Testing with Claude Desktop

To test your changes locally with Claude Desktop:

1. Link your local build:
   ```bash
   npm link
   ```

2. Update Claude Desktop config:
   ```json
   {
     "mcpServers": {
       "claude-faf-mcp": {
         "command": "node",
         "args": ["/path/to/your/local/claude-faf-mcp/build/index.js"]
       }
     }
   }
   ```

3. Restart Claude Desktop

4. Test your changes in conversation

## What We're Looking For

### High Priority

- Performance improvements
- Bug fixes with reproducible test cases
- Enhanced error handling
- Better TypeScript types
- Documentation improvements

### Welcome Contributions

- New tool implementations
- Test coverage improvements
- Example use cases
- Integration guides
- Bug reports with detailed reproduction steps

### Not Accepting

- Changes that increase dependencies unnecessarily
- Breaking changes without migration path
- Performance regressions
- Code that doesn't pass TypeScript strict checks

## Getting Help

- **Issues**: For bug reports and feature requests
- **Discussions**: For questions and general discussion at [github.com/Wolfe-Jam/faf/discussions](https://github.com/Wolfe-Jam/faf/discussions)
- **Email**: team@faf.one for security issues or private inquiries

## Recognition

Contributors are recognized in several ways:

- Listed in CHANGELOG.md for their contributions
- Mentioned in release notes for significant features
- Added to package.json contributors list

## License

By contributing, you agree that your contributions will be licensed under the MIT License. See [LICENSE](LICENSE) file for details.

## Questions?

If you have questions about contributing, open a discussion or reach out to team@faf.one.

---

**Built with championship standards by the FAF community**

*Created by Wolfe James ([ORCID: 0009-0007-0801-3841](https://orcid.org/0009-0007-0801-3841))*
