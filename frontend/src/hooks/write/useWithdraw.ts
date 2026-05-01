// Purpose:
// - Tao transaction rut collateral khoi LendingPool.
// Input:
// - assetAddress, amount.
// Guard:
// - Chi goi write khi amount > 0 va co account dang ket noi.
// Contract:
// - LendingPool.withdraw(asset, amount).
// Transform:
// - Theo doi hash va trang thai confirm transaction.
// Return:
// - { withdraw, hash, isPending, isSuccess, error }
