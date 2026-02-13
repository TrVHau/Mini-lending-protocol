# Protocol Invariants

1. Total debt grows only via borrowIndex.
2. aToken supply reflects liquidity share.
3. Health factor must be >= 1 after borrow.
4. Liquidation never creates value from nothing.
5. liquidityIndex and borrowIndex must be monotonic increasing.
