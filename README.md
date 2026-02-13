# Mini-Lending-Protocol

A simplified decentralized lending protocol inspired by Aave.

This project implements:

- Multi-asset deposits
- Borrowing against collateral
- Index-based interest accrual
- Health factor calculation
- Liquidation mechanism
- Price oracle integration
- Risk parameter management

## Core Concepts

- Depositors receive aToken representing their share.
- Borrowers receive debt tracked via variable debt tokens.
- Interest accrues using index-based accounting.
- Positions become liquidatable if health factor < 1.

## Why This Project?

This project demonstrates:

- DeFi accounting models
- Precision math handling (WAD/RAY)
- Risk management logic
- Economic security design
- Invariant-driven testing

## Architecture Overview

LendingPool → Core logic  
AToken → Deposit receipt token  
VariableDebtToken → Borrow tracking  
PriceOracle → Asset pricing  
InterestRateModel → Utilization-based rate model

See ARCHITECTURE.md for full details.

