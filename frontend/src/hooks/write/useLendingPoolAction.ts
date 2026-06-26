// Purpose:
// - Send one core LendingPool action transaction.
// Input:
// - action: supply / withdraw / borrow / repay.
// - assetAddress, amount.
// Guard:
// - Only writes when asset exists and amount > 0.
// Contract:
// - LendingPool.deposit/withdraw/borrow/repay(asset, amount).
// Transform:
// - Tracks tx hash and receipt status.
// - Invalidates query caches on success so balances, reserves, and positions refetch.
// Return:
// - { execute, canExecute, hash, isPending, isConfirming, isSuccess, error }

import { useEffect } from "react";
import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";
import useInvalidateQueries from "../useInvalidateQueries";

export type LendingPoolActionName = "supply" | "withdraw" | "borrow" | "repay";

const CONTRACT_FUNCTION: Record<
  LendingPoolActionName,
  "deposit" | "withdraw" | "borrow" | "repay"
> = {
  supply: "deposit",
  withdraw: "withdraw",
  borrow: "borrow",
  repay: "repay",
};

function useLendingPoolAction(
  action: LendingPoolActionName,
  assetAddress: `0x${string}` | null | undefined,
  amount: bigint | null | undefined,
) {
  const invalidate = useInvalidateQueries();
  const tx = useWriteContract();
  const hash = tx.data;

  const {
    isLoading: isConfirming,
    isSuccess,
    error: confirmError,
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash,
    },
  });

  useEffect(() => {
    if (isSuccess) invalidate();
  }, [isSuccess]); // eslint-disable-line react-hooks/exhaustive-deps

  const canExecute =
    !!assetAddress && amount !== null && amount !== undefined && amount > 0n;

  function execute() {
    if (!canExecute) return;

    tx.mutate({
      address: LENDING_POOL_ADDRESS,
      abi: LENDING_POOL_ABI,
      functionName: CONTRACT_FUNCTION[action],
      args: [assetAddress, amount],
    });
  }

  return {
    execute,
    canExecute,
    hash,
    isPending: tx.isPending,
    isConfirming,
    isSuccess,
    error: tx.error || confirmError,
  };
}

export default useLendingPoolAction;
