# Changelog

All notable changes to claude-faf-mcp will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [3.3.7] - 2025-12-22

### Added
- **TYPE_DEFINITIONS Scoring Parity** - Ported from faf-cli v3.2.5
  - 94 project types + 38 aliases for accurate slot-based scoring
  - Single source of truth for project type detection
  - Ensures MCP scoring matches CLI scoring exactly

### Changed
- Scoring engine now uses TYPE_DEFINITIONS for slot applicability
- Improved type detection for CLI, fullstack, library, and other project types

## [3.3.6] - 2025-12-17

### Added
- **WJTTC MCP Certification Standard** - 7-tier certification system for MCP servers
  - Tier 1: Protocol Compliance (MCP spec 2025-11-25)
  - Tier 2: Capability Negotiation
  - Tier 3: Tool Integrity
  - Tier 4: Resource Management
  - Tier 5: Security Validation
  - Tier 6: Performance Benchmarks (<50ms operations)
  - Tier 7: Integration Readiness
- **wjttc-mcp.test.ts** - Comprehensive MCP certification test suite
  - Performance metrics (tool list, tool call, file ops, concurrent ops)
  - Memory growth tracking
  - Full certification report output
- **WJTTC-MCP-v3.3.6-REPORT.json** - Machine-readable test results

### Changed
- Test suite now outputs WJTTC certification level (CHAMPIONSHIP GRADE)
- All 5 test suites passing (visibility, performance, security, wjttc-mcp, desktop-native)

## [3.3.4] - 2025-12-01

### Added
- **Subsite Auto-Detection** - Smart scoring for static HTML subsites
  - Pattern detection: No `package.json` + has `index.html`
  - Auto-ignores package.json-derived stack slots (backend, api_type, runtime, database, etc.)
  - Subsites can achieve 100% score without manual configuration
  - Auto-fills: `stack.frontend`, `stack.hosting`, `stack.build`, `stack.cicd`
  - Ideal for landing pages, demos, documentation subsites
- **Path Context Enhancement** - All action tools now support explicit `path` parameter
  - `faf_context` tool for explicit session context management
  - Auto-set context when reading .faf files via `faf_read`
  - Session state persists for subsequent calls
- **faf_human_add** - Renamed from `faf_human_set` for consistency with CLI

## [3.3.3] - 2025-11-27

### Fixed
- **Tier System Alignment** - Synchronized Mk3 tier system across all code paths
  - JSON output now uses canonical tier names (Trophy, Gold, Silver, Bronze, Green, Yellow, Red, White)
  - Fixed 0% edge case to show White tier (🤍)
  - All scorecard renders now use unified `getScoreMedal()` function
- **Removed Unauthorized Branding** - Cleaned up hallucinated F1/racing terminology
  - Removed "Championship", "Podium Edition", "Race ready", "Pit Stop" from user-facing output
  - Tool descriptions updated to neutral language
  - Help text now shows proper Mk3 tier system
- **README Cleanup** - Removed F1 branding, aligned with code changes

## [3.3.2] - 2025-11-16

### Fixed
- Updated Discord community invite link to working URL (never expires)

## [3.3.1] - 2025-11-12

### Changed
- **README Simplification** - Minimalist Quick Start following Claude Code's clean approach
  - "Copy and paste this to Claude/your AI" - Zero friction installation
  - Single-line config instruction (no verbose JSON blocks)
  - npm as primary install method (traffic/discovery optimized)
  - Desktop Extension as one-click alternative
- **Strategic Positioning** - Optimized for npm search ranking and discoverability
  - Removed Projects Convention section (moved to docs)
  - Removed Troubleshooting section (moved to docs)
  - Clean, professional landing page

### User Experience
This release perfects the installation messaging: users get ultra-minimal instructions while we maintain maximum npm download metrics for ecosystem discoverability.

## [3.3.0] - 2025-11-12

