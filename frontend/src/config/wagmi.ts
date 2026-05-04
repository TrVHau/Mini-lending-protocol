import { http, createConfig } from "wagmi";
// import { hardhat, sepolia } from "wagmi/chains";
import { hardhat } from "wagmi/chains";
// hiện tại dùng hardhat trước để test, sau này có thể chuyển sang sepolia
export const config = createConfig({
  chains: [hardhat],
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    // [sepolia.id]: http("https://1rpc.io/sepolia"),
  },
});
