import type { Resource } from '@modelcontextprotocol/sdk/types.js';
import { McpError, type ErrorCode } from '@modelcontextprotocol/sdk/types.js';
import { FafEngineAdapter } from './engine-adapter';
import { fafCli } from '../utils/faf-cli-bridge.js';
import { oneLine } from '../utils/write-outcome.js';

/** MCP's resource-not-found code — not in the SDK's ErrorCode enum, so spelled out. */
const RESOURCE_NOT_FOUND = -32002 as ErrorCode;

/**
 * The two resources, read from the active session project (the folder
 * faf_context shows) with the bundled faf-cli: its finder (the folder, then one
 * level up), its reader and its scorer — the number faf_score reports. Before
 * 6.0.0 both ran whatever `faf` was on PATH (`faf status --json`), which could be
 * another tool with another score, and a third resource answered any file:// URI
 * with a placeholder line; it read nothing, so it is gone. Template: faf-mcp
 * 3.0.2's resources.ts.
 */
export class FafResourceHandler {
  constructor(private engineAdapter: FafEngineAdapter) {}

  listResources() {
    return {
      resources: [
        {
          uri: 'claude-faf://context',
          name: 'Current FAF Context',
          description: 'The active project\'s .faf as JSON: its path, faf-cli\'s score and the parsed data.',
          mimeType: 'application/json'
        },
        {
          uri: 'claude-faf://status',
          name: 'FAF Status Summary',
          description: 'One line of text: the active project\'s .faf path and faf-cli\'s score.',
          mimeType: 'text/plain'
        },
      ] as Resource[]
    };
  }

  async readResource(uri: string) {
    switch (uri) {
      case 'claude-faf://context':
        return await this.getFafContext(uri);
      case 'claude-faf://status':
        return await this.getFafStatus(uri);
      default:
        throw new McpError(RESOURCE_NOT_FOUND, `Resource not found: ${uri}`);
    }
  }

  private async getFafContext(uri: string) {
    const cwd = this.engineAdapter.getWorkingDirectory();
    const { findFafFile, readFaf, readFafRaw, scoreFafYaml, scoreText } = await fafCli;
    let body: Record<string, unknown>;
    try {
      const fafPath = findFafFile(cwd);
      if (!fafPath) {
        body = { error: `No .faf in ${cwd} or the folder above it. faf_init creates one.` };
      } else {
        const data = readFaf(fafPath);
        const score = scoreFafYaml(readFafRaw(fafPath));
        body = {
          path: fafPath,
          score: score.score,
          scoreText: scoreText(score),
          ...(score.unknown ? { unknown: true } : {}),
          tier: score.tier.name,
          populated: score.populated,
          active: score.active,
          total: score.total,
          data,
        };
      }
    } catch (error) {
      body = { error: oneLine(error) };
    }
    return { contents: [{ uri, mimeType: 'application/json', text: JSON.stringify(body, null, 2) }] };
  }

  private async getFafStatus(uri: string) {
    const cwd = this.engineAdapter.getWorkingDirectory();
    const { findFafFile, readFafRaw, scoreFafYaml, scoreText } = await fafCli;
    let text: string;
    try {
      const fafPath = findFafFile(cwd);
      if (!fafPath) {
        text = `No .faf in ${cwd} or the folder above it. faf_init creates one.`;
      } else {
        const score = scoreFafYaml(readFafRaw(fafPath));
        text = score.unknown
          ? `${fafPath}\nFAF SCORE: ${scoreText(score)} — an About repo with no about.source_score`
          : `${fafPath}\nFAF SCORE: ${score.score}/100 (${score.populated}/${score.active} slots populated) — ${score.tier.name}`;
      }
    } catch (error) {
      text = `Error: ${oneLine(error)}`;
    }
    return { contents: [{ uri, mimeType: 'text/plain', text }] };
  }
}
