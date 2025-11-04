/**
 * Project Type Detector - FAF Compiler Engine MK3
 * Championship-grade type detection with intelligent confidence scoring
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ProjectType,
  TypeDetectionResult,
  SLOT_IGNORE_BY_TYPE,
  RELEVANT_SLOTS_BY_TYPE,
} from '../types/project-types';

export class ProjectTypeDetector {
  private projectPath: string;
  private packageJson: any = null;

  constructor(projectPath: string) {
    this.projectPath = projectPath;
  }

  /**
   * Detect project type from file system analysis
   */
  async detect(): Promise<TypeDetectionResult> {
    // Load package.json if it exists
    await this.loadPackageJson();

    // Detection priority (as per spec)
    // 1. Explicit markers
    const explicitType = this.detectExplicitMarkers();
    if (explicitType) {
      return this.createResult(explicitType.type, explicitType.confidence, explicitType.reasoning);
    }

    // 2. Framework signatures
    const frameworkType = this.detectFrameworkSignatures();
    if (frameworkType) {
      return this.createResult(frameworkType.type, frameworkType.confidence, frameworkType.reasoning);
    }

    // 3. Structure analysis
    const structureType = await this.analyzeStructure();
    if (structureType) {
      return this.createResult(structureType.type, structureType.confidence, structureType.reasoning);
    }

    // 4. Package.json analysis
    const packageType = this.analyzePackageJson();
    if (packageType) {
      return this.createResult(packageType.type, packageType.confidence, packageType.reasoning);
    }

    // 5. Default to full-stack (safe fallback)
    return this.createResult('full-stack', 50, 'Defaulted to full-stack (unable to determine specific type)');
  }

  /**
   * Check for explicit file markers
   */
  private detectExplicitMarkers(): { type: ProjectType; confidence: number; reasoning: string } | null {
    // Browser extension
    if (this.hasFile('manifest.json')) {
      return {
        type: 'browser-extension',
        confidence: 95,
        reasoning: 'Found manifest.json (browser extension marker)',
      };
    }

    // Documentation site
    if (this.hasFile('docusaurus.config.js') || this.hasFile('docusaurus.config.ts')) {
      return {
        type: 'docs-site',
        confidence: 95,
        reasoning: 'Found Docusaurus config',
      };
    }
    if (this.hasFile('vitepress.config.js') || this.hasFile('vitepress.config.ts') || this.hasFile('.vitepress/config.js')) {
      return {
        type: 'docs-site',
        confidence: 95,
        reasoning: 'Found VitePress config',
      };
    }
    if (this.hasFile('nextra.config.js') || this.hasFile('next.config.js')) {
      const hasDocs = this.hasDirectory('pages') || this.hasDirectory('docs');
      if (hasDocs) {
        return {
          type: 'docs-site',
          confidence: 90,
          reasoning: 'Found Next.js config with docs structure',
        };
      }
    }

    // Monorepo
    if (this.hasFile('pnpm-workspace.yaml')) {
      return {
        type: 'monorepo',
        confidence: 95,
        reasoning: 'Found pnpm-workspace.yaml',
      };
    }
    if (this.hasFile('lerna.json')) {
      return {
        type: 'monorepo',
        confidence: 95,
        reasoning: 'Found lerna.json',
      };
    }
    if (this.hasFile('nx.json')) {
      return {
        type: 'monorepo',
        confidence: 95,
        reasoning: 'Found nx.json (Nx monorepo)',
      };
    }
    if (this.hasFile('turbo.json')) {
      return {
        type: 'monorepo',
        confidence: 95,
        reasoning: 'Found turbo.json (Turborepo)',
      };
    }

    // Serverless
    if (this.hasFile('serverless.yml') || this.hasFile('serverless.yaml')) {
      return {
        type: 'serverless',
        confidence: 95,
        reasoning: 'Found serverless config',
      };
    }

    // Microservices
    if (this.hasFile('docker-compose.yml') || this.hasFile('docker-compose.yaml')) {
      if (this.hasDirectory('k8s') || this.hasDirectory('kubernetes')) {
        return {
          type: 'microservices',
          confidence: 90,
          reasoning: 'Found docker-compose + k8s configs',
        };
      }
    }

    return null;
  }

  /**
   * Detect framework signatures from dependencies
   */
  private detectFrameworkSignatures(): { type: ProjectType; confidence: number; reasoning: string } | null {
    if (!this.packageJson) return null;

    const allDeps = {
      ...this.packageJson.dependencies,
      ...this.packageJson.devDependencies,
    };

    // MCP Server
    if (allDeps['@modelcontextprotocol/sdk']) {
      return {
        type: 'mcp-server',
        confidence: 95,
        reasoning: 'Found @modelcontextprotocol/sdk dependency',
      };
    }

    // Desktop app
    if (allDeps['electron'] || allDeps['@tauri-apps/api']) {
      return {
        type: 'desktop-app',
        confidence: 95,
        reasoning: allDeps['electron'] ? 'Found Electron dependency' : 'Found Tauri dependency',
      };
    }

    // Mobile app
    if (allDeps['react-native'] || allDeps['expo']) {
      return {
        type: 'mobile-app',
        confidence: 95,
        reasoning: allDeps['react-native'] ? 'Found React Native dependency' : 'Found Expo dependency',
      };
    }
    if (allDeps['flutter']) {
      return {
        type: 'mobile-app',
        confidence: 95,
        reasoning: 'Found Flutter dependency',
      };
    }

    return null;
  }

  /**
   * Analyze project structure
   */
  private async analyzeStructure(): Promise<{ type: ProjectType; confidence: number; reasoning: string } | null> {
    const hasFrontend = this.hasFrontendFramework();
    const hasBackend = this.hasBackendFramework();
    const hasDatabase = this.hasDatabaseDependency();

    // Full-stack (all three)
    if (hasFrontend && hasBackend && hasDatabase) {
      return {
        type: 'full-stack',
        confidence: 90,
        reasoning: 'Has frontend + backend + database',
      };
    }

    // API backend (backend, no frontend)
    if (hasBackend && !hasFrontend) {
      return {
        type: 'api-backend',
        confidence: 85,
        reasoning: 'Has backend framework, no frontend',
      };
    }

    // SPA or Vibe site (frontend, no backend)
    if (hasFrontend && !hasBackend) {
      const isStaticOnly = await this.isStaticOnly();
      if (isStaticOnly) {
        return {
          type: 'vibe-site',
          confidence: 80,
          reasoning: 'Static site with minimal dependencies',
        };
      }
      return {
        type: 'spa',
        confidence: 85,
        reasoning: 'Has frontend framework, no backend',
      };
    }

    return null;
  }

  /**
   * Analyze package.json for library/CLI patterns
   */
  private analyzePackageJson(): { type: ProjectType; confidence: number; reasoning: string } | null {
    if (!this.packageJson) return null;

    // CLI tool
    if (this.packageJson.bin) {
      return {
        type: 'cli-tool',
        confidence: 90,
        reasoning: 'Has bin field in package.json',
      };
    }

    // Library
    if (this.packageJson.main || this.packageJson.exports) {
      const hasSrcDir = this.hasDirectory('src');
      const hasNoAppStructure = !this.hasDirectory('pages') && !this.hasDirectory('app') && !this.hasDirectory('routes');

      if (hasSrcDir && hasNoAppStructure) {
        return {
          type: 'library',
          confidence: 85,
          reasoning: 'Has main/exports field with library structure',
        };
      }
    }

    return null;
  }

  /**
   * Create TypeDetectionResult from detected type
   */
  private createResult(type: ProjectType, confidence: number, reasoning: string): TypeDetectionResult {
    return {
      type,
      confidence,
      slotignore: SLOT_IGNORE_BY_TYPE[type],
      relevantSlots: RELEVANT_SLOTS_BY_TYPE[type],
      reasoning,
    };
  }

  /**
   * Helper: Check if file exists
   */
  private hasFile(fileName: string): boolean {
    try {
      const filePath = path.join(this.projectPath, fileName);
      return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch {
      return false;
    }
  }

  /**
   * Helper: Check if directory exists
   */
  private hasDirectory(dirName: string): boolean {
    try {
      const dirPath = path.join(this.projectPath, dirName);
      return fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    } catch {
      return false;
    }
  }

  /**
   * Helper: Load package.json
   */
  private async loadPackageJson(): Promise<void> {
    try {
      const pkgPath = path.join(this.projectPath, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const content = fs.readFileSync(pkgPath, 'utf-8');
        this.packageJson = JSON.parse(content);
      }
    } catch {
      // Silently fail if package.json doesn't exist or can't be parsed
    }
  }

  /**
   * Helper: Check if has frontend framework
   */
  private hasFrontendFramework(): boolean {
    if (!this.packageJson) return false;

    const allDeps = {
      ...this.packageJson.dependencies,
      ...this.packageJson.devDependencies,
    };

    const frontendFrameworks = ['react', 'vue', 'svelte', '@angular/core', 'solid-js', 'preact'];
    return frontendFrameworks.some(fw => allDeps[fw]);
  }

  /**
   * Helper: Check if has backend framework
   */
  private hasBackendFramework(): boolean {
    if (!this.packageJson) return false;

    const allDeps = {
      ...this.packageJson.dependencies,
      ...this.packageJson.devDependencies,
    };

    const backendFrameworks = ['express', 'koa', 'hono', '@hono/node-server', 'fastify', 'nestjs'];
    return backendFrameworks.some(fw => allDeps[fw]);
  }

  /**
   * Helper: Check if has database dependency
   */
  private hasDatabaseDependency(): boolean {
    if (!this.packageJson) return false;

    const allDeps = {
      ...this.packageJson.dependencies,
      ...this.packageJson.devDependencies,
    };

    const databases = ['pg', 'mysql', 'mongodb', 'mongoose', 'prisma', '@supabase/supabase-js', 'sqlite3', 'better-sqlite3'];
    return databases.some(db => allDeps[db]);
  }

  /**
   * Helper: Check if static-only site
   */
  private async isStaticOnly(): Promise<boolean> {
    if (!this.packageJson) return true;

    const allDeps = {
      ...this.packageJson.dependencies,
      ...this.packageJson.devDependencies,
    };

    // Count total dependencies
    const depCount = Object.keys(allDeps).length;

    // Static sites typically have < 10 dependencies
    // and no server/state management libraries
    const hasServerDeps = allDeps['express'] || allDeps['next'] || allDeps['@sveltejs/kit'];
    const hasStateMgmt = allDeps['redux'] || allDeps['zustand'] || allDeps['@tanstack/react-query'];

    return depCount < 10 && !hasServerDeps && !hasStateMgmt;
  }
}
