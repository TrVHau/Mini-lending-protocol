import { useReservesWithData } from "../hooks";
function MarketTable() {
  const { reserves, reserveDataByAsset } = useReservesWithData();

  return (
    <div className="mt-6 rounded border border-slate-800 bg-slate-950 p-6">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">Markets</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-50">
            Market Overview
          </h2>
        </div>
        <div className="text-xs text-slate-500">Live data</div>
      </div>
      <div className="overflow-x-auto rounded border border-slate-800 bg-slate-900">
        <table className="min-w-full border-separate border-spacing-0">
          <thead className="bg-slate-900">
            <tr>
              <th className="border-b border-slate-800 px-6 py-4 text-left text-xs font-semibold text-slate-300">
                Asset
              </th>
              <th className="border-b border-slate-800 px-6 py-4 text-left text-xs font-semibold text-slate-300">
                APY
              </th>
              <th className="border-b border-slate-800 px-6 py-4 text-left text-xs font-semibold text-slate-300">
                Total deposits
              </th>
              <th className="border-b border-slate-800 px-6 py-4 text-left text-xs font-semibold text-slate-300">
                Available liquidity
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {reserves.map((asset) => {
              const reserve = reserveDataByAsset[asset];
              return (
                <tr key={asset} className="hover:bg-slate-900">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700">
                        <span className="text-xs text-slate-300">
                          {asset.slice(2, 6).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <span className="block text-sm font-semibold text-slate-50">
                          {asset.slice(0, 6)}...{asset.slice(-4)}
                        </span>
                        <span className="text-xs text-slate-400">
                          {reserve?.isActive ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-50">
                    --
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-200">--</td>
                  <td className="px-6 py-4 text-sm text-slate-300">--</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MarketTable;
