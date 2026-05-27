# iNMerg

Decentralized open source contribution rewards on Mantle Network, powered by zkTLS & AVS EigenLayer.

## Repository structure

| Package | Path | Stack |
|---|---|---|
| Frontend | [`web-main/`](./web-main/) | Next.js 15, TypeScript, Tailwind, Wagmi/RainbowKit |
| Contracts | [`contracts/`](./contracts/) | Foundry, Solidity 0.8.20, OpenZeppelin |

See each package's `README.md` for detailed docs.

## Quick start

```sh
# Frontend
cd web-main
pnpm install
pnpm dev              # next dev --turbopack

# Contracts
cd contracts
forge build
forge test -vvv
```

## Deployed (Mantle Sepolia)

| Contract | Address |
|---|---|
| MantleUSD (mUSD) | `0x5ab8ddE10e31d503C5db1D734ca64dD2e0066d72` |
| IssuesClaimWithAVS | `0x836112Af92dCA17D5a45d3b4Fc7E490eC6b4B36e` |
| INMergAVS | `0x9d507b8c972ee303773Bd409cd56Ed1b37D67a10` |
