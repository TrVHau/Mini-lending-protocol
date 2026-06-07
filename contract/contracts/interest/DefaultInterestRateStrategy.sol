// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IInterestRateStrategy.sol";
import "../libraries/MathUtils.sol";

/// @title DefaultInterestRateStrategy
/// @notice Two-slope (jump-rate) interest rate model, inspired by Aave v2.
///
///         Below optimal utilization:
///           borrowRate = baseRate + slope1 * (U / Uopt)
///
///         Above optimal utilization:
///           borrowRate = baseRate + slope1 + slope2 * ((U - Uopt) / (1 - Uopt))
///
///         Supply rate = borrowRate * U * (1 - reserveFactor)
///
///         Constructor inputs use annual WAD (1e18) for rates and RAY (1e27) for
///         optimal utilization. Returned rates are per-second in RAY, ready to be
///         applied directly to reserve indexes.
contract DefaultInterestRateStrategy is IInterestRateStrategy {
    using MathUtils for uint256;

    uint256 internal constant RAY = 1e27;

    /// @notice Base borrow rate per year (WAD, e.g. 1e16 = 1%)
    uint256 public immutable baseRateWad;
    /// @notice Slope below optimal utilization per year (WAD)
    uint256 public immutable slope1Wad;
    /// @notice Slope above optimal utilization per year (WAD, typically very steep)
    uint256 public immutable slope2Wad;
    /// @notice Optimal utilization ratio (RAY, e.g. 8e26 = 80%)
    uint256 public immutable optimalUtilizationRay;

    constructor(
        uint256 baseRateWad_,
        uint256 slope1Wad_,
        uint256 slope2Wad_,
        uint256 optimalUtilizationRay_
    ) {
        require(optimalUtilizationRay_ > 0 && optimalUtilizationRay_ < RAY, "BAD_OPTIMAL_UTILIZATION");
        baseRateWad = baseRateWad_;
        slope1Wad = slope1Wad_;
        slope2Wad = slope2Wad_;
        optimalUtilizationRay = optimalUtilizationRay_;
    }

    /// @inheritdoc IInterestRateStrategy
    function calculateInterestRates(
        uint256 availableLiquidity,
        uint256 totalDebt,
        uint16 reserveFactorBps
    ) external view override returns (
        uint256 liquidityRateRayPerSecond,
        uint256 borrowRateRayPerSecond
    ) {
        require(reserveFactorBps <= 10_000, "BAD_RESERVE_FACTOR");

        uint256 utilizationRay = _utilizationRay(availableLiquidity, totalDebt);
        uint256 borrowRateAnnualWad = _borrowRateAnnualWad(utilizationRay);

        // liquidityRate = borrowRate * utilization * (1 - reserveFactor)
        uint256 liquidityRateAnnualWad = MathUtils
            .mulDivDown(borrowRateAnnualWad, utilizationRay, RAY)
            .mulBpsDown(10_000 - reserveFactorBps);

        borrowRateRayPerSecond = borrowRateAnnualWad.annualWadToPerSecondRay();
        liquidityRateRayPerSecond = liquidityRateAnnualWad.annualWadToPerSecondRay();
    }

    // -------------------------------------------------------------------------
    // Internal Helpers
    // -------------------------------------------------------------------------

    /// @dev Computes utilization as totalDebt / (availableLiquidity + totalDebt) in RAY.
    function _utilizationRay(uint256 availableLiquidity, uint256 totalDebt)
        internal
        pure
        returns (uint256)
    {
        if (totalDebt == 0) return 0;
        return totalDebt.divRayDown(availableLiquidity + totalDebt);
    }

    /// @dev Computes annual borrow rate in WAD based on current utilization.
    function _borrowRateAnnualWad(uint256 utilizationRay) internal view returns (uint256) {
        if (utilizationRay <= optimalUtilizationRay) {
            // Linear segment: baseRate + slope1 * (U / Uopt)
            return baseRateWad + MathUtils.mulDivDown(slope1Wad, utilizationRay, optimalUtilizationRay);
        }

        // Jump segment: baseRate + slope1 + slope2 * ((U - Uopt) / (1 - Uopt))
        uint256 excess = utilizationRay - optimalUtilizationRay;
        uint256 excessRatio = excess.divRayDown(RAY - optimalUtilizationRay);
        return baseRateWad + slope1Wad + MathUtils.mulDivDown(slope2Wad, excessRatio, RAY);
    }
}
