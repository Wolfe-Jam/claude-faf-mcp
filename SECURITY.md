# Security Policy

## Supported Versions

We release patches for security vulnerabilities in the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| < 2.0   | :x:                |

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

We maintain minimal dependencies to reduce attack surface:

- Only one production dependency (MCP SDK)
- Regular dependency audits
- Automated security updates via Dependabot
- No deprecated or unmaintained dependencies

## Known Security Considerations

### MCP Protocol

- claude-faf-mcp operates within the Model Context Protocol (MCP) framework
- It requires filesystem access to manage .faf files
- All operations are local to the user's machine
- No data is transmitted to external services

### Filesystem Access

The server requires read/write access to:
- Project directories for .faf file management
- Claude Desktop configuration directory (for MCP setup)

This access is necessary for core functionality and is limited to user-initiated operations.

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
- **General questions**: [GitHub Discussions](https://github.com/Wolfe-Jam/faf/discussions)
- **Project maintainer**: Wolfe James ([ORCID: 0009-0007-0801-3841](https://orcid.org/0009-0007-0801-3841))

---

**Last updated**: November 2025

Thank you for helping keep claude-faf-mcp and its users safe.
