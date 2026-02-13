# Interest Accrual Model

The protocol uses index-based accounting.

## Why Index-Based?

Avoid looping over users.
Interest is applied globally via indexes.

---

## Reserve Index Update

borrowIndex = borrowIndex _ (1 + borrowRate _ dt)
liquidityIndex = liquidityIndex _ (1 + liquidityRate _ dt)

Where:

- dt = time elapsed
- Rates are expressed in RAY (1e27)

---

## User Accounting

Debt:
debt = scaledDebt \* borrowIndex / RAY

Deposit:
balance = scaledBalance \* liquidityIndex / RAY
