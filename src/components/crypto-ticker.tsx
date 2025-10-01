"use client";

import { useCryptoPrices } from "@/hooks/use-crypto-prices";
import { Bitcoin, Coins, TrendingUp, TrendingDown, Loader2 } from "lucide-react";

interface CryptoTickerProps {
  variant?: "dashboard" | "footer";
  className?: string;
}

export function CryptoTicker({ variant = "dashboard", className = "" }: CryptoTickerProps) {
  const { pricesArray, loading, error } = useCryptoPrices();

  // Fallback data if API fails
  const fallbackData = [
    { name: "Bitcoin", symbol: "BTC", formatted_price: "$43,250", formatted_change: "+2.4%", change: 2.4 },
    { name: "Ethereum", symbol: "ETH", formatted_price: "$2,580", formatted_change: "+1.8%", change: 1.8 },
    { name: "USDT", symbol: "USDT", formatted_price: "$1.00", formatted_change: "0.0%", change: 0.0 },
    { name: "BNB", symbol: "BNB", formatted_price: "$315", formatted_change: "+3.2%", change: 3.2 },
  ];

  const cryptoData = loading || error ? fallbackData : pricesArray;

  if (variant === "dashboard") {
    return (
      <div className={`bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-3">
          {loading ? (
            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
          ) : error ? (
            <TrendingDown className="h-4 w-4 text-red-500" />
          ) : (
            <Bitcoin className="h-4 w-4 text-orange-500" />
          )}
          <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
            {loading ? 'Loading Crypto Prices...' : error ? 'Crypto Prices (Offline)' : 'Live Crypto Prices'}
          </span>
          {!loading && !error && (
            <span className="text-xs text-muted-foreground">• Updates every 30s</span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {cryptoData.map((crypto) => (
            <div key={crypto.symbol} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  crypto.symbol === 'BTC' ? 'bg-orange-500' :
                  crypto.symbol === 'ETH' ? 'bg-blue-500' :
                  crypto.symbol === 'USDT' ? 'bg-green-500' :
                  'bg-yellow-500'
                }`}>
                  {crypto.symbol === 'BTC' ? (
                    <span className="text-white text-xs font-bold">₿</span>
                  ) : crypto.symbol === 'ETH' ? (
                    <span className="text-white text-xs font-bold">Ξ</span>
                  ) : crypto.symbol === 'USDT' ? (
                    <span className="text-white text-xs font-bold">₮</span>
                  ) : (
                    <Coins className="h-3 w-3 text-white" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium">{crypto.symbol}</div>
                  <div className="text-xs text-muted-foreground">{crypto.name}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{crypto.formatted_price || crypto.price}</div>
                <div className={`text-xs flex items-center gap-1 ${
                  (crypto.change || 0) > 0 ? 'text-green-600' : 
                  (crypto.change || 0) < 0 ? 'text-red-600' : 'text-gray-500'
                }`}>
                  {(crypto.change || 0) > 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (crypto.change || 0) < 0 ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : null}
                  {crypto.formatted_change || crypto.change}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return null;
}
