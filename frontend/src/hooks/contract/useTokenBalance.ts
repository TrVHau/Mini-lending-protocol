// hook này là để lấy balance của user, sẽ được dùng trong AccountSummary để hiển thị thông tin tài khoản
// input: userAddress (địa chỉ ví của user), tokenAddress (địa chỉ contract của token cần lấy balance)
// Guard: chỉ gọi hook khi userAddress đã có giá trị (sử dụng enabled trong query options)
// contract call: gọi hàm balanceOf(address) của ERC20 contract để lấy balance của user
// transform data: nếu data trả về là undefined thì trả về null để dễ xử lý trong component
// return: trả về balance, isLoading và error để component có thể hiển thị thông tin phù hợp
import { useReadContract } from "wagmi";
import { ERC20_ABI } from "../../config/contracts";

function useTokenBalance(
  userAddress: string | undefined,
  tokenAddress: string,
) {
  const { data, isLoading, error } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [userAddress || "0x"],
    query: {
      enabled: !!userAddress, // !! là query khi có userAddress, tránh gọi hàm khi userAddress chưa có giá trị
    },
  });

  return {
    balance: data ?? null,
    isLoading,
    error,
  };
}

export default useTokenBalance;
