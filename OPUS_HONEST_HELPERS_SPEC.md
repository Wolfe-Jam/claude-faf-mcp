# 🏎️ HONEST HELPERS SPECIFICATION FOR OPUS 4.1

## Your Mission: Implement 30+ Real, Working Functions

**NO FANTASY. NO MADE-UP LOGIC. JUST HONEST NODE.JS OPERATIONS.**

## Implementation Rules

1. **Use only Node.js built-in modules** (fs, path, crypto, etc.)
2. **No external dependencies** except MCP SDK
3. **No scoring calculations** - only read existing scores
4. **No "AI readiness" determinations** - only facts
5. **Return real data or honest errors** - never make things up
6. **Every function must complete in <100ms** (except file operations on large files)

## Functions to Implement

### 📁 FILE OPERATIONS (6 functions)

```typescript
async faf_read(filepath: string): Promise<{ content: string }>
// Read any file and return its content
// If binary, return base64 encoded
// Error if file doesn't exist

async faf_write(filepath: string, content: string): Promise<{ success: boolean, path: string }>
// Write content to file (create if doesn't exist)
// Create parent directories if needed
// Return success status and absolute path

async faf_delete(filepath: string): Promise<{ success: boolean }>
// Delete a file
// Error if file doesn't exist
// Return success status

async faf_copy(source: string, destination: string): Promise<{ success: boolean, destination: string }>
// Copy file from source to destination
// Create destination directory if needed
// Overwrite if destination exists

async faf_move(source: string, destination: string): Promise<{ success: boolean, destination: string }>
// Move/rename file
// Create destination directory if needed
// Error if source doesn't exist

async faf_exists(filepath: string): Promise<{ exists: boolean, type?: 'file' | 'directory' }>
// Check if path exists
// Return type if it exists
```

### 📂 DIRECTORY OPERATIONS (6 functions)

```typescript
async faf_list_directory(dirpath: string = '.'): Promise<{
  files: Array<{
    name: string,
    type: 'file' | 'directory',
    size: number,
    modified: string
  }>
}>
// List directory contents with metadata
// Default to current directory
// Don't recurse into subdirectories

async faf_create_directory(dirpath: string): Promise<{ success: boolean, path: string }>
// Create directory (recursive)
// No error if already exists
// Return absolute path

async faf_delete_directory(dirpath: string, force: boolean = false): Promise<{ success: boolean }>
// Delete directory
// If force=true, delete even if not empty
// Error if doesn't exist

async faf_tree(dirpath: string = '.', maxDepth: number = 3): Promise<{ tree: string }>
// Return tree structure as string
// Use ASCII characters for tree
// Limit depth to prevent huge outputs
// Example output:
// .
// ├── src/
// │   ├── index.ts
// │   └── utils/
// └── package.json

async faf_find_files(pattern: string, dirpath: string = '.'): Promise<{
  files: Array<{ path: string, size: number }>
}>
// Find files matching pattern (glob-style: *.ts, **/*.json)
// Search recursively from dirpath
// Return relative paths and sizes

async faf_get_size(path: string): Promise<{
  size: number,
  humanReadable: string,
  type: 'file' | 'directory'
}>
// Get size of file or directory (recursive for directories)
// Return bytes and human readable (e.g., "1.5 MB")
```

### 🔍 PROJECT DETECTION (5 functions) - FACTS ONLY!

