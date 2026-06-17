# Mini Lending Protocol

A compact Aave-inspired lending protocol for local and testnet demonstrations. The project includes Solidity contracts, a Hardhat test/deploy workspace, and a React dashboard for interacting with reserves, user positions, and liquidations.

This repository is built for learning, demos, and protocol engineering practice. It is not production-ready mainnet software.

## Highlights

- Multi-reserve lending pool with per-asset risk parameters.
- Deposit, withdraw, borrow, repay, and liquidation flows.
- Scaled accounting through `AToken` and `VariableDebtToken`.
- Live liquidity and borrow indexes using RAY precision (`1e27`).
- Pluggable utilization-based interest rate strategy.
- Mock price oracle and mock ERC20 assets for deterministic local demos.
- React + TypeScript frontend connected to a local Hardhat chain through `wagmi` and `viem`.

## Architecture

```text
Mini-lending-protocol/
├── contract/     Solidity contracts, Hardhat config, scripts, tests
├── frontend/     React + TypeScript + Vite application
└── docs/         HTML protocol, API, deploy, testing, and limitations docs
```

### Contract Layer

Core contracts live in `contract/contracts`:

- `core/LendingPool.sol` coordinates deposits, borrows, repayments, withdrawals, reserve updates, health-factor checks, and liquidations.
- `tokens/AToken.sol` stores scaled supplier balances and transfers reserve underlying.
- `tokens/VariableDebtToken.sol` stores scaled variable-debt balances.
- `interest/DefaultInterestRateStrategy.sol` calculates supply and borrow rates from utilization using a two-slope jump-rate model.
- `oracle/MockPriceOracle.sol` provides demo USD prices.
- `libraries/MathUtils.sol` provides WAD/RAY/BPS arithmetic and index accrual helpers.

Reserve configuration includes:

- `ltvBps`
- `liquidationThresholdBps`
- `liquidationBonusBps`
- `reserveFactorBps`
- `interestRateStrategy`

### Frontend Layer

The frontend is a Vite app in `frontend/` with routes for:

- `/` landing page
- `/dashboard` account and market overview
- `/markets` reserve list
- `/asset/:address` asset detail and user actions
- `/position` user reserve positions
- `/liquidation` liquidation helper view

Contract reads and writes are organized under `frontend/src/hooks`.

## Prerequisites

- Node.js 20+
- npm
- A wallet/browser setup that can connect to Hardhat local chain `31337`

## Quick Start

Install and test the contracts:

```bash
cd contract
npm install
npm test
```

Start a local chain:

```bash
cd contract
npx hardhat node
```

In a second terminal, deploy the demo environment:

```bash
cd contract
npm run deploy:local
```

Start the frontend:

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

After redeploying, update frontend addresses if needed:

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
7. Change mock oracle prices or use prepared test scenarios to make a position liquidatable.
8. Execute liquidation and verify debt/collateral changes.

## Testing

Contract tests cover:

- reserve initialization and risk-parameter validation
- deposit, withdraw, borrow, and repay flows
- account data aggregation across reserves
- health-factor enforcement
- variable interest accrual
- jump-rate strategy behavior
- liquidation edge cases, including partial liquidation and collateral caps

Run:

```bash
cd contract
npm test
```

Frontend checks:

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
- No supply caps, borrow caps, or production risk engine.
- Contracts are for demo and education; they have not been audited.
- Frontend configuration is local-chain focused by default.

## Tech Stack

| Area | Stack |
| --- | --- |
| Smart contracts | Solidity `^0.8.24`, OpenZeppelin Contracts |
| Contract tooling | Hardhat, ethers v6, TypeScript, Mocha/Chai |
| Frontend | React, TypeScript, Vite |
| Web3 frontend | wagmi, viem, TanStack Query |
| Styling | Tailwind CSS |

## Repository Status

This project is best treated as a protocol MVP:

- strong enough for local/testnet demos,
- readable enough for learning and review,
- intentionally smaller than a production lending market.

Before any real deployment, add production-grade oracle integration, role separation, monitoring, cap controls, invariant/fuzz tests, and an independent security review.
