// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title ILendingPool
/// @notice External interface for the core lending pool.
interface ILendingPool {
    // -------------------------------------------------------------------------
    // Core User Actions
    // -------------------------------------------------------------------------

    /// @notice Deposits `amount` of `asset` and receives aTokens in return.
    function deposit(address asset, uint256 amount) external;

    /// @notice Withdraws `amount` of `asset` by burning aTokens.
    ///         Health factor must remain >= 1 if the user has outstanding debt.
    ///         Pass `type(uint256).max` to withdraw the full aToken balance.
    function withdraw(address asset, uint256 amount) external;

    /// @notice Borrows `amount` of `asset` against deposited collateral.
    function borrow(address asset, uint256 amount) external;

    /// @notice Repays up to `amount` of debt for `asset`.
    ///         Pass `type(uint256).max` to repay all outstanding debt.
    function repay(address asset, uint256 amount) external;

    /// @notice Liquidates an undercollateralized position.
    /// @param collateralAsset  Asset to receive as bonus collateral.
    /// @param debtAsset        Asset to repay on the user's behalf.
    /// @param user             The borrower whose position is being liquidated.
    /// @param debtToCover      Amount of debt to repay (pass max uint256 to cover all).
    function liquidate(
        address collateralAsset,
        address debtAsset,
        address user,
        uint256 debtToCover
    ) external;

    // -------------------------------------------------------------------------
    // View Functions — User Account Data
    // -------------------------------------------------------------------------

    /// @notice Returns the current health factor for `user` in WAD (1e18).
    ///         Returns `type(uint256).max` when the user has no debt.
    function getHealthFactor(address user) external view returns (uint256);

    /// @notice Returns aggregated USD account data for `user` (all values in WAD).
    function getUserAccountData(address user) external view returns (
        uint256 collateralUsdWad,
        uint256 debtUsdWad,
        uint256 maxBorrowUsdWad,
        uint256 healthFactorWad
    );
}