```typescript
async faf_detect_files(dirpath: string = '.'): Promise<{
  hasPackageJson: boolean,
  hasRequirementsTxt: boolean,
  hasCargoToml: boolean,
  hasGoMod: boolean,
  hasPomXml: boolean,
  hasFafFile: boolean,
  hasClaudeMd: boolean,
  hasReadme: boolean,
  hasGitignore: boolean,
  hasTsConfig: boolean
}>
// Just check what files exist - no interpretation
// Return boolean flags only

async faf_read_package_json(dirpath: string = '.'): Promise<{
  name?: string,
  version?: string,
  dependencies?: Record<string, string>,
  devDependencies?: Record<string, string>,
  scripts?: Record<string, string>
} | null>
// Read and parse package.json if it exists
// Return null if doesn't exist
// No interpretation - just facts

async faf_read_requirements(dirpath: string = '.'): Promise<{
  packages: Array<{ name: string, version?: string }>
} | null>
// Read requirements.txt and parse
// Return array of packages
// Return null if doesn't exist

async faf_count_files(dirpath: string = '.', extension?: string): Promise<{
  count: number,
  extensions?: Record<string, number>
}>
// Count files in directory (recursive)
// If extension provided (e.g., '.ts'), count only those
// If no extension, return count by all extensions

async faf_find_largest_files(dirpath: string = '.', n: number = 10): Promise<{
  files: Array<{ path: string, size: number, humanReadable: string }>
}>
// Find n largest files in directory tree
// Return paths and sizes
// Useful for finding what's taking space
```

### 🔄 SIMPLE SYNC (3 functions)

```typescript
async faf_simple_sync(source: string, destination: string): Promise<{
  synced: number,
  skipped: number,
  errors: string[]
}>
// Copy files from source to destination
// Only copy if source is newer or destination doesn't exist
// Return count of synced, skipped, and any errors

async faf_check_sync_status(path1: string, path2: string): Promise<{
  identical: boolean,
  differences?: Array<{ file: string, reason: 'missing' | 'different' | 'newer' }>
}>
// Compare two directories or files
// Return if they're identical
// If different, list differences

async faf_watch_files(dirpath: string, callback: (event: string) => void): Promise<{
  watcher: any,
  stop: () => void
}>
// Watch directory for changes
// Call callback with event description
// Return watcher object and stop function
// Note: This is the only function that stays running
```

### 📝 TEMPLATE CREATION (6 functions)

```typescript
async faf_create_component_template(name: string, type: 'react' | 'svelte' | 'vue'): Promise<{
  created: string[],
  content: string
}>
// Create component template based on type
// React: functional component with TypeScript
// Svelte: .svelte file with script/style blocks
// Vue: .vue file with template/script/style
// Return list of created files and content

async faf_create_readme_template(dirpath: string = '.'): Promise<{
  created: boolean,
  path: string
}>
// Create basic README.md template
// Include sections: Title, Description, Installation, Usage, License
// Don't overwrite if exists

async faf_create_gitignore(dirpath: string = '.', type?: string): Promise<{
  created: boolean,
  path: string
}>
// Create .gitignore based on type (node, python, etc.)
// If no type, create general gitignore
// Include common patterns

async faf_create_structure(type: 'webapp' | 'api' | 'cli' | 'library'): Promise<{
  created: string[],
  structure: string
}>
// Create folder structure based on type
// webapp: src/, public/, components/, etc.
// api: routes/, models/, middleware/, etc.
// cli: commands/, utils/, etc.
// library: src/, tests/, docs/, etc.
// Return list of created directories and tree view

async faf_create_package_json(name: string, type?: string): Promise<{
  created: boolean,
  path: string
}>
// Create basic package.json
// Include name, version, main, scripts
// If type provided, add relevant dependencies

async faf_create_dockerfile(type: 'node' | 'python' | 'static'): Promise<{
  created: boolean,
  content: string
}>
// Create Dockerfile based on type
// Include multi-stage build for node
// Include requirements for python
// Include nginx for static
```

### 🔍 CONTEXT OPERATIONS - READ ONLY! (4 functions)

