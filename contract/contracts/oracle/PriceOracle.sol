// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@chainlink/contracts/src/v0.8/shared/interfaces/AggregatorV3Interface.sol";

import "../interfaces/IPriceOracle.sol";

contract PriceOracle is Ownable, IPriceOracle {
    uint8 public constant override PRICE_DECIMALS = 8;

    mapping(address => address) public priceFeeds;
    uint256 public maxPriceAge = 2 days;

    event PriceFeedUpdated(address indexed token, address indexed priceFeed);
    event MaxPriceAgeUpdated(uint256 oldMaxPriceAge, uint256 newMaxPriceAge);

    constructor() Ownable(msg.sender) {}

    function setPriceFeed(address token, address _priceFeed) external onlyOwner {
        require(token != address(0), "PriceOracle: token is zero address");
        require(_priceFeed != address(0), "PriceOracle: price feed is zero address");
        require(_priceFeed.code.length > 0, "PriceOracle: feed is not contract");

        uint8 feedDecimals = AggregatorV3Interface(_priceFeed).decimals();
        require(feedDecimals <= 18, "PriceOracle: feed decimals too high");

        priceFeeds[token] = _priceFeed;
        emit PriceFeedUpdated(token, _priceFeed);
    }

    /// @notice Sets the maximum accepted age for oracle data.
    /// @dev Use 0 to disable the stale-price check for local/test-only debugging.
    function setMaxPriceAge(uint256 newMaxPriceAge) external onlyOwner {
        emit MaxPriceAgeUpdated(maxPriceAge, newMaxPriceAge);
        maxPriceAge = newMaxPriceAge;
    }

    function getAssetPrice(address token) external view override returns (uint256) {
        require(token != address(0), "PriceOracle: token is zero address");
        address priceFeedAddress = priceFeeds[token];
        require(priceFeedAddress != address(0), "PriceOracle: price feed not set for token");

        AggregatorV3Interface priceFeed = AggregatorV3Interface(priceFeedAddress);
        (
            ,
            int256 price,
            ,
            uint256 updatedAt,
        ) = priceFeed.latestRoundData();

        require(price > 0, "PriceOracle: invalid price");
        require(updatedAt != 0, "PriceOracle: incomplete round");
        require(updatedAt <= block.timestamp, "PriceOracle: bad timestamp");
        require(
            maxPriceAge == 0 || block.timestamp - updatedAt <= maxPriceAge,
            "PriceOracle: stale price"
        );

        uint256 normalizedPrice = _scalePriceToOracleDecimals(
            uint256(price),
            priceFeed.decimals()
        );
        require(normalizedPrice > 0, "PriceOracle: normalized price is zero");

        return normalizedPrice;
    }

    function _scalePriceToOracleDecimals(
        uint256 price,
        uint8 feedDecimals
    ) internal pure returns (uint256) {
        if (feedDecimals == PRICE_DECIMALS) return price;
        if (feedDecimals < PRICE_DECIMALS) {
            return price * (10 ** (PRICE_DECIMALS - feedDecimals));
        }
        return price / (10 ** (feedDecimals - PRICE_DECIMALS));
    }
}
