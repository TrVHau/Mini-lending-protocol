// Purpose:
// - Doc danh sach reserves va batch lay du lieu tung reserve.
// Input:
// - Khong can input (lay tu LendingPool).
// Guard:
// - Chi goi batch khi co danh sach reserve.
// Contract:
// - LendingPool.getReserveList()
// - LendingPool.getReserveData(asset)
// Transform:
// - Map ket qua theo asset de UI de truy cap.
// Return:
// - { reserves, reserveDataByAsset, isLoading, error }

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";

type ReserveData = {
  aToken: `0x${string}`;
  debtToken: `0x${string}`;
  assetDecimals: bigint;
  isActive: boolean;
  isFrozen: boolean;
  ltvBps: bigint;
  liquidationThresholdBps: bigint;
  liquidationBonusBps: bigint;
  reserveFactorBps: bigint;
  liquidityIndexRay: bigint;
  borrowIndexRay: bigint;
  lastUpdateTimestamp: bigint;
};

type ReserveDataMap = Record<`0x${string}`, ReserveData>;

type ReserveDataTuple = [
  `0x${string}`,
  `0x${string}`,
  bigint,
  boolean,
  boolean,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
  bigint,
];

function useReservesWithData() {
  const listQuery = useReadContract({
    address: LENDING_POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "getReserveList",
  });

  const reserves = useMemo(() => {
    return (listQuery.data as `0x${string}`[] | undefined) ?? [];
  }, [listQuery.data]);

  const dataQuery = useReadContracts({
    contracts: reserves.map((asset) => ({
      address: LENDING_POOL_ADDRESS,
      abi: LENDING_POOL_ABI,
      functionName: "getReserveData",
      args: [asset],
    })),
    query: { enabled: reserves.length > 0 },
  });

  const reserveDataByAsset = useMemo(() => {
    const map: ReserveDataMap = {};
    dataQuery.data?.forEach((result, index) => {
      const asset = reserves[index];
      const tuple = result?.result as ReserveDataTuple | undefined;
      if (!asset || !tuple) return;
      const [
        aToken,
        debtToken,
        assetDecimals,
        isActive,
        isFrozen,
        ltvBps,
        liquidationThresholdBps,
        liquidationBonusBps,
        reserveFactorBps,
        liquidityIndexRay,
        borrowIndexRay,
        lastUpdateTimestamp,
      ] = tuple;
      map[asset] = {
        aToken,
        debtToken,
        assetDecimals,
        isActive,
        isFrozen,
        ltvBps,
        liquidationThresholdBps,
        liquidationBonusBps,
        reserveFactorBps,
        liquidityIndexRay,
        borrowIndexRay,
        lastUpdateTimestamp,
      };
    });
    return map;
  }, [dataQuery.data, reserves]);

  const isLoading = listQuery.isLoading || dataQuery.isLoading;
  const error = listQuery.error || dataQuery.error;

  return { reserves, reserveDataByAsset, isLoading, error };
}

export default useReservesWithData;
