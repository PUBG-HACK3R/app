import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const admin = getSupabaseAdminClient();
    const body = await request.json();
    
    const { 
      userId, 
      planId, 
      principalUsdt = 100, 
      roiDailyPercent = 1.0, 
      durationDays = 30,
      startDaysAgo = 0 // How many days ago to start the subscription
    } = body;

    if (!userId) {
      return NextResponse.json({ 
        error: "userId is required" 
      }, { status: 400 });
    }

    // Calculate start and end dates
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(now.getDate() - startDaysAgo);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + durationDays);

    // Set next earning to be due (yesterday or today)
    const nextEarning = new Date(now);
    nextEarning.setDate(now.getDate() - 1); // Make it due for earning

    // Create test subscription
    const { data: subscription, error: subError } = await admin
      .from("subscriptions")
      .insert({
        user_id: userId,
        plan_id: planId,
        principal_usdt: principalUsdt,
        roi_daily_percent: roiDailyPercent,
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        next_earning_at: nextEarning.toISOString(),
        active: true
      })
      .select()
      .single();

    if (subError) {
      return NextResponse.json({ 
        error: "Failed to create subscription", 
        details: subError.message 
      }, { status: 500 });
    }

    // Create initial balance if it doesn't exist
    const { data: existingBalance } = await admin
      .from("balances")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!existingBalance) {
      await admin
        .from("balances")
        .insert({
          user_id: userId,
          available_usdt: 0
        });
    }

    return NextResponse.json({
      success: true,
      message: "Test subscription created successfully",
      subscription: {
        id: subscription.id,
        userId: subscription.user_id,
        principal: subscription.principal_usdt,
        roiDaily: subscription.roi_daily_percent,
        startDate: subscription.start_date,
        endDate: subscription.end_date,
        nextEarning: subscription.next_earning_at,
        active: subscription.active
      }
    });

  } catch (err: any) {
    return NextResponse.json({ 
      error: "Test subscription creation failed", 
      details: err.message 
    }, { status: 500 });
  }
}

// GET endpoint to list existing subscriptions for debugging
export async function GET() {
  try {
    const admin = getSupabaseAdminClient();
    
    const { data: subscriptions, error } = await admin
      .from("subscriptions")
      .select(`
        id,
        user_id,
        plan_id,
        principal_usdt,
        roi_daily_percent,
        start_date,
        end_date,
        next_earning_at,
        active,
        profiles(email)
      `)
      .order("created_at", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ 
        error: "Failed to fetch subscriptions", 
        details: error.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subscriptions: subscriptions?.map(sub => ({
        id: sub.id,
        userId: sub.user_id,
        userEmail: (sub as any).profiles?.email || 'Unknown',
        planId: sub.plan_id,
        principal: sub.principal_usdt,
        roiDaily: sub.roi_daily_percent,
        startDate: sub.start_date,
        endDate: sub.end_date,
        nextEarning: sub.next_earning_at,
        active: sub.active,
        isDue: sub.next_earning_at ? new Date(sub.next_earning_at) <= new Date() : true
      }))
    });

  } catch (err: any) {
    return NextResponse.json({ 
      error: "Failed to fetch subscriptions", 
      details: err.message 
    }, { status: 500 });
  }
}
