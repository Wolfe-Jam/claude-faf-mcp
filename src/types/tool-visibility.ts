/**
 * 🏎️ FAF Tool Visibility System - v2.8.0
 * Reduce cognitive load: 20 core tools + 31 advanced tools
 * Championship-grade organization
 */

export type ToolVisibility = 'core' | 'advanced';

export type ToolCategory =
  | 'workflow'      // Essential workflow commands
  | 'quality'       // Scoring, validation, audit
  | 'intelligence'  // Format detection, stack info
  | 'sync'          // Context synchronization
  | 'ai'            // AI enhancement features
  | 'help'          // Documentation & support
  | 'trust'         // Trust system tools
  | 'file'          // File operations
  | 'utility'       // Miscellaneous utilities
  | 'display';      // Display variants

export interface ToolMetadata {
  name: string;
  visibility: ToolVisibility;
  category: ToolCategory;
  description: string;
  priority?: number; // For sorting within category
}

/**
 * CORE TOOLS (20) - Essential FAF workflow
 * Note: This list is for reference. Actual visibility is determined by TOOL_REGISTRY.
 */
const _CORE_TOOLS = [
  // Essential Workflow (5)
  'faf',
  'faf_auto',
  'faf_init',
  'faf_innit',
  'faf_status',

  // Scoring (4)
  'faf_score',
  'faf_validate',
  'faf_doctor',
  'faf_audit',

  // Intelligence (3)
  'faf_formats',
  'faf_stacks',
  'faf_skills',

  // Sync & Evolution (4)
  'faf_sync',
  'faf_bi_sync',
  'faf_update',
  'faf_migrate',

  // AI Enhancement (2)
  'faf_chat',
  'faf_enhance',

  // Help (3)
  'faf_index',
  'faf_faq',
  'faf_about',
] as const;

/**
 * ADVANCED TOOLS (31) - Power user features
 * Note: This list is for reference. Actual visibility is determined by TOOL_REGISTRY.
 */
const _ADVANCED_TOOLS = [
  // Display Variants (3)
  'faf_display',
  'faf_show',
  'faf_check',

  // Trust System (5)
  'faf_trust',
  'faf_trust_confidence',
  'faf_trust_garage',
  'faf_trust_panic',
  'faf_trust_validated',

  // AI Advanced (2)
  'faf_analyze',
  'faf_verify',

  // DNA/Auth (4)
  'faf_dna',
  'faf_log',
  'faf_auth',
  'faf_recover',

  // File Operations (11)
  'faf_read',
  'faf_write',
  'faf_list',
  'faf_exists',
  'faf_delete',
  'faf_move',
  'faf_copy',
  'faf_mkdir',
  'faf_edit',
  'faf_cat',
  'faf_ls',

  // Utilities (6)
  'faf_choose',
  'faf_clear',
  'faf_share',
  'faf_credit',
  'faf_todo',
  'faf_search',
  'faf_version',
  'faf_what',
  'faf_friday',
  'faf_debug',
] as const;

/**
 * Complete tool registry with metadata
 */
