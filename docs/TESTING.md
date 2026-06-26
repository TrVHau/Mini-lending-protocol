# Testing Guide

_Meta: Mini Lending Protocol / docs/TESTING.md_

## 1. Chạy toàn bộ test

Trong thư mục `contract`:

```bash
npm test
# hoặc
npx hardhat test
```

### Chạy một file test cụ thể

```bash
npx hardhat test test/LendingPool.liquidation.test.ts
```

### Chạy test với node background (khi cần deploy script interaction)

1. `npx hardhat node`
2. Trong terminal khác, `npm run deploy:local` hoặc chạy scripts qua `npx hardhat run scripts/deploy-local.ts --network localhost`
3. Chạy test hoặc thao tác thủ công trên console


## 2. Nhóm test hiện có

- `LendingPool.test.ts`
  - deposit / withdraw / borrow / repay
  - validate cấu hình reserve
  - regression cho: không được vay vượt LTV qua nhiều lần borrow; không được withdraw làm health factor < 1

- `LendingPool.accountData.test.ts`
  - kiểm tra account data theo USD
  - tổng hợp nhiều reserve

- `LendingPool.liquidation.test.ts`
  - healthy position revert
  - partial liquidation
  - debtToCover > userDebt
  - collateral cap

## 3. Checklist trước demo

- test pass 100%
- deploy thành công và lưu địa chỉ contracts
- oracle đã set giá cho tất cả asset dùng trong demo
- chạy kịch bản E2E: deposit -> borrow -> price drop -> liquidate
