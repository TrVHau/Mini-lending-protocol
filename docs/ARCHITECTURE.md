# Architecture

## Contracts

### LendingPool

Main entry point for:

- deposit()
- withdraw()
- borrow()
- repay()
- liquidate()

Maintains:

- Reserve data
- Risk parameters
- Index updates
- Health factor calculation

---

### AToken

Represents deposited liquidity.
Balance increases via liquidityIndex.

Actual balance = scaledBalance \* liquidityIndex / RAY

---

### VariableDebtToken

Tracks borrowed amount.
Debt increases via borrowIndex.

Actual debt = scaledDebt \* borrowIndex / RAY

---

### PriceOracle

Returns asset price in USD.

---

### InterestRateModel

Calculates rates based on utilization:

u = totalDebt / totalLiquidity

borrowRate = base + slope _ u
liquidityRate = borrowRate _ u \* (1 - reserveFactor)
