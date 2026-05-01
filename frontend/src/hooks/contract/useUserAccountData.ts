// Purpose:
// - Lay tong quan tai khoan user: collateral, debt, max borrow, health factor.
// Input:
// - userAddress: dia chi user can truy van.
// Guard:
// - Chi goi contract khi userAddress ton tai.
// Contract:
// - LendingPool.getUserAccountData(userAddress).
// Transform:
// - Map tuple thanh object:
//   collateralUsdWad, debtUsdWad, maxBorrowUsdWad, healthFactorWad.
// Return:
// - { accountData, isLoading, error }
