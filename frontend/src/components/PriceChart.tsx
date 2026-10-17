import { useRef, useMemo } from "react";
import { usePriceHistory, type Timeframe } from "../hooks/usePriceHistory";

type PriceChartProps = {
  symbol: string;
  name?: string;
  priceWad?: bigint;
};

function formatUsdValue(val: number): string {
  if (val >= 1000) {
    return val.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  if (val >= 1) {
    return val.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }
  return val.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
}

function formatTimestamp(timestamp: number, timeframe: Timeframe): string {
  const d = new Date(timestamp);
  if (timeframe === "1D") {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (timeframe === "1W" || timeframe === "1M") {
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }
  return d.toLocaleDateString([], { month: "short", year: "2-digit" });
}

export default function PriceChart({ symbol, name, priceWad }: PriceChartProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  const {
    data,
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
  } = usePriceHistory(symbol, priceWad);

  const isPositive = changePercent >= 0;

  // Chart dimensions
  const width = 800;
  const height = 300;
  const padLeft = 16;
  const padRight = 64;
  const padTop = 20;
  const padBottom = 30;

  const chartW = width - padLeft - padRight;
  const chartH = height - padTop - padBottom;

  // Calculate coordinates and path
  const { pathD, areaD, pointsWithCoords, yLabels, xLabels } = useMemo(() => {
    if (!data || data.length < 2) {
      return {
        pathD: "",
        areaD: "",
        pointsWithCoords: [],
        yLabels: [],
        xLabels: [],
      };
    }

    let min = Infinity;
    let max = -Infinity;
    for (const p of data) {
      if (p.price < min) min = p.price;
      if (p.price > max) max = p.price;
    }

    // Add 5% breathing room
    const range = max - min || min * 0.1 || 1;
    const effMin = Math.max(0, min - range * 0.05);
    const effMax = max + range * 0.05;
    const effRange = effMax - effMin;

    const coords = data.map((p, idx) => {
      const x = padLeft + (idx / (data.length - 1)) * chartW;
      const y = padTop + chartH - ((p.price - effMin) / effRange) * chartH;
      return { ...p, x, y };
    });

    // Build smooth Catmull-Rom or cubic spline
    let line = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 0; i < coords.length - 1; i++) {
      const p0 = coords[i === 0 ? i : i - 1];
      const p1 = coords[i];
      const p2 = coords[i + 1];
      const p3 = coords[i + 2 < coords.length ? i + 2 : i + 1];

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      line += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }

    const baselineY = padTop + chartH;
    const area = `${line} L ${coords[coords.length - 1].x} ${baselineY} L ${coords[0].x} ${baselineY} Z`;

    // 4 horizontal grid levels
    const yGrid = [0, 0.33, 0.66, 1].map((pct) => {
      const priceVal = effMin + pct * effRange;
      const y = padTop + chartH - pct * chartH;
      return { y, label: formatUsdValue(priceVal) };
    });

    // 5 X-axis labels
    const xGrid = [0, 0.25, 0.5, 0.75, 1].map((pct) => {
      const idx = Math.min(Math.floor(pct * (data.length - 1)), data.length - 1);
      const point = data[idx];
      const x = padLeft + pct * chartW;
      return {
        x,
        label: formatTimestamp(point.timestamp, timeframe),
      };
    });

    return {
      pathD: line,
      areaD: area,
      pointsWithCoords: coords,
      yLabels: yGrid,
      xLabels: xGrid,
    };
  }, [data, chartW, chartH, timeframe]);

  // Mouse hover event handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || pointsWithCoords.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * width;

    // Find closest point
    let closest: (typeof pointsWithCoords)[0] | null = null;
    let minDiff = Infinity;
    for (const pt of pointsWithCoords) {
      const diff = Math.abs(pt.x - mouseX);
      if (diff < minDiff) {
        minDiff = diff;
        closest = pt;
      }
    }
    if (closest) {
      setHoveredPoint({ timestamp: closest.timestamp, price: closest.price });
    }
  };

  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  const hoveredCoord = useMemo(() => {
    if (!hoveredPoint || !pointsWithCoords.length) return null;
    return pointsWithCoords.find((p) => p.timestamp === hoveredPoint.timestamp) ?? null;
  }, [hoveredPoint, pointsWithCoords]);

  const strokeColor = isPositive ? "#34d399" : "#fb7185";
  const fillColorTop = isPositive ? "rgba(52, 211, 153, 0.28)" : "rgba(251, 113, 133, 0.28)";
  const fillColorBottom = isPositive ? "rgba(52, 211, 153, 0.0)" : "rgba(251, 113, 133, 0.0)";

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950/80 p-5 shadow-xl backdrop-blur-md">
      {/* Header with price stats and timeframe selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {name ?? symbol} Price
            </span>
            {isLoading && (
              <span className="inline-block h-3 w-3 animate-spin rounded-full border border-slate-500 border-t-cyan-400" />
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <h2 className="font-mono text-3xl font-bold tracking-tight text-slate-50">
              {formatUsdValue(displayPrice)}
            </h2>
            <div
              className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                isPositive
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "bg-rose-500/15 text-rose-300 border border-rose-500/30"
              }`}
            >
              <span>{isPositive ? "▲" : "▼"}</span>
              <span>
                {isPositive ? "+" : ""}
                {formatUsdValue(changeAmount)} ({isPositive ? "+" : ""}
                {changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
          {hoveredPoint ? (
            <p className="mt-1 text-xs text-slate-400">
              {new Date(hoveredPoint.timestamp).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          ) : (
            <div className="mt-1 flex items-center gap-4 text-xs text-slate-500">
              <span>
                Low: <span className="font-medium text-slate-300">{formatUsdValue(low)}</span>
              </span>
              <span>•</span>
              <span>
                High: <span className="font-medium text-slate-300">{formatUsdValue(high)}</span>
              </span>
            </div>
          )}
        </div>

        {/* Timeframe selector */}
        <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900/90 p-1">
          {(["1D", "1W", "1M", "1Y"] as Timeframe[]).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                timeframe === tf
                  ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Interactive SVG Chart */}
      <div className="relative mt-5 w-full">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full overflow-visible select-none cursor-crosshair"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            <linearGradient id={`priceGradient-${symbol}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fillColorTop} />
              <stop offset="100%" stopColor={fillColorBottom} />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Horizontal grid lines & Y labels */}
          {yLabels.map(({ y, label }, i) => (
            <g key={i}>
              <line
                x1={padLeft}
                y1={y}
                x2={width - padRight}
                y2={y}
                stroke="#1e293b"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={width - padRight + 8}
                y={y + 4}
                fill="#64748b"
                fontSize="10"
                fontFamily="monospace"
              >
                {label}
              </text>
            </g>
          ))}

          {/* Area fill */}
          {areaD && (
            <path
              d={areaD}
              fill={`url(#priceGradient-${symbol})`}
              className="transition-all duration-300"
            />
          )}

          {/* Smooth line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#glow)"
              className="transition-all duration-300"
            />
          )}

          {/* Hover Crosshair & Marker */}
          {hoveredCoord && (
            <g>
              {/* Vertical line */}
              <line
                x1={hoveredCoord.x}
                y1={padTop}
                x2={hoveredCoord.x}
                y2={padTop + chartH}
                stroke="#475569"
                strokeDasharray="3 3"
                strokeWidth="1.5"
              />
              {/* Outer pulsing ring */}
              <circle
                cx={hoveredCoord.x}
                cy={hoveredCoord.y}
                r="8"
                fill={strokeColor}
                opacity="0.3"
                className="animate-ping"
              />
              {/* Core dot */}
              <circle
                cx={hoveredCoord.x}
                cy={hoveredCoord.y}
                r="4.5"
                fill={strokeColor}
                stroke="#020617"
                strokeWidth="2"
              />
            </g>
          )}

          {/* X-axis labels */}
          {xLabels.map(({ x, label }, i) => (
            <text
              key={i}
              x={x}
              y={height - 8}
              fill="#64748b"
              fontSize="10"
              textAnchor={i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"}
            >
              {label}
            </text>
          ))}
        </svg>
      </div>
    </div>
  );
}
