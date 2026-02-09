/**
 * README Context Extraction - MCP Bundled Version
 * Non-interactive extraction of 6 Ws from README files
 */

import { promises as fs } from 'fs';
import { parse as parseYAML, stringify as stringifyYAML } from 'yaml';
import * as path from 'path';

export interface ExtractedContext {
  who?: string;
  what?: string;
  where?: string;
  why?: string;
  when?: string;
  how?: string;
  confidence: {
    who: number;
    what: number;
    where: number;
    why: number;
    when: number;
    how: number;
    overall: number;
  };
}

export interface ReadmeExtractResult {
  success: boolean;
  message: string;
  extracted?: ExtractedContext;
  readmePath?: string;
  error?: string;
}

/**
 * Find README file in project directory
 */
async function findReadmeFile(projectPath: string): Promise<string | null> {
  const possibleNames = [
    'README.md',
    'readme.md',
    'Readme.md',
    'README.markdown',
    'README',
  ];

  for (const name of possibleNames) {
    const readmePath = path.join(projectPath, name);
    try {
      await fs.access(readmePath);
      return readmePath;
    } catch {
      // File doesn't exist, continue
    }
  }

  return null;
}

/**
 * Extract 6 Ws from README content
 * Ported from faf-cli v4.3.0
 */
export function extractSixWs(content: string): ExtractedContext {
  const context: ExtractedContext = {
    confidence: {
      who: 0,
      what: 0,
      where: 0,
      why: 0,
      when: 0,
      how: 0,
      overall: 0,
    },
  };

  // WHAT extraction
  const whatPatterns = [
    // Bold subtitle pattern
    /^[#\s]*(.+?)\n\*\*(.+?)\*\*/m,
    // Blockquote tagline
    /^>\s*\*\*(.+?)\*\*/m,
    // First paragraph after title
    /^#\s+.+\n\n(.+?)(?:\n\n|\n#)/s,
    // TL;DR
    /\*\*TL;DR:?\*\*\s*(.+?)(?:\n\n|\n#)/is,
    // Description section
    /##\s+(?:Description|About)\n+(.+?)(?:\n\n|\n#)/is,
  ];

  for (const pattern of whatPatterns) {
    const match = content.match(pattern);
    if (match) {
      const captured = match[2] || match[1];
      if (captured && captured.length > 10 && captured.length < 200) {
        context.what = captured.trim();
        context.confidence.what = 0.8;
        break;
      }
    }
  }

  // WHY extraction
  const whyPatterns = [
    // Explicit Why section
    /##\s+Why\s*\n+(.+?)(?:\n\n|\n#)/is,
    // Problem/Solution pattern
    /##\s+(?:The )?Problem\s*\n+(.+?)(?:\n\n|\n#)/is,
    // Motivation section
    /##\s+Motivation\s*\n+(.+?)(?:\n\n|\n#)/is,
    // Benefits/Features with "saves" or "reduces"
    /(?:saves?|reduces?|eliminates?)\s+(.+?)(?:\n|\.)/i,
  ];

  for (const pattern of whyPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const captured = match[1].trim();
      if (captured.length > 10 && captured.length < 300) {
        context.why = captured;
        context.confidence.why = 0.7;
        break;
      }
    }
  }

  // WHO extraction
  const whoPatterns = [
    // "for developers/teams/etc"
    /\bfor\s+((?:(?:web|mobile|backend|frontend|full-?stack|data|ML|AI|DevOps)\s+)?(?:developers?|engineers?|teams?|designers?|architects?|programmers?))/i,
    // "built for X"
    /\bbuilt\s+for\s+(.+?)(?:\.|,|\n)/i,
    // "designed for X"
    /\bdesigned\s+for\s+(.+?)(?:\.|,|\n)/i,
  ];

  for (const pattern of whoPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const captured = match[1].trim();
      if (captured.length > 3 && captured.length < 100) {
        context.who = captured;
        context.confidence.who = 0.6;
        break;
      }
    }
  }

  // WHERE extraction (platform/environment)
  const platformIndicators = {
    'Terminal/CLI': /\b(?:npm|pip|cargo|brew|cli|command[\s-]?line)\b/i,
    'Browser': /\b(?:browser|chrome|firefox|safari|web|frontend|client-side)\b/i,
    'Node.js': /\b(?:node\.?js|npm|express|fastify)\b/i,
    'Cloud': /\b(?:AWS|Azure|GCP|cloud|serverless|lambda|vercel|netlify)\b/i,
    'Docker': /\b(?:docker|container|kubernetes|k8s)\b/i,
    'Desktop': /\b(?:electron|tauri|desktop|native)\b/i,
  };

  const whereMatches: string[] = [];
  for (const [platform, pattern] of Object.entries(platformIndicators)) {
    if (pattern.test(content)) {
      whereMatches.push(platform);
    }
  }

  if (whereMatches.length > 0) {
    context.where = whereMatches.join(', ');
    context.confidence.where = Math.min(0.7, whereMatches.length * 0.2);
  }

  // WHEN extraction (status, timeline)
  const whenPatterns = [
    // Status badges
    /!\[.*?\]\(https:\/\/(?:github\.com|shields\.io|badge\.fury\.io|circleci\.com|travis-ci\.org|github\.com\/.*?\/workflows|img\.shields\.io).*?\)/,
    // Version indicators
    /\bv?\d+\.\d+\.\d+\b/,
    // Test status
    /\b\d+\/\d+\s+tests?\s+passing\b/i,
    // Production ready indicators
    /\b(?:production[\s-]?ready|stable|beta|alpha|experimental)\b/i,
  ];

  const whenIndicators: string[] = [];
  for (const pattern of whenPatterns) {
    const matches = content.match(new RegExp(pattern, 'g'));
    if (matches) {
      whenIndicators.push(...matches);
    }
  }

  if (whenIndicators.length > 0) {
    // Extract status
    const statusMatch = content.match(/\b(production[\s-]?ready|stable|beta|alpha|experimental)\b/i);
    const testsMatch = content.match(/\b(\d+\/\d+)\s+tests?\s+passing\b/i);
    const versionMatch = content.match(/\bv?(\d+\.\d+\.\d+)\b/);

    const whenParts: string[] = [];
    if (statusMatch) whenParts.push(statusMatch[1]);
    if (testsMatch) whenParts.push(`${testsMatch[1]} tests passing`);
    if (versionMatch && !whenParts.length) whenParts.push(`v${versionMatch[1]}`);

    context.when = whenParts.join(', ') || 'Active development';
    context.confidence.when = 0.5;
  }

  // HOW extraction (getting started)
  const howPatterns = [
    // Quick Start section
    /##\s+(?:Quick\s+Start|Getting\s+Started|Installation)\s*\n+```(?:bash|sh|shell)?\s*\n(.+?)\n```/is,
    // npm install
    /```(?:bash|sh|shell)?\s*\n(npm\s+install.+?)\n```/is,
    // pip install
    /```(?:bash|sh|shell)?\s*\n(pip\s+install.+?)\n```/is,
    // cargo install
    /```(?:bash|sh|shell)?\s*\n(cargo\s+install.+?)\n```/is,
    // brew install
    /```(?:bash|sh|shell)?\s*\n(brew\s+install.+?)\n```/is,
  ];

  for (const pattern of howPatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      const captured = match[1].trim();
      if (captured.length > 5 && captured.length < 200) {
        context.how = captured;
        context.confidence.how = 0.8;
        break;
      }
    }
  }

  // Calculate overall confidence
  const confidenceValues = Object.values(context.confidence).filter(
    (v) => typeof v === 'number' && v > 0
  );
  context.confidence.overall =
    confidenceValues.length > 0
      ? confidenceValues.reduce((a, b) => a + b, 0) / 6 // Average across all 6 Ws
      : 0;

  return context;
}

