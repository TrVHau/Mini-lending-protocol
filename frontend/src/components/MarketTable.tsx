function MarketTable() {
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
            <tr className="hover:bg-slate-900">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700">
                    <img
                      src="/assets/eth-logo.png"
                      alt="ETH"
                      className="h-6 w-6 rounded-full"
                    />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-slate-50">
                      ETH
                    </span>
                    <span className="text-xs text-slate-400">Ethereum</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm font-medium text-slate-50">
                +2.5%
              </td>
              <td className="px-6 py-4 text-sm text-slate-200">$1,800.00</td>
              <td className="px-6 py-4 text-sm text-slate-300">$500M</td>
            </tr>
            <tr className="hover:bg-slate-900">
              <td className="px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-700">
                    <img
                      src="/assets/dai-logo.png"
                      alt="DAI"
                      className="h-6 w-6 rounded-full"
                    />
                  </div>
                  <div>
                    <span className="block text-sm font-semibold text-slate-50">
                      DAI
                    </span>
                    <span className="text-xs text-slate-400">Stablecoin</span>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 text-sm font-medium text-slate-50">
                0.0%
              </td>
              <td className="px-6 py-4 text-sm text-slate-200">$1.00</td>
              <td className="px-6 py-4 text-sm text-slate-300">$200M</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MarketTable;
