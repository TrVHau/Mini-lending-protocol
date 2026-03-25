// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IVariableDebtToken {
    function POOL() external view returns (address);

    function UNDERLYING_ASSET() external view returns (address);

    function decimals() external view returns (uint8);

    // Scaled accounting functions
    function scaledBalanceOf(address user) external view returns (uint256);

    function scaledTotalSupply() external view returns (uint256);

    // Nominal views — pool provides the current borrow index (distinct from liquidity index)
    function balanceOfWithIndex(address user, uint256 borrowIndexRay) external view returns (uint256);
    function totalSupplyWithIndex(uint256 borrowIndexRay) external view returns (uint256);

    // Pool-only functions — return the scaled amount stored
    function mint(address user, uint256 amount, uint256 borrowIndexRay) external returns (uint256 scaledAmount);
    function burn(address user, uint256 amount, uint256 borrowIndexRay) external returns (uint256 scaledAmount);
}