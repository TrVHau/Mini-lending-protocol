function MarketTable() {
  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        Market Overview
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white shadow-md rounded-lg">
          <thead>
            <tr>
              <th className="py-3 px-6 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">
                Asset
              </th>
              <th className="py-3 px-6 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">
                Price
              </th>
              <th className="py-3 px-6 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">
                24h Change
              </th>
              <th className="py-3 px-6 bg-gray-200 text-left text-sm font-medium text-gray-600 uppercase tracking-wider">
                Liquidity
              </th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-t">
              <td className="py-4 px-6 flex items-center gap-3">
                <img
                  src="/assets/eth-logo.png"
                  alt="ETH"
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-sm font-medium text-gray-700">ETH</span>
              </td>
              <td className="py-4 px-6 text-sm text-gray-700">$1,800.00</td>
              <td className="py-4 px-6 text-sm text-green-500">+2.5%</td>
              <td className="py-4 px-6 text-sm text-gray-700">$500M</td>
            </tr>
            <tr className="border-t">
              <td className="py-4 px-6 flex items-center gap-3">
                <img
                  src="/assets/dai-logo.png"
                  alt="DAI"
                  className="w-6 h-6 rounded-full"
                />
                <span className="text-sm font-medium text-gray-700">DAI</span>
              </td>
              <td className="py-4 px-6 text-sm text-gray-700">$1.00</td>
              <td className="py-4 px-6 text-sm text-gray-500">0.0%</td>
              <td className="py-4 px-6 text-sm text-gray-700">$200M</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default MarketTable;
