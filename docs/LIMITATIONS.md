# Current Limitations (Demo Scope)

## 1. Phạm vi

Dự án hiện tối ưu cho demo testnet, chưa phải cấu hình production/mainnet.

## 2. Giới hạn kỹ thuật

- Oracle đang dùng mock; chưa có cơ chế staleness/fallback.
- Chưa có pause guardian / emergency shutdown.
- Chưa có borrow cap và supply cap theo reserve.
- Chưa có close factor động cho liquidation.
- Chưa có quy trình governance nâng cấp tham số risk.

## 3. Khuyến nghị nếu muốn lên production

- Tích hợp oracle production-grade.
- Bổ sung circuit breaker và role tách biệt.
- Audit bảo mật độc lập.
- Bổ sung invariant/fuzz test và monitoring on-chain.
