// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library MathUtils {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant RAY = 1e27;
    uint256 internal constant BPS = 1e4;


    // basic math utils
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a > b ? a : b;
    }

    function clamp(uint256 x, uint256 lo, uint256 hi) internal pure returns (uint256) {
        if(x < lo) return lo;
        if(x > hi) return hi;
        return x;
    }

    // ---------------------------------------------------------------------------
    // Full-precision 512-bit multiply-then-divide (rounds down)
    // ---------------------------------------------------------------------------

    function mulDivDown(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256) {
        require(denominator != 0, "DIV_BY_ZERO");
        
        unchecked {
            //  [prod1 prod0] = a * b
            uint256 prod0;
            uint256 prod1;
            assembly {
                let mm := mulmod(a, b, not(0))
                prod0 := mul(a, b)
                prod1 := sub(sub(mm, prod0), lt(mm, prod0))
            }
            // non overflow case, 256 by 256 division
            if (prod1 == 0) {
                return prod0 / denominator; 
            }

            // make sure the result is less than 2^256. Also prevents denominator == 0
            require(denominator > prod1, "DIV OVERFLOW");

            // compute remainder using mulmod
            uint256 remainder;
            assembly {
                remainder := mulmod(a, b, denominator)
            }
            // subtract remainder from [prod1 prod0]
            assembly {
                prod1 := sub(prod1, gt(remainder, prod0))
                prod0 := sub(prod0, remainder)
            }
            // factor powers of two out of denominator 
            // demominator = denominator / twos
            // prod0 = prod0 / twos
            uint256 twos = denominator & (~denominator + 1);
            assembly {
                denominator := div(denominator, twos)
                prod0 := div(prod0, twos)
                twos := add(div(sub(0, twos), twos), 1)
            }

            prod0 |= prod1 * twos;

            // inverse mod 2^256
            uint256 inverse = (3 * denominator) ^ 2;
            inverse *= 2 - denominator * inverse; // inverse mod 2^8
            inverse *= 2 - denominator * inverse; // inverse mod 2^16
            inverse *= 2 - denominator * inverse; // inverse mod 2^32
            inverse *= 2 - denominator * inverse; // inverse mod 2^64
            inverse *= 2 - denominator * inverse; // inverse mod 2^128
            inverse *= 2 - denominator * inverse; // inverse mod 2^256

            // result = prod0 * inverse mod 2^256
            uint256 result;
            assembly {
                result := mul(prod0, inverse)
            }
            return result;
        }
    }
    // ---------------------------------------------------------------------------
    // WAD (1e18) arithmetic
    // ---------------------------------------------------------------------------

    /// @notice floor(a * b / WAD)
    function mulWadDown(uint256 a, uint256 b) internal pure returns (uint256) {
        return mulDivDown(a, b, WAD);
    }

    /// @notice floor(a * WAD / b)
    function divWadDown(uint256 a, uint256 b) internal pure returns (uint256) {
        return mulDivDown(a, WAD, b);
    }

    // ---------------------------------------------------------------------------
    // RAY (1e27) arithmetic
    // ---------------------------------------------------------------------------

    /// @notice floor(a * b / RAY)
    function mulRayDown(uint256 a, uint256 b) internal pure returns (uint256) {
        return mulDivDown(a, b, RAY);
    }

    /// @notice floor(a * RAY / b)
    function divRayDown(uint256 a, uint256 b) internal pure returns (uint256) {
        return mulDivDown(a, RAY, b);
    }

    // ---------------------------------------------------------------------------
    // BPS (1e4) arithmetic
    // ---------------------------------------------------------------------------

    /// @notice floor(a * b / BPS)
    function mulBpsDown(uint256 a, uint256 b) internal pure returns (uint256) {
        return mulDivDown(a, b, BPS);
    }

    /// @notice floor(a * BPS / b)
    function divBpsDown(uint256 a, uint256 b) internal pure returns (uint256) {
        return mulDivDown(a, BPS, b);
    }

    // ---------------------------------------------------------------------------
    // Interest index helpers
    // ---------------------------------------------------------------------------

    /// @notice Linearly accrues an interest index.
    ///         new_index = index + index * rate * dt / RAY
    ///         `rate` is a per-second rate in RAY; mulDivDown(rate, dt, 1) computes rate*dt via 512-bit mul.
    function accrueIndexLinearRay(uint256 index, uint256 rate, uint256 dt) internal pure returns (uint256) {
        if (dt == 0 || rate == 0) return index;
        uint256 rateTimesDt = mulDivDown(rate, dt, 1);
        uint256 deltaIndex = mulRayDown(index, rateTimesDt);
        return index + deltaIndex;
    }

    /// @notice Converts an annual rate in WAD to a per-second rate in RAY.
    function annualWadToPerSecondRay(uint256 annualWad) internal pure returns (uint256) {
        uint256 secondsPerYear = 365 days;
        uint256 annualRateRay = mulDivDown(annualWad, RAY, WAD);
        return annualRateRay / secondsPerYear;
    }

    // ---------------------------------------------------------------------------
    // Decimal scaling
    // ---------------------------------------------------------------------------

    /// @notice Converts `amount` from `fromDec` to `toDec` decimals (rounds down).
    function scaleDecimals(uint256 amount, uint8 fromDec, uint8 toDec) internal pure returns (uint256) {
        if (fromDec == toDec) return amount;
        if (fromDec < toDec) return amount * (10 ** (toDec - fromDec));
        return amount / (10 ** (fromDec - toDec));
    }
}