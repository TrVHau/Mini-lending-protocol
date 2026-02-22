// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IVariableDebtToken.sol";
import "../libraries/MathUtils.sol";

/// @title VariableDebtToken
/// @notice Accounting-layer debt token. Balances are stored scaled by the
///         borrow index so outstanding debt accrues interest passively
///         without state writes. No ERC-20 transfer surface (MVP).
contract VariableDebtToken is IVariableDebtToken {
    using MathUtils for uint256;

    uint256 private constant RAY = 1e27;

    address public immutable override POOL;
    address public immutable override UNDERLYING_ASSET;

    uint8 private immutable _decimals;

    mapping(address => uint256) private _scaledBalances;
    uint256 private _scaledTotalSupply;

    constructor(
        address pool,
        address underlyingAsset,
        uint8 decimals_
    ) {
        require(pool != address(0), "POOL_ZERO");
        require(underlyingAsset != address(0), "UNDERLYING_ZERO");
        require(decimals_ <= 18, "DECIMALS_TOO_HIGH");
        POOL = pool;
        UNDERLYING_ASSET = underlyingAsset;
        _decimals = decimals_;
    }

    modifier onlyPool() {
        require(msg.sender == POOL, "ONLY_POOL");
        _;
    }

    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    // Scaled views
    function scaledBalanceOf(address user) public view override returns (uint256) {
        return _scaledBalances[user];
    }

    function scaledTotalSupply() public view override returns (uint256) {
        return _scaledTotalSupply;
    }

    // Nominal views — pool passes the current borrow index
    function balanceOfWithIndex(address user, uint256 borrowIndexRay) public view override returns (uint256) {
        return _scaledBalances[user].mulRayDown(borrowIndexRay);
    }

    function totalSupplyWithIndex(uint256 borrowIndexRay) public view override returns (uint256) {
        return _scaledTotalSupply.mulRayDown(borrowIndexRay);
    }

    // Pool-only state mutating functions — return the scaled amount written
    function mint(address user, uint256 amount, uint256 borrowIndexRay) external override onlyPool returns (uint256 scaledAmount) {
        require(user != address(0), "USER_ZERO");
        require(amount > 0, "INVALID_AMOUNT");
        require(borrowIndexRay >= RAY, "INDEX_TOO_LOW");
        scaledAmount = amount.divRayDown(borrowIndexRay);
        _scaledBalances[user] += scaledAmount;
        _scaledTotalSupply += scaledAmount;
    }

    function burn(address user, uint256 amount, uint256 borrowIndexRay) external override onlyPool returns (uint256 scaledAmount) {
        require(user != address(0), "USER_ZERO");
        require(amount > 0, "INVALID_AMOUNT");
        require(borrowIndexRay >= RAY, "INDEX_TOO_LOW");
        scaledAmount = amount.divRayDown(borrowIndexRay);
        require(_scaledBalances[user] >= scaledAmount, "BURN_EXCEEDS_BALANCE");
        _scaledBalances[user] -= scaledAmount;
        _scaledTotalSupply -= scaledAmount;
    }
}
