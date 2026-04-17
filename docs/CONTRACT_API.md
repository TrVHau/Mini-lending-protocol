# Contract API (LendingPool)

## 1. User Functions

### `deposit(address asset, uint256 amount)`

- Yêu cầu:
  - reserve tồn tại, active, không frozen
  - `amount > 0`
  - user đã `approve`
- Lỗi thường gặp:
  - `INVALID_AMOUNT`
  - `RESERVE_NOT_FOUND`
  - `RESERVE_INACTIVE`
  - `RESERVE_FROZEN`

### `withdraw(address asset, uint256 amount)`

- Yêu cầu:
  - reserve tồn tại, active
  - `amount > 0`
  - đủ `aToken` để burn
  - nếu còn nợ: health factor sau rút phải >= 1
- Lỗi thường gặp:
  - `INVALID_AMOUNT`
  - `BURN_EXCEEDS_BALANCE`
  - `HEALTH_FACTOR_TOO_LOW`

### `borrow(address asset, uint256 amount)`

- Yêu cầu:
  - reserve tồn tại, active, không frozen
  - có đủ thanh khoản
  - `currentDebt + borrow <= maxBorrow`
- Lỗi thường gặp:
  - `INVALID_AMOUNT`
  - `INSUFFICIENT_LIQUIDITY`
  - `INSUFFICIENT_COLLATERAL`

### `repay(address asset, uint256 amount)`

- Yêu cầu:
  - reserve tồn tại, active
  - `amount > 0`
  - user có nợ
- Lỗi thường gặp:
  - `INVALID_AMOUNT`
  - `NO_DEBT`

### `liquidate(address collateralAsset, address debtAsset, address user, uint256 debtToCover)`

- Yêu cầu:
  - `debtToCover > 0`, `user != 0`
  - 2 reserve hợp lệ, active, không frozen
  - health factor user < 1
- Lỗi thường gặp:
  - `INVALID_AMOUNT`
  - `HEALTHY_POSITION`
  - `NO_DEBT`
  - `NO_COLLATERAL`

## 2. View Functions

- `getReserveIndexes(asset)`
- `getReserveAddresses(asset)`
- `getHealthFactor(user)`
- `getUserAccountData(user)`

## 3. Admin Function

### `initReserve(...)`

- Chỉ owner.
- Validate tham số risk:
  - `ltvBps <= liquidationThresholdBps <= 10000`
  - `liquidationBonusBps` trong `[10000, 12000]`
  - `reserveFactorBps <= 10000`
