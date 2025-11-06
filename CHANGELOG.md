# Changelog

All notable changes to claude-faf-mcp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.9.0] - 2025-11-06

### Added
- faf_install_skill tool for automatic installation of faf-expert skill to Claude Code
- DROP | PASTE | CREATE user guidance when bare faf command called without directory
- Smart Projects folder detection in faf_quick with projectName parameter (~/projects/ > ~/Projects/ > create ~/Projects/)

### Changed
- Updated messaging from "THE JPEG for AI" to "Persistent Project Context" (official Anthropic terminology)
- Enhanced user onboarding experience with clear three-pathway guidance
- faf_quick now supports projectName parameter for instant project creation in Projects folder

### Documentation
- CLI synced with DROP | PASTE | CREATE messaging and Persistent Project Context terminology

## [2.8.1] - 2025-11-05

### Fixed
- README now includes "DROP or PASTE, Click & Go!" messaging
- Removed "chatgpt" from package.json keywords (not supported)
- Corrected test count from 79 to 57 throughout documentation

## [2.8.0] - 2025-11-05

### Added
- Tool Visibility System - Intelligent filtering to reduce cognitive load
- 21 Core Tools (default) - Essential workflow tools shown by default
- 30+ Advanced Tools (opt-in) - Expert-level tools via FAF_MCP_SHOW_ADVANCED env var
- Tool categorization system (workflow, quality, intelligence, sync, ai, help, trust, file, utility, display)
- Configuration priority system (ENV > config file > default)
- Support for ~/.fafrc config file (JSON and key=value formats)
- Claude Code skill (faf-expert) bundled with package
- Comprehensive visibility test suite (22 new tests)

### Changed
- Default tool count reduced from 51 to 21 (59% reduction in cognitive load)
- Tool filtering performance <10ms (5x better than 50ms target)
- Professional console output (silent operation, no clutter)
- README updated with v2.8.0 features and Claude Code skill installation

### Performance
- Sub-10ms tool filtering for 56 tools
- Zero regressions in existing functionality
- 79 total tests passing (57 existing + 22 new)

### Testing
- WJTTC Gold Certified
- F1-inspired testing standards applied
- Complete test report available

## [2.7.3] - 2025-11-02

### Fixed
- Corrected project.faf screenshot CDN URL to use claude-faf-mcp package asset
- Image now displays correctly on npmjs.com README

## [2.7.2] - 2025-10-31

### Changed
- Updated package.json description to highlight IANA registration
- Enhanced README with IANA registration messaging throughout
- Added visual "See It In Action" section showing project.faf placement
- Improved CLI vs MCP clarity section with better formatting
- Expanded Major Milestones timeline with complete chronological dates
- Updated download statistics to current metrics (4,700 total, 598/week)
- Changed platform validation messaging to "Quadruple Validation"

### Documentation
- Added screenshot showing project.faf between package.json and README.md
- Improved milestone presentation with all key dates from Aug 2024 to Oct 2025
- Enhanced IANA registration visibility across README sections

## [2.7.1] - 2025-10-30

### Fixed
- Added missing screenshot asset (project-faf-screenshot.png) to npm package
- Screenshot now displays correctly on npmjs.com package page

## [2.7.0] - 2025-10-30

### Added
- project.faf as the new standard for all projects
- File discovery utility supporting both project.faf and legacy .faf
- NPM badges in README (version, downloads, license)
- What's New section showcasing project.faf visibility

### Changed
- New projects now create project.faf (instead of hidden .faf)
- All MCP tools support both project.faf and legacy .faf files
- README updated with simplified v2.7.0 announcement
- Updated 18 locations across codebase for new standard

### Fixed
- File discovery now handles all .faf filename variations
- EISDIR protection for edge cases

### Testing
- Championship-grade stress testing completed
- WJTTC Gold Certified
- Backward compatibility verified with legacy .faf files

### Migration
- Existing .faf files continue to work perfectly
- Use faf migrate (CLI v3.1.0) to upgrade to project.faf
- Coordinated release with faf-cli v3.1.0

## [2.6.7] - 2025-10-25

### Fixed
- Corrected Homebrew installation command from `Wolfe-Jam/tap` to `wolfe-jam/faf`
- Fixed tap name in both installation sections of README

### Added
- Created Homebrew formula for claude-faf-mcp in wolfe-jam/faf tap
- Homebrew installation now fully functional and verified

## [2.6.6] - 2025-10-25

### Changed
- Redesigned README for professional clarity and credibility
- Removed decorative emoji and formatting from meta-content
- Emphasized "persistent project context" in official registry listing
- Clarified format-driven architecture (format-first, not tools-first)

### Added
- "Scoring System Experience" section with product screenshot
- Homebrew installation option (brew install Wolfe-Jam/tap/claude-faf-mcp)
- Strengthened positioning: "first and only persistent project context server"

### Documentation
- Format-driven architecture now leads value proposition
- Distinguished .faf from tools.md and CLAUDE.md
- Professional, noise-free README structure

## [2.6.3] - 2025-10-20

### Fixed
- Corrected typo in README title: "Persistant" → "Persistent"

## [2.6.2] - 2025-10-20

### Changed
- README version management - DRY principle implementation
- Removed duplicate version references from Technical Specs section
- Version now appears once in title for simplified maintenance

