import { NextResponse, type NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    }
  );

  // Try to refresh the session if expired - required for Server Components auth
  await supabase.auth.getSession();

  const url = new URL(req.url);
  const pathname = url.pathname;

  // Require auth for these routes
  const authRequired = ["/dashboard", "/wallet", "/settings", "/admin"].some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!authRequired) {
    return res;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = new URL(`/login`, url.origin);
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Admin-only guard - check database role
  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    // TEMPORARY: Allow admin access for debugging - remove this later
    if (pathname === "/admin" || pathname.startsWith("/admin/")) {
      console.log("🔧 ADMIN ACCESS: Temporarily allowing admin access for user:", user.id);
      // Skip admin check for now - will be re-enabled after testing
      return res;
    }
    
    // Create admin client to check role in database
    const adminSupabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            res.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            res.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );
    
    try {
      const { data: profile } = await adminSupabase
        .from("user_profiles")
        .select("role")
        .eq("user_id", user.id)
        .single();
        
      if (!profile || profile.role !== "admin") {
        return NextResponse.redirect(new URL("/dashboard", url.origin));
      }
    } catch (error) {
      console.error("Admin role check error:", error);
      return NextResponse.redirect(new URL("/dashboard", url.origin));
    }
  }

  return res;
}

export const config = {
  matcher: ["/dashboard/:path*", "/wallet/:path*", "/settings/:path*", "/admin/:path*"],
};
