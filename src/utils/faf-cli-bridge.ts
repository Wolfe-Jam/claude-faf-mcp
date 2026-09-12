/**
 * faf-cli bridge — the one place claude-faf-mcp loads faf-cli.
 *
 * faf-cli is ESM ("type": "module", exports only `types` / `default`) and this
 * package compiles to CommonJS. A dynamic `import()` loads ESM from CommonJS on
 * every supported Node and in bun; tsc keeps it as a real `import()` under
 * `module: NodeNext`. A static `import` or `export * from 'faf-cli'` would
 * compile to `require()`, which Node only allows for ESM from 22.12.
 *
 * Consumers destructure inside async code: `const { scoreFafYaml } = await fafCli`.
 * The promise is created once, at module load, and cached.
 *
 * Before 6.0.0 this file walked up from __dirname to find
 * node_modules/faf-cli/dist/index.js and imported that path — a workaround for
 * faf-cli 6.7's `bun` export condition, which faf-cli dropped in 6.8. The
 * walk could bind a different faf-cli than package.json names; the bare
 * specifier resolves the one npm installed for this package.
 *
 * Every tool runs on this faf-cli. claude-faf-mcp never runs a `faf` found on
 * PATH (6.0.0 removed the PATH detector and its shell-out); faf_debug reports
 * this faf-cli's version (utils/faf-cli-version.ts).
 */
export const fafCli = import('faf-cli');

// A missing faf-cli must fail the tool call that awaits it, not crash the
// server at startup as an unhandled rejection.
fafCli.catch(() => { /* surfaced by every `await fafCli` */ });
