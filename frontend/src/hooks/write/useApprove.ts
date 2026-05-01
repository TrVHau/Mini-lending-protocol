// Purpose:
// - Tao transaction approve ERC20 cho spender (thuong la LendingPool).
// Input:
// - tokenAddress, spenderAddress, amount.
// Guard:
// - Chi goi write khi du input va amount > 0.
// Contract:
// - ERC20.approve(spender, amount).
// Transform:
// - Khong can transform du lieu read; theo doi hash va receipt status.
// Return:
// - { approve, hash, isPending, isSuccess, error }
