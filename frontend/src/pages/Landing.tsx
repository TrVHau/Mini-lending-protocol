import { Link } from "react-router-dom";

export default function Landing() {
  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-8">
        Welcome to the Mini Lending Protocol
      </h1>
      <p className="text-lg mb-4">
        A decentralized lending platform built on Ethereum.
      </p>
      <Link
        to="/home"
        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
      >
        Get Started
      </Link>
    </div>
  );
}
