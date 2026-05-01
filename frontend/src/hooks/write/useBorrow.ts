// Purpose:
// - Tao transaction vay tai san tu LendingPool.
// Input:
// - assetAddress, amount.
// Guard:
// - Chi goi write khi amount > 0 va co account dang ket noi.
// Contract:
// - LendingPool.borrow(asset, amount).
// Transform:
// - Theo doi hash va trang thai confirm transaction.
// Return:
// - { borrow, hash, isPending, isSuccess, error }
