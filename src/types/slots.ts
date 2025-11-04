/**
 * Universal 21-Slot Architecture
 * Championship-grade slot definitions for FAF Compiler Engine MK3
 */

export interface SlotDefinition {
  number: number;
  name: string;
  description: string;
  category: 'core' | 'stack' | 'architecture';
}

export const UNIVERSAL_SLOTS: SlotDefinition[] = [
  // Core Project (Slots 1-4) - UNIVERSAL
  {
    number: 1,
    name: 'project_identity',
    description: 'Project name, goal, type, version',
    category: 'core',
  },
  {
    number: 2,
    name: 'language',
    description: 'Primary programming language',
    category: 'core',
  },
  {
    number: 3,
    name: 'human_context',
    description: '6 Ws: who, what, why, where, when, how',
    category: 'core',
  },
  {
    number: 4,
    name: 'documentation',
    description: 'README.md, CLAUDE.md, .faf file',
    category: 'core',
  },

  // Stack (Slots 5-14)
  {
    number: 5,
    name: 'frontend',
    description: 'Frontend framework (React, Vue, Svelte, etc.)',
    category: 'stack',
  },
  {
    number: 6,
    name: 'backend',
    description: 'Backend framework (Express, FastAPI, Rails, etc.)',
    category: 'stack',
  },
  {
    number: 7,
    name: 'database',
    description: 'Database (PostgreSQL, MongoDB, Supabase, etc.)',
    category: 'stack',
  },
  {
    number: 8,
    name: 'build_tool',
    description: 'Build tool (Vite, Webpack, esbuild, etc.)',
    category: 'stack',
  },
  {
    number: 9,
    name: 'package_manager',
    description: 'Package manager (npm, pnpm, yarn, pip, cargo)',
    category: 'stack',
  },
  {
    number: 10,
    name: 'api',
    description: 'API type (REST, GraphQL, tRPC, MCP, etc.)',
    category: 'stack',
  },
  {
    number: 11,
    name: 'hosting',
    description: 'Hosting/deployment (Vercel, AWS, Netlify, etc.)',
    category: 'stack',
  },
  {
    number: 12,
    name: 'cicd',
    description: 'CI/CD pipeline (GitHub Actions, CircleCI, etc.)',
    category: 'stack',
  },
  {
    number: 13,
    name: 'testing',
    description: 'Testing framework (Vitest, Jest, Pytest, etc.)',
    category: 'stack',
  },
  {
    number: 14,
    name: 'css',
    description: 'CSS/styling (Tailwind, CSS Modules, styled-components)',
    category: 'stack',
  },

  // Architecture (Slots 15-21)
  {
    number: 15,
    name: 'ui_library',
    description: 'UI library/components (shadcn, MUI, custom)',
    category: 'architecture',
  },
  {
    number: 16,
    name: 'state',
    description: 'State management (Zustand, Redux, Svelte stores)',
    category: 'architecture',
  },
  {
    number: 17,
    name: 'runtime',
    description: 'Runtime environment (Node.js, Deno, Bun, browser)',
    category: 'architecture',
  },
  {
    number: 18,
    name: 'auth',
    description: 'Authentication/Auth (Auth0, Supabase Auth, custom)',
    category: 'architecture',
  },
  {
    number: 19,
    name: 'storage',
    description: 'File storage/assets (S3, Cloudinary, local)',
    category: 'architecture',
  },
  {
    number: 20,
    name: 'caching',
    description: 'Caching/performance (Redis, CDN, service workers)',
    category: 'architecture',
  },
  {
    number: 21,
    name: 'team',
    description: 'Team/workflow structure (monorepo, CI, git flow)',
    category: 'architecture',
  },
];

export interface SlotStatus {
  slotNumber: number;
  slotName: string;
  required: boolean; // Based on project type
  filled: boolean;
  value?: any;
  points: number;
}

export interface ValidationResult {
  totalSlots: 21;
  relevantSlots: number;
  filledSlots: number;
  slots: SlotStatus[];
  score: number;
  medal: 'trophy' | 'gold' | 'silver' | 'bronze' | 'red' | 'white';
}

/**
 * Get slot name by number
 */
export function getSlotName(slotNumber: number): string {
  const slot = UNIVERSAL_SLOTS.find(s => s.number === slotNumber);
  return slot ? slot.name : `slot_${slotNumber}`;
}

/**
 * Get all slot names
 */
export function getAllSlotNames(): string[] {
  return UNIVERSAL_SLOTS.map(s => s.name);
}

/**
 * Check if a slot is in the core category
 */
export function isCoreSlot(slotName: string): boolean {
  const slot = UNIVERSAL_SLOTS.find(s => s.name === slotName);
  return slot?.category === 'core';
}
