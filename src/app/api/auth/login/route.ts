import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { loginSchema } from "@/lib/validations";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validatedData = loginSchema.parse(body);
    
    // Use admin client to verify credentials
    const admin = getSupabaseAdminClient();
    
    const { data, error } = await admin.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Create response
    const response = NextResponse.json(
      { 
        message: "Login successful",
        user: {
          id: data.user?.id,
          email: data.user?.email,
        }
      },
      { status: 200 }
    );

    // Set session cookies manually to avoid client-side issues
    if (data.session) {
      const cookieStore = cookies();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const projectRef = supabaseUrl.split('//')[1].split('.')[0];
      
      // Set auth cookies with proper format
      response.cookies.set(`sb-${projectRef}-auth-token`, JSON.stringify({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_at: data.session.expires_at,
        token_type: data.session.token_type,
        user: data.user
      }), {
        path: '/',
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
    }

    return response;

  } catch (err: any) {
    console.error("Login API error:", err);
    
    if (err.name === "ZodError") {
      return NextResponse.json(
        { error: err.errors[0]?.message || "Invalid input" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Login failed" },
      { status: 500 }
    );
  }
}
