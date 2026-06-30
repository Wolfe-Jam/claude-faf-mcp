#!/usr/bin/env node
/**
 * Generate the MCP-registry server.json — single-sourced from faf-cli.
 *
 * The registry manifest is a hybrid: an EMITTED identity half that MUST be
 * composed from faf-cli (never hand-authored — per the compose-not-fork
 * directive), and a RELEASE-MANAGED half (packages, icons, the mcpb sha) that
 * is intrinsically per-release.
 *
 *   EMITTED (faf-cli, the single source):
 *     - name              → registryName(project.faf)   (one.faf/<name>, never io.faf)
 *     - _meta one.faf/context → registryMeta(project.faf) (faf/mediaType/iana/deterministic/generated)
 *
 *   RELEASE-MANAGED (preserved from the existing server.json / synced):
 *     - version           ← package.json (the npm contract)
 *     - packages[npm]      identifier + version
 *     - packages[mcpb]     url@version + fileSha256 (real sha: --sha <hex>, else
 *                          the existing one — the mcpb-sha gate supplies it at release)
 *     - icons, repository, websiteUrl, $schema, description ← preserved
 *
 * Usage:
 *   node scripts/gen-server-card.js            # regenerate in place (preserve mcpb sha)
 *   node scripts/gen-server-card.js --sha <hex>  # set the mcpb fileSha256 (release)
 *   node scripts/gen-server-card.js --check     # print to stdout, do NOT write (diff/verify)
 */
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const root = path.join(__dirname, '..');
// faf-cli loaded from dist directly (same path the runtime bridge uses — its
// exports map's `bun` condition points at non-shipped src; dist is the truth).
const faf = require(path.join(root, 'node_modules', 'faf-cli', 'dist', 'index.js'));

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
const data = yaml.parse(fs.readFileSync(path.join(root, 'project.faf'), 'utf-8'));
const existing = JSON.parse(fs.readFileSync(path.join(root, 'server.json'), 'utf-8'));

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
const shaArg = flag('--sha');
const check = argv.includes('--check');

// `generated` is release metadata, not per-run — keep the generator IDEMPOTENT:
// preserve the existing stamp (no spurious churn on regenerate); override with
// --generated <iso> at release, else fall to a date-only stamp (the convention).
const KEY = 'io.modelcontextprotocol.registry/publisher-provided';
const existingGenerated = existing?._meta?.[KEY]?.['one.faf/context']?.generated;
const generated =
  flag('--generated') || existingGenerated || `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;

const version = pkg.version;
const existingMcpb = (existing.packages || []).find((p) => p.registryType === 'mcpb');
const mcpbSha = shaArg || existingMcpb?.fileSha256;
const mcpbUrl = `https://github.com/Wolfe-Jam/${pkg.name}/releases/download/v${version}/${pkg.name}-${version}.mcpb`;

const server = {
  $schema: existing.$schema,
  name: faf.registryName(data),                              // EMITTED — one.faf/<name>
  title: data.project?.title,                                // EMITTED — display title from project.faf (omitted if unset)
  description: existing.description || pkg.description,
  icons: existing.icons,                                     // release-managed asset
  version,                                                   // ← package.json
  repository: existing.repository,
  websiteUrl: existing.websiteUrl,
  packages: [
    { registryType: 'npm', identifier: pkg.name, version, transport: { type: 'stdio' } },
    ...(existingMcpb
      ? [{ registryType: 'mcpb', identifier: mcpbUrl, version, fileSha256: mcpbSha, transport: { type: 'stdio' } }]
      : []),
  ],
  _meta: faf.registryMeta(data, { fafPointer: './project.faf', now: generated }), // EMITTED — one.faf/context block
};

const out = JSON.stringify(server, null, 2) + '\n';
if (check) {
  process.stdout.write(out);
} else {
  fs.writeFileSync(path.join(root, 'server.json'), out);
  console.log(`server.json regenerated — name=${server.name} version=${version} (name + _meta emitted from faf-cli)`);
}
