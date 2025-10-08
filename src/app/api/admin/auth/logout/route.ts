import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const response = NextResponse.json({ 
      success: true,
      message: "Logged out successfully" 
    });

    // Clear the admin token cookie
    response.cookies.set('admin_token', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error("Admin logout error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Logout failed" 
    }, { status: 500 });
  }
}
