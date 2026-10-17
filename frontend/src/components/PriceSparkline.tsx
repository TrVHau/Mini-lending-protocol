import { useMemo } from "react";
import { usePriceHistory } from "../hooks/usePriceHistory";

type PriceSparklineProps = {
  symbol: string;
  priceWad?: bigint;
  width?: number;
  height?: number;
};

export default function PriceSparkline({
  symbol,
  priceWad,
  width = 96,
  height = 32,
}: PriceSparklineProps) {
  const { data, changePercent } = usePriceHistory(symbol, priceWad);
  const isPositive = changePercent >= 0;

  const { pathD, areaD } = useMemo(() => {
    if (!data || data.length < 2) return { pathD: "", areaD: "" };

    let min = Infinity;
    let max = -Infinity;
    for (const p of data) {
      if (p.price < min) min = p.price;
      if (p.price > max) max = p.price;
    }

    const padY = 3;
    const range = max - min || 1;
    const effH = height - padY * 2;

    const coords = data.map((p, idx) => {
      const x = (idx / (data.length - 1)) * width;
      const y = padY + effH - ((p.price - min) / range) * effH;
      return { x, y };
    });

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

    const area = `${line} L ${width} ${height} L 0 ${height} Z`;
    return { pathD: line, areaD: area };
  }, [data, width, height]);

  const strokeColor = isPositive ? "#34d399" : "#fb7185";
  const gradId = `spark-${symbol}-${isPositive ? "up" : "down"}`;

  return (
    <div className="flex items-center gap-2">
      <svg width={width} height={height} className="overflow-hidden">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="0%"
              stopColor={isPositive ? "#34d399" : "#fb7185"}
              stopOpacity="0.25"
            />
            <stop
              offset="100%"
              stopColor={isPositive ? "#34d399" : "#fb7185"}
              stopOpacity="0.0"
            />
          </linearGradient>
        </defs>
        {areaD && <path d={areaD} fill={`url(#${gradId})`} />}
        {pathD && (
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        )}
      </svg>
      <span
        className={`font-mono text-xs font-medium ${
          isPositive ? "text-emerald-400" : "text-rose-400"
        }`}
      >
        {isPositive ? "+" : ""}
        {changePercent.toFixed(1)}%
      </span>
    </div>
  );
}
