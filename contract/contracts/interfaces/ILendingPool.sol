// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ILendingPool {
    // user actions
    function deposit(address asset, uint256 amount) external;
    function withdraw(address asset, uint256 amount) external;
    function borrow(address asset, uint256 amount) external;
    function repay(address asset, uint256 amount) external;

    // view functions for user account data
    function getHealthFactor(address user) external view returns (uint256);
    function getUserAccountData(address user) external view returns (
        uint256 collateralUsdWad,
            uint256 debtUsdWad,
            uint256 maxBorrowUsdWad,
            uint256 healthFactorWad
    );
}