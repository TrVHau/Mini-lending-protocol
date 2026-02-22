// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IPriceOracle {
    // Get the price of an asset in USD, with 18 decimals. For example, if the price of the asset is $1.23, this function should return 1230000000000000000 (1.23 * 10^18).
    function getAssetPrice(address asset) external view returns (uint256);
    // Get the number of decimals used by the price oracle. This is important for correctly interpreting the price returned by getAssetPrice.
    function PRICE_DECIMALS() external view returns (uint8);
}