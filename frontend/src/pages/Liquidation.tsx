// Liquidation page: tìm các vị thế có Health Factor < 1 và cho phép thanh lý.
// Hiện tại dùng địa chỉ nhập tay (vì không có subgraph để list tất cả users).

import { useState } from "react";
import { useAccount } from "wagmi";
import Navbar from "../components/Navbar";
import { useHealthFactor, useUserReserveData, useMarketOverview, useAllowance, useApprove, useLiquidate } from "../hooks";
import { LENDING_POOL_ADDRESS } from "../config/contracts";

const WAD = 1e18;

function formatHF(hf: bigint): { label: string; color: string } {
  const isMax = hf === BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff");
  if (isMax) return { label: "∞ (An toàn)", color: "text-emerald-400" };
  const val = Number(hf) / WAD;
  const label = val.toFixed(4);
  if (val < 1) return { label, color: "text-red-400" };
  if (val < 1.2) return { label, color: "text-yellow-400" };
  return { label, color: "text-emerald-400" };
}

function formatToken(amount: bigint, decimals: number): string {
  const val = Number(amount) / 10 ** decimals;
  return val.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

// Sub-component: hiển thị position của 1 asset của target user
interface AssetInfoProps {
  asset: `0x${string}`;
  symbol: string;
  decimals: number;
  userAddress: `0x${string}`;
}

function AssetInfo({ asset, symbol, decimals, userAddress }: AssetInfoProps) {
  const { userReserveData } = useUserReserveData(userAddress, asset);
  if (!userReserveData) return null;
  if (userReserveData.collateralAmount === 0n && userReserveData.debtAmount === 0n) return null;

  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-800/60 px-4 py-2 text-sm">
      <span className="font-medium text-slate-300">{symbol}</span>
      <div className="flex gap-6 text-xs">
        <div>
          <span className="text-slate-500">Collateral: </span>
          <span className="text-emerald-400">{formatToken(userReserveData.collateralAmount, decimals)} {symbol}</span>
        </div>
        <div>
          <span className="text-slate-500">Nợ: </span>
          <span className="text-red-400">{formatToken(userReserveData.debtAmount, decimals)} {symbol}</span>
        </div>
      </div>
    </div>
  );
}

