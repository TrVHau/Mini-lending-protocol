// Purpose:
// - Doc position cua user theo tung asset: collateral + debt (amount va USD).
// Input:
// - userAddress: dia chi user.
// - assetAddress: dia chi asset reserve.
// Guard:
// - Chi goi contract khi userAddress va assetAddress ton tai.
// Contract:
// - LendingPool.getUserReserveData(user, asset).
// Transform:
// - Map tuple thanh object co field ro rang cho UI.
// Return:
// - { userReserveData, isLoading, error }

import { useReadContract } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";
import { useMemo } from "react";

type UserReserveData = {
  collateralAmount: bigint;
  debtAmount: bigint;
  collateralUsdWad: bigint;
  debtUsdWad: bigint;
};

function useUserReserveData(
  userAddress: `0x${string}` | null | undefined,
  assetAddress: `0x${string}` | null | undefined,
) {
  const { data, isLoading, error } = useReadContract({
    address: LENDING_POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "getUserReserveData",
    args:
      userAddress && assetAddress
        ? [userAddress, assetAddress]
        : [
            "0x0000000000000000000000000000000000000000",
            "0x0000000000000000000000000000000000000000",
          ],
    query: { enabled: !!userAddress && !!assetAddress },
  });

  const userReserveData = useMemo(() => {
    if (!data) return undefined;
    const [collateralAmount, debtAmount, collateralUsdWad, debtUsdWad] =
      data as [bigint, bigint, bigint, bigint];
    return {
      collateralAmount,
      debtAmount,
      collateralUsdWad,
      debtUsdWad,
    } as UserReserveData;
  }, [data]);

  return { userReserveData, isLoading, error };
}

export default useUserReserveData;
