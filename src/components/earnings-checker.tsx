"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface EarningsCheckerProps {
  autoCheck?: boolean;
  showButton?: boolean;
  onComplete?: () => void;
}

interface CheckResult {
  totalInvestments: number;
  earningsProcessed: number;
  investmentsCompleted: number;
  totalEarningsAdded: number;
  totalPrincipalReturned: number;
  errors?: string[];
}

export function EarningsChecker({ 
  autoCheck = true, 
  showButton = true, 
  onComplete 
}: EarningsCheckerProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const checkEarnings = async (manual = false) => {
    if (isChecking) return;
    
    setIsChecking(true);
    
    try {
      const response = await fetch("/api/user/check-earnings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to check earnings");
      }

      const results: CheckResult = data.results;
      setLastCheck(new Date());

      // Show notifications based on results
      if (results.earningsProcessed > 0 || results.investmentsCompleted > 0) {
        let message = "";
        
        if (results.earningsProcessed > 0) {
          message += `💰 Earned $${results.totalEarningsAdded} from ${results.earningsProcessed} investment${results.earningsProcessed > 1 ? 's' : ''}`;
        }
        
        if (results.investmentsCompleted > 0) {
          if (message) message += "\n";
          message += `🎉 ${results.investmentsCompleted} investment${results.investmentsCompleted > 1 ? 's' : ''} completed! $${results.totalPrincipalReturned} returned to your balance`;
        }

        toast.success("Earnings Updated!", {
          description: message,
          duration: 5000,
        });
      } else if (manual) {
        toast.info("All up to date!", {
          description: "No new earnings to process at this time.",
          duration: 3000,
        });
      }

      if (results.errors && results.errors.length > 0) {
        console.warn("Earnings check warnings:", results.errors);
      }

      // Call onComplete callback if provided
      if (onComplete) {
        onComplete();
      }

    } catch (error: any) {
      console.error("Earnings check failed:", error);
      if (manual) {
        toast.error("Check Failed", {
          description: error.message || "Failed to check earnings. Please try again.",
          duration: 4000,
        });
      }
    } finally {
      setIsChecking(false);
    }
  };

  // Auto-check on component mount
  useEffect(() => {
    if (autoCheck) {
      // Small delay to ensure page is loaded
      const timer = setTimeout(() => {
        checkEarnings(false);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [autoCheck]);

  // Manual refresh button
  if (!showButton) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => checkEarnings(true)}
        disabled={isChecking}
        variant="outline"
        size="sm"
        className="bg-gray-800/50 border-gray-700/50 hover:bg-gray-700/50 text-gray-300 hover:text-white"
      >
        <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
        {isChecking ? 'Checking...' : 'Refresh Earnings'}
      </Button>
      
      {lastCheck && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Last checked: {lastCheck.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
