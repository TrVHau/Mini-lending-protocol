import { useEffect, useRef, useState } from "react";
import { useConnection as useAccount } from "wagmi";
import {
  useAllowance,
  useAssetPrice,
  useApprove,
  useLendingPoolAction,
  useReserveData,
  useTokenBalance,
  useUserAccountData,
  useUserReserveData,
} from "../hooks";
import { LENDING_POOL_ADDRESS } from "../config/contracts";

export type ActionType = "supply" | "withdraw" | "borrow" | "repay";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  assetAddress: `0x${string}`;
  assetSymbol: string;
  assetDecimals: number;
  aTokenAddress?: `0x${string}`;
  action: ActionType;
}

const LABEL: Record<ActionType, string> = {
  supply: "Supply",
  withdraw: "Withdraw",
  borrow: "Borrow",
  repay: "Repay",
};

const BALANCE_LABEL: Record<ActionType, string> = {
  supply: "Wallet balance",
  withdraw: "Available to withdraw",
  borrow: "Available to borrow",
  repay: "Borrow balance",
};

const ACTION_COLOR: Record<ActionType, string> = {
  supply: "bg-emerald-400 text-slate-950 hover:bg-emerald-300",
  withdraw: "bg-slate-700 text-slate-50 hover:bg-slate-600",
  borrow: "bg-cyan-400 text-slate-950 hover:bg-cyan-300",
  repay: "bg-slate-700 text-slate-50 hover:bg-slate-600",
};

const WAD = 1e18;
const WAD_BIG = 10n ** 18n;
const BPS = 10_000n;
const MAX_UINT =
  "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
const MAX_UINT256 = 2n ** 256n - 1n;

function parseAmount(raw: string, decimals: number): bigint {
  try {
    const [int, frac = ""] = raw.split(".");
    const cleanInt = int === "" || int === "-" ? "0" : int;
    const fracPadded = frac.padEnd(decimals, "0").slice(0, decimals);
    const result = BigInt(cleanInt + fracPadded);
    return result >= 0n ? result : 0n;
  } catch {
    return 0n;
  }
}

function formatAmount(raw: bigint, decimals: number): string {
  const divisor = 10n ** BigInt(decimals);
  const int = raw / divisor;
  const frac = raw % divisor;
  if (frac === 0n) return int.toString();
  return `${int}.${frac.toString().padStart(decimals, "0").replace(/0+$/, "")}`;
}

function formatHealthFactor(hf?: bigint): string {
  if (!hf) return "--";
  if (hf === BigInt(MAX_UINT)) return "Max";
  return (Number(hf) / WAD).toFixed(2);
}

function usdWadToAssetAmount(
  usdWad: bigint,
  priceWad: bigint,
  decimals: number,
) {
  if (priceWad === 0n) return 0n;

  const amountWad = (usdWad * WAD_BIG) / priceWad;
  if (decimals === 18) return amountWad;
  if (decimals < 18) return amountWad / 10n ** BigInt(18 - decimals);
  return amountWad * 10n ** BigInt(decimals - 18);
}