export const TOOL_REGISTRY: Record<string, ToolMetadata> = {
  // ============================================================================
  // CORE TOOLS (20)
  // ============================================================================

  // Essential Workflow (5)
  faf: {
    name: 'faf',
    visibility: 'core',
    category: 'workflow',
    description: 'Main FAF command - Project DNA for AI',
    priority: 1,
  },
  faf_auto: {
    name: 'faf_auto',
    visibility: 'core',
    category: 'workflow',
    description: 'One-command championship - Initialize & optimize automatically',
    priority: 2,
  },
  faf_init: {
    name: 'faf_init',
    visibility: 'core',
    category: 'workflow',
    description: 'Create .faf file (THE JPEG for AI) - Makes your project instantly AI-readable',
    priority: 3,
  },
  faf_innit: {
    name: 'faf_innit',
    visibility: 'core',
    category: 'workflow',
    description: 'Fast AF initialization - Minimal setup, maximum speed',
    priority: 4,
  },
  faf_status: {
    name: 'faf_status',
    visibility: 'core',
    category: 'workflow',
    description: 'Check if your project has .faf - Shows AI-readability status',
    priority: 5,
  },

  // Scoring (4)
  faf_score: {
    name: 'faf_score',
    visibility: 'core',
    category: 'quality',
    description: 'Calculate AI-readability from .faf file - F1-inspired metrics!',
    priority: 1,
  },
  faf_validate: {
    name: 'faf_validate',
    visibility: 'core',
    category: 'quality',
    description: 'Validate .faf file structure and content',
    priority: 2,
  },
  faf_doctor: {
    name: 'faf_doctor',
    visibility: 'core',
    category: 'quality',
    description: 'Diagnose and fix .faf issues automatically',
    priority: 3,
  },
  faf_audit: {
    name: 'faf_audit',
    visibility: 'core',
    category: 'quality',
    description: 'Comprehensive quality audit of .faf file',
    priority: 4,
  },

  // Intelligence (3)
  faf_formats: {
    name: 'faf_formats',
    visibility: 'core',
    category: 'intelligence',
    description: 'Detect formats in project with TURBO-CAT engine',
    priority: 1,
  },
  faf_stacks: {
    name: 'faf_stacks',
    visibility: 'core',
    category: 'intelligence',
    description: 'Identify technology stack and frameworks',
    priority: 2,
  },
  faf_skills: {
    name: 'faf_skills',
    visibility: 'core',
    category: 'intelligence',
    description: 'Analyze project complexity and required skills',
    priority: 3,
  },

  // Sync & Evolution (4)
  faf_sync: {
    name: 'faf_sync',
    visibility: 'core',
    category: 'sync',
    description: 'Sync .faf with CLAUDE.md - Bi-directional context',
    priority: 1,
  },
  faf_bi_sync: {
    name: 'faf_bi_sync',
    visibility: 'core',
    category: 'sync',
    description: 'Bi-directional sync between .faf context and CLAUDE.md',
    priority: 2,
  },
  faf_update: {
    name: 'faf_update',
    visibility: 'core',
    category: 'sync',
    description: 'Update .faf with latest project changes',
    priority: 3,
  },
  faf_migrate: {
    name: 'faf_migrate',
    visibility: 'core',
    category: 'sync',
    description: 'Migrate .faf to latest format version',
    priority: 4,
  },

  // AI Enhancement (2)
  faf_chat: {
    name: 'faf_chat',
    visibility: 'core',
    category: 'ai',
    description: 'Interactive AI chat with .faf context',
    priority: 1,
  },
  faf_enhance: {
    name: 'faf_enhance',
    visibility: 'core',
    category: 'ai',
    description: 'Enhance .faf with AI optimization - SPEEDY AI you can TRUST!',
    priority: 2,
  },

  // Help (3)
  faf_index: {
    name: 'faf_index',
    visibility: 'core',
    category: 'help',
    description: 'Browse all FAF commands and documentation',
    priority: 1,
  },
  faf_faq: {
    name: 'faf_faq',
    visibility: 'core',
    category: 'help',
    description: 'Frequently asked questions about FAF',
    priority: 2,
  },
  faf_about: {
    name: 'faf_about',
    visibility: 'core',
    category: 'help',
    description: 'Learn what .faf is - THE JPEG for AI',
    priority: 3,
  },

  // ============================================================================
  // ADVANCED TOOLS (31)
  // ============================================================================

  // Display Variants (3)
  faf_display: {
    name: 'faf_display',
    visibility: 'advanced',
    category: 'display',
    description: 'Display .faf content in various formats',
  },
  faf_show: {
    name: 'faf_show',
    visibility: 'advanced',
    category: 'display',
    description: 'Show specific .faf sections',
  },
  faf_check: {
    name: 'faf_check',
    visibility: 'advanced',
    category: 'display',
    description: 'Quick check of .faf status',
  },

  // Trust System (5)
  faf_trust: {
    name: 'faf_trust',
    visibility: 'advanced',
    category: 'trust',
    description: 'Validate .faf integrity - Trust metrics',
  },
  faf_trust_confidence: {
    name: 'faf_trust_confidence',
    visibility: 'advanced',
    category: 'trust',
    description: 'Calculate confidence score for .faf data',
  },
  faf_trust_garage: {
    name: 'faf_trust_garage',
    visibility: 'advanced',
    category: 'trust',
    description: 'Store trusted .faf snapshots',
  },
  faf_trust_panic: {
    name: 'faf_trust_panic',
    visibility: 'advanced',
    category: 'trust',
    description: 'Emergency .faf recovery mode',
  },
  faf_trust_validated: {
    name: 'faf_trust_validated',
    visibility: 'advanced',
    category: 'trust',
    description: 'Show validated .faf state',
  },

  // AI Advanced (2)
  faf_analyze: {
    name: 'faf_analyze',
    visibility: 'advanced',
    category: 'ai',
    description: 'Deep analysis of project with AI',
  },
  faf_verify: {
    name: 'faf_verify',
    visibility: 'advanced',
    category: 'ai',
    description: 'Verify .faf accuracy with AI',
  },

  // DNA/Auth (4)
  faf_dna: {
    name: 'faf_dna',
    visibility: 'advanced',
    category: 'utility',
    description: 'Track project DNA evolution',
  },
  faf_log: {
    name: 'faf_log',
    visibility: 'advanced',
    category: 'utility',
    description: 'View .faf change history',
  },
  faf_auth: {
    name: 'faf_auth',
    visibility: 'advanced',
    category: 'utility',
    description: 'Manage FAF authentication',
  },
  faf_recover: {
    name: 'faf_recover',
    visibility: 'advanced',
    category: 'utility',
    description: 'Recover .faf from backup',
  },

  // File Operations (11)
  faf_read: {
    name: 'faf_read',
    visibility: 'advanced',
    category: 'file',
    description: 'Read .faf file contents',
  },
  faf_write: {
    name: 'faf_write',
    visibility: 'advanced',
    category: 'file',
    description: 'Write content to .faf file',
  },
  faf_list: {
    name: 'faf_list',
    visibility: 'advanced',
    category: 'file',
    description: 'List .faf files in directory',
  },
  faf_exists: {
    name: 'faf_exists',
    visibility: 'advanced',
    category: 'file',
    description: 'Check if .faf file exists',
  },
  faf_delete: {
    name: 'faf_delete',
    visibility: 'advanced',
    category: 'file',
    description: 'Delete .faf file',
  },
  faf_move: {
    name: 'faf_move',
    visibility: 'advanced',
    category: 'file',
    description: 'Move .faf file',
  },
  faf_copy: {
    name: 'faf_copy',
    visibility: 'advanced',
    category: 'file',
    description: 'Copy .faf file',
  },
  faf_mkdir: {
    name: 'faf_mkdir',
    visibility: 'advanced',
    category: 'file',
    description: 'Create directory for .faf files',
  },
  faf_edit: {
    name: 'faf_edit',
    visibility: 'advanced',
    category: 'file',
    description: 'Edit .faf file interactively',
  },
  faf_cat: {
    name: 'faf_cat',
    visibility: 'advanced',
    category: 'file',
    description: 'Display .faf file contents',
  },
  faf_ls: {
    name: 'faf_ls',
    visibility: 'advanced',
    category: 'file',
    description: 'List directory contents',
  },

  // Utilities (10)
  faf_choose: {
    name: 'faf_choose',
    visibility: 'advanced',
    category: 'utility',
    description: 'Interactive .faf file selector',
  },
  faf_clear: {
    name: 'faf_clear',
    visibility: 'advanced',
    category: 'utility',
    description: 'Clear .faf cache',
  },
  faf_share: {
    name: 'faf_share',
    visibility: 'advanced',
    category: 'utility',
    description: 'Share .faf file securely',
  },
  faf_credit: {
    name: 'faf_credit',
    visibility: 'advanced',
    category: 'utility',
    description: 'Show FAF credits and attribution',
  },
  faf_todo: {
    name: 'faf_todo',
    visibility: 'advanced',
    category: 'utility',
    description: 'Manage project todos',
  },
  faf_search: {
    name: 'faf_search',
    visibility: 'advanced',
    category: 'utility',
    description: 'Search within .faf content',
  },
  faf_version: {
    name: 'faf_version',
    visibility: 'advanced',
    category: 'utility',
    description: 'Show FAF CLI version',
  },
  faf_what: {
    name: 'faf_what',
    visibility: 'advanced',
    category: 'help',
    description: 'What is .faf? Quick explanation',
  },
  faf_friday: {
    name: 'faf_friday',
    visibility: 'advanced',
    category: 'utility',
    description: 'Intel Friday fuzzy detection mode',
  },
  faf_debug: {
    name: 'faf_debug',
    visibility: 'advanced',
    category: 'utility',
    description: 'Debug mode with verbose output',
  },
};