/**
 * Extract context from README file
 * Non-interactive MCP version
 */
export async function readmeExtractCommand(
  projectPath: string
): Promise<ReadmeExtractResult> {
  try {
    // Find README file
    const readmePath = await findReadmeFile(projectPath);

    if (!readmePath) {
      return {
        success: false,
        message: 'No README file found',
        error: 'Create a README.md to enable context extraction',
      };
    }

    // Read README content
    const content = await fs.readFile(readmePath, 'utf-8');

    // Extract 6 Ws
    const extracted = extractSixWs(content);

    // Check if we got anything useful
    const fieldsExtracted = [
      extracted.who,
      extracted.what,
      extracted.where,
      extracted.why,
      extracted.when,
      extracted.how,
    ].filter((f) => f !== undefined).length;

    if (fieldsExtracted === 0) {
      return {
        success: false,
        message: 'Could not extract context from README',
        error: 'README may not contain recognizable patterns for WHO/WHAT/WHY/WHERE/WHEN/HOW',
        readmePath,
      };
    }

    return {
      success: true,
      message: `Extracted ${fieldsExtracted}/6 fields from README (${Math.round(extracted.confidence.overall * 100)}% confidence)`,
      extracted,
      readmePath,
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to extract context from README',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Extract and merge README context into project.faf
 * Combines extraction + merging in one step
 */
export async function readmeMergeCommand(
  projectPath: string,
  options: { overwrite?: boolean } = {}
): Promise<ReadmeExtractResult & { fieldsUpdated?: string[] }> {
  try {
    // First extract
    const extractResult = await readmeExtractCommand(projectPath);

    if (!extractResult.success || !extractResult.extracted) {
      return extractResult;
    }

    // Find or create .faf file
    const possiblePaths = [
      path.join(projectPath, 'project.faf'),
      path.join(projectPath, '.faf'),
    ];

    let fafPath: string | null = null;
    for (const p of possiblePaths) {
      try {
        await fs.access(p);
        fafPath = p;
        break;
      } catch {
        // Continue
      }
    }

    if (!fafPath) {
      fafPath = path.join(projectPath, 'project.faf');
    }

    // Read or create .faf data
    let fafData: any = {};
    try {
      const fafContent = await fs.readFile(fafPath, 'utf-8');
      fafData = parseYAML(fafContent) || {};
    } catch {
      // New file
    }

    if (!fafData.human_context) {
      fafData.human_context = {};
    }

    // Merge extracted context
    const fieldsUpdated: string[] = [];
    const extracted = extractResult.extracted;

    for (const field of ['who', 'what', 'where', 'why', 'when', 'how'] as const) {
      const value = extracted[field];
      if (value) {
        // Only update if overwrite is true OR field is empty
        if (options.overwrite || !fafData.human_context[field]) {
          fafData.human_context[field] = value;
          fieldsUpdated.push(field);
        }
      }
    }

    // Save updated .faf
    if (fieldsUpdated.length > 0) {
      await fs.writeFile(fafPath, stringifyYAML(fafData), 'utf-8');
    }

    return {
      ...extractResult,
      fieldsUpdated,
      message:
        fieldsUpdated.length > 0
          ? `Extracted and merged ${fieldsUpdated.length} field(s) into ${path.basename(fafPath)}`
          : 'No new fields to merge (use overwrite option to replace existing)',
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to merge README context',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
