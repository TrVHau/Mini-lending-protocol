// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPriceOracle {
    // Get the price of an asset in USD, with 8 decimals (e.g., a price of $1.23 would be returned as 123000000). The asset address is the same as the one used in the lending pool.
    function getAssetPrice(address asset) external view returns (uint256);
    // Get the number of decimals used by the price oracle. This is important for correctly interpreting the price returned by getAssetPrice.
    function PRICE_DECIMALS() external view returns (uint8);
}