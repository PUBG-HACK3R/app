import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
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
  Coins,
  Cpu,
  Activity,
  Factory
} from "lucide-react";

interface DatabasePlan {
  id: string;
  name: string;
  min_amount: number;
  roi_daily_percent: number;
  duration_days: number;
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

// Bitcoin Mining Plan display configurations
const planConfigs: Record<string, {description: string; features: string[]; popular: boolean; icon: any; gradient: string; bgGradient: string}> = {
  "microbitcoinminer": {
    description: "Perfect starter plan for new miners. Low risk, steady returns with shared ASIC mining.",
    features: ["Shared ASIC Mining", "Daily Payouts", "24/7 Support", "Mobile Monitoring"],
    popular: false,
    icon: Bitcoin,
    gradient: "from-orange-500 to-orange-600",
    bgGradient: "from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900"
  },
  "basicbitcoinminer": {
    description: "Popular choice for beginners. Dedicated mining power with good daily returns.",
    features: ["Dedicated Mining", "Real-time Stats", "Daily Rewards", "Email Notifications"],
    popular: true,
    icon: Bitcoin,
    gradient: "from-blue-500 to-blue-600",
    bgGradient: "from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900"
  },
  "advancedbitcoinminer": {
    description: "Professional mining with latest hardware. Higher returns for serious miners.",
    features: ["ASIC S19 Mining", "Priority Support", "Advanced Analytics", "Auto-compound Option"],
    popular: false,
    icon: Zap,
    gradient: "from-purple-500 to-purple-600",
    bgGradient: "from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900"
  },
  "bitcoinprominer": {
    description: "Professional Bitcoin mining operation with latest S19 Pro miners.",
    features: ["ASIC S19 Pro", "Advanced Cooling", "Priority Support", "Real-time Analytics"],
    popular: false,
    icon: Crown,
    gradient: "from-green-500 to-green-600",
    bgGradient: "from-green-50 to-green-100 dark:from-green-950 dark:to-green-900"
  },
  "bitcoinenterprisefarm": {
    description: "Large-scale Bitcoin mining farm with industrial-grade equipment.",
    features: ["Industrial ASIC Farm", "Renewable Energy", "Dedicated Support", "Custom Mining Pool"],
    popular: false,
    icon: Crown,
    gradient: "from-red-500 to-red-600",
    bgGradient: "from-red-50 to-red-100 dark:from-red-950 dark:to-red-900"
  },
  default: {
    description: "Professional Bitcoin mining with enterprise-grade equipment",
    features: ["Daily mining rewards", "24/7 Monitoring", "Secure mining", "Real-time stats"],
    popular: false,
    icon: Bitcoin,
    gradient: "from-orange-500 to-red-500",
    bgGradient: "from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900"
  },
  "bitcoin starter miner": {
    description: "Entry-level Bitcoin mining with ASIC S19 miners. Perfect for beginners.",
    features: ["ASIC S19 Miners", "24/7 Monitoring", "Daily Payouts", "Mining Pool Access"],
    popular: false,
    icon: Cpu,
    gradient: "from-blue-500 to-blue-600",
    bgGradient: "from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900"
  },
  "bitcoin pro miner": {
    description: "Professional Bitcoin mining with S19 Pro miners and optimized cooling.",
    features: ["ASIC S19 Pro", "Advanced Cooling", "Priority Support", "Real-time Analytics", "Mining Optimization"],
    popular: true,
    icon: Activity,
    gradient: "from-green-500 to-green-600",
    bgGradient: "from-green-50 to-green-100 dark:from-green-950 dark:to-green-900"
  },
  "bitcoin enterprise farm": {
    description: "Large-scale Bitcoin mining farm with industrial equipment and renewable energy.",
    features: ["Industrial ASIC Farm", "Renewable Energy", "Dedicated Support", "Custom Mining Pool", "Advanced Analytics", "Insurance Coverage"],
    popular: false,
    icon: Factory,
    gradient: "from-purple-500 to-purple-600",
    bgGradient: "from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900"
  },
  "ethereum gpu miner": {
    description: "High-performance GPU mining for Ethereum with RTX 4090 rigs.",
    features: ["RTX 4090 GPUs", "Ethereum Mining", "Auto-switching", "Overclocking", "24/7 Monitoring"],
    popular: false,
    icon: Zap,
    gradient: "from-indigo-500 to-indigo-600",
    bgGradient: "from-indigo-50 to-indigo-100 dark:from-indigo-950 dark:to-indigo-900"
  },
  "cloud mining starter": {
    description: "Hassle-free cloud mining without hardware maintenance.",
    features: ["No Hardware Needed", "Remote Mining", "Instant Start", "Multiple Cryptocurrencies", "Mobile App"],
    popular: false,
    icon: Target,
    gradient: "from-cyan-500 to-cyan-600",
    bgGradient: "from-cyan-50 to-cyan-100 dark:from-cyan-950 dark:to-cyan-900"
  },
  "defi yield farming": {
    description: "Automated DeFi yield farming across multiple protocols.",
    features: ["Multi-Protocol Staking", "Automated Compounding", "Liquidity Mining", "Risk Management", "Real-time Yields"],
    popular: false,
    icon: Crown,
    gradient: "from-pink-500 to-pink-600",
    bgGradient: "from-pink-50 to-pink-100 dark:from-pink-950 dark:to-pink-900"
  },
  "multi-coin miner": {
    description: "Diversified mining across profitable altcoins with automatic profit switching.",
    features: ["Multi-Algorithm Mining", "Profit Switching", "Diverse Coin Portfolio", "Risk Diversification", "Advanced Analytics"],
    popular: false,
    icon: Coins,
    gradient: "from-amber-500 to-amber-600",
    bgGradient: "from-amber-50 to-amber-100 dark:from-amber-950 dark:to-amber-900"
  }
};

async function getPlansWithUserData(): Promise<PlanDisplay[]> {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    
    // Fetch plans directly from database using admin client
    const { data: dbPlans, error } = await admin
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("min_amount", { ascending: true });
    
    if (error) {
      console.error('Database error fetching plans:', error);
      return [];
    }
    
    if (!dbPlans || dbPlans.length === 0) {
      console.log('No plans found in database');
      return [];
    }

    // Get user's active subscriptions if logged in
    let userSubscriptions: any[] = [];
    if (user) {
      const { data: subscriptions } = await admin
        .from("subscriptions")
        .select(`
          id,
          plan_id,
          created_at,
          is_active,
          duration_days
        `)
        .eq("user_id", user.id)
        .eq("is_active", true);
      
      userSubscriptions = subscriptions || [];

      // Get total earnings for each subscription
      if (userSubscriptions.length > 0) {
        const subscriptionIds = userSubscriptions.map(s => s.id);
        const { data: earnings } = await admin
          .from("transactions")
          .select("description, amount_usdt")
          .in("description", subscriptionIds.map(id => `Daily earning for subscription ${id}`));
        
        // Calculate total earned per subscription
        userSubscriptions = userSubscriptions.map(sub => {
          const subEarnings = earnings?.filter(e => e.description.includes(sub.id)) || [];
          const totalEarned = subEarnings.reduce((sum, e) => sum + Number(e.amount_usdt), 0);
          
          // Calculate days remaining
          const createdDate = new Date(sub.created_at);
          const daysPassed = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
          const daysRemaining = Math.max(0, sub.duration_days - daysPassed);
          
          return {
            ...sub,
            total_earned: totalEarned,
            days_remaining: daysRemaining
          };
        });
      }
    }
    
    // Transform database plans to display plans
    return dbPlans.map((plan, index) => {
      const planKey = plan.name.toLowerCase().replace(/\s+/g, '');
      const config = planConfigs[planKey] || planConfigs.default;
      
      // Mark middle plan as popular if there are 3 plans
      const isPopular = dbPlans.length === 3 && index === 1 ? true : config.popular;
      
      // Check if user has active subscription for this plan
      const activeSubscription = userSubscriptions.find(sub => sub.plan_id === plan.id);
      
      return {
        ...plan,
        ...config,
        popular: isPopular,
        features: config.features,
        userHasActive: !!activeSubscription,
        activeSubscription: activeSubscription || undefined
      };
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    // Return empty array if fetch fails
    return [];
  }
}

export default async function PlansPage() {
  const plans = await getPlansWithUserData();
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
            const dailyEarning = plan.min_amount * (plan.roi_daily_percent / 100);
            const totalReturn = dailyEarning * plan.duration_days;
            const totalProfit = totalReturn - plan.min_amount;
            const totalROI = ((totalProfit / plan.min_amount) * 100).toFixed(1);
            
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
                    <div className="text-3xl sm:text-4xl font-bold text-white">${plan.min_amount}</div>
                    <div className="text-sm text-gray-400 flex items-center justify-center gap-1">
                      <Coins className="h-4 w-4" />
                      Minimum USDT Investment
                    </div>
                  </div>
                  
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 p-4 bg-gray-700/30 rounded-lg border border-gray-600/30">
                    <div className="text-center">
                      <div className="text-lg font-bold text-green-400">{plan.roi_daily_percent}%</div>
                      <div className="text-xs text-gray-400">Daily Mining</div>
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
                          ? ((plan.activeSubscription.total_earned / plan.min_amount) * 100).toFixed(1)
                          : totalROI
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
                          ? (plan.activeSubscription.total_earned - plan.min_amount).toFixed(2)
                          : totalProfit.toFixed(2)
                        }
                      </span>
                    </div>
                    <Progress 
                      value={plan.userHasActive && plan.activeSubscription 
                        ? Math.min(100, (plan.activeSubscription.total_earned / totalReturn) * 100)
                        : parseFloat(totalROI)
                      } 
                      className="h-3 bg-gray-700" 
                    />
                    <div className="text-xs text-center text-gray-400">
                      {plan.userHasActive && plan.activeSubscription 
                        ? `${((plan.activeSubscription.total_earned / totalReturn) * 100).toFixed(1)}% progress • ${plan.activeSubscription.days_remaining} days left`
                        : `${totalROI}% total mining profit over ${plan.duration_days} days`
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
                    <PlanPurchaseButton
                      planId={plan.id}
                      planName={plan.name}
                      planPrice={plan.min_amount}
                      gradient={plan.gradient}
                    />
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
      
        {/* Additional Information */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-12 sm:mt-16">
          <Card className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 border-orange-700/50 backdrop-blur-sm text-center p-6 hover:border-orange-500/70 transition-all duration-300 group">
            <div className="p-3 rounded-full bg-orange-500/20 w-fit mx-auto mb-4 group-hover:bg-orange-500/30 transition-colors duration-300">
              <Cpu className="h-10 w-10 text-orange-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">Latest ASIC Miners</h3>
            <p className="text-sm text-orange-200">
              State-of-the-art ASIC S19 Pro miners with maximum efficiency and hash rate for optimal Bitcoin mining.
            </p>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-900/50 to-green-800/50 border-green-700/50 backdrop-blur-sm text-center p-6 hover:border-green-500/70 transition-all duration-300 group">
            <div className="p-3 rounded-full bg-green-500/20 w-fit mx-auto mb-4 group-hover:bg-green-500/30 transition-colors duration-300">
              <Zap className="h-10 w-10 text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">Renewable Energy</h3>
            <p className="text-sm text-green-200">
              100% renewable energy sources for sustainable and profitable Bitcoin mining operations.
            </p>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-900/50 to-blue-800/50 border-blue-700/50 backdrop-blur-sm text-center p-6 hover:border-blue-500/70 transition-all duration-300 group sm:col-span-2 lg:col-span-1">
            <div className="p-3 rounded-full bg-blue-500/20 w-fit mx-auto mb-4 group-hover:bg-blue-500/30 transition-colors duration-300">
              <Shield className="h-10 w-10 text-blue-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2 text-white">Secure & Insured</h3>
            <p className="text-sm text-blue-200">
              Bank-grade security with full insurance coverage for all mining equipment and operations.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
