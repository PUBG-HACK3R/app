"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PlanPurchaseButton } from "@/components/plan-purchase-button";
import { PlanPurchaseModal } from "@/components/plan-purchase-modal";
import { 
  TrendingUp, 
  Shield, 
  Clock, 
  DollarSign,
  Star,
  CheckCircle,
  ArrowRight,
  Target,
  Zap,
  Crown,
  Bitcoin,
  Coins,
  Cpu,
  Activity,
  Factory
} from "lucide-react";

interface DatabasePlan {
  id: string;
  name: string;
  description?: string;
  min_amount: number;
  max_amount: number;
  daily_roi_percentage: number;
  duration_days: number;
  payout_type?: 'daily' | 'end';
  is_active: boolean;
  mining_type?: string;
  hash_rate?: string;
  power_consumption?: string;
  risk_level?: string;
  features?: string;
  created_at: string;
  updated_at: string;
}

interface PlanDisplay extends Omit<DatabasePlan, 'features'> {
  description: string;
  features: string[];
  popular: boolean;
  icon: any;
  gradient: string;
  bgGradient: string;
  userHasActive?: boolean;
  activeSubscription?: {
    id: string;
    created_at: string;
    total_earned: number;
    days_remaining: number;
  };
}

// Bitcoin Mining Plan display configurations - ONLY for actual database plans
const planConfigs: Record<string, {description: string; features: string[]; popular: boolean; icon: any; gradient: string; bgGradient: string}> = {
  default: {
    description: "Professional Bitcoin mining with enterprise-grade equipment",
    features: ["Daily mining rewards", "24/7 Monitoring", "Secure mining", "Real-time stats"],
    popular: false,
    icon: Bitcoin,
    gradient: "from-orange-500 to-red-500",
    bgGradient: "from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900"
  }
};

