// Purpose:
// - Doc so du ERC20 cua user theo tung token.
// Input:
// - userAddress: dia chi vi can truy van.
// - tokenAddress: dia chi token ERC20 can doc balance.
// Guard:
// - Chi goi contract khi userAddress ton tai va tokenAddress khong rong.
// Contract:
// - ERC20.balanceOf(userAddress).
// Transform:
// - Chuyen undefined thanh null de UI de xu ly.
// Return:
// - { balance, isLoading, error }

import { useReadContract } from "wagmi";
import { ERC20_ABI } from "../../config/contracts";

function useTokenBalance(
  userAddress: `0x${string}` | null | undefined,
  tokenAddress: `0x${string}` | null | undefined,
) {
  const { data, isLoading, error } = useReadContract({
    address: tokenAddress || "0x0000000000000000000000000000000000000000",
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [userAddress || "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!userAddress && !!tokenAddress },
  });

  return { balance: data ?? null, isLoading, error };
}

export default useTokenBalance;
