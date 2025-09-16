# Security Policy

## Overview

The FAF MCP Server is designed with security as a primary concern. This document outlines our security practices, vulnerability reporting process, and security considerations for users.

## Security Features

### Input Validation
- All file paths are validated against directory traversal attacks
- Input strings are sanitized to prevent command injection
- File sizes are limited to prevent resource exhaustion
- Path lengths are restricted to system limits

### Resource Limits
- Maximum file size: 10MB per operation
- Operation timeout: 5 seconds
- Memory usage monitoring
- Rate limiting considerations for high-frequency operations

### Data Privacy
- **Local-only operations**: No data is transmitted to external servers
- **No telemetry**: We do not collect usage statistics or error reports
- **No logging of sensitive data**: File contents are never logged
- **Ephemeral processing**: Data is not persisted beyond operation lifetime

### Error Handling
- System paths are sanitized from error messages
- Stack traces are never exposed to users
- Graceful degradation on security violations
- Structured error responses without sensitive information

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: |
| < 2.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **DO NOT** create a public GitHub issue
2. Email security concerns to: [security contact]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 1 week
- **Resolution Timeline**: Based on severity
  - Critical: 24-48 hours
  - High: 1 week
  - Medium: 2 weeks
  - Low: Next release

## Security Best Practices for Users

### Installation
```bash
# Always verify package integrity
npm audit

# Use exact versions in production
npm install --save-exact @faf/mcp-server
```

### Configuration
```json
{
  "mcpServers": {
    "faf": {
      "command": "npx",
      "args": ["@faf/mcp-server"],
      "env": {
        "FAF_MAX_FILE_SIZE": "10485760",
        "FAF_TIMEOUT": "5000"
      }
    }
  }
}
```

### File System Access
- Run with minimum required permissions
- Use read-only mode when possible
- Restrict access to specific directories
- Regular audit of accessible paths

### Environment Variables
- `FAF_MAX_FILE_SIZE`: Maximum file size in bytes (default: 10MB)
- `FAF_TIMEOUT`: Operation timeout in milliseconds (default: 5000)
- `FAF_ALLOWED_PATHS`: Comma-separated list of allowed directories
- `FAF_READ_ONLY`: Set to "true" for read-only mode

## Security Checklist

### For Users
- [ ] Running with minimum required permissions
- [ ] File size limits configured appropriately
- [ ] Timeout values set for your use case
- [ ] Regular updates to latest version
- [ ] Audit of accessible directories

### For Contributors
- [ ] All inputs validated and sanitized
- [ ] Path traversal protection implemented
- [ ] Resource limits enforced
- [ ] Error messages sanitized
- [ ] Tests include security scenarios
- [ ] No sensitive data in logs or errors

## Known Security Considerations

### File System Operations
- Operations are limited to the current working directory and subdirectories
- Symbolic links are resolved and validated
- Hidden files (starting with .) require explicit access

### Process Execution
- No shell command execution
- No eval() or Function() constructors
- Pure Node.js operations only

### Network
- No network operations
- No external API calls
- Completely offline operation

## Security Testing

Our security testing includes:

1. **Static Analysis**
   - TypeScript strict mode
   - ESLint security rules
   - Dependency vulnerability scanning

2. **Dynamic Testing**
   - Path traversal attempts
   - Input fuzzing
   - Resource exhaustion tests

3. **Manual Review**
   - Code review for security issues
   - Threat modeling
   - Attack surface analysis

## Compliance

While FAF MCP Server is not formally certified, we follow security best practices from:

- OWASP Secure Coding Practices
- Node.js Security Best Practices
- Anthropic's MCP Security Guidelines

## Updates and Patches

- Security patches are released as soon as possible
- Critical updates are highlighted in release notes
- Subscribe to releases on GitHub for notifications

## Contact

For security concerns: [security contact]
For general issues: Create a GitHub issue
For questions: See documentation

---

*Last updated: January 2025*
*Version: 2.0.0*