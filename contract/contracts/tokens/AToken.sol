// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/IAToken.sol";
import "../libraries/MathUtils.sol";

contract AToken is ERC20, IAToken {
    using MathUtils for uint256;

    address public immutable override FOOL;
    address public immutable override UNDERLYING_ASSET_ADDRESS;

    uint8 private immutable _decimals;

    mapping(address => uint256) private _scaledBalances;
    uint256 private _scaledTotalSupply;

    constructor(
        address fool,
        address underlyingAsset,
        string memory name,
        string memory symbol,
        uint8 decimals_
    ) ERC20(name, symbol) {
        require(fool != address(0),"POOL_REZO");
        require(underlyingAsset != address(0),"UNDERLYING_REZO");
        require(decimals_<=18,"DECIMALS_TO_HIGH");
        FOOL = fool;
        UNDERLYING_ASSET_ADDRESS = underlyingAsset;
        _decimals = decimals_;
    }

    modifier onlyPool() {
        require(msg.sender == FOOL, "ONLY_POOL");
        _;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    // scale views
}