export default function ClientPlansPage() {
  const [plans, setPlans] = useState<PlanDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPlansWithUserData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/plans/with-user-data');
      
      if (!response.ok) {
        throw new Error('Failed to fetch plans');
      }
      
      const data = await response.json();
      setPlans(data.plans || []);
    } catch (err: any) {
      console.error('Error fetching plans:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlansWithUserData();
  }, []);

  // Refresh plans data (called after successful purchase)
  const refreshPlans = () => {
    fetchPlansWithUserData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900/10 to-gray-900 pt-16 pb-20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-white">Loading plans...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900/10 to-gray-900 pt-16 pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-4">Error loading plans: {error}</p>
          <Button onClick={fetchPlansWithUserData} className="bg-orange-600 hover:bg-orange-700">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900/10 to-gray-900 pt-16 pb-20">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 space-y-8 sm:space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4 sm:space-y-6">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-orange-500/20 to-red-500/20 backdrop-blur-sm border border-orange-500/30 text-orange-300 px-4 py-2 rounded-full text-sm font-medium">
            <Bitcoin className="h-4 w-4" />
            <span>Bitcoin Mining Plans</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Choose Your 
            <span className="block bg-gradient-to-r from-orange-400 via-red-400 to-yellow-400 bg-clip-text text-transparent">
              Bitcoin Mining Plan
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Start earning Bitcoin through our professional mining operations. 
            Each plan offers <span className="text-green-400 font-semibold">daily mining rewards</span> with enterprise-grade equipment.
          </p>
        </div>

        {/* Plans Grid */}
        {plans.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm border border-gray-700/50 rounded-xl p-8">
              <h3 className="text-xl font-semibold mb-2 text-white">No Mining Plans Available</h3>
              <p className="text-gray-400">
                We're currently setting up our Bitcoin mining operations. Please check back soon.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan: PlanDisplay) => {
            const Icon = plan.icon;
            const dailyEarning = plan.min_amount * (plan.daily_roi_percentage / 100);
            const totalReturn = dailyEarning * plan.duration_days;
            const totalProfit = Math.max(0, totalReturn - plan.min_amount); // Ensure positive
            const totalROI = Math.max(0, ((totalProfit / plan.min_amount) * 100)); // Ensure positive
            
            return (
              <Card 
                key={plan.id} 
                className={`relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border-slate-700/50 shadow-2xl transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:border-purple-500/50 group ${
                  plan.popular ? 'ring-2 ring-purple-500 scale-105' : ''
                }`}
              >
                {plan.popular && !plan.userHasActive && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 shadow-lg">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
                    </Badge>
                  </div>
                )}
                
                {plan.userHasActive && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 shadow-lg">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active Plan
                    </Badge>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4 pt-6">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${plan.gradient} text-white mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                    <Icon className="h-8 w-8" />
                  </div>
                  <CardTitle className="text-xl sm:text-2xl font-bold text-white">{plan.name}</CardTitle>
                  <CardDescription className="text-gray-400 text-sm sm:text-base">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
              
                <CardContent className="space-y-6">
                  {/* Pricing */}
                  <div className="text-center space-y-2">
                    <div className="text-3xl sm:text-4xl font-bold text-white">
                      ${plan.min_amount} - ${plan.max_amount.toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-400 flex items-center justify-center gap-1">
                      <Coins className="h-4 w-4" />
                      Custom USDT Investment
                    </div>
                  </div>
                  
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-400">{plan.daily_roi_percentage}%</div>
                      <div className="text-xs text-gray-400">
                        {plan.duration_days >= 30 ? 'Total Return' : 'Daily Mining'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-400">
                        {plan.userHasActive && plan.activeSubscription 
                          ? `${plan.activeSubscription.days_remaining} left`
                          : `${plan.duration_days} days`
                        }
                      </div>
                      <div className="text-xs text-gray-400">Duration</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-400">
                        ${plan.userHasActive && plan.activeSubscription 
                          ? plan.activeSubscription.total_earned.toFixed(2)
                          : totalReturn.toFixed(2)
                        }
                      </div>
                      <div className="text-xs text-gray-400">
                        {plan.userHasActive ? 'Earned So Far' : 'Total Earned'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-yellow-400">
                        +{plan.userHasActive && plan.activeSubscription 
                          ? Math.max(0, ((plan.activeSubscription.total_earned / plan.min_amount) * 100)).toFixed(1)
                          : totalROI.toFixed(1)
                        }%
                      </div>
                      <div className="text-xs text-gray-400">
                        {plan.userHasActive ? 'Current Profit' : 'Total Profit'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Mining Progress Visualization */}
                  <div className="space-y-3 p-4 bg-gradient-to-r from-orange-900/20 to-red-900/20 rounded-lg border border-orange-500/20">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Mining Profit</span>
                      <span className="font-bold text-green-400">
                        ${plan.userHasActive && plan.activeSubscription 
                          ? Math.max(0, plan.activeSubscription.total_earned - plan.min_amount).toFixed(2)
                          : totalProfit.toFixed(2)
                        }
                      </span>
                    </div>
                    <Progress 
                      value={plan.userHasActive && plan.activeSubscription 
                        ? Math.min(100, Math.max(0, (plan.activeSubscription.total_earned / totalReturn) * 100))
                        : Math.max(0, totalROI)
                      } 
                      className="h-3 bg-gray-700" 
                    />
                    <div className="text-xs text-center text-gray-400">
                      {plan.userHasActive && plan.activeSubscription 
                        ? `${Math.max(0, ((plan.activeSubscription.total_earned / totalReturn) * 100)).toFixed(1)}% progress • ${plan.activeSubscription.days_remaining} days left`
                        : `${totalROI.toFixed(1)}% total mining profit over ${plan.duration_days} days`
                      }
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center text-white">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                      What's Included
                    </h4>
                    <ul className="space-y-2">
                      {plan.features.map((feature: string, index: number) => (
                        <li key={index} className="flex items-center text-sm text-gray-300">
                          <CheckCircle className="h-3 w-3 mr-2 text-green-400 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* CTA Button */}
                  {plan.userHasActive ? (
                    <div className="space-y-3">
                      <Button 
                        className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-all duration-300"
                        disabled
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Plan Active
                      </Button>
                      <Link href="/active-plans">
                        <Button variant="outline" className="w-full border-green-500/50 text-green-400 hover:bg-green-500/10">
                          <TrendingUp className="h-4 w-4 mr-2" />
                          View Progress
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <PlanPurchaseModal
                      planId={plan.id}
                      planName={plan.name}
                      minAmount={plan.min_amount}
                      maxAmount={plan.max_amount}
                      dailyRoi={plan.daily_roi_percentage}
                      duration={plan.duration_days}
                      gradient={plan.gradient}
                      onPurchaseSuccess={refreshPlans}
                    >
                      <Button 
                        size="lg" 
                        className={`w-full bg-gradient-to-r ${plan.gradient} hover:opacity-90 text-white font-semibold`}
                      >
                        <DollarSign className="mr-2 h-4 w-4" />
                        Invest Now
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </PlanPurchaseModal>
                  )}
                  
                  {/* Mining Disclaimer */}
                  <div className="flex items-start space-x-2 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
                    <Shield className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-300">
                      Mining returns depend on network difficulty and Bitcoin price. Estimates based on current mining conditions.
                    </p>
                  </div>
                </CardContent>
            </Card>
          );
        })}
        </div>
      )}
      </div>
    </div>
  );
}
