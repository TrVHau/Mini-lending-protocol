import { useState } from "react";
import { useAccount } from "wagmi";
import Navbar from "../components/Navbar";
import {
  useAllowance,
  useApprove,
  useHealthFactor,
  useLiquidate,
  useMarketOverview,
  useUserReserveData,
} from "../hooks";
import { LENDING_POOL_ADDRESS } from "../config/contracts";

const WAD = 1e18;
const MAX_UINT =
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";

function formatHealthFactor(hf: bigint): { label: string; color: string } {
  if (hf === BigInt(MAX_UINT)) {
    return { label: "Max", color: "text-emerald-300" };
  }
  const value = Number(hf) / WAD;
  if (value < 1) return { label: value.toFixed(4), color: "text-red-300" };
  if (value < 1.2) return { label: value.toFixed(4), color: "text-amber-300" };
  return { label: value.toFixed(4), color: "text-emerald-300" };
}

function formatToken(amount: bigint, decimals: number): string {
  const value = Number(amount) / 10 ** decimals;
  return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function parseTokenAmount(raw: string, decimals: number): bigint {
  if (!raw) return 0n;
  try {
    const [int, frac = ""] = raw.split(".");
    const fracPadded = frac.padEnd(decimals, "0").slice(0, decimals);
    return BigInt(int + fracPadded);
  } catch {
    return 0n;
  }
}

interface AssetInfoProps {
  asset: `0x${string}`;
  symbol: string;
  decimals: number;
  userAddress: `0x${string}`;
}

function AssetInfo({ asset, symbol, decimals, userAddress }: AssetInfoProps) {
  const { userReserveData } = useUserReserveData(userAddress, asset);
  if (!userReserveData) return null;
  if (
    userReserveData.collateralAmount === 0n &&
    userReserveData.debtAmount === 0n
  ) {
    return null;
  }

  return (
    <div className="grid gap-3 rounded-lg border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm sm:grid-cols-[auto_1fr] sm:items-center">
      <span className="font-semibold text-slate-200">{symbol}</span>
      <div className="grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <span className="text-slate-500">Collateral: </span>
          <span className="text-emerald-300">
            {formatToken(userReserveData.collateralAmount, decimals)} {symbol}
          </span>
        </div>
        <div>
          <span className="text-slate-500">Debt: </span>
          <span className="text-red-300">
            {formatToken(userReserveData.debtAmount, decimals)} {symbol}
          </span>
        </div>
      </div>
    </div>
  );
}

function Liquidation() {
  const { address } = useAccount();
  const { reserves, reserveDataByAsset, tokenMetaByAsset } =
    useMarketOverview();

  const [targetAddress, setTargetAddress] = useState("");
  const [searched, setSearched] = useState(false);
  const [collateralAsset, setCollateralAsset] = useState<`0x${string}` | "">(
    "",
  );
  const [debtAsset, setDebtAsset] = useState<`0x${string}` | "">("");
  const [debtAmount, setDebtAmount] = useState("");

  const validTarget = /^0x[0-9a-fA-F]{40}$/.test(targetAddress)
    ? (targetAddress as `0x${string}`)
    : null;

  const { healthFactor } = useHealthFactor(searched ? validTarget : null);
  const selectedDebtReserve = debtAsset ? reserveDataByAsset?.[debtAsset] : null;
  const debtDecimals = Number(selectedDebtReserve?.assetDecimals ?? 18);
  const debtSymbol = debtAsset
    ? (tokenMetaByAsset?.[debtAsset]?.symbol ?? "TOKEN")
    : "";
  const debtAmountBig = parseTokenAmount(debtAmount, debtDecimals);

  const { allowance } = useAllowance(
    address,
    LENDING_POOL_ADDRESS,
    debtAsset || null,
  );
  const approve = useApprove(
    debtAsset || null,
    LENDING_POOL_ADDRESS,
    debtAmountBig,
  );
  const liquidate = useLiquidate(
    collateralAsset || null,
    debtAsset || null,
    validTarget,
    debtAmountBig,
  );

  const needsApprove =
    allowance !== null && (allowance as bigint) < debtAmountBig;
  const hfDisplay =
    healthFactor !== null ? formatHealthFactor(healthFactor as bigint) : null;
  const canBeLiquidated =
    healthFactor !== null &&
    healthFactor !== BigInt(MAX_UINT) &&
    Number(healthFactor as bigint) / WAD < 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Navbar />
      <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
            Liquidation
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-50">
            Review unhealthy positions
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Enter a borrower address. If the health factor is below 1, you can
            repay debt and seize discounted collateral.
          </p>
        </div>

        <section className="mb-6 rounded-lg border border-slate-800 bg-slate-950/80 p-5">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Borrower address
          </label>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              placeholder="0x..."
              value={targetAddress}
              onChange={(event) => {
                setTargetAddress(event.target.value);
                setSearched(false);
              }}
              className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-cyan-400"
            />
            <button
              onClick={() => setSearched(true)}
              disabled={!validTarget}
              className="rounded-lg bg-cyan-400 px-5 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-cyan-300 disabled:opacity-40"
            >
              Check account
            </button>
          </div>
        </section>

        {searched && validTarget && (
          <section className="mb-6 rounded-lg border border-slate-800 bg-slate-950/80 p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-widest text-slate-500">
                  Health factor
                </p>
                <p
                  className={`mt-1 text-3xl font-semibold ${
                    hfDisplay?.color ?? "text-slate-400"
                  }`}
                >
                  {hfDisplay?.label ?? "Loading..."}
                </p>
              </div>
              {canBeLiquidated ? (
                <span className="rounded-full border border-red-400/30 bg-red-400/10 px-4 py-1.5 text-sm font-semibold text-red-300">
                  Eligible for liquidation
                </span>
              ) : (
                hfDisplay && (
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1.5 text-sm font-medium text-emerald-300">
                    Account is healthy
                  </span>
                )
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2">
              <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-slate-500">
                Target positions
              </p>
              {reserves.map((asset) => {
                const meta = tokenMetaByAsset?.[asset];
                const reserve = reserveDataByAsset?.[asset];
                const symbol = meta?.symbol ?? asset.slice(2, 6).toUpperCase();
                const decimals = Number(reserve?.assetDecimals ?? 18);
                return (
                  <AssetInfo
                    key={asset}
                    asset={asset}
                    symbol={symbol}
                    decimals={decimals}
                    userAddress={validTarget}
                  />
                );
              })}
            </div>
          </section>
        )}

        {searched && canBeLiquidated && (
          <section className="rounded-lg border border-red-400/30 bg-red-950/20 p-5">
            <h2 className="mb-5 text-base font-semibold text-red-200">
              Execute liquidation
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Collateral asset to receive
                </label>
                <select
                  value={collateralAsset}
                  onChange={(event) =>
                    setCollateralAsset(event.target.value as `0x${string}`)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-red-300"
                >
                  <option value="">Select asset</option>
                  {reserves.map((asset) => (
                    <option key={asset} value={asset}>
                      {tokenMetaByAsset?.[asset]?.symbol ?? asset.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-400">
                  Debt asset to repay
                </label>
                <select
                  value={debtAsset}
                  onChange={(event) =>
                    setDebtAsset(event.target.value as `0x${string}`)
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-slate-200 outline-none focus:border-red-300"
                >
                  <option value="">Select asset</option>
                  {reserves.map((asset) => (
                    <option key={asset} value={asset}>
                      {tokenMetaByAsset?.[asset]?.symbol ?? asset.slice(0, 8)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="mb-1.5 block text-xs font-medium text-slate-400">
                Debt amount to cover {debtSymbol && `(${debtSymbol})`}
              </label>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={debtAmount}
                onChange={(event) => setDebtAmount(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-2.5 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-red-300"
              />
            </div>

            {(approve.error || liquidate.error) && (
              <div className="mt-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                {(approve.error?.message || liquidate.error?.message)?.split(
                  "(",
                )[0] ?? "Transaction failed"}
              </div>
            )}

            {liquidate.isSuccess && (
              <div className="mt-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-center text-sm font-semibold text-emerald-200">
                Liquidation transaction submitted.
              </div>
            )}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              {needsApprove && (
                <button
                  onClick={() => approve.approve()}
                  disabled={
                    debtAmountBig === 0n ||
                    approve.isPending ||
                    approve.isConfirming
                  }
                  className="flex-1 rounded-lg bg-amber-300 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-200 disabled:opacity-40"
                >
                  {approve.isConfirming
                    ? "Confirming approval..."
                    : approve.isPending
                      ? "Approving..."
                      : `Approve ${debtSymbol}`}
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
                className="flex-1 rounded-lg bg-red-400 py-3 text-sm font-semibold text-slate-950 transition-colors hover:bg-red-300 disabled:opacity-40"
              >
                {liquidate.isConfirming
                  ? "Confirming transaction..."
                  : liquidate.isPending
                    ? "Submitting..."
                    : "Liquidate"}
              </button>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default Liquidation;
