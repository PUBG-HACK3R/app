"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface EarningsCheckerProps {
  onEarningsProcessed?: () => void;
}

export function EarningsChecker({ onEarningsProcessed }: EarningsCheckerProps) {
  const [isChecking, setIsChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [autoCheckEnabled, setAutoCheckEnabled] = useState(true);

  const checkEarnings = async (showToast = true) => {
    setIsChecking(true);
    
    try {
      const response = await fetch('/api/user/check-earnings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setLastCheck(new Date());
        const results = data.results;
        
        if (results.earningsProcessed > 0 || results.investmentsCompleted > 0) {
          if (showToast) {
            let message = "";
            
            if (results.earningsProcessed > 0) {
              message += `💰 Earned $${results.totalEarningsAdded} from ${results.earningsProcessed} investment${results.earningsProcessed > 1 ? 's' : ''}`;
            }
            
            if (results.investmentsCompleted > 0) {
              if (message) message += "\n";
              message += `🎉 ${results.investmentsCompleted} investment${results.investmentsCompleted > 1 ? 's' : ''} completed! $${results.totalPrincipalReturned} returned`;
            }
            
            toast.success(
              "Earnings Updated!",
              {
                description: message,
                duration: 5000,
              }
            );
          }
          
          // Notify parent component to refresh data
          onEarningsProcessed?.();
          
          // Refresh the page to show updated balance
          setTimeout(() => {
            window.location.reload();
          }, 1000);
        } else if (showToast) {
          toast.info("All up to date!", {
            description: "No new earnings to process at this time."
          });
        }
      } else {
        console.error('Earnings check failed:', data.error);
        if (showToast) {
          toast.error("Failed to check earnings");
        }
      }
    } catch (error) {
      console.error('Earnings check error:', error);
      if (showToast) {
        toast.error("Failed to check earnings");
      }
    } finally {
      setIsChecking(false);
    }
  };

  // Auto-check on component mount
  useEffect(() => {
    if (autoCheckEnabled) {
      checkEarnings(false); // Don't show toast on initial check
    }
  }, [autoCheckEnabled]);

  // Auto-check every 5 minutes when tab is active
  useEffect(() => {
    if (!autoCheckEnabled) return;

    let interval: NodeJS.Timeout;
    
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Check immediately when tab becomes visible
        checkEarnings(false);
        
        // Set up interval for periodic checks
        interval = setInterval(() => {
          checkEarnings(false);
        }, 5 * 60 * 1000); // 5 minutes
      } else {
        // Clear interval when tab is hidden
        if (interval) {
          clearInterval(interval);
        }
      }
    };

    // Initial setup
    handleVisibilityChange();
    
    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoCheckEnabled]);

  return (
    <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
      <div className="flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-green-600" />
        <div>
          <p className="text-sm font-medium text-green-800">
            Earnings Auto-Check
          </p>
          <p className="text-xs text-green-600">
            {lastCheck 
              ? `Last checked: ${lastCheck.toLocaleTimeString()}`
              : 'Checking for due earnings...'
            }
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-2 ml-auto">
        <Badge 
          variant={autoCheckEnabled ? "default" : "secondary"}
          className={autoCheckEnabled ? "bg-green-600" : ""}
        >
          {autoCheckEnabled ? "Auto" : "Manual"}
        </Badge>
        
        <Button
          onClick={() => checkEarnings(true)}
          disabled={isChecking}
          size="sm"
          variant="outline"
          className="border-green-300 text-green-700 hover:bg-green-50"
        >
          {isChecking ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-1" />
              Check Now
            </>
          )}
        </Button>
        
        <Button
          onClick={() => setAutoCheckEnabled(!autoCheckEnabled)}
          size="sm"
          variant="ghost"
          className="text-green-700 hover:bg-green-50"
        >
          {autoCheckEnabled ? "Disable Auto" : "Enable Auto"}
        </Button>
      </div>
    </div>
  );
}
