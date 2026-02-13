# Threat Model

## 1. Oracle Manipulation

Risk:
Fake price lowers HF artificially.

Mitigation:

- Use reliable oracle
- Add price staleness checks

---

## 2. Precision Drift

Risk:
Rounding errors accumulate.

Mitigation:

- Use RAY math
- Avoid division before multiplication

---

## 3. Bad Debt

Risk:
Collateral drops too fast.

Mitigation:

- Conservative LTV
- Liquidation incentive

---

## 4. Reentrancy

Risk:
External token callbacks.

Mitigation:

- ReentrancyGuard
- Checks-effects-interactions
