# Current Limitations (Demo Scope)

_Meta: Mini Lending Protocol / docs/LIMITATIONS.md_

## 1. Phạm vi

Dự án hiện tối ưu cho demo/testnet, chưa phải cấu hình production/mainnet.

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

### Checklist để tiến tới production

- Replace mock oracle with Chainlink/Market oracle(s) + add staleness/fallback logic.
- Add `PAUSE` / `EMERGENCY` roles and tests for pause behavior.
- Introduce reserve-level caps (supply/borrow) and configurable close factor for liquidations.
- Add on-chain metrics emit and off-chain monitoring (alerts on abnormal rates or HF drops).
- Expand tests: property-based/fuzz, invariants, and gas regression tests.
- Independent security review and bug bounty program prior to mainnet deployment.
