// Purpose:
// - Tong hop danh sach reserves/markets de render bang thi truong.
// Input:
// - Co the khong can input, hoac nhan mang asset addresses neu UI da biet san.
// Guard:
// - Chi query khi co danh sach asset neu hook phu thuoc vao danh sach tu ngoai.
// Contract:
// - Thuong ket hop LendingPool.getReserveAddresses(asset)
//   va LendingPool.getReserveIndexes(asset) cho tung asset.
// Transform:
// - Gop du lieu tung reserve thanh object market de UI de map.
// Return:
// - { reserves, isLoading, error }
