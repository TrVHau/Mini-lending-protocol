# Frontend App

React + TypeScript + Vite frontend for the Mini Lending Protocol.

## What it does

- Connects to the local Hardhat chain through `wagmi` + `viem`
- Reads reserve list, reserve data, balances, and user account data from `LendingPool`
- Shows market overview, asset detail, and approve -> deposit / borrow flows

## Install

```bash
npm install
```

## Run locally

Make sure the contract side is already running and deployed to localhost:

1. `npx hardhat node`
2. `npm run deploy:local` in `contract/`

Then start the frontend:

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Important config

- Local chain RPC is `http://127.0.0.1:8545`
- Frontend contract addresses are stored in `src/config/contracts.ts`
- If you redeploy locally, update the addresses in `src/config/deploy_local.txt` and `src/config/contracts.ts`
