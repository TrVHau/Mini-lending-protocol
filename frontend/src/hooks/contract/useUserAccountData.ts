// Purpose:
// - Doc tong quan tai khoan user: collateral, debt, max borrow, health factor.
// Input:
// - userAddress: dia chi user can truy van.
// Guard:
// - Chi goi contract khi userAddress ton tai (enabled = !!userAddress).
// Contract:
// - LendingPool.getUserAccountData(userAddress).
// Transform:
// - Map tuple thanh object:
//   collateralUsdWad, debtUsdWad, maxBorrowUsdWad, healthFactorWad.
// Return:
// - { accountData, isLoading, error }

import { useReadContract } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";
import { useMemo } from "react";

type UserAccountData = {
  collateralUsdWad: bigint;
  debtUsdWad: bigint;
  maxBorrowUsdWad: bigint;
  healthFactorWad: bigint;
};

function useUserAccountData(userAddress: `0x${string}` | null | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: LENDING_POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "getUserAccountData",
    args: [userAddress || "0x0000000000000000000000000000000000000000"],
    query: { enabled: !!userAddress },
  });

  const accountData = useMemo(() => {
    if (!data) return undefined;
    const [collateralUsdWad, debtUsdWad, maxBorrowUsdWad, healthFactorWad] =
      data as [bigint, bigint, bigint, bigint];
    return {
      collateralUsdWad,
      debtUsdWad,
      maxBorrowUsdWad,
      healthFactorWad,
    } as UserAccountData;
  }, [data]);

  return { accountData, isLoading, error };
}

export default useUserAccountData;
