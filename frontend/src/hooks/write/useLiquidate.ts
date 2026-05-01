// Purpose:
// - Tao transaction liquidate vi the co health factor thap.
// Input:
// - collateralAsset, debtAsset, userAddress, debtToCover.
// Guard:
// - Chi goi write khi du input va debtToCover > 0.
// Contract:
// - LendingPool.liquidate(collateralAsset, debtAsset, user, debtToCover).
// Transform:
// - Theo doi hash va trang thai confirm transaction.
// Return:
// - { liquidate, hash, isPending, isSuccess, error }
