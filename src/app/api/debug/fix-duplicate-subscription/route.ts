import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const supabase = await getSupabaseServerClient();
    const admin = getSupabaseAdminClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all subscriptions for user f5f5728e-6a8d-46f3-9d25-5e1eea2a3e86
    const targetUserId = "f5f5728e-6a8d-46f3-9d25-5e1eea2a3e86";
    
    const { data: allSubs, error: subsError } = await admin
      .from("subscriptions")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: true });

    if (subsError) {
      return NextResponse.json({ error: subsError.message }, { status: 500 });
    }

    // Find duplicate $100 subscriptions
    const hundredDollarSubs = allSubs?.filter(sub => sub.amount_invested === 100) || [];
    
    if (hundredDollarSubs.length <= 1) {
      return NextResponse.json({
        message: "No duplicates found",
        subscriptions: allSubs,
        hundred_dollar_subs: hundredDollarSubs
      });
    }

    // Keep the original (first created) and remove the duplicate (last created)
    const originalSub = hundredDollarSubs[0]; // First created
    const duplicateSub = hundredDollarSubs[hundredDollarSubs.length - 1]; // Last created (the one I created)

    // Delete the duplicate subscription
    const { error: deleteError } = await admin
      .from("subscriptions")
      .delete()
      .eq("id", duplicateSub.id);

    if (deleteError) {
      return NextResponse.json({ 
        error: "Failed to delete duplicate", 
        details: deleteError 
      }, { status: 500 });
    }

    // Get updated subscription list
    const { data: updatedSubs } = await admin
      .from("subscriptions")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: true });

    return NextResponse.json({
      success: true,
      message: "Duplicate $100 subscription removed successfully",
      removed_subscription: duplicateSub,
      kept_subscription: originalSub,
      remaining_subscriptions: updatedSubs,
      summary: {
        before_count: allSubs?.length || 0,
        after_count: updatedSubs?.length || 0,
        removed_duplicate_id: duplicateSub.id
      }
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Failed to fix duplicate subscription",
      message: error.message
    }, { status: 500 });
  }
}
