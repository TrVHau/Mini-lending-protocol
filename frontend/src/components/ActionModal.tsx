// ActionModal: form Deposit / Withdraw / Borrow / Repay cho 1 asset.
// Hỗ trợ approve flow: kiểm tra allowance → approve trước → rồi mới execute.

import { useEffect, useState } from "react";
import { useAccount } from "wagmi";
import {
  useAllowance,
  useApprove,
  useDeposit,
  useWithdraw,
  useBorrow,
  useRepay,
  useTokenBalance,
  useUserReserveData,
} from "../hooks";
import { LENDING_POOL_ADDRESS } from "../config/contracts";

export type ActionType = "deposit" | "withdraw" | "borrow" | "repay";

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
  deposit: "Nạp",
  withdraw: "Rút",
  borrow: "Vay",
  repay: "Trả nợ",
};

const ACTION_COLOR: Record<ActionType, string> = {
  deposit: "bg-emerald-500 hover:bg-emerald-600",
  withdraw: "bg-amber-500 hover:bg-amber-600",
  borrow: "bg-blue-500 hover:bg-blue-600",
  repay: "bg-purple-500 hover:bg-purple-600",
};

function parseAmount(raw: string, decimals: number): bigint {
  try {
    const [int, frac = ""] = raw.split(".");
    const fracPadded = frac.padEnd(decimals, "0").slice(0, decimals);
    return BigInt(int + fracPadded);
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

export default function ActionModal({
  isOpen,
  onClose,
  assetAddress,
  assetSymbol,
  assetDecimals,
  action,
}: Props) {
  const { address } = useAccount();
  const [rawInput, setRawInput] = useState("");
  const [step, setStep] = useState<
    "input" | "approving" | "executing" | "done"
  >("input");

  const amountBig = rawInput ? parseAmount(rawInput, assetDecimals) : 0n;

  // ---- Read data ----
  const { balance: walletBalance } = useTokenBalance(address, assetAddress);
  const { userReserveData } = useUserReserveData(address, assetAddress);

  // Allowance chỉ cần cho deposit & repay (cần transferFrom token vào pool)
  const needsApproval = action === "deposit" || action === "repay";
  const { allowance, isLoading: allowanceLoading } = useAllowance(
    needsApproval ? address : null,
    needsApproval ? LENDING_POOL_ADDRESS : null,
    needsApproval ? assetAddress : null,
  );

  // ---- Write hooks ----
  const approve = useApprove(assetAddress, LENDING_POOL_ADDRESS, amountBig);
  const deposit = useDeposit(assetAddress, amountBig);
  const withdraw = useWithdraw(assetAddress, amountBig);
  const borrow = useBorrow(assetAddress, amountBig);
  const repay = useRepay(assetAddress, amountBig);

  const actionHook = { deposit, withdraw, borrow, repay }[action];

  // ---- State transitions ----
  useEffect(() => {
    if (approve.isSuccess && step === "approving") {
      setStep("executing");
    }
  }, [approve.isSuccess, step]);

  useEffect(() => {
    if (actionHook.isSuccess && step === "executing") {
      setStep("done");
    }
  }, [actionHook.isSuccess, step]);

  // Reset when modal reopens
  useEffect(() => {
    if (isOpen) {
      setRawInput("");
      setStep("input");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isApproved =
    !needsApproval ||
    allowanceLoading ||
    allowance === null ||
    (allowance as bigint) >= amountBig;

  function handleSubmit() {
    if (amountBig === 0n) return;

    if (needsApproval && !isApproved) {
      setStep("approving");
      approve.approve();
    } else {
      setStep("executing");
      const fn = {
        deposit: deposit.deposit,
        withdraw: withdraw.withdraw,
        borrow: borrow.borrow,
        repay: repay.repay,
      }[action];
      fn();
    }
  }

  function handleClose() {
    setRawInput("");
    setStep("input");
    onClose();
  }

  const maxAmount = (() => {
    if (action === "deposit" || action === "withdraw" || action === "repay") {
      if (action === "deposit" && walletBalance !== null)
        return formatAmount(walletBalance as bigint, assetDecimals);
      if (action === "withdraw" && userReserveData)
        return formatAmount(userReserveData.collateralAmount, assetDecimals);
      if (action === "repay" && userReserveData)
        return formatAmount(userReserveData.debtAmount, assetDecimals);
    }
    return null;
  })();

  const isPending =
    step === "approving"
      ? approve.isPending || approve.isConfirming
      : step === "executing"
        ? actionHook.isPending || actionHook.isConfirming
        : false;

  const txError = step === "approving" ? approve.error : actionHook.error;

  const btnLabel = () => {
    if (step === "done") return "✓ Thành công!";
    if (step === "approving")
      return approve.isConfirming ? "Đang xác nhận approve…" : "Đang approve…";
    if (step === "executing")
      return actionHook.isConfirming ? "Đang xác nhận giao dịch…" : "Đang gửi…";
    if (!isApproved) return `Approve ${assetSymbol}`;
    return `${LABEL[action]} ${assetSymbol}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-50">
            {LABEL[action]}{" "}
            <span className="text-slate-400">{assetSymbol}</span>
          </h2>
          <button
            onClick={handleClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-800 hover:text-slate-100"
          >
            ✕
          </button>
        </div>

        {step === "done" ? (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl">
              ✓
            </div>
            <p className="text-lg font-semibold text-emerald-400">
              Giao dịch thành công!
            </p>
            <button
              onClick={handleClose}
              className="mt-2 rounded-lg bg-slate-800 px-6 py-2 text-sm text-slate-200 hover:bg-slate-700"
            >
              Đóng
            </button>
          </div>
        ) : (
          <>
            {/* Balance info */}
            <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-800/60 px-4 py-2 text-xs text-slate-400">
              <span>
                {action === "deposit"
                  ? "Số dư ví"
                  : action === "withdraw"
                    ? "Collateral"
                    : action === "repay"
                      ? "Nợ hiện tại"
                      : "Có thể vay"}
              </span>
              <span className="font-mono text-slate-200">
                {maxAmount ?? "--"} {assetSymbol}
              </span>
            </div>

            {/* Input */}
            <div className="mb-2 flex items-center overflow-hidden rounded-xl border border-slate-700 bg-slate-800 focus-within:border-blue-500">
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0.00"
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                className="flex-1 bg-transparent px-4 py-3 text-lg font-semibold text-slate-50 outline-none placeholder:text-slate-600"
              />
              <div className="flex items-center gap-2 pr-4">
                {maxAmount && (
                  <button
                    type="button"
                    onClick={() => setRawInput(maxAmount)}
                    className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300 hover:bg-slate-600"
                  >
                    MAX
                  </button>
                )}
                <span className="text-sm font-medium text-slate-400">
                  {assetSymbol}
                </span>
              </div>
            </div>

            {/* Approve progress indicator */}
            {needsApproval && amountBig > 0n && !isApproved && (
              <div className="mb-3 flex items-center gap-2 rounded-lg bg-amber-900/30 border border-amber-700/50 px-3 py-2 text-xs text-amber-300">
                <span>⚠</span>
                <span>
                  Cần approve trước khi {LABEL[action].toLowerCase()}. 2 bước:
                  Approve → {LABEL[action]}.
                </span>
              </div>
            )}

            {/* Error */}
            {txError && (
              <div className="mb-3 rounded-lg bg-red-900/30 border border-red-700/50 px-3 py-2 text-xs text-red-300">
                {txError.message?.split("(")[0] ?? "Giao dịch thất bại"}
              </div>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={
                amountBig === 0n || isPending || (step as string) === "done"
              }
              className={`mt-3 w-full rounded-xl py-3 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40 ${ACTION_COLOR[action]}`}
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
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
