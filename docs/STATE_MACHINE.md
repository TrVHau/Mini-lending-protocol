# State Machine

User Position States:

1. No position
2. Collateral only
3. Collateral + Debt
4. Liquidatable

Transitions:

Deposit → Collateral only
Borrow → Collateral + Debt
Price drop → Liquidatable
Repay → Collateral only
Withdraw → No position
Liquidation → Collateral reduced
