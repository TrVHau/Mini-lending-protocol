import { useState, useEffect, useMemo } from "react";

export type Timeframe = "1D" | "1W" | "1M" | "1Y";

export type PricePoint = {
  timestamp: number;
  price: number;
};

export type PriceHistoryResult = {
  data: PricePoint[];
  currentPrice: number;
  displayPrice: number;
  changeAmount: number;
  changePercent: number;
  high: number;
  low: number;
  timeframe: Timeframe;
  setTimeframe: (tf: Timeframe) => void;
  hoveredPoint: PricePoint | null;
  setHoveredPoint: (point: PricePoint | null) => void;
  isLoading: boolean;
};

// Map symbols to Binance/CoinGecko identifiers
const SYMBOL_MAP: Record<string, string> = {
  WETH: "ETHUSDT",
  ETH: "ETHUSDT",
  DAI: "DAIUSDT",
  BTC: "BTCUSDT",
  LINK: "LINKUSDT",
  XAU: "PAXGUSDT",
};

// Realistic baseline volatility per timeframe for fallback generation
const TIMEFRAME_CONFIG: Record<
  Timeframe,
  { points: number; stepMs: number; volatility: number; trendBias: number }
> = {
  "1D": {
    points: 24,
    stepMs: 60 * 60 * 1000,
    volatility: 0.008,
    trendBias: 0.001,
  },
  "1W": {
    points: 28,
    stepMs: 6 * 60 * 60 * 1000,
    volatility: 0.015,
    trendBias: 0.003,
  },
  "1M": {
    points: 30,
    stepMs: 24 * 60 * 60 * 1000,
    volatility: 0.025,
    trendBias: 0.005,
  },
  "1Y": {
    points: 52,
    stepMs: 7 * 24 * 60 * 60 * 1000,
    volatility: 0.045,
    trendBias: 0.01,
  },
};

/**
 * Generate a pseudo-random yet deterministic series anchored to target current price
 */
function generateFallbackHistory(
  targetPrice: number,
  timeframe: Timeframe,
  symbol: string
): PricePoint[] {
  const config = TIMEFRAME_CONFIG[timeframe];
  const now = Date.now();
  const seed = symbol.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);

  // Simple pseudo-random generator
  let state = seed + timeframe.charCodeAt(0);
  const nextRandom = () => {
    state = (state * 9301 + 49297) % 233280;
    return state / 233280;
  };

  const points: PricePoint[] = [];
  const prices: number[] = [targetPrice];

  // Walk backwards from targetPrice
  let curr = targetPrice;
  for (let i = 1; i < config.points; i++) {
    const r = nextRandom() - 0.48; // slight upward drift going forward
    const change = curr * r * config.volatility;
    curr = Math.max(curr - change, targetPrice * 0.5);
    prices.unshift(curr);
  }

  const startTime = now - (config.points - 1) * config.stepMs;
  for (let i = 0; i < config.points; i++) {
    points.push({
      timestamp: startTime + i * config.stepMs,
      price: Number(prices[i].toFixed(targetPrice < 10 ? 4 : 2)),
    });
  }

  // Ensure last point matches exactly
  if (points.length > 0) {
    points[points.length - 1].price = targetPrice;
  }

  return points;
}

export function usePriceHistory(
  symbol?: string,
  priceWad?: bigint
): PriceHistoryResult {
  const [timeframe, setTimeframe] = useState<Timeframe>("1D");
  const [hoveredPoint, setHoveredPoint] = useState<PricePoint | null>(null);
  const [fetchedData, setFetchedData] = useState<PricePoint[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const cleanSymbol = useMemo(() => {
    if (!symbol) return "WETH";
    return symbol.toUpperCase().replace(/^A|^D/, "");
  }, [symbol]);

  const livePrice = useMemo(() => {
    if (!priceWad || priceWad === 0n) {
      // Default placeholder prices if oracle is loading
      switch (cleanSymbol) {
        case "WETH":
          return 2411.52;
        case "BTC":
          return 81663.73;
        case "DAI":
          return 1.0;
        case "LINK":
          return 12.31;
        case "XAU":
          return 4161.86;
        default:
          return 100.0;
      }
    }
    return Number(priceWad) / 1e18;
  }, [priceWad, cleanSymbol]);

  useEffect(() => {
    let isCancelled = false;
    const pair = SYMBOL_MAP[cleanSymbol];

    if (!pair) {
      return;
    }

    const intervalMap: Record<Timeframe, { interval: string; limit: number }> = {
      "1D": { interval: "1h", limit: 24 },
      "1W": { interval: "4h", limit: 42 },
      "1M": { interval: "1d", limit: 30 },
      "1Y": { interval: "1w", limit: 52 },
    };

    const { interval, limit } = intervalMap[timeframe];

    async function fetchKlines() {
      setIsLoading(true);
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);

        const url = `https://api.binance.com/api/v3/klines?symbol=${pair}&interval=${interval}&limit=${limit}`;
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!res.ok) throw new Error("API response error");

        const raw: unknown = await res.json();
        if (Array.isArray(raw) && raw.length > 0 && !isCancelled) {
          // Format Binance kline item: [openTime, open, high, low, close, volume, closeTime, ...]
          const points: PricePoint[] = (raw as (string | number)[][]).map((k) => ({
            timestamp: Number(k[0]),
            price: Number(parseFloat(String(k[4]))),
          }));

          // Anchor the last point to live oracle price if available
          if (livePrice > 0 && points.length > 0) {
            points[points.length - 1].price = livePrice;
          }

          setFetchedData(points);
        }
      } catch {
        if (!isCancelled) {
          setFetchedData(null);
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchKlines();

    return () => {
      isCancelled = true;
    };
  }, [cleanSymbol, timeframe, livePrice]);

  const data = useMemo(() => {
    if (fetchedData && fetchedData.length > 0) {
      return fetchedData;
    }
    return generateFallbackHistory(livePrice, timeframe, cleanSymbol);
  }, [fetchedData, livePrice, timeframe, cleanSymbol]);

  const { high, low, firstPrice } = useMemo(() => {
    if (!data.length) return { high: livePrice, low: livePrice, firstPrice: livePrice };
    let h = data[0].price;
    let l = data[0].price;
    for (const p of data) {
      if (p.price > h) h = p.price;
      if (p.price < l) l = p.price;
    }
    return { high: h, low: l, firstPrice: data[0].price };
  }, [data, livePrice]);

  const displayPrice = hoveredPoint ? hoveredPoint.price : livePrice;
  const changeAmount = displayPrice - firstPrice;
  const changePercent = firstPrice > 0 ? (changeAmount / firstPrice) * 100 : 0;

  return {
    data,
    currentPrice: livePrice,
    displayPrice,
    changeAmount,
    changePercent,
    high,
    low,
    timeframe,
    setTimeframe,
    hoveredPoint,
    setHoveredPoint,
    isLoading,
  };
}
