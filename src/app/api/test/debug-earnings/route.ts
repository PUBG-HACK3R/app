import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdminClient();
    const now = new Date();
    const nowIso = now.toISOString();
    const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
    
    const logs: string[] = [];
    logs.push(`Debug earnings starting: ${nowIso}, today: ${today}`);

    // Get subscriptions (same query as cron job)
    const { data: subs, error: subsErr } = await admin
      .from("subscriptions")
      .select("id,user_id,amount_invested,daily_earning,start_date,end_date,active")
      .eq("active", true);

    if (subsErr) {
      logs.push(`Error getting subscriptions: ${subsErr.message}`);
      return NextResponse.json({ error: subsErr.message, logs }, { status: 500 });
    }

    logs.push(`Found ${subs?.length || 0} active subscriptions`);

    let credited = 0;

    for (const sub of subs || []) {
      logs.push(`\n--- Processing subscription ${sub.id} for user ${sub.user_id} ---`);
      
      // Check daily_earning amount
      const amount = Number(sub.daily_earning || 0);
      if (!amount) {
        logs.push(`❌ Subscription ${sub.id} has no daily_earning amount (${sub.daily_earning}) - skipping`);
        continue;
      }
      logs.push(`✅ Subscription ${sub.id} daily_earning: $${amount}`);

      // Check if subscription has started
      const startDateStr = sub.start_date.includes('T') ? sub.start_date : `${sub.start_date}T00:00:00.000Z`;
      const startDate = new Date(startDateStr);
      const todayDate = new Date(`${today}T00:00:00.000Z`);
      
      logs.push(`📅 Date check for ${sub.id}:`);
      logs.push(`   start_date: ${sub.start_date}`);
      logs.push(`   start_date_parsed: ${startDate.toISOString()}`);
      logs.push(`   today_date: ${todayDate.toISOString()}`);
      logs.push(`   has_started: ${todayDate >= startDate}`);
      
      if (todayDate < startDate) {
        logs.push(`❌ Subscription ${sub.id} hasn't started yet - skipping`);
        continue;
      }
      logs.push(`✅ Subscription ${sub.id} has started`);

      // Check if subscription has ended
      if (sub.end_date) {
        const endDate = new Date(sub.end_date as string);
        if (todayDate > endDate) {
          logs.push(`❌ Subscription ${sub.id} expired - would deactivate and skip`);
          continue;
        }
        logs.push(`✅ Subscription ${sub.id} not expired`);
      }

      // Check for existing earnings today
      logs.push(`🔍 Checking for existing earnings for ${sub.id} on ${today}`);
      const { data: todayEarning, error: duplicateCheckError } = await admin
        .from("transactions")
        .select("id,created_at,amount_usdt")
        .eq("user_id", sub.user_id)
        .eq("type", "earning")
        .eq("reference_id", sub.id)
        .gte("created_at", `${today}T00:00:00.000Z`)
        .lt("created_at", `${today}T23:59:59.999Z`)
        .maybeSingle();

      if (duplicateCheckError) {
        logs.push(`❌ Error checking duplicates for ${sub.id}: ${duplicateCheckError.message}`);
        continue;
      }

      if (todayEarning) {
        logs.push(`❌ Already credited earnings for ${sub.id} today: ${JSON.stringify(todayEarning)}`);
        continue;
      }
      logs.push(`✅ No existing earnings found for ${sub.id} today`);

      // Try to create transaction
      logs.push(`💰 Creating earning transaction for ${sub.id}: $${amount}`);
      const { data: txData, error: txErr } = await admin.from("transactions").insert({
        user_id: sub.user_id,
        type: "earning",
        amount_usdt: amount,
        reference_id: sub.id,
        meta: { source: "debug", credited_at: nowIso },
      }).select();
      
      if (txErr) {
        logs.push(`❌ Failed to create transaction for ${sub.id}: ${txErr.message}`);
        logs.push(`   Error details: ${JSON.stringify(txErr)}`);
        continue;
      }
      
      logs.push(`✅ Transaction created successfully for ${sub.id}: ${JSON.stringify(txData)}`);
      credited += 1;

      // Update balance
      logs.push(`💳 Updating balance for user ${sub.user_id}`);
      const { data: balRow, error: balanceSelectError } = await admin
        .from("balances")
        .select("available_usdt")
        .eq("user_id", sub.user_id)
        .maybeSingle();

      if (balanceSelectError) {
        logs.push(`❌ Error getting balance: ${balanceSelectError.message}`);
      } else if (!balRow) {
        logs.push(`📝 Creating new balance record for user ${sub.user_id}`);
        const { error: insertError } = await admin.from("balances").insert({
          user_id: sub.user_id,
          available_usdt: amount,
        });
        if (insertError) {
          logs.push(`❌ Error creating balance: ${insertError.message}`);
        } else {
          logs.push(`✅ Balance created with $${amount}`);
        }
      } else {
        const newBal = Number(balRow.available_usdt || 0) + amount;
        logs.push(`📊 Updating balance from $${balRow.available_usdt} to $${newBal}`);
        const { error: updateError } = await admin
          .from("balances")
          .update({ available_usdt: newBal })
          .eq("user_id", sub.user_id);
        
        if (updateError) {
          logs.push(`❌ Error updating balance: ${updateError.message}`);
        } else {
          logs.push(`✅ Balance updated successfully`);
        }
      }

      // Update subscription total_earned
      logs.push(`📈 Updating total_earned for subscription ${sub.id}`);
      const { data: currentSub } = await admin
        .from("subscriptions")
        .select("total_earned")
        .eq("id", sub.id)
        .single();
      
      const newTotalEarned = Number(currentSub?.total_earned || 0) + amount;
      
      const { error: subUpdateError } = await admin
        .from("subscriptions")
        .update({ total_earned: newTotalEarned })
        .eq("id", sub.id);

      if (subUpdateError) {
        logs.push(`❌ Error updating subscription total_earned: ${subUpdateError.message}`);
      } else {
        logs.push(`✅ Subscription total_earned updated to $${newTotalEarned}`);
      }
    }

    logs.push(`\n🎯 SUMMARY: Credited ${credited} out of ${subs?.length || 0} subscriptions`);

    return NextResponse.json({
      success: true,
      credited,
      total_subscriptions: subs?.length || 0,
      logs,
      message: `Debug earnings completed: ${credited} credited`
    });

  } catch (error: any) {
    return NextResponse.json({
      error: "Debug earnings failed",
      message: error.message
    }, { status: 500 });
  }
}
