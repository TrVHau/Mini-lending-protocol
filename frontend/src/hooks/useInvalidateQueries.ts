// Invalidates all wagmi read-contract query caches.
// Call this after any write transaction confirms so all on-chain data
// (balances, allowances, reserve state, positions) refetches automatically.

import { useQueryClient } from "@tanstack/react-query";

function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return function invalidate() {
    queryClient.invalidateQueries();
  };
}

export default useInvalidateQueries;
