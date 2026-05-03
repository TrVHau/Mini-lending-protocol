// Purpose:
// - Tao transaction vay tai san tu LendingPool.
// Input:
// - assetAddress, amount.
// Guard:
// - Chi goi write khi amount > 0 va co account dang ket noi.
// Contract:
// - LendingPool.borrow(asset, amount).
// Transform:
// - Theo doi hash va trang thai confirm transaction.
// Return:
// - { borrow, hash, isPending, isSuccess, error }

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";

function useBorrow(
  assetAddress: `0x${string}` | null | undefined,
  amount: bigint | null | undefined,
) {
  const borrowTx = useWriteContract();

  const hash = borrowTx.data;

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

  const canBorrow =
    !!assetAddress && amount !== null && amount !== undefined && amount > 0n;

  function borrow() {
    if (!canBorrow) return;

    borrowTx.mutate({
      address: LENDING_POOL_ADDRESS,
      abi: LENDING_POOL_ABI,
      functionName: "borrow",
      args: [assetAddress, amount],
    });
  }

  return {
    borrow,
    canBorrow,
    hash,
    isPending: borrowTx.isPending,
    isConfirming,
    isSuccess,
    error: borrowTx.error || confirmError,
  };
}

export default useBorrow;
