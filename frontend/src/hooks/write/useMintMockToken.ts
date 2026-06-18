// Purpose:
// - Tao transaction mint MockERC20 token cho recipient (dung cho Faucet).
// Input:
// - tokenAddress, recipient, amount.
// Guard:
// - Chi goi write khi du input va amount > 0.
// Contract:
// - MockERC20.mint(to, amount).
// Transform:
// - Theo doi hash va trang thai confirm transaction.
// - Invalidate all query caches on success so wallet balance refetches.
// Return:
// - { mint, canMint, hash, isPending, isConfirming, isSuccess, error }

import { useEffect } from "react";
import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ERC20_ABI } from "../../config/contracts";
import useInvalidateQueries from "../useInvalidateQueries";

function useMintMockToken(
  tokenAddress: `0x${string}` | null | undefined,
  recipient: `0x${string}` | null | undefined,
  amount: bigint | null | undefined,
) {
  const invalidate = useInvalidateQueries();
  const mintTx = useWriteContract();
  const hash = mintTx.data;

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

  const canMint =
    !!tokenAddress &&
    !!recipient &&
    amount !== null &&
    amount !== undefined &&
    amount > 0n;

  function mint() {
    if (!canMint) return;

    mintTx.mutate({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "mint",
      args: [recipient, amount],
    });
  }

  return {
    mint,
    canMint,
    hash,
    isPending: mintTx.isPending,
    isConfirming,
    isSuccess,
    error: mintTx.error || confirmError,
  };
}

export default useMintMockToken;
