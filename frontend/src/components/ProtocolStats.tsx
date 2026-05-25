function PotocolStats() {
  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Protocol Stats</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Total Value Locked</p>
          <p className="text-lg font-bold">$1,234,567</p>
        </div>
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Total Borrowed</p>
          <p className="text-lg font-bold">$890,123</p>
        </div>
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-lg font-bold">456</p>
        </div>
      </div>
    </div>
  );
}

export default PotocolStats;
