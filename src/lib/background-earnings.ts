"use client";

import { toast } from "sonner";

interface CheckResult {
  totalInvestments: number;
  earningsProcessed: number;
  investmentsCompleted: number;
  totalEarningsAdded: number;
  totalPrincipalReturned: number;
  errors?: string[];
}

class BackgroundEarningsService {
  private isChecking = false;
  private lastCheck: Date | null = null;
  private checkInterval: NodeJS.Timeout | null = null;

  async checkEarnings(silent = false): Promise<CheckResult | null> {
    if (this.isChecking) return null;
    
    this.isChecking = true;
    
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
      this.lastCheck = new Date();

      // Show notifications only if not silent and there are results
      if (!silent && (results.earningsProcessed > 0 || results.investmentsCompleted > 0)) {
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

        // Refresh the page after a short delay to show updated balance
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }

      if (results.errors && results.errors.length > 0) {
        console.warn("Earnings check warnings:", results.errors);
      }

      return results;

    } catch (error: any) {
      console.error("Background earnings check failed:", error);
      if (!silent) {
        toast.error("Earnings Check Failed", {
          description: error.message || "Failed to check earnings automatically.",
          duration: 4000,
        });
      }
      return null;
    } finally {
      this.isChecking = false;
    }
  }

  // Start background checking when user logs in
  startBackgroundChecking() {
    // Initial check after 2 seconds
    setTimeout(() => {
      this.checkEarnings(true); // Silent initial check
    }, 2000);

    // Set up periodic checks every 10 minutes
    this.checkInterval = setInterval(() => {
      this.checkEarnings(true); // Silent periodic checks
    }, 10 * 60 * 1000); // 10 minutes

    // Check when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && this.lastCheck) {
        const timeSinceLastCheck = Date.now() - this.lastCheck.getTime();
        // Check if it's been more than 5 minutes since last check
        if (timeSinceLastCheck > 5 * 60 * 1000) {
          this.checkEarnings(true);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Store the cleanup function
    return () => {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }

  // Stop background checking
  stopBackgroundChecking() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  // Manual check (for any manual refresh buttons if needed)
  async manualCheck(): Promise<CheckResult | null> {
    return this.checkEarnings(false); // Not silent, show notifications
  }

  getLastCheckTime(): Date | null {
    return this.lastCheck;
  }

  isCurrentlyChecking(): boolean {
    return this.isChecking;
  }
}

// Export singleton instance
export const backgroundEarnings = new BackgroundEarningsService();
