import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";

const sepoliaRpcUrl =
  import.meta.env.VITE_SEPOLIA_RPC_URL ?? "https://1rpc.io/sepolia";

export const config = createConfig({
  chains: [sepolia],
  transports: {
    // [hardhat.id]: http("http://127.0.0.1:8545"),
    [sepolia.id]: http(sepoliaRpcUrl),
  },
});
