# AGENTS.md — hak-layerzero-plugin

Guidelines for AI agents and developers working on this repository.

## Project Structure

```
src/
  index.ts               — all public exports
  plugin.ts              — HAK plugin registration (tools array)
  networks.ts            — LAYERZERO_MAINNET, LAYERZERO_TESTNET, KNOWN_DESTINATION_CHAINS
  utils/
    abi.ts               — EndpointV2 + OApp minimal ABI fragments, addressToBytes32()
    options.ts           — buildOptions() wrapping @layerzerolabs/lz-v2-utilities
    rpc.ts               — resolveConfig(), getProvider(), getSigner(), readContextConfig()
    units.ts             — toUint256() helper using Long
  tools/
    get-supported-chains.ts
    get-message-fee.ts
    send-message.ts
    get-message-status.ts
tests/
  get-supported-chains.test.ts
  get-message-fee.test.ts
  send-message.test.ts
  get-message-status.test.ts
docs/
  TOOLS.md               — per-tool parameter reference and example prompts
  CONFIGURATION.md       — all settings, env vars, precedence
  EXAMPLES.md            — end-to-end code examples
```

## Commands

```bash
npm run build       # tsup: produces dist/index.js (ESM) + dist/index.cjs (CJS) + types
npm run typecheck   # tsc --noEmit — run before every commit
npm test            # vitest run — run before every commit
npm run lint        # biome check src tests
npm run format      # biome format --write src tests
```

## Critical Rules

### Package names
- **`@hashgraph/hedera-agent-kit`** — NOT `hedera-agent-kit`
- **`@hiero-ledger/sdk`** — NOT `@hashgraph/sdk`
- Using the wrong names will cause runtime failures.

### Tool architecture
- All tools extend `BaseTool` from `@hashgraph/hedera-agent-kit` — never plain object literals.
- Query tools return data directly from `coreAction`.
- Transaction tools return `{ transaction, extras }` from `coreAction` — never submit in `coreAction`.
- Errors always return `{ success: false, error: "message" }` — never throw.

### Config precedence
Always: `ctxConfig > env var > network default > built-in default`
Use `resolveConfig()` from `src/utils/rpc.ts` — don't access `process.env` directly in tools.

### Long / Uint256
Use `toUint256()` from `src/utils/units.ts` for `ContractFunctionParameters.addUint256()`.
The TypeScript types do NOT accept strings — Long is required.

### Hedera-specific
- LayerZero on Hedera requires an **ECDSA (secp256k1)** private key — ED25519 won't work.
- The Hashio JSON-RPC relay handles HBAR decimal conversion (8 native vs 18 wei); don't double-convert.
- LayerZero messages must originate from a deployed OApp contract, not an EOA.

## Adding a New Tool

1. Create `src/tools/my-new-tool.ts` following the `BaseTool` pattern
2. Export an instance: `export const myNewTool = new MyNewTool()`
3. Register it in `src/plugin.ts` tools array
4. Export it from `src/index.ts`
5. Add its method name to `layerzeroPluginToolNames` in `src/index.ts`
6. Add tests in `tests/my-new-tool.test.ts` covering all `coreAction` branches
7. Document it in `docs/TOOLS.md`

## Testing Conventions

- Inject fake RPC/contract via `vi.mock("ethers", ...)` — never make real network calls in tests.
- Cover: missing config → error, API failure → error, happy path → correct shape.
- `shouldSecondaryAction` → true for payload with `transaction`, false for everything else.
- File naming: `tests/<tool-name>.test.ts`.

## Commit & PR Conventions

- Run `npm run typecheck && npm test` before every commit — both must pass clean.
- Upstream PRs to `hashgraph/hedera-agent-kit-js` **must** use `git commit -s` (DCO sign).
- Assignee Check CI failure on upstream PRs is expected for external contributors — ignore it.
- Version: `1.0.0` → `1.1.0` for new features, `2.0.0` only for breaking changes.

## Publishing

```bash
npm run build
npm set //registry.npmjs.org/:_authToken=<automation-token>
npm publish
# Revoke token immediately after publishing
```

Use only **Automation tokens** from https://www.npmjs.com/settings/jmgomezl/tokens.
Granular tokens fail with 403 even with publish permission.

## Known Non-Issues

- `session.txt` — listed in `.gitignore`. If it appears, delete before committing.
- `npm audit` warnings — transitive from `@layerzerolabs/*` packages. Not exploitable in this context.
- Engine warnings (`rimraf`, `lru-cache`) — transitive, Node 18 compatible, no impact.
