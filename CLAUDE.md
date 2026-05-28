# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

iNMerg is a decentralized GitHub bounty platform on Mantle Network. Project owners create mUSD-funded bounties for GitHub issues; developers claim rewards by submitting merged PRs; an EigenLayer AVS (Actively Validated Service) with zkTLS verification automates the validation flow.

Two independent packages — no monorepo tool, treat each as standalone:

| Package | Path | Stack |
|---|---|---|
| Frontend | `web-main/` | Next.js 15 (Turbopack), TypeScript, Tailwind, shadcn/ui, Wagmi/Viem/RainbowKit |
| Contracts | `contracts/` | Foundry, Solidity 0.8.20, OpenZeppelin |

## Frontend (`web-main/`)

**Package manager**: `pnpm` (ignore `package-lock.json` — two lockfiles exist but pnpm is canonical)

### Commands

```sh
pnpm dev              # next dev --turbopack
pnpm dev:local        # dotenv -e .env.local -- next dev
pnpm dev:development  # dotenv -e .env.development -- next dev
pnpm build
pnpm lint             # next lint (no type-check script)
```

### Environment

Validated at startup by `@t3-oss/env-nextjs` in `src/env.ts` — missing vars cause a build error:

```
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID
NEXT_PUBLIC_ISSUE_ADDRESS
NEXT_PUBLIC_MANTLEUSD_ADDRESS
```

Additional vars used in production but not required for dev: `NEXT_PUBLIC_GITHUB_CLIENT_ID`, `NEXT_PUBLIC_ZK_BACKEND_GENERATE_PROOF`, `NEXT_PUBLIC_ZK_BACKEND_GET_ACCESS_TOKEN`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_ALCHEMY_RPC`.

### Architecture

- **Route groups**: `src/app/(landing)/` (marketing page) and `src/app/(main)/` (app: `issues/`, `issues/[id]/`, `create-bounty/`, `profile/`, `faucet/`)
- **Contract config**: ABIs and addresses live in `src/config/const.ts`; addresses come from `src/env.ts` via `@/env`
- **Wagmi config duplication**: `src/config/wagmi.config.ts` (env-based projectId) and `src/lib/WagmiProviderWrapper.tsx` (hardcoded projectId + duplicate chain def) — keep these in sync when updating chain or projectId
- **Chain**: Mantle Sepolia, chain ID 5003
- **Path alias**: `@/` → `src/`
- **State management**: Jotai for global state; TanStack Query for async/contract reads
- **Contract interactions**: custom hooks in `src/lib/hooks/` (e.g. `use-create-issue`, `use-claim-rewards`, `use-get-all-issue`)
- No frontend tests exist

## Contracts (`contracts/`)

### Commands

```sh
forge build
forge test -vvv
forge test --match-test test_Name -vvv    # single test
forge test --match-path "test/avs/**/*.sol"
forge test --gas-report
forge coverage
forge fmt                  # format (Solidity)
forge fmt --check          # lint
forge snapshot
make deploy-mantle-sepolia # requires .env
pnpm lint                  # solhint
```

### Contract layout

```
src/avs/              — MantleUSD, IssuesClaimWithAVS (main bounty contract), INMergAVS, ZKTLSOperator
src/contracts/core/   — IssueManager, ClaimManager, FundsManager
src/contracts/base/   — IssueStorage, IssueModifiers
src/contracts/libraries/ — IssueErrors, IssueValidator, IssueCalculator
src/IssuesClaim.sol   — legacy non-AVS contract (not used by frontend)
```

`IssuesClaimWithAVS` extends `FundsManager` and is the contract the frontend interacts with.

### Deployment

- `./DEPLOY_AVS.sh` → compiles, runs `forge script script/DeployAVS.s.sol`, updates `.env` with deployed addresses
- `make deploy-mantle-sepolia` requires `.env` with `VALIDATOR_ADDRESS`, `PRIVATE_KEY`, `MANTLE_SEPOLIA_RPC_URL`
- Verification: `./FLATTEN.sh` → `forge verify-contract` via Makefile

### Formatter config (foundry.toml)

120-col line length, 4-space tabs, double quotes, `long` int types.

### Deployed addresses (Mantle Sepolia, chain ID 5003)

| Contract | Address |
|---|---|
| MantleUSD (mUSD) | `0x5ab8ddE10e31d503C5db1D734ca64dD2e0066d72` |
| IssuesClaimWithAVS | `0x836112Af92dCA17D5a45d3b4Fc7E490eC6b4B36e` |
| INMergAVS | `0x9d507b8c972ee303773Bd409cd56Ed1b37D67a10` |

RPC: `https://rpc.sepolia.mantle.xyz` | Explorer: `https://explorer.sepolia.mantle.xyz`

### Known quirks

- The `operator/` directory (AVS bot in Node.js) referenced in docs does not exist locally
- `pnpm build` in `contracts/` runs `forge build` (via package.json)
- OpenZeppelin remapping: `@openzeppelin-contracts=lib/openzeppelin-contracts/`
