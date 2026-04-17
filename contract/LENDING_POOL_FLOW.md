# LendingPool - Hàm, Công Dụng, Và Luồng Chạy

## 1. Tổng quan nhanh

`LendingPool` là contract trung tâm xử lý:

- Gửi tài sản (`deposit`)
- Rút tài sản (`withdraw`)
- Vay (`borrow`)
- Trả nợ (`repay`)
- Đọc dữ liệu account (`getUserAccountData`, `getHealthFactor`)

Các thành phần liên quan:

- `AToken`: ghi nhận collateral của user (dạng scaled balance)
- `VariableDebtToken`: ghi nhận nợ của user (dạng scaled balance)
- `PriceOracle`: trả giá asset để quy đổi USD

---

## 2. Nhóm hàm chính (state-changing)

## `initReserve(...)`

**Mục đích:** Khởi tạo một reserve mới (asset + aToken + debtToken + risk params).

**Điều kiện chính:**

- Chỉ owner gọi được
- Asset/token address không được `0`
- `ltvBps <= liquidationThresholdBps`
- Reserve chưa tồn tại

**Tác động:**

- Lưu metadata reserve vào `reserves[asset]`
- Set index ban đầu = `RAY`
- Thêm `asset` vào `reserveList`
- Emit `ReserveInitialized`

---

## `deposit(asset, amount)`

**Mục đích:** User gửi asset vào pool để nhận collateral (aToken).

**Điều kiện chính:**

- `amount > 0`
- Reserve tồn tại, active, không frozen

**Tác động:**

1. Update reserve index (`_updateReserve`)
2. Transfer underlying từ user vào `aToken`
3. Mint aToken scaled cho user
4. Emit `Deposit`

---

## `withdraw(asset, amount)`

**Mục đích:** User rút underlying từ collateral của mình.

**Điều kiện chính:**

- `amount > 0`
- Reserve tồn tại, active

**Tác động:**

1. Update reserve index
2. Burn aToken của user
3. `aToken.transferUnderlyingTo(user, amount)`
4. Emit `Withdraw`

---

## `borrow(asset, amount)`

**Mục đích:** User vay underlying từ reserve.

**Điều kiện chính:**

- `amount > 0`
- Reserve tồn tại, active, không frozen
- Reserve có đủ liquidity
- Sau vay vẫn trong giới hạn LTV (`INSUFFICIENT_COLLATERAL` nếu vượt)

**Tác động:**

1. Update reserve index
2. Check liquidity
3. Tính collateral USD và max borrow USD
4. Mint debt token cho user
5. Transfer underlying cho user
6. Emit `Borrow`

---

## `repay(asset, amount)`

**Mục đích:** User trả nợ.

**Điều kiện chính:**

- `amount > 0`
- Reserve tồn tại, active
- User có nợ (`NO_DEBT` nếu không)

**Tác động:**

1. Update reserve index
2. Tính `payback = min(amount, currentDebt)`
3. Burn debt token
4. Transfer underlying từ user vào `aToken`
5. Emit `Repay`

---

## `liquidate(collateralAsset, debtAsset, user, debtToCover)`

**Trạng thái hiện tại:** Chưa implement, đang `revert("NOT_IMPLEMENTED")`.

---

## 3. Nhóm hàm đọc dữ liệu (view)

## `getReserveIndexes(asset)`

Trả:

- `liquidityIndexRay`
- `borrowIndexRay`
- `lastUpdateTimestamp`

## `getReserveAddresses(asset)`

Trả:

- địa chỉ `aToken`
- địa chỉ `debtToken`

## `getHealthFactor(user)`

Tính theo:

`healthFactor = liquidationThresholdUsd / debtUsd` (WAD)

Nếu `debtUsd == 0` thì trả `type(uint256).max`.

## `getUserAccountData(user)`

Trả 4 giá trị:

- `collateralUsdWad`
- `debtUsdWad`
- `maxBorrowUsdWad`
- `healthFactorWad`

Logic aggregate qua toàn bộ reserve trong `reserveList`.

---

## 4. Nhóm helper nội bộ

## `_computeUserAccountData(user)`

Core helper để gom dữ liệu account qua nhiều reserve.

Lưu ý:

- Reserve nào user không có position (`collateral=0` và `debt=0`) thì skip luôn.
- Mục tiêu: tránh revert vì thiếu giá oracle ở reserve không liên quan.

## `_updateReserve(asset)`

Update index theo thời gian trôi qua, emit `ReserveUpdated`.

## `_accrueIndexes(r, dt)`

Cộng dồn `liquidityIndexRay` và `borrowIndexRay` theo rate.

## `_assetToUsdWad(asset, amount)`

Đổi amount asset sang USD WAD qua oracle.

## `_amountTo18(amount, assetDecimals)`

Scale amount về 18 decimals.

---

## 5. Luồng chạy thực tế (end-to-end)

## Luồng A: Cung cấp thanh khoản + gửi collateral

1. Owner gọi `initReserve`
2. Oracle set giá asset
3. LP gọi `deposit` để tạo liquidity
4. Borrower gọi `deposit` để tạo collateral

## Luồng B: Vay

1. Borrower gọi `borrow`
2. Contract check liquidity + check collateral theo LTV
3. Mint debt token + chuyển underlying cho borrower

## Luồng C: Trả nợ

1. Borrower approve token cho pool
2. Gọi `repay`
3. Burn debt token, chuyển tiền trả nợ về reserve

## Luồng D: Quan sát rủi ro

1. Frontend gọi `getUserAccountData`
2. Hoặc gọi riêng `getHealthFactor`
3. Dùng `healthFactorWad` để đánh giá trạng thái vị thế

---

## 6. Việc còn thiếu (next steps)

1. Implement `liquidate(...)` thật
2. Thêm event `Liquidation`
3. Viết test riêng cho liquidation:
- healthy position phải revert
- partial liquidation
- cap bởi debt còn lại
- cap bởi collateral còn lại
