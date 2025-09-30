"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { loginSchema, signupSchema } from "@/lib/validations";

export async function loginAction(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    
    // Validate input
    const validatedData = loginSchema.parse({ email, password });
    
    // Use admin client to verify credentials
    const admin = getSupabaseAdminClient();
    
    const { data, error } = await admin.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    // Set session cookies
    if (data.session) {
      const cookieStore = cookies();
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const projectRef = supabaseUrl.split('//')[1].split('.')[0];
      
      // Set auth cookies with proper format
      cookieStore.set(`sb-${projectRef}-auth-token`, JSON.stringify({
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

    // Redirect to dashboard
    redirect('/dashboard');

  } catch (err: any) {
    console.error("Login action error:", err);
    
    if (err.name === "ZodError") {
      redirect(`/login?error=${encodeURIComponent(err.errors[0]?.message || "Invalid input")}`);
    }

    redirect(`/login?error=${encodeURIComponent(err.message || "Login failed")}`);
  }
}

export async function signupAction(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    
    // Validate input
    const validatedData = signupSchema.parse({ email, password });
    
    // Use admin client to create user
    const admin = getSupabaseAdminClient();
    
    const { data, error } = await admin.auth.admin.createUser({
      email: validatedData.email,
      password: validatedData.password,
      email_confirm: true, // Auto-confirm email for development
    });

    if (error) {
      redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    }

    // Create profile
    if (data.user) {
      try {
        await admin.from("profiles").upsert({
          user_id: data.user.id,
          email: data.user.email,
          role: "user",
        });
      } catch (profileErr) {
        console.warn("Profile creation failed:", profileErr);
      }
    }

    // Redirect to login with success message
    redirect('/login?message=Account created successfully. Please log in.');

  } catch (err: any) {
    console.error("Signup action error:", err);
    
    if (err.name === "ZodError") {
      redirect(`/signup?error=${encodeURIComponent(err.errors[0]?.message || "Invalid input")}`);
    }

    redirect(`/signup?error=${encodeURIComponent(err.message || "Signup failed")}`);
  }
}
