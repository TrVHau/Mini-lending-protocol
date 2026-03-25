// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IAToken {
    function POOL() external view returns (address);

    function UNDERLYING_ASSET() external view returns (address);

    function decimals() external view returns (uint8);

    // Scaled accounting functions
    function scaledBalanceOf(address user) external view returns (uint256);

    function scaledTotalSupply() external view returns (uint256);

    // convenience view (pool provides current index)
    function balanceOfWithIndex(address user, uint256 liquidityIndexRay) external view returns (uint256);
    function totalSupplyWithIndex(uint256 liquidityIndexRay) external view returns (uint256);

    function transferUnderlyingTo(address to, uint256 amount) external;

    // Pool-only functions — return the scaled amount stored
    function mint(address user, uint256 amount, uint256 liquidityIndexRay) external returns (uint256 scaledAmount);
    function burn(address user, uint256 amount, uint256 liquidityIndexRay) external returns (uint256 scaledAmount);
}
