# Mini Lending Protocol Docs

Bộ tài liệu rút gọn cho mục tiêu demo testnet.

## 1. Tài liệu trong thư mục này

- `PROTOCOL.md`: Kiến trúc và luồng nghiệp vụ cốt lõi.
- `CONTRACT_API.md`: API chính của `LendingPool` và các lỗi thường gặp.
- `TESTNET_DEPLOY.md`: Cách cấu hình và deploy lên testnet.
- `TESTING.md`: Cách chạy test và checklist demo.
- `LIMITATIONS.md`: Giới hạn hiện tại của phiên bản demo.

## 2. Mục tiêu phiên bản

- Chạy ổn các flow: `deposit`, `withdraw`, `borrow`, `repay`, `liquidate`.
- Hỗ trợ nhiều reserve và tính toán account data theo USD.
- Phù hợp cho demo kỹ thuật trên testnet (không phải bản mainnet production).

## 3. Thành phần chính

- Core contract: `contract/contracts/core/LendingPool.sol`
- Token kế toán:
  - `contract/contracts/tokens/AToken.sol`
  - `contract/contracts/tokens/VariableDebtToken.sol`
- Oracle mock:
  - `contract/contracts/oracle/MockPriceOracle.sol`

## 4. Quick Start

Từ thư mục `contract`:

```bash
npm install
npx hardhat test
```

Deploy testnet: xem `TESTNET_DEPLOY.md`.
