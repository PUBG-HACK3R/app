import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    // Check authentication
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Check admin role
    const adminClient = getSupabaseAdminClient();
    const { data: profile } = await adminClient
      .from("user_profiles")
      .select("role, email")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { emails, amount, reason } = await request.json();

    if (!emails || !Array.isArray(emails) || !amount || amount <= 0) {
      return NextResponse.json({ error: "Invalid parameters" }, { status: 400 });
    }

    const admin = getSupabaseAdminClient();
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    // Process each email
    for (const email of emails) {
      try {
        // Find user by email
        const { data: userProfile, error: userError } = await admin
          .from("user_profiles")
          .select("user_id, email")
          .eq("email", email.trim())
          .single();

        if (userError || !userProfile) {
          errors.push(`User not found: ${email}`);
          errorCount++;
          continue;
        }

        // Get current balance or create if doesn't exist
        const { data: currentBalance } = await admin
          .from("user_balances")
          .select("available_balance, total_deposited")
          .eq("user_id", userProfile.user_id)
          .single();

        // Update user balance in user_balances table
        const { error: balanceError } = await admin
          .from("user_balances")
          .upsert({
            user_id: userProfile.user_id,
            available_balance: (currentBalance?.available_balance || 0) + amount,
            total_deposited: (currentBalance?.total_deposited || 0) + amount,
            locked_balance: currentBalance?.locked_balance || 0,
            total_withdrawn: currentBalance?.total_withdrawn || 0,
            total_earned: currentBalance?.total_earned || 0,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });

        if (balanceError) {
          console.error(`Balance update error for ${email}:`, balanceError);
          errors.push(`Failed to update balance for: ${email}`);
          errorCount++;
          continue;
        }

        // Log the transaction
        const { error: logError } = await admin
          .from("transaction_logs")
          .insert({
            user_id: userProfile.user_id,
            type: "deposit",
            amount_usdt: amount,
            description: reason || "Bulk admin topup",
            balance_before: currentBalance?.available_balance || 0,
            balance_after: (currentBalance?.available_balance || 0) + amount
          });

        if (logError) {
          console.error(`Transaction log error for ${email}:`, logError);
        }

        successCount++;
        console.log(`✅ Bulk topup successful for ${email}: $${amount}`);

      } catch (error: any) {
        console.error(`Error processing ${email}:`, error);
        errors.push(`Error processing ${email}: ${error.message}`);
        errorCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Bulk topup completed`,
      stats: {
        totalEmails: emails.length,
        successCount,
        errorCount,
        amountPerUser: amount,
        totalAmount: successCount * amount
      },
      errors: errors.slice(0, 10) // Limit error output
    });

  } catch (error: any) {
    console.error("Bulk topup error:", error);
    return NextResponse.json({ 
      error: "Internal server error",
      details: error.message 
    }, { status: 500 });
  }
}
