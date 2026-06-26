// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IAToken.sol";
import "../interfaces/ILendingPool.sol";
import "../interfaces/IInterestRateStrategy.sol";
import "../interfaces/IPriceOracle.sol";
import "../interfaces/IVariableDebtToken.sol";
import "../libraries/MathUtils.sol";

/// @title LendingPool
/// @notice Core lending/borrowing engine. Inspired by Aave v2's architecture.
///         Supports multiple reserves, each with independent risk parameters and
///         a pluggable interest-rate strategy. All index math uses RAY (1e27)
///         precision; USD values use WAD (1e18) precision.
contract LendingPool is ILendingPool, Ownable {
    using MathUtils for uint256;
    using SafeERC20 for IERC20;

    // -------------------------------------------------------------------------
    // Constants
    // -------------------------------------------------------------------------

    uint256 internal constant RAY = 1e27;
    uint256 internal constant WAD = 1e18;

    // -------------------------------------------------------------------------
    // Data Structures
    // -------------------------------------------------------------------------

    struct ReserveData {
        // Token addresses
        IAToken aToken;
        IVariableDebtToken variableDebtToken;
        // Interest rate strategy
        IInterestRateStrategy interestRateStrategy;
        // Asset configuration
        uint8 assetDecimals;
        // Indexes — stored as of `lastUpdateTimestamp`, not live
        uint256 liquidityIndexRay;
        uint256 borrowIndexRay;
        // Current per-second rates in RAY (updated on every state change)
        uint256 liquidityRateRayPerSecond;
        uint256 borrowRateRayPerSecond;
        // Last time indexes were accrued
        uint40 lastUpdateTimestamp;
        // State flags
        bool isActive;
        bool isFrozen;
        // Risk parameters (in basis points, 10_000 = 100%)
        uint16 ltvBps;
        uint16 liquidationThresholdBps;
        uint16 liquidationBonusBps;
        uint16 reserveFactorBps;
    }

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    address[] private _reserveList;
    mapping(address => ReserveData) private _reserves;
    IPriceOracle public immutable priceOracle;

    // -------------------------------------------------------------------------
    // Events
    // -------------------------------------------------------------------------

    event Deposit(address indexed user, address indexed asset, uint256 amount);
    event Withdraw(address indexed user, address indexed asset, uint256 amount);
    event Borrow(address indexed user, address indexed asset, uint256 amount);
    event Repay(address indexed user, address indexed asset, uint256 amount);
    event ReserveInitialized(
        address indexed asset,
        address indexed aToken,
        address indexed debtToken,
        address interestRateStrategy
    );
    event ReserveUpdated(
        address indexed asset,
        uint256 liquidityIndexRay,
        uint256 borrowIndexRay,
        uint256 liquidityRateRayPerSecond,
        uint256 borrowRateRayPerSecond,
        uint40 timestamp
    );
    event Liquidation(
        address indexed liquidator,
        address indexed user,
        address indexed collateralAsset,
        address debtAsset,
        uint256 debtCovered,
        uint256 collateralSeized
    );

    // -------------------------------------------------------------------------
    // Constructor
    // -------------------------------------------------------------------------

    constructor(address oracle, address owner_) Ownable(owner_) {
        require(oracle != address(0), "ORACLE_ZERO");
        priceOracle = IPriceOracle(oracle);
    }

    // -------------------------------------------------------------------------
    // Admin
    // -------------------------------------------------------------------------

    /// @notice Registers a new reserve with its tokens, strategy, and risk params.
    ///         Can only be called by the owner and only once per asset.
    function initReserve(
        address asset,
        address aToken,
        address debtToken,
        address interestRateStrategy,
        uint8 assetDecimals,
        uint16 ltvBps,
        uint16 liquidationThresholdBps,
        uint16 liquidationBonusBps,
        uint16 reserveFactorBps
    ) external onlyOwner {
        require(asset != address(0), "ASSET_ZERO");
        require(aToken != address(0), "ATOKEN_ZERO");
        require(debtToken != address(0), "DEBT_TOKEN_ZERO");
        require(interestRateStrategy != address(0), "STRATEGY_ZERO");
        require(assetDecimals <= 18, "DECIMALS_TOO_HIGH");
        require(liquidationThresholdBps <= 10_000, "BAD_LIQ_THRESHOLD");
        require(ltvBps <= liquidationThresholdBps, "BAD_LTV");
        require(liquidationBonusBps >= 10_000, "BAD_LIQ_BONUS");
        require(liquidationBonusBps <= 12_000, "BAD_LIQ_BONUS");
        require(reserveFactorBps <= 10_000, "BAD_RESERVE_FACTOR");

        ReserveData storage r = _reserves[asset];
        require(address(r.aToken) == address(0), "RESERVE_EXISTS");

        r.aToken = IAToken(aToken);
        r.variableDebtToken = IVariableDebtToken(debtToken);
        r.interestRateStrategy = IInterestRateStrategy(interestRateStrategy);
        r.assetDecimals = assetDecimals;
        r.liquidityIndexRay = RAY;
        r.borrowIndexRay = RAY;
        r.liquidityRateRayPerSecond = 0;
        r.borrowRateRayPerSecond = 0;
        r.lastUpdateTimestamp = uint40(block.timestamp);
        r.isActive = true;
        r.isFrozen = false;
        r.ltvBps = ltvBps;
        r.liquidationThresholdBps = liquidationThresholdBps;
        r.liquidationBonusBps = liquidationBonusBps;
        r.reserveFactorBps = reserveFactorBps;

        _reserveList.push(asset);
        emit ReserveInitialized(asset, aToken, debtToken, interestRateStrategy);
    }

    // -------------------------------------------------------------------------
    // Core User Actions
    // -------------------------------------------------------------------------

    /// @inheritdoc ILendingPool
    function deposit(address asset, uint256 amount) external override {
        require(amount > 0, "INVALID_AMOUNT");
        ReserveData storage r = _reserves[asset];
        require(address(r.aToken) != address(0), "RESERVE_NOT_FOUND");
        require(r.isActive, "RESERVE_INACTIVE");
        require(!r.isFrozen, "RESERVE_FROZEN");

        _updateReserve(asset);

        IERC20(asset).safeTransferFrom(msg.sender, address(r.aToken), amount);
        uint256 scaledAmount = r.aToken.mint(msg.sender, amount, r.liquidityIndexRay);
        require(scaledAmount > 0, "MINT_FAILED");

        _updateInterestRates(asset, r);
        emit Deposit(msg.sender, asset, amount);
    }

    /// @inheritdoc ILendingPool
    /// @dev Passing `type(uint256).max` as `amount` withdraws the full aToken balance.
    function withdraw(address asset, uint256 amount) external override {
        require(amount > 0, "INVALID_AMOUNT");
        ReserveData storage r = _reserves[asset];
        require(address(r.aToken) != address(0), "RESERVE_NOT_FOUND");
        require(r.isActive, "RESERVE_INACTIVE");

        _updateReserve(asset);

        if (amount == type(uint256).max) {
            amount = r.aToken.balanceOfWithIndex(msg.sender, r.liquidityIndexRay);
        }
        require(amount > 0, "INVALID_AMOUNT");

        uint256 scaledAmount = r.aToken.burn(msg.sender, amount, r.liquidityIndexRay);
        require(scaledAmount > 0, "BURN_FAILED");

        // Health check: if user has outstanding debt, ensure HF stays >= 1 after withdrawal
        (, uint256 debtUsdWad, , uint256 liqThresholdUsdWad) = _computeUserAccountData(msg.sender);
        if (debtUsdWad > 0) {
            require(
                liqThresholdUsdWad.divWadDown(debtUsdWad) >= WAD,
                "HEALTH_FACTOR_TOO_LOW"
            );
        }

        r.aToken.transferUnderlyingTo(msg.sender, amount);
        _updateInterestRates(asset, r);
        emit Withdraw(msg.sender, asset, amount);
    }

    /// @inheritdoc ILendingPool
    function borrow(address asset, uint256 amount) external override {
        require(amount > 0, "INVALID_AMOUNT");
        ReserveData storage r = _reserves[asset];
        require(address(r.aToken) != address(0), "RESERVE_NOT_FOUND");
        require(r.isActive, "RESERVE_INACTIVE");
        require(!r.isFrozen, "RESERVE_FROZEN");

        _updateReserve(asset);

        uint256 availableLiquidity = IERC20(asset).balanceOf(address(r.aToken));
        require(availableLiquidity >= amount, "INSUFFICIENT_LIQUIDITY");

        (, uint256 debtUsdWad, uint256 maxBorrowUsdWad, ) = _computeUserAccountData(msg.sender);
        uint256 borrowUsdWad = _assetToUsdWad(asset, amount);
        require(debtUsdWad + borrowUsdWad <= maxBorrowUsdWad, "INSUFFICIENT_COLLATERAL");

        uint256 scaledAmount = r.variableDebtToken.mint(msg.sender, amount, r.borrowIndexRay);
        require(scaledAmount > 0, "MINT_FAILED");

        r.aToken.transferUnderlyingTo(msg.sender, amount);
        _updateInterestRates(asset, r);
        emit Borrow(msg.sender, asset, amount);
    }

    /// @inheritdoc ILendingPool
    /// @dev Passing `type(uint256).max` as `amount` repays all outstanding debt.
    function repay(address asset, uint256 amount) external override {
        require(amount > 0, "INVALID_AMOUNT");
        ReserveData storage r = _reserves[asset];
        require(address(r.aToken) != address(0), "RESERVE_NOT_FOUND");
        require(r.isActive, "RESERVE_INACTIVE");

        _updateReserve(asset);

        uint256 debt = r.variableDebtToken.balanceOfWithIndex(msg.sender, r.borrowIndexRay);
        require(debt > 0, "NO_DEBT");

        // Cap payback to actual debt (also handles uint256.max safely)
        uint256 payback = amount >= debt ? debt : amount;

        uint256 burnedScaled = r.variableDebtToken.burn(msg.sender, payback, r.borrowIndexRay);
        require(burnedScaled > 0, "BURN_FAILED");

        IERC20(asset).safeTransferFrom(msg.sender, address(r.aToken), payback);
        _updateInterestRates(asset, r);
        emit Repay(msg.sender, asset, payback);
    }

    /// @inheritdoc ILendingPool
    function liquidate(
        address collateralAsset,
        address debtAsset,
        address user,
        uint256 debtToCover
    ) external override {
        require(debtToCover > 0, "INVALID_AMOUNT");
        require(user != address(0), "USER_ZERO");

        _validateAndUpdateLiquidation(collateralAsset, debtAsset, user);

        ReserveData storage col = _reserves[collateralAsset];
        ReserveData storage dbt = _reserves[debtAsset];

        (uint256 debtCovered, uint256 collateralToSeize) =
            _computeLiquidationAmounts(collateralAsset, debtAsset, user, debtToCover, col, dbt);

        require(debtCovered > 0, "INVALID_AMOUNT");

        // Transfer debt from liquidator → debt reserve, then burn both tokens
        IERC20(debtAsset).safeTransferFrom(msg.sender, address(dbt.aToken), debtCovered);
        require(dbt.variableDebtToken.burn(user, debtCovered, dbt.borrowIndexRay) > 0, "BURN_FAILED");
        require(col.aToken.burn(user, collateralToSeize, col.liquidityIndexRay) > 0, "BURN_FAILED");

        // Transfer seized collateral to liquidator
        col.aToken.transferUnderlyingTo(msg.sender, collateralToSeize);

        // Refresh rates on both reserves
        _updateInterestRates(debtAsset, dbt);
        if (debtAsset != collateralAsset) {
            _updateInterestRates(collateralAsset, col);
        }

        emit Liquidation(msg.sender, user, collateralAsset, debtAsset, debtCovered, collateralToSeize);
    }

    /// @dev Validates reserves and health factor, then accrues indexes.
    function _validateAndUpdateLiquidation(
        address collateralAsset,
        address debtAsset,
        address user
    ) private {
        ReserveData storage col = _reserves[collateralAsset];
        ReserveData storage dbt = _reserves[debtAsset];
        require(address(col.aToken) != address(0), "COLLATERAL_RESERVE_NOT_FOUND");
        require(address(dbt.aToken) != address(0), "DEBT_RESERVE_NOT_FOUND");
        require(col.isActive && dbt.isActive, "RESERVE_INACTIVE");
        // NOTE: Liquidation must work even on frozen reserves to maintain protocol solvency.
        // isFrozen only blocks new deposits/borrows, not liquidations.

        _updateReserve(collateralAsset);
        if (debtAsset != collateralAsset) _updateReserve(debtAsset);

        (, uint256 debtUsdWad, , uint256 liqThresholdUsdWad) = _computeUserAccountData(user);
        require(debtUsdWad > 0, "NO_DEBT");
        require(liqThresholdUsdWad.divWadDown(debtUsdWad) < WAD, "HEALTHY_POSITION");
    }

    /// @dev Computes the actual debt covered and collateral seized amounts,
    ///      capping both to available balances.
    function _computeLiquidationAmounts(
        address collateralAsset,
        address debtAsset,
        address user,
        uint256 debtToCover,
        ReserveData storage col,
        ReserveData storage dbt
    ) private view returns (uint256 debtCovered, uint256 collateralToSeize) {
        uint256 userDebt = dbt.variableDebtToken.balanceOfWithIndex(user, dbt.borrowIndexRay);
        debtCovered = debtToCover >= userDebt ? userDebt : debtToCover;

        uint256 userCollateral = col.aToken.balanceOfWithIndex(user, col.liquidityIndexRay);
        require(userCollateral > 0, "NO_COLLATERAL");

        collateralToSeize = _usdWadToAssetAmount(
            collateralAsset,
            _assetToUsdWad(debtAsset, debtCovered).mulBpsDown(col.liquidationBonusBps)
        );

        if (collateralToSeize > userCollateral) {
            collateralToSeize = userCollateral;
            debtCovered = _usdWadToAssetAmount(
                debtAsset,
                _assetToUsdWad(collateralAsset, collateralToSeize).divBpsDown(col.liquidationBonusBps)
            );
        }
    }

    // -------------------------------------------------------------------------
    // View Functions — Reserve Data
    // -------------------------------------------------------------------------

    /// @notice Returns full reserve configuration and **live** (current-block) indexes.
    function getReserveData(address asset) external view returns (
        address aToken,
        address debtToken,
        uint8 assetDecimals,
        bool isActive,
        bool isFrozen,
        uint16 ltvBps,
        uint16 liquidationThresholdBps,
        uint16 liquidationBonusBps,
        uint16 reserveFactorBps,
        uint256 liquidityIndexRay,
        uint256 borrowIndexRay,
        uint40 lastUpdateTimestamp
    ) {
        ReserveData storage r = _reserves[asset];
        return (
            address(r.aToken),
            address(r.variableDebtToken),
            r.assetDecimals,
            r.isActive,
            r.isFrozen,
            r.ltvBps,
            r.liquidationThresholdBps,
            r.liquidationBonusBps,
            r.reserveFactorBps,
            _currentLiquidityIndex(r),
            _currentBorrowIndex(r),
            r.lastUpdateTimestamp
        );
    }

    /// @notice Returns the current per-second interest rates for a reserve.
    function getReserveRates(address asset) external view returns (
        uint256 liquidityRateRayPerSecond,
        uint256 borrowRateRayPerSecond
    ) {
        ReserveData storage r = _reserves[asset];
        return (r.liquidityRateRayPerSecond, r.borrowRateRayPerSecond);
    }

    /// @notice Returns the interest rate strategy contract for a reserve.
    function getReserveInterestRateStrategy(address asset) external view returns (address) {
        return address(_reserves[asset].interestRateStrategy);
    }

    /// @notice Returns the list of all initialized reserve asset addresses.
    function getReserveList() external view returns (address[] memory) {
        return _reserveList;
    }

    /// @notice Returns the number of initialized reserves.
    function getReserveCount() external view returns (uint256) {
        return _reserveList.length;
    }

    /// @notice Returns the asset address at a given index in the reserve list.
    function getReserveAt(uint256 index) external view returns (address) {
        return _reserveList[index];
    }

    // -------------------------------------------------------------------------
    // View Functions — User Account Data
    // -------------------------------------------------------------------------

    /// @inheritdoc ILendingPool
    function getHealthFactor(address user) external view override returns (uint256) {
        (, uint256 debtUsdWad, , uint256 liqThresholdUsdWad) = _computeUserAccountData(user);
        if (debtUsdWad == 0) return type(uint256).max;
        return liqThresholdUsdWad.divWadDown(debtUsdWad);
    }

    /// @inheritdoc ILendingPool
    function getUserAccountData(address user) external view override returns (
        uint256 collateralUsdWad,
        uint256 debtUsdWad,
        uint256 maxBorrowUsdWad,
        uint256 healthFactorWad
    ) {
        uint256 liqThresholdUsdWad;
        (collateralUsdWad, debtUsdWad, maxBorrowUsdWad, liqThresholdUsdWad) =
            _computeUserAccountData(user);

        healthFactorWad = debtUsdWad == 0
            ? type(uint256).max
            : liqThresholdUsdWad.divWadDown(debtUsdWad);
    }

    /// @notice Returns a user's collateral and debt amounts for a specific reserve.
    function getUserReserveData(address user, address asset) external view returns (
        uint256 collateralAmount,
        uint256 debtAmount,
        uint256 collateralUsdWad,
        uint256 debtUsdWad
    ) {
        ReserveData storage r = _reserves[asset];
        require(address(r.aToken) != address(0), "RESERVE_NOT_FOUND");

        uint256 liveLiquidityIndex = _currentLiquidityIndex(r);
        uint256 liveBorrowIndex = _currentBorrowIndex(r);

        collateralAmount = r.aToken.balanceOfWithIndex(user, liveLiquidityIndex);
        debtAmount = r.variableDebtToken.balanceOfWithIndex(user, liveBorrowIndex);

        collateralUsdWad = collateralAmount > 0 ? _assetToUsdWad(asset, collateralAmount) : 0;
        debtUsdWad = debtAmount > 0 ? _assetToUsdWad(asset, debtAmount) : 0;
    }

    // -------------------------------------------------------------------------
    // Internal — Reserve Index Management
    // -------------------------------------------------------------------------

    /// @dev Accrues index interest up to the current block and updates storage.
    ///      Must be called at the start of every state-changing function.
    function _updateReserve(address asset) internal {
        ReserveData storage r = _reserves[asset];

        uint40 currentTimestamp = uint40(block.timestamp);
        uint256 dt = uint256(currentTimestamp) - uint256(r.lastUpdateTimestamp);
        if (dt == 0) return;

        r.liquidityIndexRay = _currentLiquidityIndex(r);
        r.borrowIndexRay = _currentBorrowIndex(r);
        r.lastUpdateTimestamp = currentTimestamp;
    }

    // -------------------------------------------------------------------------
    // Internal — Interest Rate Updates
    // -------------------------------------------------------------------------

    /// @dev Recalculates interest rates based on current utilization, stores them,
    ///      and emits the ReserveUpdated event with the new rates.
    ///      Must be called after every action that changes liquidity or debt.
    function _updateInterestRates(address asset, ReserveData storage r) internal {
        uint256 availableLiquidity = IERC20(asset).balanceOf(address(r.aToken));
        uint256 totalDebt = r.variableDebtToken.totalSupplyWithIndex(r.borrowIndexRay);

        (uint256 newLiquidityRate, uint256 newBorrowRate) =
            r.interestRateStrategy.calculateInterestRates(
                availableLiquidity,
                totalDebt,
                r.reserveFactorBps
            );

        r.liquidityRateRayPerSecond = newLiquidityRate;
        r.borrowRateRayPerSecond = newBorrowRate;

        emit ReserveUpdated(
            asset,
            r.liquidityIndexRay,
            r.borrowIndexRay,
            newLiquidityRate,
            newBorrowRate,
            r.lastUpdateTimestamp
        );
    }

    // -------------------------------------------------------------------------
    // Internal — Account Data
    // -------------------------------------------------------------------------

    /// @dev Computes aggregated account data across all reserves for `user`.
    ///      Uses live (current-block) indexes via `_currentLiquidityIndex` /
    ///      `_currentBorrowIndex` so that cross-reserve risk checks are accurate
    ///      even if some reserves haven't been touched recently.
    function _computeUserAccountData(address user) internal view returns (
        uint256 collateralUsdWad,
        uint256 debtUsdWad,
        uint256 maxBorrowUsdWad,
        uint256 liquidationThresholdUsdWad
    ) {
        uint256 len = _reserveList.length;
        for (uint256 i = 0; i < len; i++) {
            address asset = _reserveList[i];
            ReserveData storage r = _reserves[asset];

            uint256 collateralAmount = r.aToken.balanceOfWithIndex(user, _currentLiquidityIndex(r));
            uint256 debtAmount = r.variableDebtToken.balanceOfWithIndex(user, _currentBorrowIndex(r));

            // Skip reserves where the user has no position — avoids requiring oracle price
            // for assets the user has never interacted with.
            if (collateralAmount == 0 && debtAmount == 0) continue;

            uint256 colUsd = collateralAmount > 0 ? _assetToUsdWad(asset, collateralAmount) : 0;
            uint256 debtUsd = debtAmount > 0 ? _assetToUsdWad(asset, debtAmount) : 0;

            collateralUsdWad += colUsd;
            debtUsdWad += debtUsd;
            maxBorrowUsdWad += colUsd.mulBpsDown(r.ltvBps);
            liquidationThresholdUsdWad += colUsd.mulBpsDown(r.liquidationThresholdBps);
        }
    }

    // -------------------------------------------------------------------------
    // Internal — Live Index Helpers (View)
    // -------------------------------------------------------------------------

    /// @dev Returns the liquidity index accrued to the current block (read-only).
    ///      Uses `accrueIndexLinearRay` for overflow-safe 512-bit `rate * dt`.
    function _currentLiquidityIndex(ReserveData storage r) internal view returns (uint256) {
        uint256 dt = uint256(uint40(block.timestamp)) - uint256(r.lastUpdateTimestamp);
        return MathUtils.accrueIndexLinearRay(r.liquidityIndexRay, r.liquidityRateRayPerSecond, dt);
    }

    /// @dev Returns the borrow index accrued to the current block (read-only).
    ///      Uses `accrueIndexLinearRay` for overflow-safe 512-bit `rate * dt`.
    function _currentBorrowIndex(ReserveData storage r) internal view returns (uint256) {
        uint256 dt = uint256(uint40(block.timestamp)) - uint256(r.lastUpdateTimestamp);
        return MathUtils.accrueIndexLinearRay(r.borrowIndexRay, r.borrowRateRayPerSecond, dt);
    }

    // -------------------------------------------------------------------------
    // Internal — Price / Decimal Conversion
    // -------------------------------------------------------------------------

    /// @dev Converts an asset amount to USD WAD using the price oracle.
    function _assetToUsdWad(address asset, uint256 amount) internal view returns (uint256) {
        ReserveData storage r = _reserves[asset];
        uint256 amountWad = _scaleToWad(amount, r.assetDecimals);
        uint256 priceWad = _getPriceWad(asset);
        return amountWad.mulWadDown(priceWad);
    }

    /// @dev Converts a USD WAD amount to an asset token amount.
    function _usdWadToAssetAmount(address asset, uint256 usdWad) internal view returns (uint256) {
        ReserveData storage r = _reserves[asset];
        uint256 priceWad = _getPriceWad(asset);
        uint256 amountWad = usdWad.divWadDown(priceWad);
        return _scaleFromWad(amountWad, r.assetDecimals);
    }

    /// @dev Fetches oracle price and normalizes it to WAD (1e18) regardless of oracle decimals.
    function _getPriceWad(address asset) internal view returns (uint256) {
        uint256 price = priceOracle.getAssetPrice(asset);
        uint8 priceDec = priceOracle.PRICE_DECIMALS();
        if (priceDec == 18) return price;
        if (priceDec < 18) return price * (10 ** (18 - priceDec));
        return price / (10 ** (priceDec - 18));
    }

    /// @dev Scales `amount` from `assetDecimals` to 18 decimals.
    function _scaleToWad(uint256 amount, uint8 assetDecimals) internal pure returns (uint256) {
        if (assetDecimals == 18) return amount;
        if (assetDecimals < 18) return amount * (10 ** (18 - assetDecimals));
        return amount / (10 ** (assetDecimals - 18));
    }

    /// @dev Scales `amount` from 18 decimals down to `assetDecimals`.
    function _scaleFromWad(uint256 amount, uint8 assetDecimals) internal pure returns (uint256) {
        if (assetDecimals == 18) return amount;
        if (assetDecimals < 18) return amount / (10 ** (18 - assetDecimals));
        return amount * (10 ** (assetDecimals - 18));
    }
}
