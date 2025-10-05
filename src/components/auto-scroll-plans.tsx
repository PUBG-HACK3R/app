"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlanPurchaseButton } from "@/components/plan-purchase-button";

interface Plan {
  id: string;
  name: string;
  min_amount: number;
  max_amount: number;
  roi_daily_percent: number;
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
        <div className="flex-shrink-0 w-64 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl border border-gray-700/50 p-4">
          <div className="space-y-3">
            <div className="text-center text-gray-400">
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
      {plans.map((plan, index) => (
        <div key={plan.id} className="flex-shrink-0 w-64 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-2xl border border-gray-700/50 p-4 hover:border-gray-600/50 transition-all duration-300">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-white text-lg">{plan.name}</h3>
              <Badge className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-300 border-blue-500/30 font-semibold">
                {plan.roi_daily_percent}% Daily
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="text-3xl font-bold text-white">
                ${(plan.min_amount || 0).toLocaleString()} - ${(plan.max_amount || 0).toLocaleString()}
              </div>
              <div className="text-sm text-gray-400">
                {plan.duration_days} days • {(plan.roi_daily_percent * plan.duration_days).toFixed(1)}% total ROI
              </div>
              <div className="text-xs text-green-400 font-medium">
                Daily profit: ${((plan.min_amount || 0) * (plan.roi_daily_percent || 0) / 100).toFixed(2)}+
              </div>
            </div>
            
            {plan.user_has_subscription ? (
              <Button 
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold shadow-lg cursor-default"
                disabled
              >
                ✓ Active Plan
              </Button>
            ) : (
              <PlanPurchaseButton
                planId={plan.id}
                planName={plan.name}
                planPrice={plan.min_amount}
                gradient="from-blue-500 to-purple-600"
                className="w-full shadow-lg transform hover:scale-105 transition-all duration-200"
              />
            )}
          </div>
        </div>
      ))}
      
      {/* Add a "View All" card at the end */}
      <div className="flex-shrink-0 w-64 bg-gradient-to-br from-purple-800/50 to-pink-800/50 rounded-2xl border border-purple-700/50 p-4 hover:border-purple-600/50 transition-all duration-300">
        <div className="space-y-3 h-full flex flex-col justify-center items-center text-center">
          <div className="text-white font-bold text-lg">View All Plans</div>
          <div className="text-purple-200 text-sm">
            Discover more investment opportunities
          </div>
          <Link href="/plans" className="w-full">
            <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 text-white font-semibold">
              Browse All
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
