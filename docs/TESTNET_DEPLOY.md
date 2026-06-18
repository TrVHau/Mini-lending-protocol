# Deploy Testnet

_Meta: Mini Lending Protocol / docs/TESTNET_DEPLOY.md_

## 1. Chuẩn bị

Trong thư mục `contract`:

```bash
npm install
```

Cấu hình biến môi trường (ví dụ trong `.env`):

- `PRIVATE_KEY`: ví deploy
- `RPC_URL`: RPC testnet
- `ETHERSCAN_API_KEY` (nếu verify)

Example `.env` (example):

```
PRIVATE_KEY=0x...
RPC_URL=https://sepolia.infura.io/v3/<KEY>
ETHERSCAN_API_KEY=...
```

Đảm bảo tài khoản có đủ native token testnet.

## 2. Compile và test trước deploy

```bash
npx hardhat compile
npx hardhat test
```

## 3. Deploy

Repo hiện tại chỉ có script local `scripts/deploy-local.ts`. Nếu bạn tạo script testnet riêng thì có thể chạy theo mẫu sau:

```bash
npx hardhat run scripts/<your-deploy-script>.ts --network <network>
```

Lệnh local thực tế là:

```bash
npm run deploy:local
```

Lệnh này dùng cho mạng `localhost` sau khi đã chạy `npx hardhat node`.

Sau deploy, lưu lại:

- địa chỉ `MockPriceOracle`
- địa chỉ `LendingPool`
- địa chỉ `DefaultInterestRateStrategy`
- địa chỉ từng `AToken` và `VariableDebtToken`

### Cập nhật frontend cho testnet

Sau khi deploy lên testnet, cập nhật `frontend/src/config/contracts.ts` hoặc `frontend/src/config/deploy_local.txt` (các tên file tương ứng) với địa chỉ mới để UI kết nối đúng mạng.

Nên lưu kèm explorer links và transaction hashes trong một file `deploy_testnet.txt` để dễ verify và chia sẻ.

## 4. Khởi tạo reserve

Gọi `initReserve` cho từng asset muốn demo, với tham số mẫu:

- `interestRateStrategy = <DefaultInterestRateStrategy address>`
- `ltvBps = 8000`
- `liquidationThresholdBps = 8500`
- `liquidationBonusBps = 10500`
- `reserveFactorBps = 1000`

Set giá oracle bằng `setPrice(asset, price)`.

## 5. Verify (khuyến nghị)

```bash
npx hardhat verify --network <network> <contractAddress> <constructorArgs...>
```

## 6. Kịch bản demo tối thiểu

1. User A deposit collateral.
2. User B deposit liquidity.
3. User A borrow.
4. Giảm giá collateral bằng oracle mock.
5. User B liquidate một phần và kiểm tra event/state.
