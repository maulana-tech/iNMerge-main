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
| MantleUSD (mUSD) | `0x6d4d017dE8d0A36dce7856Ee989624C6A18cD9Ea` |
| IssuesClaimWithAVS | `0xD04A92C83AFe71f4f69F9FAD0A33229BFBdE33E6` |
| INMergAVS | `0x44b99f76f12e0Ece22f6bD76DcB305Afcf25876D` |
