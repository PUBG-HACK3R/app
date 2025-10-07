"use client";

import { useState } from "react";
import { Eye, EyeOff, Bitcoin } from "lucide-react";

interface BalanceSectionProps {
  walletBalance: number;
}

export function BalanceSection({ walletBalance }: BalanceSectionProps) {
  const [showBalance, setShowBalance] = useState(true);

  const toggleBalanceVisibility = () => {
    setShowBalance(!showBalance);
  };

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <span className="text-sm">Balance</span>
          <button
            onClick={toggleBalanceVisibility}
            className="hover:text-gray-500 dark:hover:text-gray-300 transition-colors cursor-pointer"
            aria-label={showBalance ? "Hide balance" : "Show balance"}
          >
            {showBalance ? (
              <Eye className="w-4 h-4" />
            ) : (
              <EyeOff className="w-4 h-4" />
            )}
          </button>
        </div>
        <div className="absolute top-0 right-0">
          <div className="w-16 h-16 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-full flex items-center justify-center">
            <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
              <Bitcoin className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-4xl font-bold text-gray-900 dark:text-white mb-1">
        {showBalance ? `$${walletBalance.toFixed(2)}` : "••••••"}
      </div>
      <div className="text-gray-600 dark:text-gray-400 text-sm">
        USDT Balance
      </div>
    </div>
  );
}
