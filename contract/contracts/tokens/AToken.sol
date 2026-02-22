// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
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

    function decimals() public view override(ERC20,IAToken) returns (uint8) {
        return _decimals;
    }

    // scale views
    function scaledBalanceOf(address user) public view override returns (uint256) {
        return _scaledBalances[user];
    }

    function scaledTotalSupply() public view override returns (uint256) {
        return _scaledTotalSupply;
    }

    // convenience views
    function balanceOfWithIndex(address user, uint256 liquidityIndexRay) public view override returns (uint256) {
        return _scaledBalances[user].mulRayDown(liquidityIndexRay);
    }

    function totalSupplyWithIndex(uint256 liquidityIndexRay) public view override returns (uint256) {
        return _scaledTotalSupply.mulRayDown(liquidityIndexRay);
    }

    // Pool-only state mutating functions
    function mint(address user, uint256 amount, uint256 liquidityIndexRay) external override onlyPool returns (bool) {
        require(amount > 0, "INVALID_AMOUNT");
        uint256 scaledAmount = amount.divRayDown(liquidityIndexRay);
        _scaledBalances[user] += scaledAmount;
        _scaledTotalSupply += scaledAmount;
        return true;
    }

    function burn(address user, uint256 amount, uint256 liquidityIndexRay) external override onlyPool returns (bool) {
        require(amount > 0, "INVALID_AMOUNT");
        uint256 scaledAmount = amount.divRayDown(liquidityIndexRay);
        require(_scaledBalances[user] >= scaledAmount, "BURN_EXCEEDS_BALANCE");
        _scaledBalances[user] -= scaledAmount;
        _scaledTotalSupply -= scaledAmount;
        return true;
    }
}