### Added
- **Desktop Extension (.mcpb)** - One-click installation bundle with branded FAF orange icon
  - Packaged .mcpb format for drag-and-drop installation in Claude Desktop
  - Orange smiley icon displays in all MCP server views
  - Available from GitHub releases page
- **MCP Protocol Icons** - Added full icon set (48x48, 128x128, 256x256, 512x512) to server.json
  - Icons hosted on GitHub raw URLs for registry display
  - Proper MIME types and size specifications

### Changed
- **One-Command Installation** - Moved faf-cli from peerDependencies to dependencies
  - `npm install -g claude-faf-mcp` now auto-installs both packages
  - Dual download metrics maintained (both packages counted separately)
  - Eliminated manual two-step installation process
- **README Restructure** - Added two installation options
  - Option 1: npm (one command, no config editing)
  - Option 2: Desktop Extension (with branded icon)
  - Clear documentation of path resolution system

### Installation Experience
This release perfects the installation flow: users get one-command simplicity while we maintain accurate download metrics for both claude-faf-mcp and faf-cli packages.

## [3.2.0] - 2025-11-10

### Added
- **Podium Edition Scorecard** - Full championship-style scorecard with `faf_score --full` flag
  - Dynamic status tiers (PODIUM EDITION, RACE READY, QUALIFYING, IN DEVELOPMENT)
  - Four detailed sections with live progress bars (Core Intelligence, Context Delivery, Performance, Standalone Operation)
  - Real-time metrics calculated based on project files (project.faf, CLAUDE.md, README.md, package.json)
  - Smart next steps based on what's missing in your project
  - Mobile-friendly "project.faf score: podium" format
  - Includes new Claude quote: "It's so logical if it didn't exist, AI would have built it itself"

