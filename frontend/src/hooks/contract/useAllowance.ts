// Purpose:
// - Doc allowance ERC20 cua user cho spender (thuong la LendingPool).
// Input:
// - ownerAddress: dia chi user.
// - spenderAddress: dia chi spender.
// - tokenAddress: dia chi token ERC20.
// Guard:
// - Chi goi contract khi du input.
// Contract:
// - ERC20.allowance(owner, spender).
// Transform:
// - Chuyen undefined thanh null de UI de xu ly.
// Return:
// - { allowance, isLoading, error }

import { useReadContract } from "wagmi";
import { ERC20_ABI } from "../../config/contracts";

function useAllowance(
  ownerAddress: `0x${string}` | null | undefined,
  spenderAddress: `0x${string}` | null | undefined,
  tokenAddress: `0x${string}` | null | undefined,
) {
  const { data, isLoading, error } = useReadContract({
    address: tokenAddress || "0x0000000000000000000000000000000000000000",
    abi: ERC20_ABI,
    functionName: "allowance",
    args:
      ownerAddress && spenderAddress
        ? [ownerAddress, spenderAddress]
        : [
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",
          ],
    query: {
      enabled: !!ownerAddress && !!spenderAddress && !!tokenAddress,
    },
  });

  return { allowance: data ?? null, isLoading, error };
}

export default useAllowance;