/**
 * Helper functions
 */

export function isCoreTool(toolName: string): boolean {
  return TOOL_REGISTRY[toolName]?.visibility === 'core';
}

export function isAdvancedTool(toolName: string): boolean {
  return TOOL_REGISTRY[toolName]?.visibility === 'advanced';
}

export function getCoreTools(): ToolMetadata[] {
  return Object.values(TOOL_REGISTRY).filter((tool) => tool.visibility === 'core');
}

export function getAdvancedTools(): ToolMetadata[] {
  return Object.values(TOOL_REGISTRY).filter((tool) => tool.visibility === 'advanced');
}

export function getAllTools(): ToolMetadata[] {
  return Object.values(TOOL_REGISTRY);
}

export function getToolsByCategory(category: ToolCategory): ToolMetadata[] {
  return Object.values(TOOL_REGISTRY).filter((tool) => tool.category === category);
}

export function getToolMetadata(toolName: string): ToolMetadata | undefined {
  return TOOL_REGISTRY[toolName];
}

/**
 * Validate tool counts (for testing)
 */
export function validateToolCounts(): { core: number; advanced: number; total: number } {
  const core = getCoreTools().length;
  const advanced = getAdvancedTools().length;
  const total = getAllTools().length;

  return { core, advanced, total };
}
