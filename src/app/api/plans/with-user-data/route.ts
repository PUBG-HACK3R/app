import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Bitcoin Mining Plan display configurations
const planConfigs: Record<string, {description: string; features: string[]; popular: boolean; icon: string; gradient: string; bgGradient: string}> = {
  "microbitcoinminer": {
    description: "Perfect starter plan for new miners. Low risk, steady returns with shared ASIC mining.",
    features: ["Shared ASIC Mining", "Daily Payouts", "24/7 Support", "Mobile Monitoring"],
    popular: false,
    icon: "Bitcoin",
    gradient: "from-orange-500 to-orange-600",
    bgGradient: "from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900"
  },
  "basicbitcoinminer": {
    description: "Popular choice for beginners. Dedicated mining power with good daily returns.",
    features: ["Dedicated Mining", "Real-time Stats", "Daily Rewards", "Email Notifications"],
    popular: true,
    icon: "Bitcoin",
    gradient: "from-blue-500 to-blue-600",
    bgGradient: "from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900"
  },
  default: {
    description: "Professional Bitcoin mining with enterprise-grade equipment",
    features: ["Daily mining rewards", "24/7 Monitoring", "Secure mining", "Real-time stats"],
    popular: false,
    icon: "Bitcoin",
    gradient: "from-orange-500 to-red-500",
    bgGradient: "from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900"
  }
};

export async function GET() {
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
      return NextResponse.json({ plans: [] });
    }
    
    if (!dbPlans || dbPlans.length === 0) {
      console.log('No plans found in database');
      return NextResponse.json({ plans: [] });
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
    const plans = dbPlans.map((plan, index) => {
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

    return NextResponse.json({ 
      plans,
      user_id: user?.id || null,
      subscription_count: userSubscriptions.length
    });

  } catch (error) {
    console.error('Error fetching plans with user data:', error);
    return NextResponse.json({ 
      plans: [],
      error: 'Failed to fetch plans'
    }, { status: 500 });
  }
}
