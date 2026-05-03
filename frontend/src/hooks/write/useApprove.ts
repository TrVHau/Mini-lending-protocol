// Purpose:
// - Tao transaction approve ERC20 cho spender, thuong la LendingPool.
// Input:
// - tokenAddress, spenderAddress, amount.
// Guard:
// - Chi goi write khi du input va amount > 0.
// Contract:
// - ERC20.approve(spender, amount).
// Transform:
// - Theo doi hash va trang thai confirm transaction.
// Return:
// - { approve, canApprove, hash, isPending, isConfirming, isSuccess, error }

import { useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { ERC20_ABI } from "../../config/contracts";

function useApprove(
  tokenAddress: `0x${string}` | null | undefined,
  spenderAddress: `0x${string}` | null | undefined,
  amount: bigint | null | undefined,
) {
  const approveTx = useWriteContract();

  const hash = approveTx.data;

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

  const canApprove =
    !!tokenAddress &&
    !!spenderAddress &&
    amount !== null &&
    amount !== undefined &&
    amount > 0n;

  function approve() {
    if (!canApprove) return;

    approveTx.mutate({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [spenderAddress, amount],
    });
  }

  return {
    approve,
    canApprove,
    hash,
    isPending: approveTx.isPending,
    isConfirming,
    isSuccess,
    error: approveTx.error || confirmError,
  };
}

export default useApprove;
