# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 6.x.x   | :white_check_mark: |
| 5.x.x   | :white_check_mark: (security fixes) |
| < 5.0   | :x:                |

## Reporting a Vulnerability

We take the security of claude-faf-mcp seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do Not

- Open a public GitHub issue for security vulnerabilities
- Disclose the vulnerability publicly before we have had a chance to address it
- Exploit the vulnerability beyond what is necessary to demonstrate it

### Please Do

**Report security issues via email to: team@faf.one**

Include the following information:

- Type of issue (e.g., buffer overflow, SQL injection, cross-site scripting)
- Full paths of source file(s) related to the manifestation of the issue
- Location of the affected source code (tag/branch/commit or direct URL)
- Step-by-step instructions to reproduce the issue
- Proof-of-concept or exploit code (if possible)
- Impact of the issue, including how an attacker might exploit it

### What to Expect

When you report a security issue, you can expect:

1. **Acknowledgment within 24 hours** - We will confirm receipt of your report
2. **Initial assessment within 72 hours** - We will provide our initial evaluation
3. **Regular updates** - We will keep you informed as we work on a fix
4. **Coordinated disclosure** - We will work with you on disclosure timing
5. **Credit** - We will acknowledge your contribution (unless you prefer to remain anonymous)

### Our Commitment

- We will respond to your report promptly
- We will keep you informed of our progress
- We will treat your report confidentially
- We will credit you for responsible disclosure (if desired)
- We will work to issue a fix as quickly as possible

## Security Best Practices

When using claude-faf-mcp:

### For Users

- Keep your installation up to date
- Only install from official sources (npm, GitHub releases)
- Verify package integrity when possible
- Review the permissions required by the MCP server
- Use Claude Desktop from official Anthropic channels only

### For Contributors

- Follow secure coding practices
- Never commit sensitive data (API keys, tokens, credentials)
- Use environment variables for configuration
- Validate all inputs
- Follow our TypeScript strict mode requirements
- Run security audits before submitting PRs:
  ```bash
  npm audit
  npm run build
  npm test
  ```

## Dependencies

We keep the dependency list short to reduce attack surface. The production dependencies are the ones in package.json:

- `@modelcontextprotocol/sdk` — the MCP protocol and stdio transport
- `faf-cli` — detection, scoring, the renders and every file writer (composed, not forked)
- `yaml` — reading and editing YAML

CI runs `npm audit --audit-level=high` on every push and pull request, and Dependabot proposes security updates.

## Known Security Considerations

### MCP Protocol

- claude-faf-mcp operates within the Model Context Protocol (MCP) framework, over stdio
- It requires filesystem access to manage .faf files
- Everything runs on the user's machine. The one network use is `faf_git`, which runs `git clone --depth 1` of the URL the caller gives, with symbolic links checked out as plain files
- Nothing is sent to FAF; see [PRIVACY.md](PRIVACY.md)

### Filesystem Access

The server reads and writes only:
- The active project folder (the one `faf_context` shows) and folders listed in `FAF_ALLOWED_ROOTS` — never the home folder or the filesystem root
- The MEMORY.md Claude Code loads for the project (`~/.claude/projects/<id>/memory/MEMORY.md`), through `faf_tri_sync`
- The project's `.claude/settings.json`, only faf's SessionStart hook entry, through `faf_setup` after a preview

A context file that is a link out of the project is refused. It never writes the Claude Desktop configuration. [PRIVACY.md](PRIVACY.md) lists every file it writes.

## Security Updates

- Security updates are released as soon as fixes are available
- Critical vulnerabilities receive immediate attention
- All security updates are documented in CHANGELOG.md
- Users are notified via GitHub Security Advisories

## Vulnerability Disclosure Process

Our typical timeline:

1. **Day 0**: Report received
2. **Day 1**: Acknowledgment sent
3. **Day 3**: Initial assessment completed
4. **Day 7-30**: Fix developed and tested
5. **Day 30-90**: Coordinated disclosure
6. **Day 90+**: Public disclosure if fix is delayed

We aim for fixes within 30 days for high-severity issues.

## Security Hall of Fame

We recognize researchers who help us improve security:

*No vulnerabilities reported yet*

If you report a vulnerability, we will list you here (with your permission).

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [CWE Top 25](https://cwe.mitre.org/top25/)
- [NPM Security Best Practices](https://docs.npmjs.com/packages-and-modules/securing-your-code)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

## Contact

- **Security issues**: team@faf.one
- **General questions**: [GitHub Discussions](https://github.com/Wolfe-Jam/claude-faf-mcp/discussions)
- **Project maintainer**: Wolfe James ([ORCID: 0009-0007-0801-3841](https://orcid.org/0009-0007-0801-3841))

---

**Last updated**: September 2026

Thank you for helping keep claude-faf-mcp and its users safe.
