"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Copy,
  Wallet,
  Shield,
  Zap,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  ExternalLink
} from "lucide-react";

interface CentralizedDepositProps {
  amount: number;
  onError?: (error: string) => void;
}

interface DepositAddressData {
  address: string;
  network: string;
  created_at: string;
}

export default function CentralizedDeposit({ amount, onError }: CentralizedDepositProps) {
  const [depositAddress, setDepositAddress] = useState<DepositAddressData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDepositAddress();
  }, []);

  const fetchDepositAddress = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/wallet/deposit-address');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch deposit address');
      }

      setDepositAddress({
        address: data.address,
        network: data.network,
        created_at: data.created_at
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load deposit address';
      setError(errorMessage);
      onError?.(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const copyAddress = async () => {
    if (!depositAddress) return;
    
    try {
      await navigator.clipboard.writeText(depositAddress.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const generateQRCode = () => {
    if (!depositAddress) return '';
    
    // Generate QR code URL for the deposit address
    const qrData = encodeURIComponent(depositAddress.address);
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${qrData}`;
  };

  const openBlockExplorer = () => {
    if (!depositAddress) return;
    
    // Open Polygon block explorer
    const explorerUrl = `https://polygonscan.com/address/${depositAddress.address}`;
    window.open(explorerUrl, '_blank');
  };

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-700/50 backdrop-blur-sm">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center space-y-3">
            <RefreshCw className="h-8 w-8 text-blue-400 animate-spin mx-auto" />
            <p className="text-white">Loading your deposit address...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-gradient-to-br from-red-900/50 to-orange-900/50 border-red-700/50 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-3 rounded-full bg-red-500/20 border border-red-500/30">
              <AlertCircle className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <CardTitle className="text-xl text-white">Error Loading Address</CardTitle>
              <CardDescription className="text-gray-400">
                Failed to load your deposit address
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-red-900/20 border border-red-700/50 rounded-lg p-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
          
          <Button 
            onClick={fetchDepositAddress}
            className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!depositAddress) {
    return null;
  }

  return (
    <Card className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-700/50 backdrop-blur-sm">
      <CardHeader>
        <div className="flex items-center space-x-3">
          <div className="p-3 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 border border-blue-500/30">
            <Wallet className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <CardTitle className="text-xl text-white">Your Personal Deposit Address</CardTitle>
            <CardDescription className="text-gray-400">
              Send ${amount} USDT to this address
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Network Badge */}
        <div className="flex items-center justify-between">
          <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30">
            {depositAddress.network.toUpperCase()} Network
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={openBlockExplorer}
            className="text-gray-400 hover:text-white"
          >
            <ExternalLink className="h-4 w-4 mr-1" />
            View on Explorer
          </Button>
        </div>

        {/* QR Code */}
        <div className="text-center">
          <div className="inline-block p-4 bg-white rounded-lg">
            <img 
              src={generateQRCode()} 
              alt="Deposit Address QR Code"
              className="w-48 h-48 mx-auto"
            />
          </div>
          <p className="text-sm text-gray-400 mt-2">Scan with your wallet app</p>
        </div>

        <Separator className="bg-slate-700" />

        {/* Address */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-white">Deposit Address</label>
          <div className="flex items-center space-x-2">
            <div className="flex-1 p-3 bg-slate-800/50 border border-slate-600 rounded-lg">
              <p className="text-sm text-gray-300 font-mono break-all">
                {depositAddress.address}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyAddress}
              className="border-blue-500/50 text-blue-300 hover:bg-blue-500/10"
            >
              {copied ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          {copied && (
            <p className="text-sm text-green-400">✓ Address copied to clipboard</p>
          )}
        </div>

        {/* Important Information */}
        <div className="space-y-3 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-yellow-400" />
            <span className="text-sm font-medium text-yellow-300">Important Instructions</span>
          </div>
          <ul className="text-sm text-yellow-200 space-y-1 ml-6 list-disc">
            <li>Only send USDT (TRC20 or Polygon) to this address</li>
            <li>Minimum deposit: $12 USDT</li>
            <li>Funds will be credited automatically after confirmation</li>
            <li>This address is unique to your account</li>
            <li>Do not send other cryptocurrencies to this address</li>
          </ul>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            <span className="text-sm text-gray-300">Auto-credited</span>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-green-400" />
            <span className="text-sm text-gray-300">Secure & Safe</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-blue-400" />
            <span className="text-sm text-gray-300">No fees</span>
          </div>
          <div className="flex items-center space-x-2">
            <RefreshCw className="h-4 w-4 text-purple-400" />
            <span className="text-sm text-gray-300">24/7 monitoring</span>
          </div>
        </div>

        {/* Refresh Button */}
        <Button 
          onClick={fetchDepositAddress}
          variant="outline"
          className="w-full border-blue-500/50 text-blue-300 hover:bg-blue-500/10"
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Address
        </Button>
      </CardContent>
    </Card>
  );
}
