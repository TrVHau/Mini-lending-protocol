# API Specification

All state-changing functions MUST call `_updateReserve(asset)` first.

All values using RAY = 1e27
All normalized USD values use WAD = 1e18

---

## deposit(asset, amount, onBehalfOf)

Requirements:

- reserve.isActive == true
- reserve.isFrozen == false
- amount > 0
- totalDeposits + amount <= supplyCap (if cap > 0)

Flow:

1. updateReserve(asset)
2. transferFrom(msg.sender, pool, amount)
3. mint scaled aToken:
   scaledAmount = amount \* RAY / liquidityIndex
4. emit Deposit

---

## withdraw(asset, amount, to)

Requirements:

- amount > 0
- user balance >= amount
- after withdraw: healthFactor >= 1 (if user has debt)

Flow:

1. updateReserve(asset)
2. compute scaledAmount
3. burn scaled aToken
4. transfer asset to `to`
5. emit Withdraw

---

## borrow(asset, amount, onBehalfOf)

Requirements:

- reserve.isActive == true
- amount > 0
- availableLiquidity >= amount
- user collateral enabled
- borrowCap not exceeded
- healthFactor after borrow >= 1

Flow:

1. updateReserve(asset)
2. compute newDebt
3. check LTV
4. mint scaled debt token
5. transfer asset to borrower
6. emit Borrow

---

## repay(asset, amount, onBehalfOf)

Requirements:

- amount > 0
- user has debt

Flow:

1. updateReserve(asset)
2. calculate current debt
3. actualRepay = min(amount, currentDebt)
4. burn scaled debt
5. transferFrom payer
6. emit Repay

---

## liquidate(collateralAsset, debtAsset, user, repayAmount)

Requirements:

- healthFactor(user) < 1
- repayAmount <= maxCloseFactor
- user has debt
- user has collateral

Flow:

1. updateReserve(debtAsset)
2. updateReserve(collateralAsset)
3. compute maxRepay
4. compute collateralToSeize
5. burn debt
6. transferFrom liquidator (debtAsset)
7. transfer collateral to liquidator
8. emit Liquidation