export default function ActionModal({
  isOpen,
  onClose,
  assetAddress,
  assetSymbol,
  assetDecimals,
  aTokenAddress,
  action,
}: Props) {
  const { address } = useAccount();
  const [rawInput, setRawInput] = useState("");
  const submittedAmountRef = useRef<bigint | null>(null);
  const [maxMode, setMaxMode] = useState<"none" | "repayAll" | "withdrawAll">(
    "none",
  );
  const [step, setStep] = useState<
    "input" | "approving" | "executing" | "done"
  >("input");

  // Repay-all and withdraw-all support the Aave-style uint256.max sentinel.
  // Supply and borrow MAX use frontend-computed exact amounts.
  const parsedInput = rawInput ? parseAmount(rawInput, assetDecimals) : 0n;
  const amountBig =
    maxMode === "repayAll" || maxMode === "withdrawAll"
      ? MAX_UINT256
      : parsedInput;
  const activeAmountBig = submittedAmountRef.current ?? amountBig;

  const { accountData } = useUserAccountData(address);
  const { reserveData } = useReserveData(assetAddress);
  const { balance: walletBalance } = useTokenBalance(address, assetAddress);
  const { balance: reserveLiquidity } = useTokenBalance(
    action === "borrow" ? aTokenAddress : null,
    action === "borrow" ? assetAddress : null,
  );
  const { userReserveData } = useUserReserveData(address, assetAddress);
  const { priceWad } = useAssetPrice(assetAddress);

  const needsApproval = action === "supply" || action === "repay";
  const {
    allowance,
    isLoading: allowanceLoading,
    error: allowanceError,
  } = useAllowance(
    needsApproval ? address : null,
    needsApproval ? LENDING_POOL_ADDRESS : null,
    needsApproval ? assetAddress : null,
  );

  // For max-repay we must approve MAX_UINT256, not the cached debtAmount.
  // Reason: the contract's repay() calls transferFrom(user, aToken, liveDebt)
  // where liveDebt includes per-second interest accrued AFTER the approve tx.
  // If we approved only the cached amount, the transfer reverts with
  // "ERC20: insufficient allowance" even though the user intended a full repay.
  const approveAmount =
    maxMode === "repayAll" && action === "repay"
      ? MAX_UINT256
      : activeAmountBig;

  const approve = useApprove(assetAddress, LENDING_POOL_ADDRESS, approveAmount);
  const actionHook = useLendingPoolAction(
    action,
    assetAddress,
    activeAmountBig,
  );

  function executeAction() {
    actionHook.execute();
  }

  useEffect(() => {
    if (approve.isSuccess && step === "approving") {
      const tid = window.setTimeout(() => {
        setStep("executing");
        executeAction();
      }, 0);
      return () => clearTimeout(tid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [approve.isSuccess, step]);

  useEffect(() => {
    if (actionHook.isSuccess && step === "executing") {
      const tid = window.setTimeout(() => {
        setStep("done");
      }, 0);
      return () => clearTimeout(tid);
    }
  }, [actionHook.isSuccess, step]);

  useEffect(() => {
    if (isOpen) {
      submittedAmountRef.current = null;
      const tid = window.setTimeout(() => {
        setRawInput("");
        setMaxMode("none");
        setStep("input");
      }, 0);
      return () => clearTimeout(tid);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const allowanceBig = allowance as bigint | null;
  const supplyExceedsWallet =
    action === "supply" &&
    walletBalance !== null &&
    parsedInput > (walletBalance as bigint);
  const isAllowanceReady =
    !needsApproval || (!allowanceLoading && allowanceBig !== null);
  const isApproved =
    !needsApproval || (allowanceBig !== null && allowanceBig >= approveAmount);

  function handleSubmit() {
    if (!address) return;
    if (amountBig === 0n) return;
    if (supplyExceedsWallet) return;
    if (needsApproval && !isAllowanceReady) return;

    submittedAmountRef.current = amountBig;

    if (needsApproval && !isApproved) {
      setStep("approving");
      approve.approve();
      return;
    }

    setStep("executing");
    executeAction();
  }

  function handleClose() {
    submittedAmountRef.current = null;
    setRawInput("");
    setMaxMode("none");
    setStep("input");
    onClose();
  }

  const maxAmountBig = (() => {
    if (action === "supply" && walletBalance !== null) {
      return walletBalance as bigint;
    }
    if (action === "withdraw" && userReserveData) {
      const suppliedAmount = userReserveData.collateralAmount;
      if (!accountData || !reserveData || accountData.debtUsdWad === 0n) {
        return suppliedAmount;
      }

      const thresholdBps = reserveData.liquidationThresholdBps;
      if (
        thresholdBps === 0n ||
        !priceWad ||
        priceWad === 0n ||
        accountData.healthFactorWad <= WAD_BIG
      ) {
        return 0n;
      }

      // Estimate the asset-specific amount that can be withdrawn while keeping
      // health factor >= 1. The contract remains the final authority.
      const liquidationThresholdUsdWad =
        (accountData.healthFactorWad * accountData.debtUsdWad) / WAD_BIG;
      if (liquidationThresholdUsdWad <= accountData.debtUsdWad) return 0n;

      const removableThresholdUsdWad =
        liquidationThresholdUsdWad - accountData.debtUsdWad;
      const removableCollateralUsdWad =
        (removableThresholdUsdWad * BPS) / thresholdBps;
      const cappedWithdrawUsdWad =
        removableCollateralUsdWad < userReserveData.collateralUsdWad
          ? removableCollateralUsdWad
          : userReserveData.collateralUsdWad;

      let withdrawAmount = usdWadToAssetAmount(
        cappedWithdrawUsdWad,
        priceWad,
        assetDecimals,
      );
      if (withdrawAmount > suppliedAmount) withdrawAmount = suppliedAmount;

      // Stay just inside the boundary to avoid a one-unit rounding mismatch in
      // the on-chain health-factor check.
      if (withdrawAmount > 0n && withdrawAmount < suppliedAmount) {
        withdrawAmount -= 1n;
      }

      return withdrawAmount;
    }
    if (action === "repay" && userReserveData) {
      // Display known debt; submitting MAX sends uint256.max under the hood.
      return userReserveData.debtAmount;
    }
    if (
      action === "borrow" &&
      accountData &&
      priceWad !== undefined &&
      priceWad > 0n
    ) {
      const availableBorrowUsdWad =
        accountData.maxBorrowUsdWad > accountData.debtUsdWad
          ? accountData.maxBorrowUsdWad - accountData.debtUsdWad
          : 0n;
      if (availableBorrowUsdWad === 0n) return 0n;

      const borrowCapacityRaw = usdWadToAssetAmount(
        availableBorrowUsdWad,
        priceWad,
        assetDecimals,
      );
      // Subtract 1 unit (smallest denomination) to avoid landing exactly on the
      // collateral ceiling — the contract's _assetToUsdWad can round up by 1 wei,
      // causing an INSUFFICIENT_COLLATERAL revert at the exact boundary.
      const borrowCapacity =
        borrowCapacityRaw > 1n ? borrowCapacityRaw - 1n : borrowCapacityRaw;

      const liquidity = reserveLiquidity as bigint | null;
      const maxBorrow =
        liquidity !== null && liquidity < borrowCapacity
          ? liquidity
          : borrowCapacity;

      return maxBorrow;
    }
    return null;
  })();

  const maxAmount =
    maxAmountBig !== null ? formatAmount(maxAmountBig, assetDecimals) : null;

  const maxHint = (() => {
    if (action === "supply") {
      return "MAX supplies your wallet balance.";
    }
    if (action === "withdraw") {
      return accountData && accountData.debtUsdWad > 0n
        ? "MAX estimates the largest safe withdrawal while keeping health factor above 1; if that is the full balance, it submits uint256.max."
        : "MAX submits uint256.max to withdraw your full supplied balance.";
    }
    if (action === "borrow") {
      return "MAX borrows up to your capacity, capped by reserve liquidity and rounded down slightly.";
    }
    if (action === "repay") {
      return "MAX submits uint256.max so the pool repays all live debt after interest accrues.";
    }
    return "";
  })();

  const isPending =
    step === "approving"
      ? approve.isPending || approve.isConfirming
      : step === "executing"
        ? actionHook.isPending || actionHook.isConfirming
        : false;

  const txError = step === "approving" ? approve.error : actionHook.error;
  const visibleAllowanceError = needsApproval ? allowanceError : undefined;

  const btnLabel = () => {
    if (step === "done") return "Transaction complete";
    if (step === "approving") {
      return approve.isConfirming ? "Confirming approval..." : "Approving...";
    }
    if (step === "executing") {
      return actionHook.isConfirming
        ? "Confirming transaction..."
        : "Submitting...";
    }
    if (!address) return "Connect wallet first";
    if (supplyExceedsWallet) return "Insufficient wallet balance";
    if (visibleAllowanceError) return "Allowance unavailable";
    if (needsApproval && !isAllowanceReady) return "Checking allowance...";
    if (!isApproved) return `Approve ${assetSymbol}`;
    return `${LABEL[action]} ${assetSymbol}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-lg border border-slate-700 bg-slate-950 p-6 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-50">
            {LABEL[action]}{" "}
            <span className="text-slate-400">{assetSymbol}</span>
          </h2>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
            aria-label="Close modal"
          >
            X
          </button>
        </div>

        {step === "done" ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/15 text-2xl font-semibold text-emerald-300">
              OK
            </div>
            <p className="text-lg font-semibold text-emerald-300">
              Transaction submitted successfully.
            </p>
            <button
              onClick={handleClose}
              className="mt-2 rounded-lg bg-slate-800 px-6 py-2 text-sm text-slate-200 transition-colors hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-900 px-4 py-2 text-xs text-slate-400">
              <span>{BALANCE_LABEL[action]}</span>
              <span className="font-mono text-slate-200">
                {maxAmount ?? "--"} {assetSymbol}
              </span>
            </div>

            <div className="mb-2 flex items-center overflow-hidden rounded-lg border border-slate-700 bg-slate-900 focus-within:border-cyan-400">
              <input
                type="text"
                inputMode="decimal"
                min="0"
                step="any"
                placeholder="0.00"
                value={rawInput}
                onChange={(event) => {
                  setRawInput(event.target.value);
                  setMaxMode("none"); // manual edit cancels MAX sentinel mode
                }}
                className="min-w-0 flex-1 bg-transparent px-4 py-3 text-lg font-semibold text-slate-50 outline-none placeholder:text-slate-600"
              />
              <div className="flex items-center gap-2 pr-4">
                {maxAmountBig !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setRawInput(maxAmount ?? "0");
                      setMaxMode(
                        action === "repay" && maxAmountBig > 0n
                          ? "repayAll"
                          : action === "withdraw" &&
                              userReserveData &&
                              userReserveData.collateralAmount > 0n &&
                              maxAmountBig === userReserveData.collateralAmount
                            ? "withdrawAll"
                            : "none",
                      );
                    }}
                    className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300 transition-colors hover:bg-slate-600"
                  >
                    MAX
                  </button>
                )}
                <span className="text-sm font-medium text-slate-400">
                  {assetSymbol}
                </span>
              </div>
            </div>

            {maxAmountBig !== null && (
              <p className="mb-3 text-xs text-slate-500">{maxHint}</p>
            )}

            <div className="mb-3 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Health factor</span>
                <span className="text-slate-400">Before - After</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm font-semibold">
                <span className="text-slate-100">
                  {formatHealthFactor(accountData?.healthFactorWad)}
                </span>
                <span className="text-slate-500">to</span>
                <span className="text-cyan-300">Updates on-chain</span>
              </div>
            </div>

            {needsApproval &&
              amountBig > 0n &&
              isAllowanceReady &&
              !isApproved && (
                <div className="mb-3 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
                  This action needs token approval before the transaction.
                </div>
              )}

            {supplyExceedsWallet && (
              <div className="mb-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                Amount is greater than your wallet balance.
              </div>
            )}

            {(txError || visibleAllowanceError) && (
              <div className="mb-3 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 text-xs text-red-200">
                {(txError || visibleAllowanceError)?.message?.split("(")[0] ??
                  "Transaction failed"}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={
                amountBig === 0n ||
                !address ||
                supplyExceedsWallet ||
                isPending ||
                (step as string) === "done" ||
                (needsApproval && !isAllowanceReady)
              }
              className={`mt-3 w-full rounded-lg py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${ACTION_COLOR[action]}`}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {btnLabel()}
                </span>
              ) : (
                btnLabel()
              )}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
