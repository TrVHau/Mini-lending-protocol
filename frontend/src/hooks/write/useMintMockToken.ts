import { useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { ERC20_ABI } from "../../config/contracts";

function useMintMockToken(
  tokenAddress: `0x${string}` | null | undefined,
  recipient: `0x${string}` | null | undefined,
  amount: bigint | null | undefined,
) {
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
