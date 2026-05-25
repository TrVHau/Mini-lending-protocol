// Purpose:
// - Tao transaction tra no cho asset da vay.
// Input:
// - assetAddress, amount.
// Guard:
// - Chi goi write khi amount > 0, da ket noi vi, va da approve token repay.
// Contract:
// - LendingPool.repay(asset, amount).
// Transform:
// - Theo doi hash va trang thai confirm transaction.
// Return:
// - { repay, hash, isPending, isSuccess, error }

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";

function useRepay(
  assetAddress: `0x${string}` | null | undefined,
  amount: bigint | null | undefined,
) {
  const repayTx = useWriteContract();

  const hash = repayTx.data;

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

  const canRepay =
    !!assetAddress && amount !== null && amount !== undefined && amount > 0n;

  function repay() {
    if (!canRepay) return;

    repayTx.mutate({
      address: LENDING_POOL_ADDRESS,
      abi: LENDING_POOL_ABI,
      functionName: "repay",
      args: [assetAddress, amount],
    });
  }

  return {
    repay,
    canRepay,
    hash,
    isPending: repayTx.isPending,
    isConfirming,
    isSuccess,
    error: repayTx.error || confirmError,
  };
}

export default useRepay;
