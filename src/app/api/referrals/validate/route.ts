import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Validate referral code
export async function POST(request: Request) {
  try {
    const { referralCode } = await request.json();
    
    if (!referralCode) {
      return NextResponse.json({ error: "Referral code is required" }, { status: 400 });
    }

    const supabase = await getSupabaseServerClient();

    // Find the referrer by referral code
    const { data: referrer, error: referrerError } = await supabase
      .from("profiles")
      .select("user_id, email, referral_code")
      .eq("referral_code", referralCode.toUpperCase())
      .single();

    if (referrerError || !referrer) {
      return NextResponse.json({ 
        valid: false, 
        error: "Invalid referral code" 
      }, { status: 200 });
    }

    return NextResponse.json({ 
      valid: true, 
      referrer: {
        id: referrer.user_id,
        email: referrer.email?.split('@')[0] + '***', // Partially hide email
        code: referrer.referral_code
      }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
  }
}
