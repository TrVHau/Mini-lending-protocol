// hook này là để lấy health factor của user, sẽ được dùng trong AccountSummary để hiển thị thông tin tài khoản
// input: userAddress (địa chỉ ví của user)
// Guard: chỉ gọi hook khi userAddress đã có giá trị (sử dụng enabled trong query options)
// contract call: gọi hàm getHealthFactor(address) của LendingPool contract để lấy health factor của user
// transform data: nếu data trả về là undefined thì trả về null để dễ xử lý trong component
// return: trả về healthFactor, isLoading và error để component có thể hiển thị thông tin phù hợp
import { useReadContract } from "wagmi";
import { LENDING_POOL_ADDRESS, LENDING_POOL_ABI } from "../../config/contracts";

function useHealthFactor(userAddress: string | undefined) {
  const { data, isLoading, error } = useReadContract({
    address: LENDING_POOL_ADDRESS,
    abi: LENDING_POOL_ABI,
    functionName: "getHealthFactor",
    args: [userAddress || "0x"],
    query: {
      enabled: !!userAddress, // !! là query khi có userAddress, tránh gọi hàm khi userAddress chưa có giá trị
    },
  });

  return {
    healthFactor: data ?? null,
    isLoading,
    error,
  };
}

export default useHealthFactor;
