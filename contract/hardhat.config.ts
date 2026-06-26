import { HardhatUserConfig } from "hardhat/config";
import * as dotenv from "dotenv";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-chai-matchers";

dotenv.config();

const sepoliaRpcUrl = process.env.SEPOLIA_RPC_URL || process.env.RPC_URL || "";

// Xử lý private key, tự động thêm 0x nếu người dùng quên nhập
const privateKey = process.env.PRIVATE_KEY
  ? process.env.PRIVATE_KEY.startsWith("0x")
    ? process.env.PRIVATE_KEY
    : `0x${process.env.PRIVATE_KEY}`
  : "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    sepolia: {
      url: sepoliaRpcUrl,
      // Nếu không có privateKey, in ra thông báo lỗi rõ ràng ở terminal thay vì mảng rỗng
      accounts: privateKey ? [privateKey] : [],
      chainId: 11155111,
    },
  },
};

export default config;
