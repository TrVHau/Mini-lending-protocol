import { useMemo } from "react";
import { useReadContract } from "wagmi";
import {
  LENDING_POOL_ABI,
  LENDING_POOL_ADDRESS,
  PRICE_ORACLE_ABI,
} from "../../config/contracts";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function normalizePriceToWad(price: bigint, decimals: number) {
  if (decimals === 18) return price;
  if (decimals < 18) return price * 10n ** BigInt(18 - decimals);
  return price / 10n ** BigInt(decimals - 18);
}

function useAssetPrice(assetAddress: `0x${string}` | null | undefined) {
  const oracleQuery = useReadContract({
    address: LENDING_POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "priceOracle",
  });

  const oracleAddress =
    (oracleQuery.data as `0x${string}` | undefined) ?? ZERO_ADDRESS;

  const priceQuery = useReadContract({
    address: oracleAddress,
    abi: PRICE_ORACLE_ABI,
    functionName: "getAssetPrice",
    args: assetAddress ? [assetAddress] : undefined,
    query: { enabled: !!assetAddress && oracleAddress !== ZERO_ADDRESS },
  });

  const decimalsQuery = useReadContract({
    address: oracleAddress,
    abi: PRICE_ORACLE_ABI,
    functionName: "PRICE_DECIMALS",
    query: { enabled: oracleAddress !== ZERO_ADDRESS },
  });

  const priceWad = useMemo(() => {
    if (priceQuery.data === undefined || decimalsQuery.data === undefined) {
      return undefined;
    }

    const price = priceQuery.data as bigint;
    const decimals = Number(decimalsQuery.data);
    return normalizePriceToWad(price, decimals);
  }, [priceQuery.data, decimalsQuery.data]);

  return {
    priceWad,
    isLoading:
      oracleQuery.isLoading || priceQuery.isLoading || decimalsQuery.isLoading,
    error: oracleQuery.error || priceQuery.error || decimalsQuery.error,
  };
}

export default useAssetPrice;
