// Purpose:
// - Tong hop du lieu market cho bang: reserve list, reserve data,
//   token meta (name/symbol), total deposits, available liquidity.
// Input:
// - Khong can input (lay tu LendingPool).
// Guard:
// - Chi batch query khi co danh sach reserve va reserve data.
// Contract:
// - LendingPool.getReserveList()
// - LendingPool.getReserveData(asset)
// - ERC20.symbol(), ERC20.name()
// - ERC20.balanceOf(aToken)
// - AToken.totalSupplyWithIndex(liquidityIndexRay)
// Transform:
// - Map ket qua ve theo asset address.
// Return:
// - { reserves, reserveDataByAsset, tokenMetaByAsset, marketStatsByAsset, isLoading, error }

import { useMemo } from "react";
import { useReadContract, useReadContracts } from "wagmi";
import {
  ATOKEN_ABI,
  ERC20_ABI,
  LENDING_POOL_ABI,
  LENDING_POOL_ADDRESS,
} from "../../config/contracts";

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

type TokenMeta = {
  name: string;
  symbol: string;
};

type TokenMetaMap = Record<`0x${string}`, TokenMeta>;

type MarketStats = {
  availableLiquidity: bigint;
  totalDeposits: bigint;
};

type MarketStatsMap = Record<`0x${string}`, MarketStats>;

type ContractResult = {
  status: "success" | "failure";
  result?: unknown;
};

function useMarketOverview() {
  const listQuery = useReadContract({
    address: LENDING_POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "getReserveList",
  });

  const reserves = useMemo(() => {
    return (listQuery.data as `0x${string}`[] | undefined) ?? [];
  }, [listQuery.data]);

  const reserveDataQuery = useReadContracts({
    contracts: reserves.map((asset) => ({
      address: LENDING_POOL_ADDRESS,
      abi: LENDING_POOL_ABI,
      functionName: "getReserveData",
      args: [asset],
    })),
    query: { enabled: reserves.length > 0 },
  });

  const reserveDataByAsset = useMemo(() => {
    if (!reserveDataQuery.data) return undefined;
    const map: ReserveDataMap = {};

    const getReserveResult = (entry: unknown) => {
      const typed = entry as ContractResult;
      if (!typed || typed.status !== "success") return null;
      return typed.result as ReserveDataTuple;
    };

    reserveDataQuery.data.forEach((result, index) => {
      const asset = reserves[index];
      const tuple = getReserveResult(result);
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
  }, [reserveDataQuery.data, reserves]);

  const metaCalls = useMemo(() => {
    if (!reserves.length) return [];
    return reserves.flatMap((asset) => [
      { address: asset, abi: ERC20_ABI, functionName: "symbol", args: [] },
      { address: asset, abi: ERC20_ABI, functionName: "name", args: [] },
    ]);
  }, [reserves]);

  const statsCalls = useMemo(() => {
    if (!reserves.length || !reserveDataByAsset) return [];
    return reserves.flatMap((asset) => {
      const reserve = reserveDataByAsset[asset];
      if (!reserve?.aToken) return [];
      return [
        {
          address: asset,
          abi: ERC20_ABI,
          functionName: "balanceOf",
          args: [reserve.aToken],
        },
        {
          address: reserve.aToken,
          abi: ATOKEN_ABI,
          functionName: "totalSupplyWithIndex",
          args: [reserve.liquidityIndexRay],
        },
      ];
    });
  }, [reserves, reserveDataByAsset]);

  const metaQuery = useReadContracts({
    contracts: metaCalls,
    query: { enabled: metaCalls.length > 0 },
  });

  const statsQuery = useReadContracts({
    contracts: statsCalls,
    query: { enabled: statsCalls.length > 0 },
  });

  const tokenMetaByAsset = useMemo(() => {
    if (!metaQuery.data || !reserves.length) return undefined;
    const map: TokenMetaMap = {};

    const getResult = (entry: unknown) => {
      const typed = entry as ContractResult;
      if (!typed || typed.status !== "success") return null;
      return typed.result as string;
    };

    for (let i = 0; i < reserves.length; i++) {
      const asset = reserves[i];
      const symbol = getResult(metaQuery.data[i * 2]);
      const name = getResult(metaQuery.data[i * 2 + 1]);
      if (!symbol || !name) continue;
      map[asset] = { symbol, name };
    }

    return map;
  }, [metaQuery.data, reserves]);

  const marketStatsByAsset = useMemo(() => {
    if (!statsQuery.data || !reserves.length || !reserveDataByAsset) {
      return undefined;
    }

    const map: MarketStatsMap = {};

    const getResult = (entry: unknown) => {
      const typed = entry as ContractResult;
      if (!typed || typed.status !== "success") return null;
      return typed.result as bigint;
    };

    for (let i = 0; i < reserves.length; i++) {
      const asset = reserves[i];
      const reserve = reserveDataByAsset[asset];
      if (!reserve?.aToken) continue;
      const availableLiquidity = getResult(statsQuery.data[i * 2]);
      const totalDeposits = getResult(statsQuery.data[i * 2 + 1]);
      if (availableLiquidity === null || totalDeposits === null) continue;
      map[asset] = { availableLiquidity, totalDeposits };
    }

    return map;
  }, [statsQuery.data, reserves, reserveDataByAsset]);

  const isLoading =
    listQuery.isLoading ||
    reserveDataQuery.isLoading ||
    metaQuery.isLoading ||
    statsQuery.isLoading;
  const error =
    listQuery.error ||
    reserveDataQuery.error ||
    metaQuery.error ||
    statsQuery.error;

  return {
    reserves,
    reserveDataByAsset,
    tokenMetaByAsset,
    marketStatsByAsset,
    isLoading,
    error,
  };
}

export default useMarketOverview;
