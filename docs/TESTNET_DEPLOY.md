# Deploy Testnet

## 1. Chuẩn bị

Trong thư mục `contract`:

```bash
npm install
```

Cấu hình biến môi trường (ví dụ trong `.env`):

- `PRIVATE_KEY`: ví deploy
- `RPC_URL`: RPC testnet
- `ETHERSCAN_API_KEY` (nếu verify)

Đảm bảo tài khoản có đủ native token testnet.

## 2. Compile và test trước deploy

```bash
npx hardhat compile
npx hardhat test
```

## 3. Deploy

Dùng script deploy của dự án (nếu đã có), ví dụ:

```bash
npx hardhat run scripts/deploy.ts --network <network>
```

Sau deploy, lưu lại:

- địa chỉ `MockPriceOracle`
- địa chỉ `LendingPool`
- địa chỉ từng `AToken` và `VariableDebtToken`

## 4. Khởi tạo reserve

Gọi `initReserve` cho từng asset muốn demo, với tham số mẫu:

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
