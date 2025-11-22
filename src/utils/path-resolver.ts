/**
 * 🎯 Projects Convention Path Resolver
 *
 * Default: ~/Projects/[project-name]/project.faf
 *
 * Project name inference order:
 * 1. User explicit path (always wins)
 * 2. User project name statement
 * 3. AI inference from README, files, conversation context
 * 4. Fallback to 'unnamed-project'
 */

import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

export interface ProjectContext {
  readme?: string;
  projectName?: string;
  uploadedFiles?: string[];
  conversationContext?: string;
}

export interface PathResolution {
  projectPath: string;
  fafFilePath: string;
  projectName: string;
  source: 'user-explicit' | 'user-name' | 'ai-inference' | 'fallback';
}

/**
 * Slugify project name for filesystem
 */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove emojis/special chars
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-'); // Collapse multiple dashes
}

/**
 * Infer project name from context
 */
function inferFromContext(context?: ProjectContext): string | null {
  if (!context) return null;

  // Try README title
  if (context.readme) {
    const titleMatch = context.readme.match(/^#\s+(.+)/m);
    if (titleMatch) {
      return slugify(titleMatch[1]);
    }
  }

  // Try explicit project name
  if (context.projectName) {
    return slugify(context.projectName);
  }

  // Try uploaded files (package.json name, etc.)
  if (context.uploadedFiles && context.uploadedFiles.length > 0) {
    for (const file of context.uploadedFiles) {
      try {
        const basename = path.basename(file);

        // package.json
        if (basename === 'package.json' && fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          const pkg = JSON.parse(content);
          if (pkg.name) {
            // Handle scoped packages: @org/name → name
            return slugify(pkg.name.replace(/^@[\w-]+\//, ''));
          }
        }
      } catch {
        continue;
      }
    }
  }

  return null;
}

/**
 * Get user's home directory cross-platform
 */
export function getHomeDirectory(): string {
  return os.homedir();
}

/**
 * Get default Projects directory
 */
export function getProjectsDirectory(): string {
  const home = getHomeDirectory();
  return path.join(home, 'Projects');
}

/**
 * Try to find existing project directory from short name
 * Pomelli-style: "my-app" → finds ~/Projects/my-app OR ~/my-app OR ~/Code/my-app
 */
function findExistingProject(shortName: string): string | null {
  const home = getHomeDirectory();
  const slugified = slugify(shortName);

  // Search locations in priority order
  const searchLocations = [
    path.join(home, 'Projects', slugified),
    path.join(home, 'projects', slugified),
    path.join(home, 'FAF', slugified),          // F1 projects location
    path.join(home, 'Code', slugified),
    path.join(home, 'code', slugified),
    path.join(home, 'Development', slugified),
    path.join(home, 'dev', slugified),
    path.join(home, slugified)
  ];

  for (const location of searchLocations) {
    if (fs.existsSync(location)) {
      return location;
    }
  }

  return null;
}

/**
 * Resolve project path using Projects convention
 *
 * @param userInput - User-provided path or project name
 * @param context - Context for AI inference (README, files, etc.)
 * @returns Path resolution with project directory and .faf file path
 */
export function resolveProjectPath(
  userInput?: string,
  context?: ProjectContext
): PathResolution {
  // USER EXPLICIT PATH ALWAYS WINS
  if (userInput && (userInput.includes('/') || userInput.includes('\\'))) {
    // Handle tilde expansion
    let normalized = userInput;
    if (userInput.startsWith('~')) {
      normalized = path.join(getHomeDirectory(), userInput.slice(1));
    }
    normalized = path.resolve(normalized);

    const projectName = path.basename(normalized);
    const fafFilePath = path.join(normalized, 'project.faf');

    return {
      projectPath: normalized,
      fafFilePath,
      projectName,
      source: 'user-explicit'
    };
  }

  // USER PROVIDED NAME (not path) - Try to find existing first
  if (userInput) {
    const existingPath = findExistingProject(userInput);
    if (existingPath) {
      const projectName = path.basename(existingPath);
      const fafFilePath = path.join(existingPath, 'project.faf');

      return {
        projectPath: existingPath,
        fafFilePath,
        projectName,
        source: 'user-name'
      };
    }

    // Not found - default to ~/Projects/[name] for creation
    const projectName = slugify(userInput);
    const projectPath = path.join(getProjectsDirectory(), projectName);
    const fafFilePath = path.join(projectPath, 'project.faf');

    return {
      projectPath,
      fafFilePath,
      projectName,
      source: 'user-name'
    };
  }

  // AI INFERENCE FROM CONTEXT
  const inferredName = inferFromContext(context);
  if (inferredName) {
    // Try to find existing project first
    const existingPath = findExistingProject(inferredName);
    if (existingPath) {
      const fafFilePath = path.join(existingPath, 'project.faf');

      return {
        projectPath: existingPath,
        fafFilePath,
        projectName: inferredName,
        source: 'ai-inference'
      };
    }

    // Not found - create in Projects
    const projectPath = path.join(getProjectsDirectory(), inferredName);
    const fafFilePath = path.join(projectPath, 'project.faf');

    return {
      projectPath,
      fafFilePath,
      projectName: inferredName,
      source: 'ai-inference'
    };
  }

  // FALLBACK
  const projectName = 'unnamed-project';
  const projectPath = path.join(getProjectsDirectory(), projectName);
  const fafFilePath = path.join(projectPath, 'project.faf');

  return {
    projectPath,
    fafFilePath,
    projectName,
    source: 'fallback'
  };
}

/**
 * Ensure Projects directory exists
 */
export function ensureProjectsDirectory(): void {
  const projectsDir = getProjectsDirectory();
  if (!fs.existsSync(projectsDir)) {
    fs.mkdirSync(projectsDir, { recursive: true });
  }
}

/**
 * Validate that path is on real filesystem (not container)
 */
export function isRealFilesystemPath(inputPath: string): boolean {
  // Container paths to reject
  const containerPaths = [
    '/mnt/user-data/',
    '/home/claude/',
    '/tmp/uploads/'
  ];

  return !containerPaths.some(cp => inputPath.startsWith(cp));
}

/**
 * Format confirmation message for user
 */
export function formatPathConfirmation(resolution: PathResolution): string {
  const sourceEmoji = {
    'user-explicit': '✓',
    'user-name': '✓',
    'ai-inference': '🤖',
    'fallback': '⚠️'
  };

  const emoji = sourceEmoji[resolution.source];

  if (resolution.source === 'ai-inference') {
    return `${emoji} Inferred project: "${resolution.projectName}"\nCreating at: ${resolution.projectPath}/`;
  }

  if (resolution.source === 'fallback') {
    return `${emoji} Using fallback name: "${resolution.projectName}"\nCreating at: ${resolution.projectPath}/\n(Tip: Provide project name or upload README for auto-detection)`;
  }

  return `${emoji} Creating at: ${resolution.projectPath}/`;
}
