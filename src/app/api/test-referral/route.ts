import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code') || 'F0BB72';
    
    const supabase = await getSupabaseServerClient();

    // Test the exact same query that the validation API uses
    const { data: referrer, error: referrerError } = await supabase
      .from("user_profiles")
      .select("user_id, email, referral_code")
      .eq("referral_code", code.toUpperCase())
      .single();

    return NextResponse.json({
      testCode: code.toUpperCase(),
      found: !referrerError && !!referrer,
      error: referrerError?.message || null,
      referrer: referrer ? {
        email: referrer.email,
        referralCode: referrer.referral_code,
        userId: referrer.user_id
      } : null,
      rawError: referrerError
    });

  } catch (err: any) {
    return NextResponse.json({ 
      error: "Test failed", 
      details: err.message 
    }, { status: 500 });
  }
}
