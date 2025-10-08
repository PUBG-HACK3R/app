import { NextResponse } from "next/server";
import { z } from "zod";
import { adminAuth } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LoginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { username, password } = LoginSchema.parse(json);

    // Attempt admin login
    const session = await adminAuth.login(username, password);
    
    if (!session) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid username or password" 
      }, { status: 401 });
    }

    // Set HTTP-only cookie for security
    const response = NextResponse.json({ 
      success: true,
      admin: session.admin,
      expires_at: session.expires_at
    });

    response.cookies.set('admin_token', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      path: '/'
    });

    return response;

  } catch (err: any) {
    console.error("Admin login error:", err);
    
    if (err instanceof z.ZodError) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid login data", 
        issues: err.issues 
      }, { status: 400 });
    }
    
    return NextResponse.json({ 
      success: false,
      error: "Login failed" 
    }, { status: 500 });
  }
}
