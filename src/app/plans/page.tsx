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
    <main className="mx-auto max-w-7xl px-4 py-12 space-y-12">
      {/* Header Section */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
          <Zap className="h-4 w-4" />
          <span>Investment Opportunities</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight">Choose Your Investment Plan</h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Start building your wealth with our carefully designed investment portfolios. 
          Each plan offers competitive daily returns with transparent fee structures.
        </p>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold mb-2">No Investment Plans Available</h3>
          <p className="text-muted-foreground">
            We're currently updating our investment plans. Please check back soon.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3">
          {plans.map((plan) => {
          const Icon = plan.icon;
          const totalReturn = (plan.price_usdt * (plan.roi_daily_percent / 100) * plan.duration_days).toFixed(2);
          const totalProfit = (parseFloat(totalReturn) - plan.price_usdt).toFixed(2);
          const totalROI = ((parseFloat(totalProfit) / plan.price_usdt) * 100).toFixed(1);
          
          return (
            <Card 
              key={plan.id} 
              className={`relative border-0 shadow-xl transition-all duration-300 hover:shadow-2xl hover:scale-105 ${
                plan.popular ? 'ring-2 ring-primary' : ''
              } bg-gradient-to-br ${plan.bgGradient}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground px-4 py-1">
                    <Star className="h-3 w-3 mr-1" />
                    Most Popular
                  </Badge>
                </div>
              )}
              
              <CardHeader className="text-center pb-4">
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r ${plan.gradient} text-white mx-auto mb-4`}>
                  <Icon className="h-8 w-8" />
                </div>
                <CardTitle className="text-2xl font-bold">{plan.name}</CardTitle>
                <CardDescription className="text-base">
                  {plan.description}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Pricing */}
                <div className="text-center space-y-2">
                  <div className="text-4xl font-bold">${plan.price_usdt}</div>
                  <div className="text-sm text-muted-foreground">Minimum Investment</div>
                </div>
                
                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-white/50 dark:bg-black/20 rounded-lg">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-600">{plan.roi_daily_percent}%</div>
                    <div className="text-xs text-muted-foreground">Daily ROI</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{plan.duration_days} days</div>
                    <div className="text-xs text-muted-foreground">Duration</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-blue-600">${totalReturn}</div>
                    <div className="text-xs text-muted-foreground">Total Return</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-purple-600">+{totalROI}%</div>
                    <div className="text-xs text-muted-foreground">Total ROI</div>
                  </div>
                </div>
                
                {/* ROI Progress Visualization */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Expected Profit</span>
                    <span className="font-semibold text-green-600">${totalProfit}</span>
                  </div>
                  <Progress value={parseFloat(totalROI)} className="h-2" />
                </div>
                
                {/* Features */}
                <div className="space-y-3">
                  <h4 className="font-semibold flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    What's Included
                  </h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-center text-sm">
                        <CheckCircle className="h-3 w-3 mr-2 text-green-500 flex-shrink-0" />
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
                <div className="flex items-start space-x-2 p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                  <Shield className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-yellow-700 dark:text-yellow-300">
                    Investment returns are projected based on historical performance. Past performance does not guarantee future results.
                  </p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        </div>
      )}
      
      {/* Additional Information */}
      <div className="grid gap-6 md:grid-cols-3 mt-16">
        <Card className="border-0 shadow-lg text-center p-6">
          <Shield className="h-12 w-12 text-blue-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Secure & Regulated</h3>
          <p className="text-sm text-muted-foreground">
            Your investments are protected with bank-level security and regulatory compliance.
          </p>
        </Card>
        
        <Card className="border-0 shadow-lg text-center p-6">
          <Clock className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Daily Returns</h3>
          <p className="text-sm text-muted-foreground">
            Receive your returns daily, automatically credited to your wallet balance.
          </p>
        </Card>
        
        <Card className="border-0 shadow-lg text-center p-6">
          <DollarSign className="h-12 w-12 text-purple-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Flexible Withdrawals</h3>
          <p className="text-sm text-muted-foreground">
            Withdraw your earnings anytime with our fast and secure withdrawal system.
          </p>
        </Card>
      </div>
    </main>
  );
}