### Documentation
- Version only in title (single source of truth) and historical changelog entries
- Streamlined documentation for easier version updates

## [2.6.1] - 2025-10-16

☑️ **Official MCP Registry Publication**

### Added
- server.json configuration for Anthropic MCP Registry listing
- Official registry validation and publication ([PR #2759](https://github.com/modelcontextprotocol/servers/pull/2759) MERGED)

### Changed
- mcpName field updated with correct capitalization format (io.github.Wolfe-Jam/claude-faf-mcp)
- First .faf format server officially listed in Anthropic MCP ecosystem

### Registry Status
- ☑️ Published to official Anthropic MCP Registry
- ☑️ Validated by Anthropic engineering team
- ☑️ Available for one-click installation in MCP-compatible hosts

## [2.6.0] - 2025-10-14

🏆 **Post-Evaluation Release (94.4/100 Gold Standard)**

### Added
- Type-safe tool handlers with proper TypeScript definitions
- Community contribution framework (templates, guidelines, funding)
- WJTTC Comprehensive Evaluation Report (94.4/100 Gold Standard)

### Changed
- Repository cleanup: Removed 17K+ lines of legacy docs
- Improved TypeScript strict mode compliance across all handlers

### Developer Experience
- Better IDE autocomplete with proper types
- Cleaner codebase for contributors
- Professional community standards

## [2.5.5] - 2025-10-13

### Added
- GitHub Pages documentation hub at https://wolfe-jam.github.io/claude-faf-mcp/
- GitHub Discussions for community engagement
- Issue templates (bug report & feature request) with YAML forms
- CONTRIBUTING.md with development guide and TypeScript strict mode requirements
- REDDIT_POST.md for r/ClaudeAI announcement
- Comprehensive evaluation report (94.4/100 Gold Standard)
- Enhanced NPM keywords (59 strategic terms) for better discoverability
- Brand keywords: faf-innit, fast-af, wolfejam, ai-commit, context-mirroring, c-mirror
- 12 professional badges in README (NPM, downloads, TypeScript, performance, evaluation)

### Changed
- Updated .gitignore to allow docs/*.md files while keeping internal docs private
- Enhanced README with Championship Score Card and Orange Smiley branding
- Improved package.json description for cleaner NPM presence

### Fixed
- Official Orange Smiley 🧡 brand icon properly integrated (commit message corrected from history)
- Image URLs now use jsdelivr CDN for reliable display across npm, GitHub, and docs

## [2.5.4] - 2025-10-12

### Fixed
- Image display issues on npmjs.com package page using GitHub raw URLs

## [2.5.3] - 2025-10-11

### Added
- Championship branding complete with Orange Smiley visual identity
- Score card screenshot showing actual terminal output

## [2.5.2] - 2025-10-10

### Added
- Visual Championship Experience on NPM package page
- Orange Smiley branding with complete visual identity
- Championship Score Card screenshot in scoring section

### Changed
- Professional presentation and polish across all documentation

## [2.5.1] - 2025-10-09

### Changed
- Championship README with Trophy section leading for immediate impact
- Optimized package description for cleaner NPM presence
- Professional structure with scannable, modern layout

## [2.5.0] - 2025-10-08

### Added
- **Championship Edition** - 7-tier medal system for AI-readiness scoring
- Visual progress bars in terminal output
- Milestone tracking with next-level guidance
- Enhanced scoring algorithm for better project analysis

### Changed
- Scoring system now uses F1-inspired tiers:
  - 🏆 Trophy (100%) - Perfect AI|HUMAN balance
  - 🥇 Gold (99%) - Gold standard
  - 🥈 Silver (95-98%) - Excellence
  - 🥉 Bronze (85-94%) - Production ready
  - 🟢 Green (70-84%) - Good foundation
  - 🟡 Yellow (55-69%) - Getting there
  - 🔴 Red (0-54%) - Needs attention

## [2.4.0] - 2025-09-30

### Added
- Enhanced MCP tools for better Claude Desktop integration
- Improved error handling and validation

## [2.3.0] - 2025-09-25

### Added
- Bi-directional sync between .faf and CLAUDE.md files
- Performance optimizations (<11ms target achieved)

## [2.2.0] - 2025-09-20

### Added
- Complete TypeScript strict mode implementation
- Comprehensive test suite (730 C.O.R.E tests)
- Zero-dependency architecture (MCP SDK only)

## [2.1.0] - 2025-09-15

### Added
- 33+ MCP tools for complete project management
- Auto-detection and project analysis
- File operations (read, write, search, list)

## [2.0.0] - 2025-09-10

### Added
- Initial MCP server implementation
- .faf format support for Claude Desktop
- Core tools: faf_init, faf_auto, faf_score, faf_status

### Changed
- Migrated from CLI-only to MCP server architecture

## [1.0.0] - 2025-09-01

### Added
- Initial release of .faf format
- Project DNA concept for AI context
- Basic scoring system

---

## Legend

- **Added** - New features
- **Changed** - Changes in existing functionality
- **Deprecated** - Soon-to-be removed features
- **Removed** - Removed features
- **Fixed** - Bug fixes
- **Security** - Vulnerability fixes

---

**Made with 🧡 by wolfejam.dev**
