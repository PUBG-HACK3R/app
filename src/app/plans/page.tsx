import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PlanPurchaseButton } from "@/components/plan-purchase-button";
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
  Coins
} from "lucide-react";

interface DatabasePlan {
  id: string;
  name: string;
  price_usdt: number;
  roi_daily_percent: number;
  duration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PlanDisplay extends DatabasePlan {
  description: string;
  features: string[];
  popular: boolean;
  icon: any;
  gradient: string;
  bgGradient: string;
}

// Plan display configurations
const planConfigs: Record<string, Omit<PlanDisplay, keyof DatabasePlan>> = {
  default: {
    description: "A great investment opportunity with competitive returns",
    features: ["Daily returns", "24/7 Support", "Secure wallet", "Analytics"],
    popular: false,
    icon: Target,
    gradient: "from-blue-500 to-blue-600",
    bgGradient: "from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900"
  },
  starter: {
    description: "Perfect for beginners looking to start their investment journey",
    features: ["Daily returns", "24/7 Support", "Basic analytics", "Secure wallet"],
    popular: false,
    icon: Target,
    gradient: "from-blue-500 to-blue-600",
    bgGradient: "from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900"
  },
  pro: {
    description: "Ideal for experienced investors seeking higher returns",
    features: ["Higher daily returns", "Priority support", "Advanced analytics", "Portfolio insights", "Risk management"],
    popular: true,
    icon: TrendingUp,
    gradient: "from-green-500 to-green-600",
    bgGradient: "from-green-50 to-green-100 dark:from-green-950 dark:to-green-900"
  },
  elite: {
    description: "Premium plan for serious investors with maximum returns",
    features: ["Maximum daily returns", "VIP support", "Premium analytics", "Personal advisor", "Custom strategies", "Exclusive insights"],
    popular: false,
    icon: Crown,
    gradient: "from-purple-500 to-purple-600",
    bgGradient: "from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900"
  }
};

async function getPlans(): Promise<PlanDisplay[]> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/plans`, {
      cache: 'no-store' // Always fetch fresh data
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch plans');
    }
    
    const data = await response.json();
    const plans: DatabasePlan[] = data.plans || [];
    
    // Transform database plans to display plans
    return plans.map((plan, index) => {
      const planKey = plan.name.toLowerCase().replace(/\s+/g, '');
      const config = planConfigs[planKey] || planConfigs.default;
      
      // Mark middle plan as popular if there are 3 plans
      const isPopular = plans.length === 3 && index === 1 ? true : config.popular;
      
      return {
        ...plan,
        ...config,
        popular: isPopular
      };
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    // Return empty array if fetch fails
    return [];
  }
}

export default async function PlansPage() {
  const plans = await getPlans();
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900/20 to-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:py-12 space-y-8 sm:space-y-12">
        {/* Header Section */}
        <div className="text-center space-y-4 sm:space-y-6">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-blue-500/30 text-blue-300 px-4 py-2 rounded-full text-sm font-medium">
            <Bitcoin className="h-4 w-4" />
            <span>Crypto Investment Opportunities</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white">
            Choose Your 
            <span className="block bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Crypto Investment Plan
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
            Start building your crypto wealth with our AI-powered investment portfolios. 
            Each plan offers <span className="text-green-400 font-semibold">guaranteed daily returns</span> with complete transparency.
          </p>
        </div>

        {/* Plans Grid */}
        {plans.length === 0 ? (
          <div className="text-center py-12">
            <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-8">
              <h3 className="text-xl font-semibold mb-2 text-white">No Investment Plans Available</h3>
              <p className="text-gray-400">
                We're currently updating our crypto investment plans. Please check back soon.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 sm:gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => {
            const Icon = plan.icon;
            const totalReturn = (plan.price_usdt * (plan.roi_daily_percent / 100) * plan.duration_days).toFixed(2);
            const totalProfit = (parseFloat(totalReturn) - plan.price_usdt).toFixed(2);
            const totalROI = ((parseFloat(totalProfit) / plan.price_usdt) * 100).toFixed(1);
            
            return (
              <Card 
                key={plan.id} 
                className={`relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border-slate-700/50 shadow-2xl transition-all duration-300 hover:shadow-2xl hover:scale-105 hover:border-purple-500/50 group ${
                  plan.popular ? 'ring-2 ring-purple-500 scale-105' : ''
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                    <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-2 shadow-lg">
                      <Star className="h-3 w-3 mr-1" />
                      Most Popular
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
                    <div className="text-3xl sm:text-4xl font-bold text-white">${plan.price_usdt}</div>
                    <div className="text-sm text-gray-400 flex items-center justify-center gap-1">
                      <Coins className="h-4 w-4" />
                      Minimum USDT Investment
                    </div>
                  </div>
                  
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 p-4 bg-slate-700/30 rounded-lg border border-slate-600/30">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-400">{plan.roi_daily_percent}%</div>
                      <div className="text-xs text-gray-400">Daily ROI</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-400">{plan.duration_days} days</div>
                      <div className="text-xs text-gray-400">Duration</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-purple-400">${totalReturn}</div>
                      <div className="text-xs text-gray-400">Total Return</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-orange-400">+{totalROI}%</div>
                      <div className="text-xs text-gray-400">Total ROI</div>
                    </div>
                  </div>
                  
                  {/* ROI Progress Visualization */}
                  <div className="space-y-3 p-4 bg-gradient-to-r from-green-900/20 to-blue-900/20 rounded-lg border border-green-500/20">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-300">Expected Profit</span>
                      <span className="font-bold text-green-400">${totalProfit}</span>
                    </div>
                    <Progress value={parseFloat(totalROI)} className="h-3 bg-slate-700" />
                    <div className="text-xs text-center text-gray-400">
                      {totalROI}% total return over {plan.duration_days} days
                    </div>
                  </div>
                  
                  {/* Features */}
                  <div className="space-y-3">
                    <h4 className="font-semibold flex items-center text-white">
                      <CheckCircle className="h-4 w-4 mr-2 text-green-400" />
                      What's Included
                    </h4>
                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-center text-sm text-gray-300">
                          <CheckCircle className="h-3 w-3 mr-2 text-green-400 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {/* CTA Button */}
                  <PlanPurchaseButton
                    planId={plan.id}
                    planName={plan.name}
                    planPrice={plan.price_usdt}
                    gradient={plan.gradient}
                  />
                  
                  {/* Risk Disclaimer */}
                  <div className="flex items-start space-x-2 p-3 bg-amber-900/20 border border-amber-700/30 rounded-lg">
                    <Shield className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-amber-300">
                      Crypto investments carry risk. Returns are projected based on AI trading algorithms and historical performance.
                    </p>
                  </div>
                </CardContent>
            </Card>
          );
        })}
        </div>
      )}
      
        {/* Additional Information */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-12 sm:mt-16">
          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-700/50 backdrop-blur-sm text-center p-6 hover:border-blue-500/70 transition-all duration-300 group">
            <div className="p-3 rounded-full bg-blue-500/20 w-fit mx-auto mb-4 group-hover:bg-blue-500/30 transition-colors duration-300">
              <Shield className="h-10 w-10 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">Military-Grade Security</h3>
            <p className="text-sm text-blue-200">
              Your crypto investments are protected with advanced encryption, cold storage, and multi-signature wallets.
            </p>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-700/50 backdrop-blur-sm text-center p-6 hover:border-green-500/70 transition-all duration-300 group">
            <div className="p-3 rounded-full bg-green-500/20 w-fit mx-auto mb-4 group-hover:bg-green-500/30 transition-colors duration-300">
              <Clock className="h-10 w-10 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">Automated Daily Returns</h3>
            <p className="text-sm text-green-200">
              AI-powered trading algorithms generate daily profits, automatically credited to your USDT wallet balance.
            </p>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 border-purple-700/50 backdrop-blur-sm text-center p-6 hover:border-purple-500/70 transition-all duration-300 group sm:col-span-2 lg:col-span-1">
            <div className="p-3 rounded-full bg-purple-500/20 w-fit mx-auto mb-4 group-hover:bg-purple-500/30 transition-colors duration-300">
              <Bitcoin className="h-10 w-10 text-purple-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">Instant Crypto Withdrawals</h3>
            <p className="text-sm text-purple-200">
              Withdraw your USDT earnings anytime with lightning-fast blockchain transactions and minimal fees.
            </p>
          </Card>
        </div>
      </div>
    </main>
  );
}
