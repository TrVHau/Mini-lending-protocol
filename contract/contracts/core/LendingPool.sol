// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "../interfaces/ILendingPool.sol";
import "../interfaces/IPriceOracle.sol";
import "../interfaces/IAToken.sol";
import "../interfaces/IVariableDebtToken.sol";

contract LendingPool is ILendingPool, Ownable {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant RAY = 1e27;

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

    mapping(address => ReserveData) private reserves;
    IPriceOracle public immutable priceOracle;

    event ReserveInitialized(address indexed asset, address indexed aToken, address indexed debtToken);
    event ReserveUpdated(address indexed asset, uint256 liquidityIndexRay, uint256 borrowIndexRay, uint40 timestamp);

    constructor(address oracle, address owner_) Ownable(owner_) {
        require(oracle != address(0), "ORACLE_ZERO");
        priceOracle = IPriceOracle(oracle);
    }

    /// @notice Phase 1 admin setup for reserve registry and initial indexes.
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

        emit ReserveInitialized(asset, aToken, debtToken);
    }

    /// @notice Phase 1 reserve index updater. Must be called first in state-changing flows.
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
        emit ReserveUpdated(asset, r.liquidityIndexRay, r.borrowIndexRay, currentTimestamp);
    }

    function _accrueIndexes(ReserveData storage r, uint256 dt) internal {
        if (dt == 0) return;

        if (r.liquidityRateRayPerSecond != 0) {
            uint256 liquidityDelta = (r.liquidityIndexRay * r.liquidityRateRayPerSecond * dt) / RAY;
            r.liquidityIndexRay = r.liquidityIndexRay + liquidityDelta;
        }

        if (r.borrowRateRayPerSecond != 0) {
            uint256 borrowDelta = (r.borrowIndexRay * r.borrowRateRayPerSecond * dt) / RAY;
            r.borrowIndexRay = r.borrowIndexRay + borrowDelta;
        }
    }

    function _amountTo18(uint256 amount, uint8 assetDecimals) internal pure returns (uint256) {
        if (assetDecimals == 18) return amount;
        if (assetDecimals < 18) return amount * (10 ** (18 - assetDecimals));
        return amount / (10 ** (assetDecimals - 18));
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
        return (amountWad * priceWad) / WAD;
    }

    function getReserveIndexes(address asset)
        external
        view
        returns (uint256 liquidityIndexRay, uint256 borrowIndexRay, uint40 lastUpdateTimestamp)
    {
        ReserveData storage r = reserves[asset];
        return (r.liquidityIndexRay, r.borrowIndexRay, r.lastUpdateTimestamp);
    }

    function getReserveAddresses(address asset) external view returns (address aToken, address debtToken) {
        ReserveData storage r = reserves[asset];
        return (address(r.aToken), address(r.variableDebtToken));
    }

    // -----------------------------------------------------------------------
    // ILendingPool placeholders (implemented in Phase 2+)
    // -----------------------------------------------------------------------

    function deposit(address, uint256) external pure override {
        revert("NOT_IMPLEMENTED_PHASE2");
    }

    function withdraw(address, uint256) external pure override {
        revert("NOT_IMPLEMENTED_PHASE2");
    }

    function borrow(address, uint256) external pure override {
        revert("NOT_IMPLEMENTED_PHASE3");
    }

    function repay(address, uint256) external pure override {
        revert("NOT_IMPLEMENTED_PHASE3");
    }

    function getHealthFactor(address) external pure override returns (uint256) {
        return 0;
    }

    function getUserAccountData(address)
        external
        pure
        override
        returns (uint256 collateralUsdWad, uint256 debtUsdWad, uint256 maxBorrowUsdWad, uint256 healthFactorWad)
    {
        return (0, 0, 0, 0);
    }
}