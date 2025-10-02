import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const { email } = forgotPasswordSchema.parse(body);
    
    const supabase = await getSupabaseServerClient();
    
    // Get the site URL, fallback to production URL if not set
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://we-earn-iota.vercel.app';
    const redirectUrl = `${siteUrl}/reset-password`;
    
    console.log("Password reset request for email:", email);
    console.log("Password reset redirect URL:", redirectUrl);
    
    // Send password reset email
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      console.error("Password reset error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      
      // For debugging - log more details but still return success for security
      if (error.message?.includes('User not found')) {
        console.log("User not found for email:", email);
      }
      
      // Don't reveal if email exists or not for security
      // Always return success to prevent email enumeration
      return NextResponse.json(
        { message: "If an account with that email exists, we've sent password reset instructions." },
        { status: 200 }
      );
    }

    console.log("Password reset email sent successfully for:", email);
    console.log("Reset data:", data);

    return NextResponse.json(
      { message: "Password reset instructions sent successfully." },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Forgot password API error:", error);
    
    if (error.name === "ZodError") {
      return NextResponse.json(
        { error: error.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}
