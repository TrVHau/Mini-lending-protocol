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
        return min(max(x, lo), hi);
    }

    // div 

    function mulDivDown(uint256 a, uint256 b, uint256 denominator) internal pure returns (uint256) {
        require(denominator !=0, "DIV BY REZO");
        
    }
}