function Liquidation() {
  const { address } = useAccount();
  const { reserves, reserveDataByAsset, tokenMetaByAsset } = useMarketOverview();

  const [targetAddress, setTargetAddress] = useState("");
  const [searched, setSearched] = useState(false);

  const [collateralAsset, setCollateralAsset] = useState<`0x${string}` | "">("");
  const [debtAsset, setDebtAsset] = useState<`0x${string}` | "">("");
  const [debtAmount, setDebtAmount] = useState("");

  const validTarget = /^0x[0-9a-fA-F]{40}$/.test(targetAddress)
    ? (targetAddress as `0x${string}`)
    : null;

  const { healthFactor } = useHealthFactor(searched ? validTarget : null);

  const selectedDebtReserve = debtAsset ? reserveDataByAsset?.[debtAsset] : null;
  const debtDecimals = Number(selectedDebtReserve?.assetDecimals ?? 18);
  const debtSymbol = debtAsset ? (tokenMetaByAsset?.[debtAsset]?.symbol ?? "TOKEN") : "";

  const debtAmountBig = (() => {
    if (!debtAmount) return 0n;
    try {
      const [int, frac = ""] = debtAmount.split(".");
      const fracPadded = frac.padEnd(debtDecimals, "0").slice(0, debtDecimals);
      return BigInt(int + fracPadded);
    } catch {
      return 0n;
    }
  })();

  // Allowance & Approve for debt token
  const { allowance } = useAllowance(address, LENDING_POOL_ADDRESS, debtAsset || null);
  const approve = useApprove(
    debtAsset || null,
    LENDING_POOL_ADDRESS,
    debtAmountBig
  );

  const liquidate = useLiquidate(
    collateralAsset || null,
    debtAsset || null,
    validTarget,
    debtAmountBig
  );

  const needsApprove = allowance !== null && (allowance as bigint) < debtAmountBig;

  const hfDisplay = healthFactor !== null ? formatHF(healthFactor as bigint) : null;
  const canBeLiquidated =
    healthFactor !== null &&
    healthFactor !== BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff") &&
    Number(healthFactor as bigint) / WAD < 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 md:pl-72">
      <Navbar />
      <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Liquidation</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-50">Thanh lý vị thế</h1>
          <p className="mt-1 text-sm text-slate-400">
            Nhập địa chỉ ví cần kiểm tra. Nếu Health Factor &lt; 1, bạn có thể thanh lý.
          </p>
        </div>

        {/* Search target */}
        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Địa chỉ ví cần kiểm tra
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="0x..."
              value={targetAddress}
              onChange={(e) => { setTargetAddress(e.target.value); setSearched(false); }}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 font-mono text-sm text-slate-100 outline-none focus:border-blue-500 placeholder:text-slate-600"
            />
            <button
              onClick={() => setSearched(true)}
              disabled={!validTarget}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
            >
              Tìm kiếm
            </button>
          </div>
        </div>

        {/* Health Factor result */}
        {searched && validTarget && (
          <div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase tracking-widest">Health Factor</p>
                <p className={`mt-1 text-3xl font-bold ${hfDisplay?.color ?? "text-slate-400"}`}>
                  {hfDisplay?.label ?? "Đang tải…"}
                </p>
              </div>
              {canBeLiquidated && (
                <span className="rounded-full bg-red-500/20 px-4 py-1.5 text-sm font-semibold text-red-400 border border-red-500/30">
                  ⚠ Có thể thanh lý
                </span>
              )}
              {hfDisplay && !canBeLiquidated && (
                <span className="rounded-full bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400 border border-emerald-500/20">
                  ✓ An toàn
                </span>
              )}
            </div>

            {/* Asset positions of target */}
            <div className="flex flex-col gap-2 mt-4">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 mb-1">Vị thế</p>
              {reserves.map((asset) => {
                const meta = tokenMetaByAsset?.[asset];
                const reserve = reserveDataByAsset?.[asset];
                const symbol = meta?.symbol ?? asset.slice(2, 6).toUpperCase();
                const decimals = Number(reserve?.assetDecimals ?? 18);
                return (
                  <AssetInfo key={asset} asset={asset} symbol={symbol} decimals={decimals} userAddress={validTarget} />
                );
              })}
            </div>
          </div>
        )}

        {/* Liquidation form — only shown if can be liquidated */}
        {searched && canBeLiquidated && (
          <div className="rounded-xl border border-red-800/50 bg-red-950/20 p-6">
            <h2 className="mb-5 text-base font-semibold text-red-300">⚡ Thực hiện thanh lý</h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Collateral asset */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Collateral asset (tài sản nhận)
                </label>
                <select
                  value={collateralAsset}
                  onChange={(e) => setCollateralAsset(e.target.value as `0x${string}`)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-red-500"
                >
                  <option value="">-- Chọn asset --</option>
                  {reserves.map((a) => (
                    <option key={a} value={a}>
                      {tokenMetaByAsset?.[a]?.symbol ?? a.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Debt asset */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Debt asset (tài sản trả nợ)
                </label>
                <select
                  value={debtAsset}
                  onChange={(e) => setDebtAsset(e.target.value as `0x${string}`)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-red-500"
                >
                  <option value="">-- Chọn asset --</option>
                  {reserves.map((a) => (
                    <option key={a} value={a}>
                      {tokenMetaByAsset?.[a]?.symbol ?? a.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Debt amount */}
            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Số lượng nợ cần cover {debtSymbol && `(${debtSymbol})`}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={debtAmount}
                onChange={(e) => setDebtAmount(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-slate-100 outline-none focus:border-red-500 placeholder:text-slate-600"
              />
            </div>

            {/* Error */}
            {(approve.error || liquidate.error) && (
              <div className="mt-3 rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-xs text-red-300">
                {(approve.error?.message || liquidate.error?.message)?.split("(")[0] ?? "Giao dịch thất bại"}
              </div>
            )}

            {liquidate.isSuccess && (
              <div className="mt-3 rounded-lg bg-emerald-900/30 border border-emerald-700/50 px-3 py-2 text-sm text-emerald-300 text-center font-semibold">
                ✓ Thanh lý thành công!
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 flex gap-3">
              {needsApprove && (
                <button
                  onClick={() => approve.approve()}
                  disabled={debtAmountBig === 0n || approve.isPending || approve.isConfirming}
                  className="flex-1 rounded-xl bg-amber-500 py-3 text-sm font-semibold text-white hover:bg-amber-600 disabled:opacity-40 transition-colors"
                >
                  {approve.isConfirming ? "Đang xác nhận…" : approve.isPending ? "Đang approve…" : `Approve ${debtSymbol}`}
                </button>
              )}
              <button
                onClick={() => liquidate.liquidate()}
                disabled={
                  !collateralAsset ||
                  !debtAsset ||
                  debtAmountBig === 0n ||
                  (needsApprove && !approve.isSuccess) ||
                  liquidate.isPending ||
                  liquidate.isConfirming
                }
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                {liquidate.isConfirming
                  ? "Đang xác nhận…"
                  : liquidate.isPending
                  ? "Đang gửi…"
                  : "⚡ Thanh lý"}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default Liquidation;
