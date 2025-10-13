"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { backgroundEarnings } from "@/lib/background-earnings";

interface ManualEarningsRefreshProps {
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function ManualEarningsRefresh({ 
  size = "sm", 
  variant = "outline",
  className = ""
}: ManualEarningsRefreshProps) {
  const [isChecking, setIsChecking] = useState(false);

  const handleManualCheck = async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    try {
      await backgroundEarnings.manualCheck();
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <Button
      onClick={handleManualCheck}
      disabled={isChecking}
      variant={variant}
      size={size}
      className={`${className} ${isChecking ? 'opacity-50' : ''}`}
    >
      <RefreshCw className={`${size === 'sm' ? 'h-3 w-3' : 'h-4 w-4'} mr-2 ${isChecking ? 'animate-spin' : ''}`} />
      {isChecking ? 'Checking...' : 'Refresh Earnings'}
    </Button>
  );
}
