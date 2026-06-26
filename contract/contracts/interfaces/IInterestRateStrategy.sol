// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IInterestRateStrategy
/// @notice Interface for pluggable interest rate models.
///         All rate values are per-second in RAY (1e27) precision.
interface IInterestRateStrategy {
    /// @notice Computes the current liquidity and borrow rates based on utilization.
    /// @param availableLiquidity  Underlying tokens currently sitting in the aToken (not borrowed).
    /// @param totalDebt           Total outstanding debt denominated in the underlying token.
    /// @param reserveFactorBps    Reserve factor in basis points (e.g. 1000 = 10%).
    /// @return liquidityRateRayPerSecond  Per-second supply rate in RAY.
    /// @return borrowRateRayPerSecond     Per-second borrow rate in RAY.
    function calculateInterestRates(
        uint256 availableLiquidity,
        uint256 totalDebt,
        uint16 reserveFactorBps
    ) external view returns (
        uint256 liquidityRateRayPerSecond,
        uint256 borrowRateRayPerSecond
    );
}
