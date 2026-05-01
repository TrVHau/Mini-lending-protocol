// Purpose:
// - Lay so du collateral (aToken) cua user theo tung asset.
// Input:
// - userAddress: dia chi user.
// - assetAddress: dia chi asset reserve.
// Guard:
// - Chi query khi co userAddress va assetAddress.
// Contract:
// - LendingPool.getReserveAddresses(asset) de lay aToken.
// - AToken.scaledBalanceOf(user).
// - LendingPool.getReserveIndexes(asset) de lay liquidityIndex.
// Transform:
// - Tinh nominal balance: scaledBalance * liquidityIndex / RAY.
// Return:
// - { scaledBalance, balance, isLoading, error }
