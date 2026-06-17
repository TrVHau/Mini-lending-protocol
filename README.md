# Mini Lending Protocol

A compact Aave-inspired lending protocol for local and testnet demos. The repository combines Solidity smart contracts, a Hardhat test and deployment workspace, and a React dashboard for interacting with reserves, positions, and liquidations.

This is a protocol MVP for learning, interviews, demos, and engineering practice. It is intentionally smaller than a production lending market and should not be treated as audited mainnet software.

## What This Project Demonstrates

- Multi-reserve lending with per-asset risk parameters.
- Deposit, withdraw, borrow, repay, and liquidation flows.
- Scaled accounting through `AToken` and `VariableDebtToken`.
- Live liquidity and borrow indexes using RAY precision (`1e27`).
- A pluggable utilization-based interest rate strategy.
- Mock oracle and mock ERC20 assets for deterministic local demos.
- A React + TypeScript frontend connected to a local Hardhat chain through `wagmi` and `viem`.

## Repository Layout

```text
Mini-lending-protocol/
├── contract/     Solidity contracts, Hardhat config, scripts, tests
├── frontend/     React + TypeScript + Vite app
└── docs/         Protocol, API, deploy, testing, and limitations docs
```

## Architecture

### Contract Layer

Core contracts live in `contract/contracts`:

- `core/LendingPool.sol` coordinates deposits, borrows, repayments, withdrawals, reserve updates, health-factor checks, and liquidations.
- `tokens/AToken.sol` tracks supplier balances and handles reserve ownership accounting.
- `tokens/VariableDebtToken.sol` tracks variable debt balances.
- `interest/DefaultInterestRateStrategy.sol` implements a two-slope jump-rate model.
- `oracle/MockPriceOracle.sol` provides demo USD prices.
- `libraries/MathUtils.sol` provides WAD/RAY/BPS arithmetic and index accrual helpers.

Each reserve is configured with:

- `ltvBps`
- `liquidationThresholdBps`
- `liquidationBonusBps`
- `reserveFactorBps`
- `interestRateStrategy`

### Frontend Layer

The frontend lives in `frontend/` and provides views for:

- landing and overview screens
- reserve market list
- asset detail and user actions
- account and position summaries
- liquidation helper flow

Contract reads and writes are organized under `frontend/src/hooks`.

## Prerequisites

- Node.js 20+
- npm
- A wallet/browser setup that can connect to Hardhat local chain `31337`

## Quick Start

### 1. Install and test the contracts

```bash
cd contract
npm install
npm test
```

### 2. Start a local Hardhat chain

```bash
cd contract
npx hardhat node
```

### 3. Deploy the demo environment

In a second terminal:

```bash
cd contract
npm run deploy:local
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open the Vite URL, connect a wallet to `http://127.0.0.1:8545`, and use chain ID `31337`.

## Local Deployment Notes

The local deploy script creates:

- `MockPriceOracle`
- `LendingPool`
- `DefaultInterestRateStrategy`
- mock WETH and DAI assets
- `AToken` and `VariableDebtToken` wrappers for each reserve

If you redeploy, update the frontend configuration if addresses change:

- `frontend/src/config/contracts.ts`
- `frontend/src/config/deploy_local.txt`

The frontend currently reads `LENDING_POOL_ADDRESS` from `frontend/src/config/contracts.ts`.

## Demo Flow

1. Start `npx hardhat node`.
2. Run `npm run deploy:local` from `contract/`.
3. Connect the frontend wallet to Hardhat chain `31337`.
4. Deposit collateral.
5. Borrow an available asset.
6. Inspect account data and health factor.
7. Adjust mock oracle prices or use test scenarios to make a position liquidatable.
8. Execute liquidation and verify debt and collateral changes.

## Testing

### Contract tests

Run:

```bash
cd contract
npm test
```

The test suite covers:

- reserve initialization and risk-parameter validation
- deposit, withdraw, borrow, and repay flows
- account data aggregation across reserves
- health-factor enforcement
- variable interest accrual
- jump-rate strategy behavior
- liquidation edge cases, including partial liquidation and collateral caps

### Frontend checks

```bash
cd frontend
npm run lint
npm run build
```

## Documentation

- [Protocol Overview](docs/PROTOCOL.html)
- [Contract API](docs/CONTRACT_API.html)
- [Local Deploy Guide](docs/LOCAL_DEPLOY.html)
- [Testnet Deploy Guide](docs/TESTNET_DEPLOY.html)
- [Testing Guide](docs/TESTING.html)
- [Current Limitations](docs/LIMITATIONS.html)
- [Contract Glossary](contract/GLOSSARY.html)

## Important Limitations

- The oracle is a mock oracle.
- No production governance, pause guardian, or emergency admin process is included.
- No supply caps, borrow caps, or production risk engine is included.
- The contracts are for demo and education and have not been audited.
- Frontend configuration is local-chain focused by default.

## Tech Stack

| Area             | Stack                                      |
| ---------------- | ------------------------------------------ |
| Smart contracts  | Solidity `^0.8.24`, OpenZeppelin Contracts |
| Contract tooling | Hardhat, ethers v6, TypeScript, Mocha/Chai |
| Frontend         | React, TypeScript, Vite                    |
| Web3 frontend    | wagmi, viem, TanStack Query                |
| Styling          | Tailwind CSS                               |

## Why This Repo Is Good for a Blockchain Intern Portfolio

- It shows protocol-level thinking, not just simple NFT or token demos.
- It includes the full loop: contracts, tests, deployment, and frontend integration.
- It demonstrates understanding of lending mechanics such as collateralization, health factors, and liquidation.
- It gives you concrete material to explain tradeoffs, limitations, and risk controls in an interview.

## Repository Status

This project is best treated as a polished MVP:

- strong enough for local and testnet demos,
- readable enough for learning and review,
- intentionally smaller than a production lending market.

Before any real deployment, add production-grade oracle integration, role separation, monitoring, cap controls, invariant and fuzz tests, and an independent security review.
