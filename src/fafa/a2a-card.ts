/**
 * `.fafa` → A2A AgentCard mapper.
 *
 * Maps CFM's FAF Agent Card (`.fafa`) to a conformant **A2A AgentCard**
 * (A2A protocol v1.0, served at `/.well-known/a2a-agent-card`).
 *
 * Posture: `.fafa` is a PEER to the A2A AgentCard — **compatible + enhancing**.
 * Every A2A field maps from `.fafa`; the enhancement is the **FAF context block**,
 * which rides as an A2A extension (`one.faf/context`) — byte-equivalent to the MCP
 * server-card `_meta["one.faf/context"]`. One context, every door.
 *
 * Pure mapper (testable). The live A2A *invocation* endpoint (JSON-RPC `message/send`)
 * is served at the edge — this module produces the discovery card that points at it.
 */

export const A2A_PROTOCOL_VERSION = '1.0';
export const A2A_WELL_KNOWN_PATH = '/.well-known/a2a-agent-card';

export interface A2AAgentSkill {
  id: string;
  name: string;
  description?: string;
  tags: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
}

export interface A2AAgentCard {
  protocolVersion: string;
  name: string;
  description?: string;
  url: string;
  version?: string;
  provider?: { organization?: string; url?: string };
  capabilities: { streaming: boolean; pushNotifications: boolean; extendedAgentCard: boolean };
  defaultInputModes: string[];
  defaultOutputModes: string[];
  skills: A2AAgentSkill[];
  extensions?: { uri: string; description?: string; required: boolean; params?: Record<string, unknown> }[];
}

/** Map a parsed `.fafa` document to a conformant A2A AgentCard. */
export function fafaToA2ACard(fafa: any, opts: { url: string }): A2AAgentCard {
  const agent = fafa?.agent ?? {};
  const card: A2AAgentCard = {
    protocolVersion: A2A_PROTOCOL_VERSION,
    name: agent.name,
    description: agent.description,
    url: opts.url, // A2A service endpoint (JSON-RPC) — served at the edge
    version: agent.version,
    provider: { organization: agent.vendor, url: agent.homepage },
    // CFM's tools are synchronous request/response; no streaming/push yet.
    capabilities: { streaming: false, pushNotifications: false, extendedAgentCard: false },
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
  // The enhancement: the FAF context block as an A2A extension (the durable middle).
  if (fafa?.provenance) {
    card.extensions = [{
      uri: 'https://one.faf/context',
      description: 'FAF context provenance — the durable context block (one context, every door).',
      required: false,
      params: fafa.provenance,
    }];
  }
  return card;
}
