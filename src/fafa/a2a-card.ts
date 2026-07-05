/**
 * `.fafa` → A2A AgentCard mapper.
 *
 * Maps CFM's FAF Agent Card (`.fafa`) to a conformant **A2A AgentCard**
 * (A2A protocol v1.0, served at `/.well-known/agent-card.json`).
 *
 * Posture: `.fafa` is a PEER to the A2A AgentCard — **compatible + enhancing**.
 * Every A2A field maps from `.fafa`; the enhancement is the **FAF context block**,
 * which rides as an A2A extension (`one.faf/context`) — byte-equivalent to the MCP
 * server-card `_meta["one.faf/context"]`. One context, every door.
 *
 * v1.0 note: the AgentCard was restructured — `url` + `protocolVersion` are folded
 * into a REQUIRED `supportedInterfaces[]`, and extensions live under
 * `capabilities.extensions[]` (not top-level). Source: a2aproject/A2A
 * `specification/a2a.proto` (AgentCard / AgentInterface / AgentCapabilities).
 *
 * Pure mapper (testable). The live A2A *invocation* endpoint (JSON-RPC `message/send`)
 * is served at the edge — this module produces the discovery card that points at it.
 */

export const A2A_PROTOCOL_VERSION = '1.0';
export const A2A_PROTOCOL_BINDING = 'JSONRPC'; // core A2A bindings: JSONRPC | GRPC | HTTP+JSON
export const A2A_WELL_KNOWN_PATH = '/.well-known/agent-card.json';

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

/** Map a parsed `.fafa` document to a conformant A2A v1.0 AgentCard. */
export function fafaToA2ACard(fafa: any, opts: { url: string }): A2AAgentCard {
  const agent = fafa?.agent ?? {};
  // CFM's tools are synchronous request/response; no streaming/push yet.
  const capabilities: A2AAgentCapabilities = {
    streaming: false,
    pushNotifications: false,
    extendedAgentCard: false,
  };
  // The enhancement: the FAF context block as an A2A extension (the durable middle).
  // v1.0 places extensions under `capabilities.extensions[]`.
  if (fafa?.provenance) {
    capabilities.extensions = [{
      uri: 'https://one.faf/context',
      description: 'FAF context provenance — the durable context block (one context, every door).',
      required: false,
      params: fafa.provenance,
    }];
  }
  return {
    // Human display name, sourced from the `.fafa` — never hardcoded. Explicit
    // `agent.displayName` wins; else the `metadata.persona`; else the machine id
    // `agent.name`. A changeable default: set `displayName` in the `.fafa` to change it.
    name: agent.displayName ?? fafa?.metadata?.persona ?? agent.name,
    description: agent.description,
    // v1.0: the A2A service endpoint (JSON-RPC) lives inside supportedInterfaces[].
    supportedInterfaces: [{
      url: opts.url, // a real endpoint, supplied by the caller — never baked in
      protocolBinding: A2A_PROTOCOL_BINDING,
      protocolVersion: A2A_PROTOCOL_VERSION,
    }],
    provider: { organization: agent.vendor, url: agent.homepage },
    version: agent.version,
    capabilities,
    defaultInputModes: ['text/plain', 'application/json'],
    defaultOutputModes: ['text/plain', 'application/json'],
    // A2A skill ≡ FAF capability ≡ MCP tool (per AGENT-FORMAT §3).
    skills: (fafa?.capabilities ?? []).map((c: any): A2AAgentSkill => ({
      id: c.name,
      name: c.name,
      description: c.description,
      tags: Array.isArray(c.tags) ? c.tags : [],
    })),
  };
}
