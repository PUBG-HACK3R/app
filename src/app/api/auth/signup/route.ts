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
        // Generate referral code for new user
        const newUserReferralCode = `REF${data.user.id.substring(0, 8).toUpperCase()}`;
        
        // Check if profile already exists (might be created by trigger)
        const { data: existingProfile } = await admin
          .from("user_profiles")
          .select("id")
          .eq("user_id", data.user.id)
          .single();

        if (!existingProfile) {
          await admin.from("user_profiles").insert({
            user_id: data.user.id,
            email: data.user.email,
            role: "user",
            referral_code: newUserReferralCode,
          });
        } else {
          // Update existing profile with referral code
          await admin.from("user_profiles").update({
            referral_code: newUserReferralCode,
          }).eq("user_id", data.user.id);
        }

        // Ensure user_balances record exists
        const { data: existingBalance } = await admin
          .from("user_balances")
          .select("id")
          .eq("user_id", data.user.id)
          .single();

        if (!existingBalance) {
          await admin.from("user_balances").insert({
            user_id: data.user.id,
            available_balance: 0,
            locked_balance: 0,
            total_deposited: 0,
            total_withdrawn: 0,
            total_earned: 0
          });
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
              // Update the new user's profile with referrer info
              await admin
                .from("user_profiles")
                .update({ referred_by: referrer.referral_code })
                .eq("user_id", data.user.id);

              // Create referral record
              await admin
                .from("referral_commissions")
                .insert({
                  referrer_user_id: referrer.user_id,
                  referred_user_id: data.user.id,
                  source_type: 'deposit',
                  source_amount: 0,
                  commission_percentage: 5.00,
                  commission_amount: 0,
                  status: 'pending'
                });

              console.log(`Referral created: ${referrer.email} referred ${data.user.email}`);
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
        message: "Account created successfully",
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
