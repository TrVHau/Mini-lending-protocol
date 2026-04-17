# Protocol Overview

## 1. Kiến trúc

Protocol gồm 3 lớp:

- `LendingPool`: điều phối logic vay/cho vay/thanh lý.
- `AToken`: ghi nhận tài sản gửi (scaled balance theo `liquidityIndex`).
- `VariableDebtToken`: ghi nhận nợ vay (scaled balance theo `borrowIndex`).

Giá tài sản lấy từ `IPriceOracle` theo chuẩn USD (`PRICE_DECIMALS`).

## 2. Luồng nghiệp vụ

1. `deposit(asset, amount)`

- User chuyển underlying vào `aToken` reserve.
- Pool mint `aToken` scaled cho user.

2. `borrow(asset, amount)`

- Pool kiểm tra thanh khoản reserve.
- Pool tính `currentDebt + newDebt <= maxBorrow` theo dữ liệu toàn account.
- Pool mint debt token và chuyển underlying ra cho user.

3. `repay(asset, amount)`

- Pool burn debt token theo phần trả thực tế (`min(amount, debt)`).
- User chuyển underlying trả về reserve.

4. `withdraw(asset, amount)`

- Pool burn `aToken` của user.
- Nếu user còn debt, bắt buộc health factor sau rút phải >= 1.
- Pool chuyển underlying cho user.

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

## 4. Account Data

`getUserAccountData(user)` trả về:

- `collateralUsdWad`
- `debtUsdWad`
- `maxBorrowUsdWad`
- `healthFactorWad`

`healthFactorWad = liquidationThresholdUsdWad / debtUsdWad`.
Nếu user không có nợ, health factor là `max uint256`.
