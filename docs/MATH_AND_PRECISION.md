# Math & Precision Rules

Constants:
WAD = 1e18
RAY = 1e27

---

## Index Math

index_new = index_old + index_old _ rate _ dt / RAY

Rates are per second in RAY.

---

## Normalizing Asset Amount

normalized = amount _ price _ 10^(18 - tokenDecimals) / 10^oracleDecimals

All USD values must be in WAD.

---

## Scaled Accounting

scaledAmount = amount \* RAY / index

actualAmount = scaledAmount \* index / RAY

---

## Rounding Rules

- Always round down for borrow
- Always round down for withdraw
- Round down when seizing collateral
- Never round in user’s favor during liquidation
