# Protocol Flow

## Deposit

User → LendingPool.deposit()
→ Update reserve
→ Transfer asset
→ Mint aToken

---

## Borrow

User → borrow()
→ Update reserve
→ Check collateral
→ Mint debt
→ Transfer asset

---

## Repay

User → repay()
→ Update reserve
→ Burn debt
→ Transfer asset to pool

---

## Liquidate

Liquidator → liquidate()
→ Validate HF < 1
→ Repay part of debt
→ Transfer collateral with bonus