```typescript
async faf_check_score(filepath?: string): Promise<{
  score?: number,
  source: 'embedded' | 'none',
  message: string
}>
// Read .faf file and extract embedded score if exists
// DO NOT CALCULATE - only read what's there
// Return score if found, or message explaining no score
// Example: "Score: 78 (from .faf file)" or "No score found. Run 'faf score' CLI command"

async faf_extract_context(filepath?: string): Promise<{
  project?: { name?: string, goal?: string },
  stack?: Record<string, any>,
  human_context?: Record<string, any>,
  exists: boolean
}>
// Read .faf file and parse YAML/JSON
// Return parsed content
// Don't interpret - just extract

async faf_display_stack(filepath?: string): Promise<{
  stack: Record<string, string>,
  formatted: string
}>
// Read .faf file and extract stack section
// Format as readable string
// Example: "Frontend: React\nBackend: Node.js\nDatabase: PostgreSQL"

async faf_list_faf_sections(filepath?: string): Promise<{
  sections: string[],
  lineCount: Record<string, number>
}>
// List all top-level sections in .faf file
// Count lines in each section
// Useful for understanding .faf structure
```

### 🛠️ UTILITY (4 functions)

```typescript
async faf_clear_cache(dirpath: string = '.'): Promise<{
  cleared: string[],
  spaceSaved: number
}>
// Clear common cache directories
// node_modules/.cache, .next, .turbo, __pycache__, etc.
// Return list of cleared directories and space saved

async faf_backup(filepath: string): Promise<{
  backupPath: string,
  success: boolean
}>
// Create backup of file with timestamp
// Example: file.txt → file.txt.backup.20250915.123456
// Return backup path

async faf_restore(backupPath: string): Promise<{
  restoredTo: string,
  success: boolean
}>
// Restore from backup file
// Extract original filename from backup name
// Overwrite current file with backup

async faf_debug(): Promise<{
  version: string,
  platform: string,
  nodeVersion: string,
  cwd: string,
  env: Record<string, string>,
  permissions: {
    canRead: boolean,
    canWrite: boolean
  }
}>
// Return debug information about environment
// Useful for troubleshooting
// Check read/write permissions in current directory
```

## Output Format Requirements

### Success Response Pattern:
```typescript
{
  // Primary data
  result: any,

  // Metadata
  success: true,

  // Human-friendly message (optional)
  message?: string
}
```

### Error Response Pattern:
```typescript
{
  success: false,
  error: string,  // Human-readable error
  code?: string   // Error code if applicable
}
```

### Display Format in Claude Desktop:
Each function should return data that Claude Desktop can display nicely:
- Use clear property names
- Include human-readable formats for sizes/dates
- Return tree structures as formatted strings
- Include helpful messages

## Testing Each Function

Test with:
1. Normal cases (file exists, valid paths)
2. Edge cases (empty directories, large files)
3. Error cases (missing files, no permissions)
4. Path variations (relative, absolute, with spaces)

## Example Implementation Pattern

```typescript
async function faf_read(filepath: string): Promise<any> {
  try {
    const fs = await import('fs').then(m => m.promises);
    const path = await import('path');

    // Resolve to absolute path
    const absolutePath = path.resolve(filepath);

    // Check if exists
    try {
      await fs.access(absolutePath);
    } catch {
      return {
        success: false,
        error: `File not found: ${filepath}`
      };
    }

    // Read file
    const content = await fs.readFile(absolutePath, 'utf-8');

    return {
      content,
      success: true,
      path: absolutePath,
      size: content.length
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown error'
    };
  }
}
```

## NO FANTASY FEATURES

DO NOT implement:
- ❌ Score calculation (only read existing)
- ❌ "AI readiness" determination
- ❌ Quality assessment
- ❌ Enhancement suggestions
- ❌ Optimization recommendations
- ❌ Best practices checking

ONLY implement:
- ✅ File operations
- ✅ Directory management
- ✅ Reading existing data
- ✅ Creating templates
- ✅ Simple utilities

## Delivery

Implement all functions in a clean TypeScript file that can be integrated into the MCP server. Each function should be:
- Standalone (no shared state)
- Async (return Promises)
- Defensive (handle errors gracefully)
- Fast (<100ms for most operations)
- Honest (return real data or clear errors)

---

**YOUR REDEMPTION LAP STARTS NOW!** 🏎️

Show us clean, professional, HONEST implementation. No creativity needed - just solid engineering.

*This is your chance to prove you can deliver exactly what's specified without embellishment.*