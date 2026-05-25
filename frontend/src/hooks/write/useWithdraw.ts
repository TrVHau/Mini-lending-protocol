// Purpose:
// - Tao transaction rut collateral khoi LendingPool.
// Input:
// - assetAddress, amount.
// Guard:
// - Chi goi write khi amount > 0 va co account dang ket noi.
// Contract:
// - LendingPool.withdraw(asset, amount).
// Transform:
// - Theo doi hash va trang thai confirm transaction.
// Return:
// - { withdraw, hash, isPending, isSuccess, error }

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";

function useWithdraw(
  assetAddress: `0x${string}` | null | undefined,
  amount: bigint | null | undefined,
) {
  const withdrawTx = useWriteContract();

  const hash = withdrawTx.data;

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

  const canWithdraw =
    !!assetAddress && amount !== null && amount !== undefined && amount > 0n;

  function withdraw() {
    if (!canWithdraw) return;

    withdrawTx.mutate({
      address: LENDING_POOL_ADDRESS,
      abi: LENDING_POOL_ABI,
      functionName: "withdraw",
      args: [assetAddress, amount],
    });
  }

  return {
    withdraw,
    canWithdraw,
    hash,
    isPending: withdrawTx.isPending,
    isConfirming,
    isSuccess,
    error: withdrawTx.error || confirmError,
  };
}

export default useWithdraw;
