import { NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient();
    
    // Sign out the user
    await supabase.auth.signOut();
    
    // Redirect to login page
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
  } catch (error) {
    console.error("Logout error:", error);
    // Still redirect to login even if there's an error
    return NextResponse.redirect(new URL('/login', process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'));
  }
}

export async function POST() {
  return GET(); // Handle both GET and POST requests
}
