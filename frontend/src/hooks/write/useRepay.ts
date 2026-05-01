// Purpose:
// - Tao transaction tra no cho asset da vay.
// Input:
// - assetAddress, amount.
// Guard:
// - Chi goi write khi amount > 0, da ket noi vi, va da approve token repay.
// Contract:
// - LendingPool.repay(asset, amount).
// Transform:
// - Theo doi hash va trang thai confirm transaction.
// Return:
// - { repay, hash, isPending, isSuccess, error }
