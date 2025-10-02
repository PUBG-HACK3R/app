"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Wallet, 
  ExternalLink, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Shield,
  Zap,
  Copy
} from "lucide-react";
import { ethers } from "ethers";

// USDT TRC20 Contract ABI (simplified)
const USDT_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)"
];

interface HotWalletConnectorProps {
  amount: number;
  onSuccess: (txHash: string, walletAddress: string) => void;
  onError: (error: string) => void;
}

declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function HotWalletConnector({ amount, onSuccess, onError }: HotWalletConnectorProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTransacting, setIsTransacting] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState(false);
  const [usdtBalance, setUsdtBalance] = useState<string | null>(null);

  // Environment variables (these should be in your .env.local)
  const POLYGON_MUMBAI_CHAIN_ID = "0x13881"; // 80001 in hex
  const USDT_ADDRESS = process.env.NEXT_PUBLIC_USDT_ADDRESS || "0x"; // Replace with actual USDT contract address
  const HOT_WALLET_ADDRESS = process.env.NEXT_PUBLIC_HOT_WALLET_ADDRESS || "0x"; // Replace with your hot wallet address

  useEffect(() => {
    checkWalletConnection();
  }, []);

  useEffect(() => {
    if (walletAddress && isCorrectNetwork) {
      fetchUSDTBalance();
    }
  }, [walletAddress, isCorrectNetwork]);

  const checkWalletConnection = async () => {
    if (typeof window.ethereum !== 'undefined') {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          await checkNetwork();
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    }
  };

  const checkNetwork = async () => {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      setIsCorrectNetwork(chainId === POLYGON_MUMBAI_CHAIN_ID);
    } catch (error) {
      console.error("Error checking network:", error);
      setIsCorrectNetwork(false);
    }
  };

  const connectWallet = async () => {
    if (typeof window.ethereum === 'undefined') {
      onError("MetaMask is not installed. Please install MetaMask or use TrustWallet.");
      return;
    }

    setIsConnecting(true);
    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        await checkNetwork();
        
        if (!isCorrectNetwork) {
          await switchToPolygonMumbai();
        }
      }
    } catch (error: any) {
      console.error("Error connecting wallet:", error);
      onError(`Failed to connect wallet: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToPolygonMumbai = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_MUMBAI_CHAIN_ID }],
      });
      setIsCorrectNetwork(true);
    } catch (switchError: any) {
      // This error code indicates that the chain has not been added to MetaMask
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: POLYGON_MUMBAI_CHAIN_ID,
                chainName: 'Polygon Mumbai Testnet',
                nativeCurrency: {
                  name: 'MATIC',
                  symbol: 'MATIC',
                  decimals: 18,
                },
                rpcUrls: ['https://rpc-mumbai.maticvigil.com/'],
                blockExplorerUrls: ['https://mumbai.polygonscan.com/'],
              },
            ],
          });
          setIsCorrectNetwork(true);
        } catch (addError) {
          console.error("Error adding network:", addError);
          onError("Failed to add Polygon Mumbai network");
        }
      } else {
        console.error("Error switching network:", switchError);
        onError("Failed to switch to Polygon Mumbai network");
      }
    }
  };

  const fetchUSDTBalance = async () => {
    if (!walletAddress || !isCorrectNetwork) return;

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, provider);
      
      const balance = await contract.balanceOf(walletAddress);
      const decimals = await contract.decimals();
      const formattedBalance = ethers.formatUnits(balance, decimals);
      
      setUsdtBalance(parseFloat(formattedBalance).toFixed(2));
    } catch (error) {
      console.error("Error fetching USDT balance:", error);
      setUsdtBalance("0.00");
    }
  };

  const sendUSDT = async () => {
    if (!walletAddress || !isCorrectNetwork) {
      onError("Please connect your wallet and switch to Polygon Mumbai network");
      return;
    }

    setIsTransacting(true);
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(USDT_ADDRESS, USDT_ABI, signer);

      // Convert amount to proper decimals (USDT has 6 decimals)
      const amountInWei = ethers.parseUnits(amount.toString(), 6);

      // Check balance
      const balance = await contract.balanceOf(walletAddress);
      if (balance < amountInWei) {
        throw new Error(`Insufficient USDT balance. You have ${ethers.formatUnits(balance, 6)} USDT`);
      }

      // Send transaction
      const tx = await contract.transfer(HOT_WALLET_ADDRESS, amountInWei);
      
      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        onSuccess(receipt.hash, walletAddress);
      } else {
        throw new Error("Transaction failed");
      }
    } catch (error: any) {
      console.error("Error sending USDT:", error);
      onError(`Transaction failed: ${error.message}`);
    } finally {
      setIsTransacting(false);
    }
  };

  const copyAddress = (address: string) => {
    navigator.clipboard.writeText(address);
  };

  if (!walletAddress) {
    return (
      <Card className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-purple-700/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30">
              <Wallet className="h-6 w-6 text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Connect Your Wallet</CardTitle>
              <CardDescription className="text-gray-400">
                Connect MetaMask or TrustWallet to deposit directly
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Shield className="h-4 w-4 text-green-400" />
              <span className="text-sm text-gray-300">Direct wallet-to-wallet transfer</span>
            </div>
            <div className="flex items-center space-x-2">
              <Zap className="h-4 w-4 text-yellow-400" />
              <span className="text-sm text-gray-300">Instant confirmation</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-blue-400" />
              <span className="text-sm text-gray-300">Lower fees than traditional gateways</span>
            </div>
          </div>

          <Separator className="bg-slate-700" />

          <Button 
            onClick={connectWallet}
            disabled={isConnecting}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold"
          >
            {isConnecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="mr-2 h-4 w-4" />
                Connect Wallet
              </>
            )}
          </Button>

          <div className="text-xs text-gray-400 text-center">
            Supports MetaMask, TrustWallet, and other Web3 wallets
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-purple-900/50 to-blue-900/50 border-purple-700/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-full bg-gradient-to-r from-green-500/20 to-blue-500/20 border border-green-500/30">
              <Wallet className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Wallet Connected</CardTitle>
              <CardDescription className="text-gray-400">
                Ready to send ${amount} USDT
              </CardDescription>
            </div>
          </div>
          <Badge className={`${isCorrectNetwork ? 'bg-green-500/20 text-green-300 border-green-500/30' : 'bg-red-500/20 text-red-300 border-red-500/30'}`}>
            {isCorrectNetwork ? 'Polygon Mumbai' : 'Wrong Network'}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Wallet Address:</span>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-white font-mono">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyAddress(walletAddress)}
                className="h-6 w-6 p-0"
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">USDT Balance:</span>
            <span className="text-sm text-white font-semibold">
              {usdtBalance ? `${usdtBalance} USDT` : 'Loading...'}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Amount to Send:</span>
            <span className="text-sm text-green-400 font-semibold">${amount} USDT</span>
          </div>
        </div>

        <Separator className="bg-slate-700" />

        {!isCorrectNetwork && (
          <div className="flex items-center space-x-2 p-3 bg-red-900/20 border border-red-700/50 rounded-lg">
            <AlertCircle className="h-4 w-4 text-red-400" />
            <div className="flex-1">
              <p className="text-sm text-red-300">Please switch to Polygon Mumbai network</p>
              <Button
                variant="outline"
                size="sm"
                onClick={switchToPolygonMumbai}
                className="mt-2 border-red-500/50 text-red-300 hover:bg-red-500/10"
              >
                Switch Network
              </Button>
            </div>
          </div>
        )}

        {isCorrectNetwork && usdtBalance !== null && parseFloat(usdtBalance) < amount && (
          <div className="flex items-center space-x-2 p-3 bg-orange-900/20 border border-orange-700/50 rounded-lg">
            <AlertCircle className="h-4 w-4 text-orange-400" />
            <p className="text-sm text-orange-300">
              Insufficient USDT balance. You need ${amount} USDT but have ${usdtBalance} USDT.
            </p>
          </div>
        )}

        <Button 
          onClick={sendUSDT}
          disabled={isTransacting || !isCorrectNetwork || (usdtBalance !== null && parseFloat(usdtBalance) < amount)}
          className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold"
        >
          {isTransacting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Transaction...
            </>
          ) : (
            <>
              <ExternalLink className="mr-2 h-4 w-4" />
              Send ${amount} USDT
            </>
          )}
        </Button>

        <div className="text-xs text-gray-400 text-center">
          Transaction will be sent to our secure hot wallet for instant processing
        </div>
      </CardContent>
    </Card>
  );
}
