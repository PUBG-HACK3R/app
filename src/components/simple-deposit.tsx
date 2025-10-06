"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Copy,
  Wallet,
  Shield,
  CheckCircle,
  AlertCircle,
  RefreshCw
} from "lucide-react";

interface SimpleDepositProps {
  amount: number;
  showAmount?: boolean;
}

interface DepositData {
  address: string;
  network: string;
  networkName: string;
  symbol: string;
  contractAddress: string;
  hotWallet: string;
}

export default function SimpleDeposit({ amount, showAmount = true }: SimpleDepositProps) {
  const [selectedNetwork, setSelectedNetwork] = useState<'TRON' | 'ARBITRUM'>('TRON');
  const [depositData, setDepositData] = useState<DepositData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Simple QR Code component using a QR code API
  const QRCodeDisplay = ({ address }: { address: string }) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(address)}`;
    
    return (
      <div className="flex justify-center p-4">
        <div className="bg-white p-4 rounded-lg">
          <img 
            src={qrUrl} 
            alt="QR Code for deposit address" 
            className="w-48 h-48"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
            }}
          />
        </div>
      </div>
    );
  };

  const fetchDepositAddress = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Create deposit intent with the new event-based system
      const response = await fetch('/api/deposits/create-intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          network: selectedNetwork === 'TRON' ? 'TRC20' : 'BEP20',
          amount_usdt: 100 // Default amount
        })
      });
      const data = await response.json();
      
      if (data.success) {
        setDepositData(data);
      } else {
        setError(data.error || 'Failed to get deposit address');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDepositAddress();
  }, [selectedNetwork]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
        <span className="ml-2 text-gray-400">Loading deposit address...</span>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="bg-red-900/20 border-red-700/50">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <div>
              <div className="text-red-400 font-medium">Error</div>
              <div className="text-red-300 text-sm">{error}</div>
            </div>
          </div>
          <Button 
            onClick={fetchDepositAddress}
            className="mt-4 bg-red-600 hover:bg-red-700"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {showAmount && (
        <Card className="bg-gray-800/50 border-gray-700/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-white text-lg flex items-center gap-2">
              <Wallet className="w-4 h-4 text-green-400" />
              Deposit ${amount} USDT
            </CardTitle>
            <CardDescription className="text-sm">
              Send USDT to your unique address
            </CardDescription>
          </CardHeader>
        </Card>
      )}
      
      <div className="space-y-4">
        
        {/* Network Selection */}
        <div>
          <label className="text-xs font-medium text-gray-400 mb-2 block">Select Network</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedNetwork('TRON')}
              className={`p-2 rounded-lg border transition-all text-xs ${
                selectedNetwork === 'TRON' 
                  ? 'bg-green-600 border-green-500 text-white' 
                  : 'bg-gray-800/50 border-gray-600 text-gray-300 hover:border-green-500'
              }`}
            >
              <div className="text-center">
                <div className="font-medium">TRON</div>
                <div className="text-xs opacity-80">TRC20</div>
              </div>
            </button>
            
            <button
              onClick={() => setSelectedNetwork('ARBITRUM')}
              className={`p-2 rounded-lg border transition-all text-xs ${
                selectedNetwork === 'ARBITRUM' 
                  ? 'bg-blue-600 border-blue-500 text-white' 
                  : 'bg-gray-800/50 border-gray-600 text-gray-300 hover:border-blue-500'
              }`}
            >
              <div className="text-center">
                <div className="font-medium">Arbitrum</div>
                <div className="text-xs opacity-80">ARB</div>
              </div>
            </button>
          </div>
        </div>

        {/* Deposit Instructions */}
        {depositData && (
          <>
            {/* Deposit Address */}
            <div>
              <label className="text-xs font-medium text-gray-400 mb-2 block">
                Your {depositData.networkName} Address
              </label>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-900/50 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs font-mono break-all">
                  {depositData.address}
                </div>
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(depositData.address)}
                  className={`px-3 ${copied ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'}`}
                >
                  {copied ? <CheckCircle className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </Button>
              </div>
              
              {/* QR Code Display - Auto-generated */}
              <div className="mt-4">
                <QRCodeDisplay address={depositData.address} />
                <p className="text-center text-xs text-gray-400 mt-2">
                  Scan QR code to copy address
                </p>
              </div>
            </div>

            {/* Network Info */}
            <div className="bg-gray-900/30 rounded-lg p-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-gray-400">Network</div>
                  <div className="text-white font-medium">{depositData.networkName}</div>
                </div>
                <div>
                  <div className="text-gray-400">Token</div>
                  <div className="text-white font-medium">{depositData.symbol}</div>
                </div>
              </div>
            </div>

            {/* Important Notes */}
            <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                <div className="text-xs">
                  <div className="text-yellow-400 font-medium mb-1">Important:</div>
                  <ul className="text-yellow-200 space-y-0.5 text-xs">
                    <li>• Only send {depositData.symbol} to this address</li>
                    <li>• Minimum: $1 USDT</li>
                    <li>• Funds credited after confirmation</li>
                    <li>• Address is unique to your account</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="text-center pt-2">
              <div className="text-gray-400 text-xs">
                {showAmount ? (
                  <>Waiting for <span className="text-white font-medium">${amount} USDT</span> deposit</>
                ) : (
                  <>Waiting for USDT deposit</>
                )}
              </div>
              <div className="text-gray-500 text-xs mt-1">
                Funds will appear automatically
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
