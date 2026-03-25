# Huong Dan Trien Khai Tiep Theo (MVP Lending Protocol)

Tai lieu nay mo ta thu tu code de di tu ban hien tai den phien ban co the test duoc end-to-end.

## 1. Muc Tieu Hien Tai

- `AToken` va `VariableDebtToken` da o mo hinh accounting-layer (scaled balance + index).
- `MockPriceOracle` da on dinh voi `PRICE_DECIMALS = 8`.
- `LendingPool` chua co logic nghiep vu.
- Test chua bao phu flow thuc te (moi smoke test).

## 2. Thu Tu Trien Khai Khuyen Nghi

### Phase 1: LendingPool Core Skeleton

Tao cau truc du lieu trong `LendingPool.sol`:

- `struct ReserveData`:
  - `address aToken`
  - `address debtToken`
  - `uint8 assetDecimals`
  - `uint256 liquidityIndexRay`
  - `uint256 borrowIndexRay`
  - `uint256 liquidityRateRayPerSecond`
  - `uint256 borrowRateRayPerSecond`
  - `uint40 lastUpdateTimestamp`
  - `bool isActive`
  - `bool isFrozen`
  - risk params in BPS (`ltvBps`, `liquidationThresholdBps`, `liquidationBonusBps`, `reserveFactorBps`)
- `mapping(address => ReserveData) reserves`
- `IPriceOracle public priceOracle`

Them ham noi bo:

- `_updateReserve(address asset)`
- `_accrueIndexes(ReserveData storage r, uint256 dt)`
- `_assetToUsdWad(address asset, uint256 amount)` (doc gia tu oracle + doi ve WAD)
- `_amountTo18(uint256 amount, uint8 assetDecimals)` (helper quy doi ve 1e18)

Khoi tao reserve (quan trong):

- Luc add reserve, set `liquidityIndexRay = 1e27` va `borrowIndexRay = 1e27`.
- `lastUpdateTimestamp = uint40(block.timestamp)`.
- Validate token addresses khac `address(0)` va reserve chua ton tai.

Yeu cau bat buoc:

- Moi ham state-changing phai goi `_updateReserve(asset)` truoc.

Definition of done cho Phase 1:

- Co ham `initReserve(...)` (hoac equivalent) de register asset + token wrappers.
- `_updateReserve` cap nhat index dung theo `dt = block.timestamp - lastUpdateTimestamp`.
- Neu `dt == 0` thi skip accrue de tranh tinh toan du thua.
- Code compile pass voi reserve da init index = RAY (khong bi chia cho 0 o mint/burn token wrappers).

### Phase 2: Deposit / Withdraw

Implement:

- `deposit(asset, amount)`
- `withdraw(asset, amount)`

Flow cho `deposit`:

1. Validate reserve active + not frozen + amount > 0
2. `_updateReserve(asset)`
3. `transferFrom(msg.sender, address(this), amount)`
4. `IAToken.mint(msg.sender, amount, reserve.liquidityIndexRay)`
5. Emit event

Flow cho `withdraw`:

1. Validate amount > 0
2. `_updateReserve(asset)`
3. Burn aToken theo index hien tai
4. Check Health Factor neu user dang co debt
5. Transfer tai san cho user
6. Emit event

### Phase 3: Borrow / Repay

Implement:

- `borrow(asset, amount)`
- `repay(asset, amount)`

Quy tac:

- Debt token chi dung `borrowIndexRay` (khong dung `liquidityIndexRay`).
- Borrow phai check collateral, LTV, HF sau borrow >= 1e18.
- Repay dung `actualRepay = min(amount, currentDebt)`.

### Phase 4: User Views + Risk Views

Implement day du:

- `getUserAccountData(user)`
- `getHealthFactor(user)`

Yeu cau:

- Gia lay tu oracle theo `PRICE_DECIMALS`.
- Quy doi ve USD WAD thong nhat 1e18.
- Lam ro logic max borrow va HF theo docs.

### Phase 5: Liquidation

Implement ham liquidation sau khi borrow/repay va HF da on dinh:

- Dieu kien: `HF < 1e18`
- Gioi han close factor
- Tinh collateral seize kem liquidation bonus
- Burn debt + transfer debtAsset vao pool + tra collateral cho liquidator

## 3. Test Strategy (Bat Buoc Lam Song Song)

### Unit Tests toi thieu

- deposit/withdraw co index update
- borrow/repay dung debt index
- getHealthFactor dung o case bien (`==1`, `<1`, `>1`)
- liquidation chi duoc phep khi HF < 1

### Fuzz Tests

- random chuoi: deposit -> borrow -> repay -> withdraw
- skip time va kiem tra index monotonic tang

### Invariant Tests

- Khong the rut vuot collateral hop le
- Khong co so du am
- Tong debt va collateral khong vo ly sau nhieu thao tac

## 4. Definition Of Done cho MVP

MVP duoc xem la xong khi:

- Build pass
- Unit tests pass
- Co fuzz/invariant co ban pass
- Borrow/repay/withdraw khong pha vo HF rules
- Liquidation flow chay dung voi close factor + bonus

## 5. Khuon Tien Do De Follow Moi Ngay

Moi buoi coding:

1. Chon 1 phase duy nhat
2. Viet code + test cho phase do
3. Chay compile + test
4. Sua loi den khi xanh
5. Moi sang phase tiep theo

Khuyen nghi: khong mo rong frontend luc nay. Hoan tat core protocol + tests truoc, sau do moi expose views cho UI.
