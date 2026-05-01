// Purpose:
// - Lay tong no cua user theo tung asset.
// Input:
// - userAddress: dia chi user.
// - assetAddress: dia chi asset reserve.
// Guard:
// - Chi query khi co userAddress va assetAddress.
// Contract:
// - LendingPool.getReserveAddresses(asset) de lay debtToken.
// - VariableDebtToken.scaledBalanceOf(user).
// - LendingPool.getReserveIndexes(asset) de lay borrowIndex.
// Transform:
// - Tinh nominal debt: scaledDebt * borrowIndex / RAY.
// Return:
// - { scaledDebt, debt, isLoading, error }
