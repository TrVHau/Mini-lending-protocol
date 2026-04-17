# Glossary - Mini Lending Protocol

## A

## `aToken`
Token kế toán đại diện cho phần **collateral/liquidity đã gửi** vào protocol.  
`aToken` trong dự án này là token nội bộ, pool gọi `mint/burn` để cập nhật số dư scaled.

## `asset`
Tài sản gốc (underlying), ví dụ DAI/USDC mock ERC20.

---

## B

## `BPS` (Basis Points)
Đơn vị phần trăm theo basis points:
- `10000 bps = 100%`
- `100 bps = 1%`

Ví dụ:
- `ltvBps = 8000` nghĩa là 80%
- `liquidationThresholdBps = 8500` nghĩa là 85%

## `borrow`
Hành động vay underlying từ reserve. User phải có collateral và không vượt quá giới hạn LTV.

## `borrowIndexRay`
Chỉ số nợ tích lũy (đơn vị RAY), dùng để quy đổi giữa scaled debt và nominal debt.

---

## C

## `collateral`
Tài sản user gửi vào để bảo đảm cho khoản vay.

## `collateralUsdWad`
Giá trị collateral quy đổi sang USD, đơn vị WAD (1e18).

---

## D

## `debtToken` / `VariableDebtToken`
Token kế toán đại diện cho phần nợ. Số dư lưu ở dạng scaled.

## `debtUsdWad`
Giá trị nợ quy đổi USD, đơn vị WAD.

## `deposit`
User chuyển underlying vào reserve, đổi lại nhận `aToken` scaled.

---

## H

## `health factor` (`healthFactorWad`)
Chỉ số an toàn vị thế:

`healthFactor = liquidationThresholdUsd / debtUsd`

- `> 1`: vị thế an toàn
- `= 1`: sát ngưỡng
- `< 1`: có thể bị thanh lý (khi liquidation implement)

Nếu user chưa có nợ (`debtUsd = 0`) thì trả `MaxUint256`.

---

## I

## `initReserve`
Hàm owner dùng để khởi tạo reserve cho một asset:
- gắn `aToken`, `debtToken`
- cấu hình risk params (`ltv`, `liquidationThreshold`, ...)
- set index ban đầu.

---

## L

## `liquidity`
Underlying hiện có trong reserve và có thể cho vay.

## `liquidityIndexRay`
Chỉ số lãi phía cung cấp thanh khoản (RAY), dùng quy đổi scaled aToken sang nominal balance.

## `liquidation`
Cơ chế đóng bớt nợ của vị thế nguy hiểm (`HF < 1`) và tịch biên collateral theo bonus.  
Trong code hiện tại: hàm `liquidate(...)` đã có trong interface nhưng đang `NOT_IMPLEMENTED`.

## `liquidationBonusBps`
Phần thưởng thêm cho liquidator khi thanh lý (đơn vị bps).

## `liquidationThresholdBps`
Ngưỡng dùng để tính health factor. Thường cao hơn hoặc bằng LTV.

## `LTV` (`ltvBps`)
Loan-to-Value: tỷ lệ tối đa được vay trên giá trị collateral.

`maxBorrowUsd = collateralUsd * ltvBps / 10000`

---

## O

## `oracle`
Nguồn giá để quy đổi asset -> USD.

## `PRICE_DECIMALS`
Số chữ số thập phân của giá oracle (mock hiện tại là `8`).

---

## R

## `RAY`
Đơn vị fixed-point `1e27`, dùng cho interest index.

## `repay`
Trả nợ. Protocol burn debt token và chuyển underlying trả về reserve.

## `reserve`
Một “pool con” theo từng asset, gồm:
- `aToken`
- `debtToken`
- index
- risk params
- trạng thái active/frozen.

## `reserveFactorBps`
Thông số dự trữ của reserve (chưa dùng sâu trong business logic hiện tại).

---

## S

## `scaled balance`
Số dư đã scale theo index để tránh cập nhật từng block cho mọi user.  
Nominal balance được tính động theo công thức:

`nominal = scaled * index`

## `SafeERC20`
Thư viện OpenZeppelin giúp transfer ERC20 an toàn hơn.

---

## U

## `underlying`
Token gốc thực tế được chuyển qua lại (khác với token kế toán như aToken/debtToken).

## `update reserve` (`_updateReserve`)
Bước bắt buộc trước các hành động state-changing để cập nhật index theo thời gian.

---

## W

## `WAD`
Đơn vị fixed-point `1e18`, dùng cho giá trị tiền tệ USD trong protocol (`*_UsdWad`).

## `withdraw`
Rút underlying khỏi collateral (burn aToken trước rồi mới chuyển underlying ra ngoài).
