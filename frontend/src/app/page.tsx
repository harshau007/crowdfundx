"use client";
import CampaignList from "@/components/CampaignList";
import CreateCampaignSheet from "@/components/CreateCampaignForm";
import { Button } from "@/components/ui/button";
import { connectWallet } from "@/lib/contract";
import { Loader2 } from "lucide-react";
import type React from "react";
import { useEffect, useState } from "react";
import { Slide, toast } from "react-toastify";

const App: React.FC = () => {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Retrieve stored wallet address on mount
  useEffect(() => {
    const storedAddress = localStorage.getItem("walletAddress");
    if (storedAddress) {
      setWalletAddress(storedAddress);
    }
  }, []);

  // Listen for wallet account changes so the UI updates when wallet is unlocked or locked
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = (accounts: string[]) => {
        if (accounts.length === 0) {
          // Wallet locked or disconnected
          setWalletAddress(null);
          localStorage.removeItem("walletAddress");
          toast.info("Wallet disconnected or locked", {
            position: "bottom-right",
            autoClose: 2000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "dark",
            transition: Slide,
          });
        } else {
          // Wallet unlocked or changed account
          setWalletAddress(accounts[0]);
          localStorage.setItem("walletAddress", accounts[0]);
          toast.success("Wallet unlocked", {
            position: "bottom-right",
            autoClose: 1000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            theme: "dark",
            transition: Slide,
          });
        }
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);

      return () => {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
      };
    }
  }, []);

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    try {
      const address = await connectWallet();
      setWalletAddress(address);
      localStorage.setItem("walletAddress", address);
      toast.success("Wallet connected successfully", {
        position: "bottom-right",
        autoClose: 1000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        theme: "dark",
        transition: Slide,
      });
    } catch (error) {
      console.error("Error connecting wallet:", error);
      toast.error("Failed to connect wallet. Please try again.", {
        position: "bottom-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        theme: "dark",
        transition: Slide,
      });
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white py-10 px-6">
      {/* Header */}
      <header className="flex items-center justify-between mb-10">
        <h1 className="text-3xl font-extrabold tracking-tight cursor-pointer">
          CrowdFundX
        </h1>
        <div className="flex items-center space-x-4">
          {!walletAddress ? (
            <Button
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className="bg-white text-black hover:bg-gray-200 transition-colors min-w-[140px]"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Wallet"
              )}
            </Button>
          ) : (
            <div className="flex items-center space-x-2 bg-[#111] px-3 py-2 rounded-md border border-[#333]">
              <div className="h-2 w-2 rounded-full bg-green-500"></div>
              <span className="text-sm">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            </div>
          )}
          {/* <div className="border border-white p-2 rounded-full hover:bg-white hover:text-black transition-colors cursor-pointer">
            <User size={24} />
          </div> */}
        </div>
      </header>

      {/* Main Content */}
      <main>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold"></h2>
          {walletAddress ? (
            <CreateCampaignSheet />
          ) : (
            <Button
              onClick={handleConnectWallet}
              disabled={isConnecting}
              className="flex items-center gap-2 bg-white text-black hover:bg-gray-200 transition-colors"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting Wallet...
                </>
              ) : (
                "Connect Wallet to Create Campaign"
              )}
            </Button>
          )}
        </div>
        <CampaignList />
      </main>
    </div>
  );
};

export default App;
