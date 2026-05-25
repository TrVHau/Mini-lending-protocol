import { WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { config } from "./config/wagmi";

import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Markets from "./pages/Markets";
import Position from "./pages/Position";
import Liquidation from "./pages/Liquidation";
import AssetDetail from "./pages/AssetDetail";

const queryClient = new QueryClient();

function App() {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/markets" element={<Markets />} />
            <Route path="/position" element={<Position />} />
            <Route path="/liquidation" element={<Liquidation />} />
            <Route path="/asset/:address" element={<AssetDetail />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default App;
