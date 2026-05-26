# Mini Lending Protocol

Mini Lending Protocol là một giao thức lending tối giản theo mô hình Aave, dùng cho demo kỹ thuật và thử nghiệm local/testnet.

## What it does

- `deposit`, `withdraw`, `borrow`, `repay`, `liquidate`
- Quản lý reserve theo `liquidityIndex` và `borrowIndex`
- Tính `health factor` và thanh lý theo giá từ oracle
- Hỗ trợ nhiều reserve với các tham số rủi ro riêng: `ltv`, `liquidationThreshold`, `liquidationBonus`, `reserveFactor`

## Repo layout

- `contract/`: smart contracts, scripts deploy local, và tests Hardhat
- `frontend/`: giao diện React + TypeScript + Vite
- `docs/`: tài liệu nghiệp vụ, API, deploy và testing

## Prerequisites

- Node.js 20+ khuyến nghị
- npm

## Contract quick start

Từ thư mục `contract`:

```bash
npm install
npx hardhat test
```

## Local Hardhat flow

Để frontend đọc được dữ liệu local, cần chạy đúng thứ tự sau:

1. Mở một terminal và chạy Hardhat node:

```bash
cd contract
npx hardhat node
```

2. Mở terminal khác và deploy lên mạng `localhost`:

```bash
cd contract
npm run deploy:local
```

3. Đồng bộ địa chỉ deploy local vào frontend nếu cần:

- `frontend/src/config/contracts.ts`
- `frontend/src/config/deploy_local.txt`

4. Chạy frontend:

```bash
cd frontend
npm install
npm run dev
```

## Local addresses

Sau khi deploy local, các địa chỉ thường được ghi trong:

- `frontend/src/config/deploy_local.txt`

Trong repo hiện tại, frontend mặc định đang trỏ tới `LendingPool` local đã deploy.

## Frontend notes

- Frontend dùng `wagmi` + `viem`
- Network local đang cấu hình cho Hardhat chain (`31337`) với RPC `http://127.0.0.1:8545`
- Nếu chưa chạy `hardhat node`, frontend sẽ không lấy được dữ liệu on-chain

## Documentation

- [docs/README.md](docs/README.md)
- [docs/PROTOCOL.md](docs/PROTOCOL.md)
- [docs/CONTRACT_API.md](docs/CONTRACT_API.md)
- [docs/TESTNET_DEPLOY.md](docs/TESTNET_DEPLOY.md)
- [docs/TESTING.md](docs/TESTING.md)
- [docs/LIMITATIONS.md](docs/LIMITATIONS.md)

## Quick checklist

- `contract` test pass
- `hardhat node` đang chạy
- deploy local bằng `--network localhost`
- frontend trỏ đúng chain và address
- wallet đang ở chain `31337`
