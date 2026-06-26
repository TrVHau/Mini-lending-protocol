# Protocol Overview

_Meta: Mini Lending Protocol / docs/PROTOCOL.md_

## 1. Kiến trúc

Protocol gồm 3 lớp:

- `LendingPool`: điều phối logic vay/cho vay/thanh lý.
- `AToken`: ghi nhận tài sản gửi (scaled balance theo `liquidityIndex`).
- `VariableDebtToken`: ghi nhận nợ vay (scaled balance theo `borrowIndex`).

Giá tài sản lấy từ `IPriceOracle` theo chuẩn USD (`PRICE_DECIMALS`).

### Đơn vị & chỉ số

- **WAD**: 1e18 (dùng cho giá trị USD và một số phép toán token)
- **RAY**: 1e27 (dùng cho index math)

`AToken` và `VariableDebtToken` giữ số dư "scaled" và dùng `liquidityIndex` / `borrowIndex` (RAY) để quy đổi tới current underlying balance. Indexes được accrue (tích lãi) khi có thao tác thay đổi trạng thái — các hàm core luôn gọi `_updateReserve` để đảm bảo indexes cập nhật trước khi logic chính chạy.

## 2. Luồng nghiệp vụ

1. `deposit(asset, amount)`
   - User chuyển underlying vào `aToken` reserve.
   - Pool mint `aToken` scaled cho user.
   - Frontend `MAX` là exact wallet balance, không phải sentinel trong contract.

2. `borrow(asset, amount)`
   - Pool kiểm tra thanh khoản reserve.
   - Pool tính `currentDebt + newDebt <= maxBorrow` theo dữ liệu toàn account.
   - Pool mint debt token và chuyển underlying ra cho user.
   - Frontend `MAX` là borrowing capacity đã cap theo liquidity và round down nhẹ.

3. `repay(asset, amount)`
   - Pool burn debt token theo phần trả thực tế (`min(amount, debt)`).
   - User chuyển underlying trả về reserve.
   - Với full repay, caller có thể truyền `type(uint256).max`; pool sẽ cập nhật borrow index, đọc live debt, rồi chỉ thu đúng số nợ thực tế.

4. `withdraw(asset, amount)`
   - Pool burn `aToken` của user.
   - Nếu `amount == type(uint256).max`, pool resolve sang toàn bộ live aToken balance của user trước khi burn.
   - Nếu user còn debt, health factor sau rút phải >= 1.
   - Pool chuyển underlying cho user.
   - Frontend `MAX` dùng `type(uint256).max` khi rút toàn bộ balance; nếu chỉ rút một phần an toàn vì còn debt, frontend gửi exact amount đã ước tính. Contract vẫn kiểm tra lại on-chain.

5. `liquidate(collateralAsset, debtAsset, user, debtToCover)`
   - Chỉ chạy khi health factor của `user` < 1.
   - Liquidator trả `debtAsset`, nhận `collateralAsset` kèm liquidation bonus.
   - Có cơ chế cap theo lượng collateral thực có của user.

## 3. Chỉ số rủi ro theo reserve

- `ltvBps`: trần vay theo collateral.
- `liquidationThresholdBps`: ngưỡng bắt đầu có thể bị liquidate.
- `liquidationBonusBps`: thưởng cho liquidator.

Ràng buộc hiện tại:

- `ltvBps <= liquidationThresholdBps`
- `liquidationThresholdBps <= 10000`
- `liquidationBonusBps` trong `[10000, 12000]`

### Sự kiện chính

- `Deposit(address indexed user, address indexed asset, uint256 amount)`
- `Withdraw(address indexed user, address indexed asset, uint256 amount)`
- `Borrow(address indexed user, address indexed asset, uint256 amount)`
- `Repay(address indexed user, address indexed asset, uint256 amount)`
- `ReserveInitialized(address indexed asset, address indexed aToken, address indexed debtToken, address interestRateStrategy)`
- `ReserveUpdated(address indexed asset, uint256 liquidityIndexRay, uint256 borrowIndexRay, uint256 liquidityRateRayPerSecond, uint256 borrowRateRayPerSecond, uint40 timestamp)`
- `Liquidation(address indexed liquidator, address indexed user, address indexed collateralAsset, address debtAsset, uint256 debtCovered, uint256 collateralSeized)`

Notes: events emit at key state transitions and are useful for E2E verification, analytics, and UI updates.

## 4. Account Data

`getUserAccountData(user)` trả về:

- `collateralUsdWad`
- `debtUsdWad`
- `maxBorrowUsdWad`
- `healthFactorWad`

`healthFactorWad = liquidationThresholdUsdWad / debtUsdWad`. Nếu user không có nợ, health factor là `type(uint256).max`.

---

See the contracts for precise index math and unit conversions (WAD/RAY).
