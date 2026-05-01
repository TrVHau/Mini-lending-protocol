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

// import { useReadContracts } from "wagmi";
// import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";

// function useReserves() {
//   const { data, isLoading, error } = useReadContracts({
//     contracts: assets.flatMap((assetAddress) => [
//       {
//         address: LENDING_POOL_ADDRESS,
//         abi: LENDING_POOL_ABI,
//         functionName: "getReserveAddresses",
//         args: [assetAddress as `0x${string}`],
//         query: {
//           enabled: !!assetAddress,
//         },
//       },
//       {
//         address: LENDING_POOL_ADDRESS,
//         abi: LENDING_POOL_ABI,
//         functionName: "getReserveIndexes",
//         args: [assetAddress as `0x${string}`],
//         query: {
//           enabled: !!assetAddress,
//         },
//       },
//     ]),
//   });

//   const reserves = (data as readonly `0x${string}`[] | undefined)?.map(
//     (reserveAddress) => ({
//       reserveAddress,
//     }),
//   );

//   return {
//     reserves: reserves ?? [],
//     isLoading,
//     error,
//   };
// }

// export default useReserves;
