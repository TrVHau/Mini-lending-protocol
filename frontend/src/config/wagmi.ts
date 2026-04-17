import { http, createConfig } from "wagmi";
import { hardhat, sepolia } from "wagmi/chains";
export const config = createConfig({
  chains: [hardhat, sepolia],
  transports: {
    [hardhat.id]: http("http://127.0.0.1:8545"),
    [sepolia.id]: http("https://1rpc.io/sepolia"),
  },
});
