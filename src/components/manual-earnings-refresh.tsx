"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, Clock } from "lucide-react";
import { backgroundEarnings } from "@/lib/background-earnings";
import { toast } from "sonner";

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
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Get initial last check time on component mount
  useEffect(() => {
    const lastCheck = backgroundEarnings.getLastCheckTime();
    setLastRefreshTime(lastCheck);
  }, []);

  const handleManualCheck = async () => {
    if (isChecking) return;
    
    setIsChecking(true);
    
    // Show popup notification that refresh started
    toast.info("Refreshing Earnings", {
      description: "Checking for new earnings...",
      duration: 2000,
    });
    
    try {
      const result = await backgroundEarnings.manualCheck();
      const now = new Date();
      setLastRefreshTime(now);
      
      // Show success popup with results
      if (result) {
        toast.success("Refresh Complete!", {
          description: `Last refreshed at ${now.toLocaleTimeString()}`,
          duration: 3000,
        });
      }
    } catch (error) {
      toast.error("Refresh Failed", {
        description: "Failed to refresh earnings. Please try again.",
        duration: 4000,
      });
    } finally {
      setIsChecking(false);
    }
  };

  const formatLastRefreshTime = (date: Date | null) => {
    if (!date) return "Never";
    
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    return date.toLocaleDateString();
  };

  return (
    <div className="flex flex-col items-center gap-2">
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
      
      {/* Last Refresh Time Display */}
      <div className="flex items-center gap-1 text-xs text-gray-500">
        <Clock className="h-3 w-3" />
        <span>Last refresh: {formatLastRefreshTime(lastRefreshTime)}</span>
      </div>
    </div>
  );
}
