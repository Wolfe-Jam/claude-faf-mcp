# Compose faf-cli — MCP update precedent

**Doctrine:** language detection, scoring, 6Ws interview, and Turbo-Cat live in **faf-cli**. MCP servers **compose** them. They do not fork classifiers.

## Why

When faf-cli ships a language Edition (Go, C#, JVM, Ruby, Swift, …), every MCP that depends on `turboCatScan` / `turboCatSlots` / `relentlessContext` / `scoreFafYaml` inherits the Edition **by bumping the dep** — zero parser work in the MCP.

Forking = drift. Composition = one truth.

## CFM (claude-faf-mcp) floor

| Surface | Composed from faf-cli |
|---------|------------------------|
| `faf_auto` / `faf_formats` | `turboCatScan`, `turboCatSlots` |
| `faf_go` Table-of-8 | `SIX_WS_INTERVIEW`, `buildTableOf8` |
| `faf_readme` / human extract | `relentlessContext` |
| `faf_score` / trust | `scoreFafYaml`, parity helpers |
| Bridge | `src/utils/faf-cli-bridge.ts` |

**Current pin:** `faf-cli: ^7.7.0` (The Swift Edition floor — includes Go→Swift rail).

## Update playbook (this MCP and siblings)

1. **Read** faf-cli `CHANGELOG` from current pin → npm latest.
2. **Bump** `package.json` `faf-cli` range to `^X.Y.Z` (latest Edition floor).
3. **`npm install`** → lockfile resolves.
4. **Smoke** `turboCatScan` on a fixture for each new language if the Edition is detection-only.
5. **`npm test`** — full suite green.
6. **CHANGELOG** — “compose faf-cli ^X.Y.Z — inherit Editions by construction.”
7. **Do not** copy `src/detect/*.ts` into the MCP.

## Sibling pins (as of CFM 7.7 compose)

| Package | Typical pin (check live) | Action |
|---------|--------------------------|--------|
| **claude-faf-mcp** | `^7.7.0` | this playbook |
| **grok-faf-mcp** | often lags | same bump |
| **faf-mcp** | often lags further | same bump |

Keep floors aligned unless a sibling intentionally freezes for a release train.

## Kill lines (do not re-claim in MCP README)

- `go.mod` alone ≠ backend  
- `.csproj` alone ≠ type  
- `pom` / `gradle` alone ≠ Spring  
- `Gemfile` alone ≠ Rails  
- `Package.swift` alone ≠ app  
- `pubspec` alone ≠ Flutter  

Those claims live in faf-cli Editions; MCP marketing can say **“inherits faf-cli Edition rail by composition.”**
