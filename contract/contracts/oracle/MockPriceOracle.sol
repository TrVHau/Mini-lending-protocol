// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MockPriceOracle is Ownable {
    uint8 public constant decimals = 8;

    mapping(address => uint256) public prices; // asset => price (USD,1e8)

    event PriceUpdated(address indexed asset, uint256 price);

    constructor(address owner_) Ownable(owner_) {}
    function setPrice(address asset, uint256 price) external onlyOwner {
        require(asset != address(0),"ASSET_REZO");
        require(price>0,"PRICE_REZO");
        prices[asset] = price;
        emit PriceUpdated(asset, price);
    }

    function getPrice(address asset) external view returns (uint256) {
        uint256 price = prices[asset];
        require(price > 0, "PRICE_NOT_SET");
        return price;
    }
}