### Changed
- **README Restructure** - Following Svelte/Vercel pattern for clean landing page
  - README.md now uses clean landing page content (155 lines → from 564 lines)
  - Version history moved to CHANGELOG.md (this file)
  - GitHub Pages (wolfe-jam.github.io/claude-faf-mcp/) is now canonical documentation
  - Landing page tagline updated to new Claude quote
  - Title color changed to orange (#FF8C00) for brand consistency

### Project Milestone
This release inaugurates the "project.faf scorecard era" - transforming the static documentation scorecard into a dynamic, interactive feature accessible through MCP tools.

## [3.0.5] - 2025-11-07

### Added
- **Discord Release Automation** - Automatic Discord announcements for new releases
- **MCP Mission Statement** - Clarified .faf's position as universal Context layer for Model Context Protocol

### Changed
- **Documentation Polish** - Updated README from beta messaging to stable v3.0.4+ docs
- **Code Cleanup** - Post-release refactoring and optimization

### Fixed
- **File Utils** - Simplified file handling logic
- **FAF File Finder** - Improved project.faf detection with better fallback logic

## [3.0.4] - 2025-11-06

🏎️ **100% Standalone Achievement - Championship Complete**

### Added
- **faf_quick** - Lightning-fast project.faf creation (3ms average)
- **faf_enhance** - Intelligent enhancement with auto-detection (63ms)

### Changed
- **Mk3 Complete** - 14/14 bundled commands (was 12/14)
- **100% Standalone** - Zero CLI dependencies across all 50 tools
- **16.2x Speedup** - Average performance improvement over CLI versions
- **19ms Average** - Execution time across all bundled commands

### Performance
- 50/50 MCP tools operational (100% success rate)
- Fastest command: 1ms (formats)
- Unmeasurable: 0ms (migrate - too fast!)

## [3.0.3] - 2025-11-06

### Added
- **9 NEW Bundled Commands**: Eliminated ALL CLI dependencies!
  - `faf_sync` - Sync project.faf with project changes
  - `faf_bi_sync` - Bidirectional sync (project.faf ↔ CLAUDE.md)
  - `faf_formats` - TURBO-CAT format discovery
  - `faf_doctor` - Health check diagnostics
  - `faf_validate` - Schema validation
  - `faf_audit` - Comprehensive quality audit
  - `faf_update` - Update project.faf metadata
  - `faf_migrate` - Migrate legacy .faf to project.faf
  - `faf_innit` - British init command (innit bruv!)

### Fixed
- **CRITICAL**: Users can now generate CLAUDE.md without CLI (faf_bi_sync works!)
- **CRITICAL**: Format discovery works without CLI (faf_formats works!)
- All 50 MCP tools now work standalone - NO CLI DEPENDENCY

### Changed
- Mk3 bundled engine now handles 12 commands (was 3):
  - init, score, auto (v3.0.0)
  - sync, bi-sync, formats, doctor, validate, audit, update, migrate, innit (v3.0.3)
- Average test duration: 102.20ms (50/50 passing)

### Performance
- 100% tool success rate
- All categories verified working
- Zero CLI fallback calls for bundled commands

### Breaking the 40% Barrier
Users stuck at 40% AI-readiness (couldn't generate CLAUDE.md) are now FREE!
- Before: 16/25 working (64%) - blocked by CLI dependency
- After: 25/25 working (100%) - fully standalone

## [3.0.2] - 2025-11-06

### Fixed
- **Claude Desktop Usability**: MCP now defaults to ~/Projects instead of constantly asking for directory paths
- **Working Directory Logic**: Simplified `findBestWorkingDirectory()` to force universal ~/Projects default
- **Container Compatibility**: Explicitly avoids `/root/` to work seamlessly in Claude Desktop's container environment

### Changed
- Engine adapter now creates ~/Projects directory if it doesn't exist (cross-platform)
- Fallback hierarchy: FAF_WORKING_DIR env → MCP_WORKING_DIR env → ~/Projects (force) → home → /tmp
- Better user experience: "we LIVE in /Projects" - no more path prompts

### Testing
- 50/50 tools passing (100%) with new default
- Average duration: 152.58ms
- All categories verified working

## [3.0.1] - 2025-11-06

### Fixed
- **Mk3 Engine Adapter**: Fixed flag parsing bug where `--force` was treated as a directory path
- **faf_auto Tool**: Now correctly passes `force` flag to bundled engine
- **Type Definitions**: Added missing `force` property to `FafAutoArgs` interface

### Testing
- Added comprehensive MCP tools test suite (test-mcp-tools.js)
- All 5 core tools now passing: faf_init, faf_score, faf_auto, faf_status, faf_about
- Verified file creation works correctly through MCP tool handlers

### Performance
- Average duration: 20.6ms (5/5 tests passing)
- 100% success rate on MCP tool operations

## [3.0.0] - 2025-11-06

🏎️ **Mk3 Championship Edition - Done Properly**

### Breaking Changes
- **project.faf ONLY**: No longer supports legacy `.faf` (hidden) files
- MCP now throws LOUD error if `.faf` detected with migration instructions
- Users MUST run `faf migrate` to upgrade legacy projects

### What's New in v3.0.0
- **Mk3 Bundled Engine**: Core CLI code bundled directly (6-16x faster)
- **ONE Standard**: project.faf everywhere (visible, universal, like package.json)
- **LOUD Migration Errors**: Clear guidance when legacy `.faf` detected
- **Championship Performance**: 24.7ms avg, 104 calls/sec throughput

### Added
- project.faf as the ONLY supported filename (no legacy fallback)
- Bundled engine for 3 commands: score, init, auto (no CLI dependency)
- Loud error messages with migration instructions for legacy files
- Simplified file discovery (no complex priority logic)

### Changed
- `findFafFile()` now ONLY finds project.faf (throws error for `.faf`)
- File discovery simplified (no tier system, no legacy support)
- All internal references updated to project.faf standard

### Removed
- Legacy `.faf` (hidden) file support
- Multi-tier file discovery system
- Deprecation warnings (replaced with hard errors)

### Migration Guide
If upgrading from v2.x with `.faf` files:
1. Run `faf migrate` in your project directory
2. This renames `.faf` → `project.faf` (takes <1 second)
3. Then upgrade to MCP v3.0.0

### Performance
- Cold start: 154ms
- Warmed average: 24.7ms (50% better than 50ms target)
- Concurrent: 9.6ms per call
- Memory: -1.88MB heap growth (zero leaks)

## [3.0.0-beta.2] - 2025-11-06

### Documentation
- Added comprehensive beta announcement to README with:
  - Clear explanation of Mk3 Bundled Engine
  - Compatibility table (no CLI → v2.7.3, with CLI → v3.0 beta)
  - Installation instructions for both scenarios
  - What works vs what doesn't (3 bundled, 13 need CLI)
  - Beta testing feedback request
  - Performance metrics and WJTTC certification

## [3.0.0-beta.1] - 2025-11-06

🏎️ **Mk3 Bundled Engine - Championship Performance Edition**

### Breaking Changes
- MCP server now operates standalone - no longer requires global faf-cli installation
- Bundled engine architecture replaces CLI process spawning for core commands

### Added
- **Mk3 Bundled Engine**: Core CLI engine code now bundled directly into MCP package
- 3 commands now use direct function calls (no CLI dependency):
  - `score` - FafCompiler scoring engine (24.7ms avg, 104 calls/sec throughput)
  - `init` - Project initialization (78ms avg)
  - `auto` - Combined init + score workflow (9-15ms avg)
- New `/src/faf-core/` directory with 19 bundled files (624KB compiled):
  - Core compiler engine (FafCompiler - 922 lines)
  - Generators (championship faf-generator)
  - Utilities (file operations, fafignore parsing, chrome detection)
  - Engines (FAB formats processor, DNA analyzer, context extractor, dependency TSA)
- Programmatic APIs for score, init, and auto commands (return structured data, no console output)
- Fallback mechanism: non-bundled commands still shell out to CLI if installed
- Enhanced working directory detection with safety checks (prevents home/root directory execution)

### Changed
- Performance improvements: 6-16x faster than CLI spawning for bundled commands
  - Cold start: 154ms (beating 200ms target)
  - Warmed average: 24.7ms (beating 50ms target by 50%)
  - Concurrent: 9.6ms per call (104 calls/second throughput)
- TypeScript strict mode adjustments: disabled `noUnusedLocals` and `noUnusedParameters` for bundled CLI code
- Engine adapter now routes to bundled functions before falling back to CLI

### Dependencies
- Added `yaml` package (2.4.1) - only new production dependency needed

### Performance
- Memory efficient: -1.88MB heap growth over 100 iterations (negative = no leak!)
- Sub-10ms response times in concurrent mode
- Zero crashes, zero hangs, zero race conditions

### Testing
- WJTTC Championship Grade Certified (6/6 tests passed)
- 100% test pass rate across stress tests
- Backward compatible with existing workflows

### Documentation
- BUNDLING_PLAN.md - Complete dependency tree and migration strategy
- MK3_TEST_RESULTS.md - Architecture documentation and performance benchmarks
- WJTTC-MK3-ENGINE-REPORT.md - F1-inspired championship test report

### Known Limitations
- 13 commands still require CLI fallback (quick, sync, bi-sync, enhance, formats, validate, doctor, dna, log, update, recover, auth, audit)
- Cold start 154ms (acceptable but could be optimized to <100ms in future)

### Migration Notes
- Existing MCP users get automatic performance upgrade
- No configuration changes required
- Backward compatible with all existing workflows
- CLI fallback ensures no functionality loss

### Compatibility Notice
- **No CLI installed**: Use v2.7.3 (last fully standalone version)
- **With CLI installed**: Use v2.8/2.9 or upgrade to v3.0.0-beta.1 (3 commands get 6-16x performance boost)
- **Mk3 beta caveat**: 13 commands still require faf-cli fallback (will be bundled in Mk3 stable)

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
