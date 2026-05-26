# Contract Package

Smart contracts and Hardhat scripts for the Mini Lending Protocol.

## What is here

- Core lending pool logic in `contracts/core/LendingPool.sol`
- Token accounting contracts in `contracts/tokens/`
- Mock oracle and mock ERC20 assets for local/testing flows
- Hardhat tests for deposit, borrow, repay, withdraw, and liquidation
- Local deployment script in `scripts/deploy-local.ts`

## Install

```bash
npm install
```

## Test

```bash
npx hardhat test
```

## Local deploy

1. Start a local chain:

```bash
npx hardhat node
```

2. Deploy to localhost:

```bash
npm run deploy:local
```

## Notes

- The local deploy script prints the deployed addresses for the oracle, pool, assets, and token wrappers.
- Use those addresses to update the frontend config when you redeploy.
