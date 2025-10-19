import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Bitcoin, Coins, TrendingUp } from "lucide-react";

// Fetch plans from the API
async function getPlans() {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/plans?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error('Failed to fetch plans');
    }
    
    const data = await response.json();
    return data.plans || [];
  } catch (error) {
    console.error('Error fetching plans:', error);
    return [];
  }
}

export async function CurrentPlansDisplay() {
  const plans = await getPlans();

  // If no plans available, show fallback content
  if (!plans || plans.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 mb-6">Investment plans are currently being updated.</p>
        <Link href="/plans">
          <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
            View All Plans
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Link>
      </div>
    );
  }

  // Show up to 3 plans
  const displayPlans = plans.slice(0, 3);

  return (
    <>
      <div className="grid md:grid-cols-3 gap-8">
        {displayPlans.map((plan: any, index: number) => {
          const isPopular = index === 1; // Make middle plan popular
          
          return (
            <Card 
              key={plan.id} 
              className={`${
                isPopular 
                  ? "bg-gradient-to-br from-orange-900/50 to-red-900/50 border-orange-700/50 relative" 
                  : "bg-gradient-to-br from-gray-800/50 to-gray-900/50 border-gray-700/50"
              }`}
            >
              {isPopular && (
                <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-orange-500 text-white">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  {index === 0 ? <Bitcoin className="w-5 h-5" /> : 
                   index === 1 ? <TrendingUp className="w-5 h-5" /> : 
                   <Coins className="w-5 h-5" />}
                  {plan.name}
                </CardTitle>
                <CardDescription className="text-gray-400">
                  {plan.description || "Professional Bitcoin mining plan"}
                </CardDescription>
                <div className="text-2xl font-bold text-orange-400">
                  {plan.daily_roi_percentage}% Daily
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm text-gray-300">
                  <div>• Min: ${plan.min_amount} - Max: ${plan.max_amount}</div>
                  <div>• {plan.duration_days} days duration</div>
                  <div>• Professional mining equipment</div>
                  <div>• 24/7 monitoring & support</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      
      <div className="text-center mt-8">
        <Link href="/plans">
          <Button size="lg" className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600">
            View All Mining Plans
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </Link>
      </div>
    </>
  );
}
