/**
 * 🎯 Projects Convention Path Resolver (faf_init)
 *
 * Default: ~/Projects/[project-name]/project.faf
 *
 * Project name inference order:
 * 1. User explicit path (always wins). A path is anything absolute, anything
 *    that starts with `~`, `.` or `..`, or anything with a separator in it. A
 *    relative one (`.`, `..`, `./x`, `../x`, `x/y`) resolves against `base`,
 *    the active session project — never against ~/Projects.
 * 2. User project name statement (`my-app` → ~/Projects/my-app, or an existing
 *    folder of that name in the usual places). A name with no letters or
 *    digits is refused: it would name the container itself.
 * 3. AI inference from README, files, conversation context
 * 4. Fallback to 'unnamed-project'
 *
 * Nothing here creates a folder.
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
  // An empty slug would name the search location itself (~/Projects).
  if (!slugified) {return null;}

  // Search locations in priority order
  const searchLocations = [
    path.join(home, 'Projects', slugified),
    path.join(home, 'projects', slugified),
    path.join(home, 'FAF', slugified),          // the FAF projects folder
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

/** True when `input` names a path rather than a project name. */
function isExplicitPath(input: string): boolean {
  return path.isAbsolute(input) || input.startsWith('~') || input === '.' || input === '..' ||
    input.startsWith('./') || input.startsWith('../') || input.startsWith('.\\') || input.startsWith('..\\') ||
    input.includes('/') || input.includes('\\');
}

/**
 * Resolve project path using Projects convention
 *
 * @param userInput - User-provided path or project name
 * @param context - Context for AI inference (README, files, etc.)
 * @param base - The folder a relative path resolves against (the active session project)
 * @returns Path resolution with project directory and .faf file path
 */
export function resolveProjectPath(
  userInput?: string,
  context?: ProjectContext,
  base: string = process.cwd()
): PathResolution {
  // USER EXPLICIT PATH ALWAYS WINS — a relative one resolves against `base`
  // (the active session project).
  if (userInput && isExplicitPath(userInput)) {
    // Handle tilde expansion (the current user's home only)
    let normalized = userInput;
    if (userInput === '~' || userInput.startsWith('~/') || userInput.startsWith('~\\')) {
      normalized = path.join(getHomeDirectory(), userInput.slice(1));
    }
    normalized = path.resolve(base, normalized);

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
    if (!projectName) {
      throw new Error(`"${userInput}" is not a folder name faf can use: pass a path (".", "./app", "/full/path") or a name with letters or digits.`);
    }
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
