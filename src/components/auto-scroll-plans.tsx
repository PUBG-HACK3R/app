"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlanPurchaseButton } from "@/components/plan-purchase-button";
import { PlanPurchaseModal } from "@/components/plan-purchase-modal";

interface Plan {
  id: string;
  name: string;
  min_amount: number;
  max_amount: number;
  daily_roi_percentage: number;
  duration_days: number;
  is_active?: boolean;
  user_has_subscription?: boolean;
}

interface HorizontalPlansProps {
  plans: Plan[];
}

export function HorizontalPlans({ plans }: HorizontalPlansProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll functionality removed - now just manual scrolling

  if (!plans || plans.length === 0) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex-shrink-0 w-64 bg-gradient-to-br from-gray-200/80 to-gray-300/80 dark:from-gray-800/80 dark:to-gray-900/80 rounded-2xl border border-gray-300/50 dark:border-gray-700/50 p-4">
          <div className="space-y-3">
            <div className="text-center text-gray-600 dark:text-gray-400">
              No investment plans available
            </div>
            <Link href="/plans">
              <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white">
                Browse Plans
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={scrollRef}
      className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {plans.map((plan, index) => {
        const isEndPayoutPlan = plan.duration_days >= 30;
        
        // Handle different ROI display for monthly plans
        let displayROI = plan.daily_roi_percentage;
        let badgeText = `${displayROI}% Daily`;
        let totalROI = plan.daily_roi_percentage * plan.duration_days;
        let dailyProfit = (plan.min_amount * plan.daily_roi_percentage) / 100;
        
        if (isEndPayoutPlan) {
          // Monthly plans: show 120% or 150% total return
          displayROI = plan.duration_days === 30 ? 120 : 150;
          badgeText = `${displayROI}% Total`;
          totalROI = displayROI;
          dailyProfit = 0; // No daily profit for end-payout plans
        }
        
        return (
          <div key={plan.id} className="flex-shrink-0 w-64 bg-gradient-to-br from-gray-200/80 to-gray-300/80 dark:from-gray-800/80 dark:to-gray-900/80 rounded-2xl border border-gray-300/50 dark:border-gray-700/50 p-4 hover:border-gray-400/50 dark:hover:border-gray-600/50 transition-all duration-300">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-900 dark:text-white text-lg">{plan.name}</h3>
                <Badge className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-600 dark:text-blue-300 border-blue-500/30 font-semibold whitespace-nowrap">
                  {badgeText}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  ${plan.min_amount} - ${(plan.max_amount || 100000).toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {plan.duration_days} days • {totalROI.toFixed(1)}% total ROI
                </div>
                {!isEndPayoutPlan ? (
                  <div className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Daily profit: ${dailyProfit.toFixed(2)}+ per ${plan.min_amount}
                  </div>
                ) : (
                  <div className="text-xs text-amber-600 dark:text-amber-400 font-medium">
                    💰 All earnings paid at completion
                  </div>
                )}
              </div>
              
              {plan.user_has_subscription ? (
                <Button 
                  className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold shadow-lg cursor-default"
                  disabled
                >
                  ✓ Active Plan
                </Button>
              ) : (
                <PlanPurchaseModal
                  planId={plan.id}
                  planName={plan.name}
                  minAmount={plan.min_amount}
                  maxAmount={plan.max_amount || 100000}
                  dailyRoi={displayROI}
                  duration={plan.duration_days}
                  gradient="from-blue-500 to-purple-600"
                >
                  <Button className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold shadow-lg transform hover:scale-105 transition-all duration-200">
                    Invest Now
                  </Button>
                </PlanPurchaseModal>
              )}
            </div>
          </div>
        );
      })}
      
      {/* Removed "View All Plans" card */}
    </div>
  );
}
