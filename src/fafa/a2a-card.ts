/**
 * `.fafa` → A2A AgentCard adapter.
 *
 * Thin door into `faf cards` (`generateA2ACard` when the installed faf-cli
 * exports it; otherwise the same identity map + `fafContextBlock()`).
 * `opts.url` is the door — never baked in. Identity (.fafa) ≠ hosting.
 *
 * A2A extension URI is `https://faf.one/context` (dereference).
 * MCP `_meta` key stays `one.faf/context`. Same params. Never raw provenance.
 */

import { fafContextBlock } from 'faf-cli';
import type { FafData } from 'faf-cli';
import * as fafCli from 'faf-cli';

export const A2A_PROTOCOL_VERSION = '1.0';
export const A2A_PROTOCOL_BINDING = 'JSONRPC'; // core A2A bindings: JSONRPC | GRPC | HTTP+JSON
export const A2A_WELL_KNOWN_PATH = '/.well-known/agent-card.json';
export const A2A_CONTEXT_URI = 'https://faf.one/context';

export interface A2AAgentSkill {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
}

/** A2A v1.0 `AgentInterface` — one endpoint + its protocol binding + protocol version. */
export interface A2AAgentInterface {
  url: string;
  protocolBinding: string;
  protocolVersion: string;
}

export interface A2AAgentExtension {
  uri: string;
  description?: string;
  required: boolean;
  params?: Record<string, unknown>;
}

export interface A2AAgentCapabilities {
  streaming: boolean;
  pushNotifications: boolean;
  extendedAgentCard: boolean;
  extensions?: A2AAgentExtension[];
}

export interface A2AAgentCard {
  name: string;
  description?: string;
  supportedInterfaces: A2AAgentInterface[]; // v1.0 REQUIRED (was top-level url + protocolVersion)
  provider?: { organization?: string; url?: string };
  version?: string;
  capabilities: A2AAgentCapabilities;
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: A2AAgentSkill[];
}

type GenerateA2ACard = (
  fafa: unknown,
  faf: FafData,
  opts?: { doorUrl?: string; fafPointer?: string; now?: string },
) => A2AAgentCard;

function fafPointer(fafa: any): string {
  return typeof fafa?.provenance?.faf === 'string' && fafa.provenance.faf
    ? fafa.provenance.faf
    : './project.faf';
}

function fafFromFafa(fafa: any): FafData {
  const generated =
    typeof fafa?.provenance?.generated === 'string' ? fafa.provenance.generated : undefined;
  return {
    generated,
    project: {
      name: fafa?.agent?.name,
      homepage: fafa?.agent?.homepage,
    },
  } as FafData;
}

/** Map a parsed `.fafa` document to a conformant A2A v1.0 AgentCard. */
export function fafaToA2ACard(fafa: any, opts: { url: string }): A2AAgentCard {
  const faf = fafFromFafa(fafa);
  const pointer = fafPointer(fafa);
  const generate = (fafCli as { generateA2ACard?: GenerateA2ACard }).generateA2ACard;
  if (typeof generate === 'function') {
    return generate(fafa, faf, { doorUrl: opts.url, fafPointer: pointer });
  }

  const agent = fafa?.agent ?? {};
  const block = fafContextBlock(faf, { fafPointer: pointer });
  return {
    name: agent.displayName ?? fafa?.metadata?.persona ?? agent.name,
    description: agent.description,
    supportedInterfaces: [{
      url: opts.url,
      protocolBinding: A2A_PROTOCOL_BINDING,
      protocolVersion: A2A_PROTOCOL_VERSION,
    }],
    provider: { organization: agent.vendor, url: agent.homepage },
    version: agent.version,
    capabilities: {
      streaming: false,
      pushNotifications: false,
      extendedAgentCard: false,
      extensions: [{
        uri: A2A_CONTEXT_URI,
        description: 'FAF context provenance — the durable context block (one context, every door).',
        required: false,
        params: block,
      }],
    },
    defaultInputModes: ['text/plain', 'application/json'],
    defaultOutputModes: ['text/plain', 'application/json'],
    skills: (fafa?.capabilities ?? []).map((c: any): A2AAgentSkill => ({
      id: c.name,
      name: c.name,
      description: c.description,
      tags: Array.isArray(c.tags) ? c.tags : [],
    })),
  };
}
