// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../interfaces/IAToken.sol";
import "../libraries/MathUtils.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @title AToken
/// @notice Accounting-layer receipt token. Balances are stored scaled by the
///         liquidity index so they accrue interest passively without any
///         state writes. There is intentionally no ERC-20 transfer surface
///         (MVP: only the pool may mint/burn).
contract AToken is IAToken {
    using SafeERC20 for IERC20;
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

    // saveTransfer
    function transferUnderlyingTo(address to, uint256 amount) external override onlyPool {
        IERC20(UNDERLYING_ASSET).safeTransfer(to, amount);
    }

    // Pool-only state mutating functions
    function mint(address user, uint256 amount, uint256 liquidityIndexRay) external override onlyPool returns (uint256 scaledAmount) {
        require(user != address(0), "USER_ZERO");
        require(amount > 0, "INVALID_AMOUNT");
        require(liquidityIndexRay >= RAY, "INDEX_TOO_LOW");
        scaledAmount = amount.divRayDown(liquidityIndexRay);
        _scaledBalances[user] += scaledAmount;
        _scaledTotalSupply += scaledAmount;
    }

    function burn(address user, uint256 amount, uint256 liquidityIndexRay) external override onlyPool returns (uint256 scaledAmount) {
        require(user != address(0), "USER_ZERO");
        require(amount > 0, "INVALID_AMOUNT");
        require(liquidityIndexRay >= RAY, "INDEX_TOO_LOW");
        scaledAmount = amount.divRayDown(liquidityIndexRay);
        require(_scaledBalances[user] >= scaledAmount, "BURN_EXCEEDS_BALANCE");
        _scaledBalances[user] -= scaledAmount;
        _scaledTotalSupply -= scaledAmount;
    }
}
