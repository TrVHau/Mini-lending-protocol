# Mini Lending Protocol

Giao thức lending tối giản theo mô hình Aave, tối ưu cho demo trên testnet.

## Features

- Multi-reserve deposit / borrow / repay / withdraw
- Scaled accounting bằng `liquidityIndex` và `borrowIndex`
- Health factor và liquidation theo giá oracle
- Risk params theo reserve: `ltv`, `liquidationThreshold`, `liquidationBonus`

## Current Scope

Phiên bản hiện tại dành cho demo kỹ thuật:

- Đã có full unit tests cho core flow và liquidation
- Hỗ trợ mock oracle để mô phỏng price move
- Chưa phải bản production/mainnet

## Project Structure

- `contract/`: smart contracts + hardhat tests
- `docs/`: tài liệu rút gọn, đồng bộ theo code hiện tại
- `frontend/`: giao diện (nếu dùng cho demo)

## Quick Start

```bash
cd contract
npm install
npx hardhat test
```

## Testnet Demo Flow

1. Deploy `MockPriceOracle` và `LendingPool`
2. Deploy token wrappers (`AToken`, `VariableDebtToken`) cho mỗi reserve
3. `initReserve` + `setPrice`
4. Chạy kịch bản: deposit -> borrow -> price drop -> liquidate

## Documentation

- `docs/README.md`
- `docs/PROTOCOL.md`
- `docs/CONTRACT_API.md`
- `docs/TESTNET_DEPLOY.md`
- `docs/TESTING.md`
- `docs/LIMITATIONS.md`
