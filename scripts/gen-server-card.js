#!/usr/bin/env node
/**
 * Write the MCP-registry server.json — its identity composed from faf-cli.
 *
 * The registry manifest has two halves:
 *
 *   EMITTED (faf-cli, the single source):
 *     - name              → registryName(project.faf)   (one.faf/<name>, never io.faf)
 *     - title             → registryTitle(project.faf)  (omitted when unset or over the 100-char cap)
 *     - _meta one.faf/context → registryMeta(project.faf) (faf/mediaType/iana/deterministic/generated)
 *
 *   RELEASE-MANAGED:
 *     - version, packages[npm] ← package.json
 *     - packages[mcpb]    the release asset for this version + its fileSha256
 *     - icons             ← this repo's own assets/icons (every faf-icon-<size>.png there)
 *     - repository, websiteUrl, $schema, description ← kept from server.json
 *
 * The .mcpb sha is never typed by hand. `npm run verify:mcpb -- --record`
 * packs the bundle, starts the server inside it, checks initialize and
 * tools/list, and only then passes the bundle's sha256 here with --sha. When
 * package.json's version differs from the version the .mcpb entry names, this
 * script refuses to run without --sha and writes nothing: a new version with
 * the old bundle's sha is exactly the registry entry that cannot be fixed later
 * (registry versions are immutable).
 *
 * Usage:
 *   node scripts/gen-server-card.js              # rewrite in place (same version: sha kept)
 *   node scripts/gen-server-card.js --sha <hex>  # record the .mcpb sha256 for this version
 *   node scripts/gen-server-card.js --generated <iso>  # set the context timestamp (release)
 *   node scripts/gen-server-card.js --check      # print to stdout, write nothing
 *
 * Exit 0 = written (or printed); 1 = refused or failed, nothing written.
 */
const fs = require('fs');
const path = require('path');
const yaml = require('yaml');

const root = process.env.GEN_SERVER_CARD_ROOT || path.join(__dirname, '..');

async function main() {
  // faf-cli is ESM; import() loads it from CommonJS on every supported Node.
  const faf = await import('faf-cli');

  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf-8'));
  const data = yaml.parse(fs.readFileSync(path.join(root, 'project.faf'), 'utf-8'));
  const existing = JSON.parse(fs.readFileSync(path.join(root, 'server.json'), 'utf-8'));

  const argv = process.argv.slice(2);
  const flag = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : null; };
  const shaArg = flag('--sha');
  const check = argv.includes('--check');

  if (shaArg !== null && !/^[0-9a-f]{64}$/.test(shaArg)) {
    throw new Error(`--sha must be the bundle's sha256: 64 lowercase hex characters (got ${JSON.stringify(shaArg)})`);
  }

  const version = pkg.version;
  const existingMcpb = (existing.packages || []).find((p) => p.registryType === 'mcpb');
  if (existingMcpb && existingMcpb.version !== version && !shaArg) {
    throw new Error(
      `server.json's .mcpb entry is for v${existingMcpb.version}, package.json is v${version}. ` +
        'A new version needs the new bundle\'s sha: run `npm run verify:mcpb -- --record` ' +
        '(packs the bundle, checks it starts and lists its tools, then records its sha256). server.json was not written.',
    );
  }

  // `generated` is release metadata, not per-run — keep the output idempotent:
  // keep the existing stamp; --generated <iso> sets it at release.
  const KEY = faf.REGISTRY_PUBLISHER_KEY;
  const existingGenerated = existing?._meta?.[KEY]?.['one.faf/context']?.generated;
  const generated =
    flag('--generated') || existingGenerated || `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`;

  const repoUrl = String(pkg.repository?.url || '').replace(/^git\+/, '').replace(/\.git$/, '');
  const repoPath = repoUrl.replace(/^https:\/\/github\.com\//, '');
  const iconsDir = path.join(root, 'assets', 'icons');
  const icons = [48, 128, 256, 512]
    .filter((size) => fs.existsSync(path.join(iconsDir, `faf-icon-${size}.png`)))
    .map((size) => ({
      src: `https://raw.githubusercontent.com/${repoPath}/main/assets/icons/faf-icon-${size}.png`,
      mimeType: 'image/png',
      sizes: [`${size}x${size}`],
    }));

  const mcpbSha = shaArg || existingMcpb?.fileSha256;
  const mcpbUrl = `https://github.com/${repoPath}/releases/download/v${version}/${pkg.name}-${version}.mcpb`;
  const title = faf.registryTitle(data);

  const server = {
    $schema: existing.$schema,
    name: faf.registryName(data),                              // EMITTED — one.faf/<name>
    ...(title ? { title } : {}),                               // EMITTED — faf-cli registryTitle
    description: existing.description || pkg.description,
    icons,                                                     // this repo's own icons
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
    console.log(`server.json written — name=${server.name} version=${version} (name, title and _meta from faf-cli)`);
  }
}

main().catch((error) => {
  console.error(`gen-server-card: ${error && error.message ? error.message : error}`);
  process.exit(1);
});
