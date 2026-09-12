// mcp-stdio.mjs — talk to an MCP server over stdio, the way a host does.
//
// Spawns the server (no shell), sends `initialize`, `notifications/initialized`
// and then each request in order, and returns every answer by request. Used by
// the release checks (scripts/verify-mcpb.mjs, scripts/smoke-package.mjs) and
// by scripts/sync-version.js, which reads the live tools/list to write the
// surfaces that list tools. Nothing here writes a file.

import { spawn } from 'node:child_process';

export const PROTOCOL_VERSION = '2025-06-18';

/**
 * @param {object} o
 * @param {string} o.command      the program (e.g. process.execPath)
 * @param {string[]} o.args       its arguments (e.g. [<bundle>/dist/src/index.js])
 * @param {string} [o.cwd]
 * @param {Record<string,string>} [o.env]
 * @param {Array<{method: string, params?: object}>} [o.requests]  sent after the handshake
 * @param {number} [o.timeoutMs]
 * @returns {Promise<{ initialize: any, results: any[], stderr: string }>}
 *   results[i] is the JSON-RPC response to requests[i] ({ result } or { error }).
 */
export function talk({ command, args, cwd, env, requests = [], timeoutMs = 60_000 }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
    const answers = new Map();
    let buf = '';
    let stderr = '';
    let settled = false;
    const expected = requests.length + 1; // + initialize
    const finish = (err, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try { child.stdin.end(); } catch { /* already closed */ }
      child.kill();
      if (err) reject(err); else resolve(value);
    };
    const timer = setTimeout(() => {
      finish(new Error(`no answer to ${expected - answers.size} request(s) within ${timeoutMs / 1000}s. stderr: ${stderr.slice(-800)}`));
    }, timeoutMs);

    const send = (msg) => child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', ...msg })}\n`);

    child.on('error', (e) => finish(e));
    child.on('exit', (code, signal) => {
      if (!settled && answers.size < expected) {
        finish(new Error(`the server exited (${signal ?? code}) after ${answers.size} of ${expected} answers. stderr: ${stderr.slice(-800)}`));
      }
    });
    child.stderr.on('data', (d) => { stderr += d.toString(); });
    child.stdout.on('data', (d) => {
      buf += d.toString();
      let nl;
      while ((nl = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, nl).trim();
        buf = buf.slice(nl + 1);
        if (!line) continue;
        let msg;
        try { msg = JSON.parse(line); } catch { continue; }
        if (msg.id === undefined || msg.id === null || answers.has(msg.id)) continue;
        answers.set(msg.id, msg);
        if (msg.id === 0) {
          if (msg.error) return finish(new Error(`initialize failed: ${JSON.stringify(msg.error)}`));
          send({ method: 'notifications/initialized' });
          requests.forEach((r, i) => send({ id: i + 1, method: r.method, params: r.params ?? {} }));
        }
        if (answers.size === expected) {
          finish(null, {
            initialize: answers.get(0).result,
            results: requests.map((_, i) => answers.get(i + 1)),
            stderr,
          });
        }
      }
    });

    send({
      id: 0,
      method: 'initialize',
      params: { protocolVersion: PROTOCOL_VERSION, capabilities: {}, clientInfo: { name: 'claude-faf-mcp-release-check', version: '1' } },
    });
  });
}
