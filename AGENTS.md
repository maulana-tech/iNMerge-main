# AGENTS.md — iNMerg

## Repository structure

Two independent packages in the root:

| Package | Path | Stack |
|---|---|---|
| Frontend | `web-main/` | Next.js 15 (Turbopack), TypeScript, Tailwind, shadcn/ui, Wagmi/Viem/RainbowKit, pnpm |
| Frontend | `web-main/` | Next.js 15 (Turbopack), TypeScript, Tailwind, shadcn/ui, Wagmi/Viem/RainbowKit, pnpm |
| Contracts | `contracts/` | Foundry (forge), Solidity 0.8.20, OpenZeppelin |

No monorepo tool — treat each as standalone.

## Frontend (web-main)

### Commands

```sh
pnpm dev              # next dev --turbopack
pnpm dev:local        # dotenv -e .env.local -- next dev
pnpm dev:development  # dotenv -e .env.development -- next dev
pnpm build
pnpm start
pnpm lint             # next lint (no dedicated type-check script)
```

### Environment

Required (validated by `@t3-oss/env-nextjs` at `src/env.ts`):
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_ISSUE_ADDRESS`
- `NEXT_PUBLIC_MANTLEUSD_ADDRESS`

`.env*` files are gitignored. Additional vars used in production:
`NEXT_PUBLIC_GITHUB_CLIENT_ID`, `NEXT_PUBLIC_ZK_BACKEND_GENERATE_PROOF`,
`NEXT_PUBLIC_ZK_BACKEND_GET_ACCESS_TOKEN`, `NEXT_PUBLIC_APP_URL`,
`NEXT_PUBLIC_ALCHEMY_RPC`.

### Architecture

- App router: `(landing)/` (landing page), `(main)/` (app: `issues/`, `issues/[id]/`, `create-bounty/`, `profile/`, `faucet/`)
- ABI + addresses in `src/config/const.ts` (imported from env via `@/env`)
- Wagmi config duplicated: `src/config/wagmi.config.ts` (env-based projectId) and `src/lib/WagmiProviderWrapper.tsx` (hardcoded projectId + duplicate chain def)
- Alchemy RPC key is hardcoded in both wagmi config files
- Path alias `@/` → `./src/`
- Chain: Mantle Sepolia (chain ID 5003)
- Two lockfiles exist (`package-lock.json` + `pnpm-lock.yaml`); `pnpm` is the intended package manager

### Testing

No frontend tests exist.

## Contracts (contracts/)

### Commands

```sh
forge build                   # compile
forge test -vvv               # test with verbose
forge test --gas-report       # gas report
forge test --match-path "test/avs/**/*.sol"  # run AVS tests only
forge test --match-test test_Name -vvv       # single test
forge coverage
forge fmt                     # format (forge fmt --check to lint)
forge snapshot                # gas snapshot
make deploy-mantle-sepolia    # deploy (requires .env with VALIDATOR_ADDRESS, PRIVATE_KEY, MANTLE_SEPOLIA_RPC_URL)
pnpm lint                     # solhint
```

### Contract layout

```
src/avs/           — MantleUSD, IssuesClaimWithAVS, INMergAVS, ZKTLSOperator (primary contracts)
src/contracts/core/  — IssueManager, ClaimManager, FundsManager
src/contracts/base/  — IssueStorage, IssueModifiers
src/contracts/libraries/ — IssueErrors, IssueValidator, IssueCalculator
src/IssuesClaim.sol — legacy (non-AVS)
```

`IssuesClaimWithAVS` is the main bounty contract. It extends `FundsManager`.

### Deployment

`./DEPLOY_AVS.sh` compiles → deploys via `forge script script/DeployAVS.s.sol` → updates `.env` with deployed addresses. Also uses `make deploy-mantle-sepolia` (which requires `.env` with `include .env`).

Verification: `./FLATTEN.sh` → flatten to `flattened/` → `forge verify-contract` per Makefile.

### Deployed addresses (Mantle Sepolia)

| Contract | Address |
|---|---|
| MantleUSD | `0x6d4d017dE8d0A36dce7856Ee989624C6A18cD9Ea` |
| IssuesClaimWithAVS | `0xD04A92C83AFe71f4f69F9FAD0A33229BFBdE33E6` |
| INMergAVS | `0x44b99f76f12e0Ece22f6bD76DcB305Afcf25876D` |

RPC: `https://rpc.sepolia.mantle.xyz`
Explorer: `https://explorer.sepolia.mantle.xyz`

### Env vars (contracts)

Required in `.env`: `VALIDATOR_ADDRESS`, `PRIVATE_KEY`, `MANTLE_SEPOLIA_RPC_URL`.
Optional: `MANTLESCAN_API_KEY`, `MINIMUM_STAKE`, `MUSD_TOKEN_ADDRESS`, `ISSUES_CLAIM_ADDRESS`, `AVS_CONTRACT_ADDRESS`, `VALIDATOR_PRIVATE_KEY`.

### Quirks

- `operator/` directory referenced in docs and scripts does not exist locally (it contained the AVS operator bot — Node.js with zkTLS/GitHub API integration)
- `pnpm build` runs `forge build` (via package.json script)
- Solidity formatter is `forge fmt`, configured in `foundry.toml` (120 cols, 4-space tab, double quotes)
- Remappings: `@openzeppelin-contracts=lib/openzeppelin-contracts/`
