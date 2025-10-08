import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const token = request.headers.get('cookie')?.split('admin_token=')[1]?.split(';')[0];
    
    if (!token) {
      return NextResponse.json({ 
        success: false,
        error: "No admin token provided" 
      }, { status: 401 });
    }

    const admin = await adminAuth.verifyToken(token);
    
    if (!admin) {
      return NextResponse.json({ 
        success: false,
        error: "Invalid or expired token" 
      }, { status: 401 });
    }

    return NextResponse.json({ 
      success: true,
      admin 
    });

  } catch (error) {
    console.error("Admin verification error:", error);
    return NextResponse.json({ 
      success: false,
      error: "Token verification failed" 
    }, { status: 500 });
  }
}
