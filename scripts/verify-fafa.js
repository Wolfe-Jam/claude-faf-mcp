#!/usr/bin/env node
/**
 * verify-fafa.js — verify a FAF Agent Card (.fafa).
 *
 * Five layers (strongest first):
 *   L1 accuracy    — declared capabilities == the server's LIVE tools/list
 *   L2 shape       — valid YAML + required fields + complete capabilities
 *   L4 A2A conform — maps to a valid A2A AgentCard (src/fafa/a2a-card)
 *   L5 trust       — cites_spec are real FAF media types; agent.id is a did:web
 *
 * Usage:  node scripts/verify-fafa.js [path/to/card.fafa]   (default: ./agent.fafa)
 * Exit 0 = all pass, 1 = a check failed. Requires `npm run build` (uses dist/).
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const yaml = require(path.join(root, 'node_modules/yaml'));
const cardPath = process.argv[2] || path.join(root, 'agent.fafa');

let pass = 0, fail = 0;
const ok = (n, c, x = '') => { console.log(`  ${c ? 'PASS' : 'FAIL'}  ${n}${x ? ' — ' + x : ''}`); c ? pass++ : fail++; };

console.log('verify-fafa:', cardPath, '\n');

let card;
try { card = yaml.parse(fs.readFileSync(cardPath, 'utf8')); ok('L2 valid YAML', true); }
catch (e) { ok('L2 valid YAML', false, e.message); process.exit(1); }

['version', 'agent', 'capabilities', 'endpoints', 'provenance'].forEach((k) => ok('L2 required field: ' + k, k in card));
ok('L2 agent identity (name+id+version)', !!(card.agent && card.agent.name && card.agent.id && card.agent.version), 'v' + (card.agent && card.agent.version));
ok('L2 every capability complete (name+description+cites_spec)', card.capabilities.every((c) => c.name && c.description && c.cites_spec), card.capabilities.length + ' caps');

const specs = ['application/vnd.faf+yaml', 'application/vnd.fafm+yaml', 'application/vnd.fafa+yaml'];
ok('L5 cites_spec are real FAF media types', card.capabilities.every((c) => specs.includes(c.cites_spec)));
ok('L5 agent.id is a did:web', /^did:web:/.test(card.agent.id || ''), card.agent.id);

// L1 accuracy — capabilities must match the live tools/list of this server
const msgs = [
  { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'verify-fafa', version: '1' } } },
  { jsonrpc: '2.0', method: 'notifications/initialized' },
  { jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} },
].map((m) => JSON.stringify(m)).join('\n') + '\n';
const r = spawnSync('node', [path.join(root, 'dist/src/index.js')], { input: msgs, encoding: 'utf8', env: { ...process.env, FAF_TOOLS: 'all' }, timeout: 60000, maxBuffer: 1e7 });
let live = [];
for (const l of (r.stdout || '').split('\n')) { const t = l.trim(); if (!t) continue; let m; try { m = JSON.parse(t); } catch { continue; } if (m.id === 2 && m.result) live = m.result.tools.map((x) => x.name); }
const a = card.capabilities.map((c) => c.name).sort();
const b = live.slice().sort();
ok('L1 accuracy: capabilities == live tools/list', a.length > 0 && JSON.stringify(a) === JSON.stringify(b), `card ${a.length} / live ${b.length}`);

// L4 A2A conformance — must map to a valid A2A AgentCard
try {
  const { fafaToA2ACard } = require(path.join(root, 'dist/src/fafa/a2a-card.js'));
  const c = fafaToA2ACard(card, { url: 'https://faf.one/.well-known/' + path.basename(cardPath) });
  ok('L4 A2A conformance (maps to a valid A2A AgentCard)', !!(c && c.name && Array.isArray(c.skills) && c.skills.length === card.capabilities.length), (c.skills ? c.skills.length : 0) + ' skills');
} catch (e) { ok('L4 A2A conformance', false, e.message); }

console.log(`\n${fail === 0 ? 'ALL PASS' : fail + ' FAILED'} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
