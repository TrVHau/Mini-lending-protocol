# Testing Plan

## Unit Tests

- Deposit / Withdraw
- Borrow / Repay
- Health factor calculation
- Liquidation correctness
- Interest accrual

---

## Fuzz Tests

- Random borrow/repay sequences
- Time skipping
- Edge precision scenarios

---

## Invariant Tests

- HF >= 1 after borrow
- No free collateral extraction
- Index monotonicity
