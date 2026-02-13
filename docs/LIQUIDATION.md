# Liquidation

If Health Factor < 1:

1. Liquidator repays part of borrower's debt.
2. Liquidator receives collateral + bonus.

---

## Formula

collateralToSeize =
repayAmount

- price(debtAsset)
  / price(collateralAsset)
- liquidationBonus

---

## Constraints

- Cannot repay more than closeFactor limit.
- Cannot seize more collateral than borrower owns.
