# Contract API (LendingPool)

_Meta: Mini Lending Protocol / docs/CONTRACT_API.md_

## 1. User Functions

### `deposit(address asset, uint256 amount)`

- Yêu cầu:
  - reserve tồn tại, active, không frozen
  - `amount > 0`
  - user đã `approve`
- Ghi chú: frontend `MAX` dùng wallet balance làm exact `amount`; contract không dùng `type(uint256).max` sentinel cho deposit.
- Lỗi thường gặp:
  - `INVALID_AMOUNT`
  - `RESERVE_NOT_FOUND`
  - `RESERVE_INACTIVE`
  - `RESERVE_FROZEN`

Revert messages from source:

- `INVALID_AMOUNT` (when `amount == 0`)
- `RESERVE_NOT_FOUND` (reserve not initialized)
- `RESERVE_INACTIVE` (reserve `isActive == false`)
- `RESERVE_FROZEN` (reserve `isFrozen == true`)
- `MINT_FAILED` (internal aToken mint returned 0)

---

### `withdraw(address asset, uint256 amount)`

- Yêu cầu:
  - reserve tồn tại, active
  - `amount > 0`
  - đủ `aToken` để burn
  - nếu còn nợ: health factor sau rút phải >= 1
- Ghi chú:
  - truyền `type(uint256).max` để rút toàn bộ aToken balance theo kiểu Aave
  - nếu user còn nợ, contract vẫn kiểm tra health factor sau rút
  - frontend `MAX` nên dùng sentinel chỉ khi rút toàn bộ balance; nếu không, dùng số có thể rút ước tính theo health factor
- Lỗi thường gặp:
  - `INVALID_AMOUNT`
  - `BURN_FAILED` / `BURN_EXCEEDS_BALANCE`
  - `HEALTH_FACTOR_TOO_LOW`

Revert messages from source:

- `INVALID_AMOUNT` (when `amount == 0`, or when max-withdraw resolves to zero balance)
- `RESERVE_NOT_FOUND` (reserve not initialized)
- `RESERVE_INACTIVE` (reserve `isActive == false`)
- `BURN_FAILED` (aToken burn returned 0)
- `BURN_EXCEEDS_BALANCE` (aToken-level guard when attempting to burn more than user has)
- `HEALTH_FACTOR_TOO_LOW` (withdraw would leave HF < 1)

---

### `borrow(address asset, uint256 amount)`

- Yêu cầu:
  - reserve tồn tại, active, không frozen
  - có đủ thanh khoản
  - `currentDebt + borrow <= maxBorrow` theo account data
- Ghi chú: frontend `MAX` dùng borrowing capacity, capped theo reserve liquidity và nên round down nhẹ để tránh lỗi biên; contract không dùng `type(uint256).max` sentinel cho borrow.
- Lỗi thường gặp:
  - `INVALID_AMOUNT`
  - `INSUFFICIENT_LIQUIDITY`
  - `INSUFFICIENT_COLLATERAL`

Revert messages from source:

- `INVALID_AMOUNT` (when `amount == 0`)
- `RESERVE_NOT_FOUND` (reserve not initialized)
- `RESERVE_INACTIVE` (reserve `isActive == false`)
- `RESERVE_FROZEN` (reserve `isFrozen == true`)
- `INSUFFICIENT_LIQUIDITY` (reserve `aToken` underlying balance < amount)
- `INSUFFICIENT_COLLATERAL` (user's collateral cannot support the borrow)
- `MINT_FAILED` (debt token mint returned 0)

---

### `repay(address asset, uint256 amount)`

- Yêu cầu:
  - reserve tồn tại, active
  - `amount > 0`
  - user có nợ
- Ghi chú:
  - `amount` được cap theo live debt hiện tại: `payback = min(amount, debt)`
  - dùng `type(uint256).max` làm `amount` cho luồng "repay all" kiểu Aave
  - user vẫn cần approve đủ allowance trước khi gọi `repay`; nếu full repay bằng `type(uint256).max`, frontend nên approve `type(uint256).max` hoặc đảm bảo allowance hiện tại đủ cho live debt
- Lỗi thường gặp:
  - `INVALID_AMOUNT`
  - `NO_DEBT`

Revert messages from source:

- `INVALID_AMOUNT` (when `amount == 0`)
- `RESERVE_NOT_FOUND` (reserve not initialized)
- `RESERVE_INACTIVE` (reserve `isActive == false`)
- `NO_DEBT` (user has zero debt on reserve)
- `BURN_FAILED` (debt token burn returned 0)

---

### `liquidate(address collateralAsset, address debtAsset, address user, uint256 debtToCover)`

- Yêu cầu:
  - `debtToCover > 0`, `user != address(0)`
  - hai reserve hợp lệ và active (liquidation vẫn hoạt động trên reserve frozen)
  - health factor user < 1
- Hành động chính:
  - transfer `debtAsset` từ liquidator → debt reserve, burn debt token of user, burn `aToken` collateral of user, then transfer seized collateral to liquidator
  - caps/decrements để đảm bảo không seize vượt quá collateral thực có
- Lỗi thường gặp:
  - `INVALID_AMOUNT`
  - `HEALTHY_POSITION`
  - `NO_DEBT`
  - `NO_COLLATERAL`

Revert messages from source:

- `INVALID_AMOUNT` (when `debtToCover == 0`)
- `USER_ZERO` (when `user == address(0)`)
- `COLLATERAL_RESERVE_NOT_FOUND` / `DEBT_RESERVE_NOT_FOUND` (reserve missing)
- `RESERVE_INACTIVE` (either reserve inactive)
- `NO_DEBT` (target user has no debt)
- `HEALTHY_POSITION` (user's HF >= 1)
- `NO_COLLATERAL` (user has no collateral in the collateral reserve)
- `BURN_FAILED` (on burning debt or collateral aToken if underlying burn/mint failed)

## 2. View Functions

- `getReserveList()`
- `getReserveCount()`
- `getReserveAt(index)`
- `getReserveData(asset)`
- `getReserveRates(asset)`
- `getReserveInterestRateStrategy(asset)`
- `getHealthFactor(user)`
- `getUserAccountData(user)`

`getReserveData(asset)` trả về:

- `aToken`
- `debtToken`
- `assetDecimals`
- `isActive`
- `isFrozen`
- `ltvBps`
- `liquidationThresholdBps`
- `liquidationBonusBps`
- `reserveFactorBps`
- `liquidityIndexRay`
- `borrowIndexRay`
- `lastUpdateTimestamp`

Notes: view functions do not revert under normal usage but will return zero/empty values for uninitialized reserves; callers should check `aToken`/`debtToken` addresses.

## 3. Admin Function

### `initReserve(...)`

- Chỉ owner.
- Nhận `interestRateStrategy` cho từng reserve.
- Validate tham số risk:
  - `ltvBps <= liquidationThresholdBps <= 10000`
  - `liquidationBonusBps` trong `[10000, 12000]`
  - `reserveFactorBps <= 10000`

---

_Notes_

This file documents the public LendingPool surface and common revert reasons. For full signatures and natspec, see the contract source `contract/contracts/core/LendingPool.sol`.
