/**
 * Project Types V1 - FAF Compiler Engine MK3
 * Championship-grade type definitions for intelligent project scoring
 */

export type ProjectType =
  | 'browser-extension'
  | 'vibe-site'
  | 'spa'
  | 'full-stack'
  | 'api-backend'
  | 'library'
  | 'cli-tool'
  | 'mcp-server'
  | 'desktop-app'
  | 'mobile-app'
  | 'microservices'
  | 'serverless'
  | 'docs-site'
  | 'monorepo';

export interface TypeDetectionResult {
  type: ProjectType;
  confidence: number; // 0-100
  slotignore: string[];
  relevantSlots: number; // 21 - slotignore.length
  reasoning: string; // Why this type was selected
}

export interface ProjectSignature {
  files?: string[]; // Required files (manifest.json, docusaurus.config.js)
  dependencies?: string[]; // NPM dependencies (@modelcontextprotocol/sdk)
  devDependencies?: string[]; // Dev dependencies
  directories?: string[]; // Required directories
  packageJsonFields?: string[]; // Required fields in package.json (bin, exports)
}

export const PROJECT_TYPE_SIGNATURES: Record<ProjectType, ProjectSignature> = {
  'browser-extension': {
    files: ['manifest.json'],
  },
  'docs-site': {
    files: ['docusaurus.config.js', 'vitepress.config.js', 'nextra.config.js'],
  },
  'monorepo': {
    files: ['pnpm-workspace.yaml', 'lerna.json', 'nx.json', 'turbo.json'],
  },
  'mcp-server': {
    dependencies: ['@modelcontextprotocol/sdk'],
  },
  'desktop-app': {
    dependencies: ['electron', 'tauri'],
  },
  'mobile-app': {
    dependencies: ['react-native', 'flutter', 'expo'],
  },
  'serverless': {
    files: ['serverless.yml', 'serverless.yaml'],
    dependencies: ['serverless'],
  },
  'microservices': {
    files: ['docker-compose.yml', 'k8s/', 'kubernetes/'],
  },
  'cli-tool': {
    packageJsonFields: ['bin'],
  },
  'library': {
    packageJsonFields: ['main', 'exports'],
  },
  'api-backend': {
    dependencies: ['express', 'fastapi', 'koa', 'hono', '@hono/node-server'],
  },
  'full-stack': {
    // Detected by structure analysis (frontend + backend + database)
  },
  'spa': {
    dependencies: ['react', 'vue', 'svelte', '@angular/core'],
  },
  'vibe-site': {
    // Detected by static structure, minimal dependencies
  },
};

export const SLOT_IGNORE_BY_TYPE: Record<ProjectType, string[]> = {
  'browser-extension': ['backend', 'database', 'hosting', 'api', 'auth', 'storage', 'caching', 'team'],
  'vibe-site': ['backend', 'database', 'api', 'cicd', 'hosting', 'ui_library', 'state', 'runtime', 'auth', 'storage', 'caching', 'team'],
  'spa': ['backend', 'database', 'storage', 'caching'],
  'full-stack': [], // No slots ignored
  'api-backend': ['frontend', 'css', 'ui_library', 'state'],
  'library': ['frontend', 'backend', 'database', 'api', 'hosting', 'css', 'ui_library', 'state', 'runtime', 'auth', 'storage', 'caching', 'team'],
  'cli-tool': ['frontend', 'backend', 'database', 'api', 'hosting', 'css', 'ui_library', 'state', 'auth', 'storage', 'caching', 'team'],
  'mcp-server': ['frontend', 'database', 'hosting', 'css', 'ui_library', 'state', 'auth', 'storage', 'caching', 'team'],
  'desktop-app': ['hosting', 'caching', 'team'],
  'mobile-app': ['hosting', 'caching', 'team'],
  'microservices': [], // No slots ignored
  'serverless': ['frontend', 'css', 'ui_library', 'state'],
  'docs-site': ['backend', 'database', 'api', 'hosting', 'cicd', 'testing', 'ui_library', 'state', 'runtime', 'auth', 'storage', 'caching', 'team'],
  'monorepo': [], // No slots ignored
};

export const RELEVANT_SLOTS_BY_TYPE: Record<ProjectType, number> = {
  'browser-extension': 13,
  'vibe-site': 11,
  'spa': 17,
  'full-stack': 21,
  'api-backend': 17,
  'library': 10,
  'cli-tool': 10,
  'mcp-server': 11,
  'desktop-app': 18,
  'mobile-app': 18,
  'microservices': 21,
  'serverless': 17,
  'docs-site': 9,
  'monorepo': 21,
};
