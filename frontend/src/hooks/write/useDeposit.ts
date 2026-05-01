// Purpose:
// - Tao transaction nap tai san vao LendingPool.
// Input:
// - assetAddress, amount.
// Guard:
// - Chi goi write khi amount > 0, da ket noi vi, va da approve neu can.
// Contract:
// - LendingPool.deposit(asset, amount).
// Transform:
// - Theo doi hash va trang thai confirm transaction.
// Return:
// - { deposit, hash, isPending, isSuccess, error }
