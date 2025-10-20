import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { signupSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { referralCode, ...signupData } = body;
    
    // Validate input
    const validatedData = signupSchema.parse(signupData);
    
    // Use admin client to create user (bypasses client-side cookie issues)
    const admin = getSupabaseAdminClient();
    
    const { data, error } = await admin.auth.admin.createUser({
      email: validatedData.email,
      password: validatedData.password,
      email_confirm: true, // Auto-confirm email for development
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Create profile
    if (data.user) {
      try {
        // Wait for trigger to complete (database triggers should handle profile/balance creation)
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify that profile and balance were created by trigger
        const { data: profile, error: profileError } = await admin
          .from("user_profiles")
          .select("id, referral_code, role")
          .eq("user_id", data.user.id)
          .single();

        const { data: balance, error: balanceError } = await admin
          .from("user_balances")
          .select("id")
          .eq("user_id", data.user.id)
          .single();

        // If trigger failed, create manually as fallback
        if (profileError || !profile) {
          console.log("Trigger failed for profile, creating manually...");
          const referralCode = `REF${data.user.id.substring(0, 8).toUpperCase()}`;
          
          const { error: manualProfileError } = await admin.from("user_profiles").insert({
            user_id: data.user.id,
            email: data.user.email,
            role: "user",
            referral_code: referralCode,
          });
          
          if (manualProfileError) {
            console.error("Manual profile creation failed:", manualProfileError);
            throw new Error(`Profile creation failed: ${manualProfileError.message}`);
          }
        }

        if (balanceError || !balance) {
          console.log("Trigger failed for balance, creating manually...");
          
          const { error: manualBalanceError } = await admin.from("user_balances").insert({
            user_id: data.user.id,
            available_balance: 5.00, // $5 sign-up bonus
            locked_balance: 0,
            total_deposited: 0,
            total_withdrawn: 0,
            total_earned: 5.00 // Track the bonus as earnings
          });
          
          if (manualBalanceError) {
            console.error("Manual balance creation failed:", manualBalanceError);
            throw new Error(`Balance creation failed: ${manualBalanceError.message}`);
          }
        } else {
          // Balance exists, add $5 sign-up bonus
          const { error: bonusError } = await admin
            .from("user_balances")
            .update({
              available_balance: 5.00,
              total_earned: 5.00
            })
            .eq("user_id", data.user.id);
            
          if (bonusError) {
            console.error("Failed to add sign-up bonus:", bonusError);
          }
        }

        // Create transaction log entry for the $5 sign-up bonus
        const { error: txLogError } = await admin
          .from("transaction_logs")
          .insert({
            user_id: data.user.id,
            type: "earning",
            amount_usdt: 5.00,
            description: "Welcome bonus for new account signup",
            balance_before: 0,
            balance_after: 5.00,
            created_at: new Date().toISOString()
          });

        if (txLogError) {
          console.error("Failed to create transaction log for sign-up bonus:", txLogError);
        } else {
          console.log("✅ Successfully created signup bonus transaction log for user:", data.user.id);
        }

        // Handle referral code if provided
        if (referralCode && referralCode.trim()) {
          try {
            // Find the referrer by referral code
            const { data: referrer, error: referrerError } = await admin
              .from("user_profiles")
              .select("user_id, email, referral_code")
              .eq("referral_code", referralCode.trim().toUpperCase())
              .single();

            if (referrer && !referrerError) {
              // Update the new user's profile with referrer USER_ID (not referral_code)
              await admin
                .from("user_profiles")
                .update({ referred_by: referrer.user_id })
                .eq("user_id", data.user.id);

              // Create referral record
              await admin
                .from("referral_commissions")
                .insert({
                  referrer_user_id: referrer.user_id,
                  referred_user_id: data.user.id,
                  source_type: 'signup',
                  source_amount: 0,
                  commission_percentage: 5.00,
                  commission_amount: 0,
                  status: 'active'
                });

              console.log(`Referral created: ${referrer.email} (${referrer.user_id}) referred ${data.user.email} (${data.user.id})`);
            } else {
              console.warn("Invalid referral code:", referralCode);
            }
          } catch (referralErr) {
            console.warn("Referral processing failed:", referralErr);
            // Non-fatal - user account is still created
          }
        }
      } catch (profileErr) {
        console.warn("Profile creation failed:", profileErr);
        // Non-fatal - profile will be created on first API call
      }
    }

    return NextResponse.json(
      { 
        message: "Account created successfully! You've received a $5 welcome bonus.",
        user: {
          id: data.user?.id,
          email: data.user?.email,
        }
      },
      { status: 201 }
    );

  } catch (err: any) {
    console.error("Signup API error:", err);
    
    if (err.name === "ZodError") {
      return NextResponse.json(
        { error: err.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Signup failed" },
      { status: 500 }
    );
  }
}
