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
    
    // Send password reset email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password`,
    });

    if (error) {
      console.error("Password reset error:", error);
      
      // Don't reveal if email exists or not for security
      // Always return success to prevent email enumeration
      return NextResponse.json(
        { message: "If an account with that email exists, we've sent password reset instructions." },
        { status: 200 }
      );
    }

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
