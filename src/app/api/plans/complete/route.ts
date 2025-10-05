import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const admin = getSupabaseAdminClient();

    // Find completed subscriptions that haven't had their principal returned
    const { data: completedSubs, error: subError } = await admin
      .from("subscriptions")
      .select(`
        id,
        user_id,
        principal_usdt,
        end_date,
        active,
        plan_id,
        plans(name, duration_days)
      `)
      .eq("active", true)
      .lte("end_date", new Date().toISOString().slice(0, 10));

    if (subError) {
      console.error("Error fetching completed subscriptions:", subError);
      return NextResponse.json({ error: "Failed to fetch subscriptions" }, { status: 500 });
    }

    if (!completedSubs || completedSubs.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "No completed subscriptions to process",
        processed: 0 
      });
    }

    let processedCount = 0;
    const results = [];

    for (const sub of completedSubs) {
      try {
        // Get plan name safely
        const planName = (sub.plans as any)?.name || 'Unknown Plan';
        
        // Check if investment return already exists for this subscription
        const { data: existingReturn } = await admin
          .from("transactions")
          .select("id")
          .eq("user_id", sub.user_id)
          .eq("type", "investment_return")
          .eq("description", `Investment return from ${planName} mining plan (Subscription: ${sub.id})`)
          .maybeSingle();

        if (existingReturn) {
          // Already processed, just deactivate subscription
          await admin
            .from("subscriptions")
            .update({ active: false })
            .eq("id", sub.id);
          continue;
        }

        // Create investment return transaction
        const { error: txError } = await admin
          .from("transactions")
          .insert({
            user_id: sub.user_id,
            type: "investment_return",
            amount_usdt: sub.principal_usdt,
            status: "completed",
            description: `Investment return from ${planName} mining plan (Subscription: ${sub.id})`,
          });

        if (txError) {
          console.error(`Error creating return transaction for subscription ${sub.id}:`, txError);
          results.push({
            subscription_id: sub.id,
            success: false,
            error: txError.message
          });
          continue;
        }

        // Deactivate the subscription
        const { error: updateError } = await admin
          .from("subscriptions")
          .update({ active: false })
          .eq("id", sub.id);

        if (updateError) {
          console.error(`Error deactivating subscription ${sub.id}:`, updateError);
        }

        processedCount++;
        results.push({
          subscription_id: sub.id,
          user_id: sub.user_id,
          plan_name: planName,
          returned_amount: sub.principal_usdt,
          success: true
        });

      } catch (error) {
        console.error(`Error processing subscription ${sub.id}:`, error);
        results.push({
          subscription_id: sub.id,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${processedCount} completed mining plans`,
      processed: processedCount,
      total_found: completedSubs.length,
      results
    });

  } catch (error) {
    console.error("Plan completion processing error:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Unexpected error" 
    }, { status: 500 });
  }
}

// GET endpoint for manual testing
export async function GET() {
  return POST();
}
