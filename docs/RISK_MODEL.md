# Risk Model

Each asset has:

- LTV (Loan-To-Value)
- Liquidation Threshold
- Liquidation Bonus
- Reserve Factor

---

## Borrow Constraint

Σ(collateral \* LTV) >= totalDebt

---

## Health Factor

HF = (Σ collateral \* liquidationThreshold) / totalDebt

Liquidatable if HF < 1
