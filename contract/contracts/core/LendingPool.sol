// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "../interfaces/IAToken.sol";
import "../interfaces/ILendingPool.sol";
import "../interfaces/IPriceOracle.sol";
import "../interfaces/IVariableDebtToken.sol";
import "../libraries/MathUtils.sol";

contract LendingPool is ILendingPool, Ownable {
    using MathUtils for uint256;
    using SafeERC20 for IERC20;

    uint256 internal constant RAY = 1e27;
    uint256 internal constant WAD = 1e18;

    struct ReserveData {
        IAToken aToken;
        IVariableDebtToken variableDebtToken;
        uint8 assetDecimals;
        uint256 liquidityIndexRay;
        uint256 borrowIndexRay;
        uint256 liquidityRateRayPerSecond;
        uint256 borrowRateRayPerSecond;
        uint40 lastUpdateTimestamp;
        bool isActive;
        bool isFrozen;
        uint16 ltvBps;
        uint16 liquidationThresholdBps;
        uint16 liquidationBonusBps;
        uint16 reserveFactorBps;
    }

    // events
    event Deposit(address indexed user, address indexed asset, uint256 amount);
    event Withdraw(address indexed user, address indexed asset, uint256 amount);
    event Borrow(address indexed user, address indexed asset, uint256 amount);
    event Repay(address indexed user, address indexed asset, uint256 amount);
    event ReserveInitialized(
        address indexed asset,
        address indexed aToken,
        address indexed debtToken
    );
    event ReserveUpdated(
        address indexed asset,
        uint256 liquidityIndexRay,
        uint256 borrowIndexRay,
        uint40 timestamp
    );
    event Liquidation(
        address indexed user,
        address indexed collateralAsset,
        address indexed debtAsset,
        uint256 debtCovered,
        uint256 collateralSeized
    );

    address[] private reserveList;
    mapping(address => ReserveData) private reserves;
    IPriceOracle public immutable priceOracle;

    constructor(address oracle, address owner_) Ownable(owner_) {
        require(oracle != address(0), "ORACLE_ZERO");
        priceOracle = IPriceOracle(oracle);
    }

    // -------------------------------------------------------------------------
    // Main State-Changing Functions
    // -------------------------------------------------------------------------

    /// @notice Admin setup for reserve registry and initial indexes.
    function initReserve(
        address asset,
        address aToken,
        address debtToken,
        uint8 assetDecimals,
        uint16 ltvBps,
        uint16 liquidationThresholdBps,
        uint16 liquidationBonusBps,
        uint16 reserveFactorBps
    ) external onlyOwner {
        require(asset != address(0), "ASSET_ZERO");
        require(aToken != address(0), "ATOKEN_ZERO");
        require(debtToken != address(0), "DEBT_TOKEN_ZERO");
        require(assetDecimals <= 18, "DECIMALS_TOO_HIGH");

        ReserveData storage r = reserves[asset];
        require(address(r.aToken) == address(0), "RESERVE_EXISTS");
        require(liquidationThresholdBps <= 10_000, "BAD_LIQ_THRESHOLD");
        require(ltvBps <= liquidationThresholdBps, "BAD_LTV");
        require(reserveFactorBps <= 10_000, "BAD_RESERVE_FACTOR");

        r.aToken = IAToken(aToken);
        r.variableDebtToken = IVariableDebtToken(debtToken);
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

        reserveList.push(asset);
        emit ReserveInitialized(asset, aToken, debtToken);
    }

    function deposit(address asset, uint256 amount) external override {
        require(amount > 0, "INVALID_AMOUNT");
        ReserveData storage r = reserves[asset];
        require(address(r.aToken) != address(0), "RESERVE_NOT_FOUND");
        require(r.isActive, "RESERVE_INACTIVE");
        require(!r.isFrozen, "RESERVE_FROZEN");

        _updateReserve(asset);
        IERC20(asset).safeTransferFrom(msg.sender, address(r.aToken), amount);

        uint256 scaledAmount = r.aToken.mint(
            msg.sender,
            amount,
            r.liquidityIndexRay
        );
        require(scaledAmount > 0, "MINT_FAILED");

        emit Deposit(msg.sender, asset, amount);
    }

    function withdraw(address asset, uint256 amount) external override {
        require(amount > 0, "INVALID_AMOUNT");
        ReserveData storage r = reserves[asset];
        require(address(r.aToken) != address(0), "RESERVE_NOT_FOUND");
        require(r.isActive, "RESERVE_INACTIVE");

        _updateReserve(asset);
        uint256 scaledAmount = r.aToken.burn(
            msg.sender,
            amount,
            r.liquidityIndexRay
        );
        require(scaledAmount > 0, "BURN_FAILED");

        r.aToken.transferUnderlyingTo(msg.sender, amount);
        emit Withdraw(msg.sender, asset, amount);
    }

    function borrow(address asset, uint256 amount) external override {
        require(amount > 0, "INVALID_AMOUNT");
        ReserveData storage r = reserves[asset];
        require(address(r.aToken) != address(0), "RESERVE_NOT_FOUND");
        require(r.isActive, "RESERVE_INACTIVE");
        require(!r.isFrozen, "RESERVE_FROZEN");

        _updateReserve(asset);

        uint256 availableLiquidity = IERC20(asset).balanceOf(address(r.aToken));
        require(availableLiquidity >= amount, "INSUFFICIENT_LIQUIDITY");

        (, , uint256 maxBorrowUsdWad, ) = _computeUserAccountData(msg.sender);
        uint256 borrowUsdWad = _assetToUsdWad(asset, amount);
        require(borrowUsdWad <= maxBorrowUsdWad, "INSUFFICIENT_COLLATERAL");

        uint256 scaledAmount = r.variableDebtToken.mint(
            msg.sender,
            amount,
            r.borrowIndexRay
        );
        require(scaledAmount > 0, "MINT_FAILED");

        r.aToken.transferUnderlyingTo(msg.sender, amount);
        emit Borrow(msg.sender, asset, amount);
    }

    function repay(address asset, uint256 amount) external override {
        require(amount > 0, "INVALID_AMOUNT");
        ReserveData storage r = reserves[asset];
        require(address(r.aToken) != address(0), "RESERVE_NOT_FOUND");
        require(r.isActive, "RESERVE_INACTIVE");

        _updateReserve(asset);

        uint256 debt = r.variableDebtToken.balanceOfWithIndex(
            msg.sender,
            r.borrowIndexRay
        );
        uint256 payback = amount > debt ? debt : amount;
        require(payback > 0, "NO_DEBT");

        uint256 burnedScaledAmount = r.variableDebtToken.burn(
            msg.sender,
            payback,
            r.borrowIndexRay
        );
        require(burnedScaledAmount > 0, "BURN_FAILED");

        IERC20(asset).safeTransferFrom(msg.sender, address(r.aToken), payback);
        emit Repay(msg.sender, asset, payback);
    }

    function liquidate(
        address collateralAsset,
        address debtAsset,
        address user,
        uint256 debtToCover
    ) external override {
        require(debtToCover > 0, "INVALID_AMOUNT");
        require(user != address(0), "USER_ZERO");

        ReserveData storage c = reserves[collateralAsset];
        ReserveData storage d = reserves[debtAsset];
        require(address(c.aToken) != address(0), "COLLATERAL_RESERVE_NOT_FOUND");
        require(address(d.aToken) != address(0), "DEBT_RESERVE_NOT_FOUND");
        require(c.isActive && d.isActive, "RESERVE_INACTIVE");
        require(!c.isFrozen && !d.isFrozen, "RESERVE_FROZEN");

        _updateReserve(collateralAsset);
        if (debtAsset != collateralAsset) {
            _updateReserve(debtAsset);
        }

        uint256 healthFactorWad = this.getHealthFactor(user);
        require(healthFactorWad < WAD, "HEALTHY_POSITION");

        uint256 debtCovered = d.variableDebtToken.balanceOfWithIndex(user, d.borrowIndexRay);
        require(debtCovered > 0, "NO_DEBT");
        if (debtToCover < debtCovered) {
            debtCovered = debtToCover;
        }

        uint256 userCollateral = c.aToken.balanceOfWithIndex(user, c.liquidityIndexRay);
        require(userCollateral > 0, "NO_COLLATERAL");

        uint256 collateralToSeize = _usdWadToAssetAmount(
            collateralAsset,
            _assetToUsdWad(debtAsset, debtCovered).mulBpsDown(c.liquidationBonusBps)
        );
        if (collateralToSeize > userCollateral) {
            collateralToSeize = userCollateral;
            debtCovered = _usdWadToAssetAmount(
                debtAsset,
                _assetToUsdWad(collateralAsset, collateralToSeize).divBpsDown(c.liquidationBonusBps)
            );
        }

        require(debtCovered > 0, "INVALID_AMOUNT");
        IERC20(debtAsset).safeTransferFrom(msg.sender, address(d.aToken), debtCovered);
        require(
            d.variableDebtToken.burn(user, debtCovered, d.borrowIndexRay) > 0,
            "BURN_FAILED"
        );
        require(
            c.aToken.burn(user, collateralToSeize, c.liquidityIndexRay) > 0,
            "BURN_FAILED"
        );

        c.aToken.transferUnderlyingTo(msg.sender, collateralToSeize);
        emit Liquidation(user, collateralAsset, debtAsset, debtCovered, collateralToSeize);
    }

    // -------------------------------------------------------------------------
    // Main View Functions
    // -------------------------------------------------------------------------

    function getReserveIndexes(
        address asset
    )
        external
        view
        returns (
            uint256 liquidityIndexRay,
            uint256 borrowIndexRay,
            uint40 lastUpdateTimestamp
        )
    {
        ReserveData storage r = reserves[asset];
        return (r.liquidityIndexRay, r.borrowIndexRay, r.lastUpdateTimestamp);
    }

    function getReserveAddresses(
        address asset
    ) external view returns (address aToken, address debtToken) {
        ReserveData storage r = reserves[asset];
        return (address(r.aToken), address(r.variableDebtToken));
    }

    function getHealthFactor(address user) external view override returns (uint256) {
        (, uint256 debtUsdWad, , uint256 liquidationThresholdUsdWad) =
            _computeUserAccountData(user);

        if (debtUsdWad == 0) {
            return type(uint256).max;
        }
        return liquidationThresholdUsdWad.divWadDown(debtUsdWad);
    }

    function getUserAccountData(
        address user
    )
        external
        view
        override
        returns (
            uint256 collateralUsdWad,
            uint256 debtUsdWad,
            uint256 maxBorrowUsdWad,
            uint256 healthFactorWad
        )
    {
        uint256 liquidationThresholdUsdWad;
        (
            collateralUsdWad,
            debtUsdWad,
            maxBorrowUsdWad,
            liquidationThresholdUsdWad
        ) = _computeUserAccountData(user);

        if (debtUsdWad == 0) {
            healthFactorWad = type(uint256).max;
        } else {
            healthFactorWad = liquidationThresholdUsdWad.divWadDown(debtUsdWad);
        }
    }

    // -------------------------------------------------------------------------
    // Internal Helpers
    // -------------------------------------------------------------------------

    function _computeUserAccountData(
        address user
    )
        internal
        view
        returns (
            uint256 collateralUsdWad,
            uint256 debtUsdWad,
            uint256 maxBorrowUsdWad,
            uint256 liquidationThresholdUsdWad
        )
    {
        for (uint256 i = 0; i < reserveList.length; i++) {
            address asset = reserveList[i];
            ReserveData storage r = reserves[asset];
            if (address(r.aToken) == address(0)) {
                continue;
            }

            uint256 collateralAmount = r.aToken.balanceOfWithIndex(
                user,
                r.liquidityIndexRay
            );
            uint256 debtAmount = r.variableDebtToken.balanceOfWithIndex(
                user,
                r.borrowIndexRay
            );

            // Skip reserves where user has no position so missing oracle price
            // on unrelated reserves does not break account-data reads.
            if (collateralAmount == 0 && debtAmount == 0) {
                continue;
            }

            uint256 collateralUsd = collateralAmount > 0
                ? _assetToUsdWad(asset, collateralAmount)
                : 0;
            uint256 debtUsd = debtAmount > 0
                ? _assetToUsdWad(asset, debtAmount)
                : 0;

            collateralUsdWad += collateralUsd;
            debtUsdWad += debtUsd;
            maxBorrowUsdWad += collateralUsd.mulBpsDown(r.ltvBps);
            liquidationThresholdUsdWad += collateralUsd.mulBpsDown(
                r.liquidationThresholdBps
            );
        }
    }

    /// @notice Reserve index updater. Must be called first in state-changing flows.
    function _updateReserve(address asset) internal {
        ReserveData storage r = reserves[asset];
        require(address(r.aToken) != address(0), "RESERVE_NOT_FOUND");

        uint40 currentTimestamp = uint40(block.timestamp);
        uint256 dt = uint256(currentTimestamp) - uint256(r.lastUpdateTimestamp);
        if (dt == 0) {
            return;
        }

        _accrueIndexes(r, dt);
        r.lastUpdateTimestamp = currentTimestamp;
        emit ReserveUpdated(
            asset,
            r.liquidityIndexRay,
            r.borrowIndexRay,
            currentTimestamp
        );
    }

    function _accrueIndexes(ReserveData storage r, uint256 dt) internal {
        if (dt == 0) {
            return;
        }

        if (r.liquidityRateRayPerSecond != 0) {
            uint256 liquidityDelta = r.liquidityIndexRay.mulRayDown(
                r.liquidityRateRayPerSecond * dt
            );
            r.liquidityIndexRay = r.liquidityIndexRay + liquidityDelta;
        }

        if (r.borrowRateRayPerSecond != 0) {
            uint256 borrowDelta = r.borrowIndexRay.mulRayDown(
                r.borrowRateRayPerSecond * dt
            );
            r.borrowIndexRay = r.borrowIndexRay + borrowDelta;
        }
    }

    /// @notice Converts an `amount` of `asset` to USD WAD using oracle price decimals.
    function _assetToUsdWad(address asset, uint256 amount) internal view returns (uint256) {
        ReserveData storage r = reserves[asset];
        require(address(r.aToken) != address(0), "RESERVE_NOT_FOUND");

        uint256 amountWad = _amountTo18(amount, r.assetDecimals);
        uint256 price = priceOracle.getAssetPrice(asset);
        uint8 priceDecimals = priceOracle.PRICE_DECIMALS();

        uint256 priceWad;
        if (priceDecimals == 18) {
            priceWad = price;
        } else if (priceDecimals < 18) {
            priceWad = price * (10 ** (18 - priceDecimals));
        } else {
            priceWad = price / (10 ** (priceDecimals - 18));
        }

        return amountWad.mulWadDown(priceWad);
    }
    function _usdWadToAssetAmount(address asset, uint256 usdWadAmount) internal view returns (uint256) {
        ReserveData storage r = reserves[asset];
        require(address(r.aToken) != address(0), "RESERVE_NOT_FOUND");

        uint256 price = priceOracle.getAssetPrice(asset);
        uint8 priceDecimals = priceOracle.PRICE_DECIMALS();
        uint256 priceWad;
        if (priceDecimals == 18) {
            priceWad = price;
        } else if (priceDecimals < 18) {
            priceWad = price * (10 ** (18 - priceDecimals));
        } else {
            priceWad = price / (10 ** (priceDecimals - 18));
        }

        uint256 amountWad = usdWadAmount.divWadDown(priceWad);
        return _amountFrom18(amountWad, r.assetDecimals);
    }

    function _amountTo18(uint256 amount, uint8 assetDecimals) internal pure returns (uint256) {
        if (assetDecimals == 18) {
            return amount;
        }
        if (assetDecimals < 18) {
            return amount * (10 ** (18 - assetDecimals));
        }
        return amount / (10 ** (assetDecimals - 18));
    }

    function _amountFrom18(uint256 amount, uint8 assetDecimals) internal pure returns (uint256) {
        if (assetDecimals == 18) {
            return amount;
        }
        if (assetDecimals < 18) {
            return amount / (10 ** (18 - assetDecimals));
        }
        return amount * (10 ** (assetDecimals - 18));
    }
}
