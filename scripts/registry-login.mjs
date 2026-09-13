#!/usr/bin/env node
/**
 * registry-login.mjs — log mcp-publisher in to the MCP Registry by DNS, with
 * the private key read from the environment, never from argv.
 *
 * `mcp-publisher login dns --private-key <hex>` (v1.8.1) takes the key only as
 * a flag, so it would sit in the process list for as long as the login runs.
 * This does the same login the publisher's in-process signer does
 * (cmd/publisher/auth/common.go at v1.8.1):
 *
 *   timestamp  = now, RFC 3339, UTC, whole seconds
 *   signature  = ed25519(seed = MCP_PRIVATE_KEY, message = timestamp)
 *   POST {registry}/v0/auth/dns  { domain, timestamp, signed_timestamp: hex(signature) }
 *   → { registry_token }  written to ~/.config/mcp-publisher/token.json (0600)
 *     as { token, method: "dns", registry }, the file `mcp-publisher publish` reads.
 *
 * Usage (the key in MCP_PRIVATE_KEY, 64 hex characters):
 *   node scripts/registry-login.mjs --domain faf.one
 *   node scripts/registry-login.mjs --domain faf.one --dry-run   # sign and self-check only; no network, no file
 */
import { createPrivateKey, createPublicKey, sign, verify } from 'node:crypto';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const domain = flag('--domain');
const registry = (flag('--registry') || 'https://registry.modelcontextprotocol.io').replace(/\/+$/, '');
const dryRun = argv.includes('--dry-run');

function fail(msg) {
  console.error(`registry-login: ${msg}`);
  process.exit(1);
}

if (!domain) fail('--domain is required (e.g. --domain faf.one)');
const hex = (process.env.MCP_PRIVATE_KEY || '').trim();
if (!/^[0-9a-fA-F]{64}$/.test(hex)) fail('MCP_PRIVATE_KEY must be set to the ed25519 private key: 64 hex characters');

// A raw 32-byte ed25519 seed as a PKCS#8 key (RFC 8410 prefix).
const seed = Buffer.from(hex, 'hex');
const key = createPrivateKey({ key: Buffer.concat([Buffer.from('302e020100300506032b657004220420', 'hex'), seed]), format: 'der', type: 'pkcs8' });
const publicKey = createPublicKey(key);
const rawPublic = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);

const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
const signature = sign(null, Buffer.from(timestamp), key);
if (!verify(null, Buffer.from(timestamp), publicKey, signature)) fail('the signature does not verify with the key\'s own public key');

console.log(`Expected proof record: v=MCPv1; k=ed25519; p=${rawPublic.toString('base64')}`);
if (dryRun) {
  console.log(`dry run: signed ${timestamp} for ${domain}; the signature verifies. Nothing was sent or written.`);
  process.exit(0);
}

const res = await fetch(`${registry}/v0/auth/dns`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  body: JSON.stringify({ domain, timestamp, signed_timestamp: signature.toString('hex') }),
});
const body = await res.text();
if (res.status !== 200) fail(`token exchange failed with status ${res.status}: ${body.slice(0, 500)}`);
let token;
try { token = JSON.parse(body).registry_token; } catch { /* below */ }
if (!token) fail('the registry answered 200 without a registry_token');

const dir = path.join(os.homedir(), '.config', 'mcp-publisher');
fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
fs.writeFileSync(path.join(dir, 'token.json'), JSON.stringify({ token, method: 'dns', registry }), { mode: 0o600 });
console.log(`✓ logged in to ${registry} for ${domain} (token in ~/.config/mcp-publisher/token.json)`);
