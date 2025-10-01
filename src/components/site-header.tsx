"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { User } from "@supabase/supabase-js";

export function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();
    
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const role = (session.user.app_metadata as any)?.role || (session.user.user_metadata as any)?.role || "user";
        setIsAdmin(role === "admin");
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const role = (session.user.app_metadata as any)?.role || (session.user.user_metadata as any)?.role || "user";
        setIsAdmin(role === "admin");
      } else {
        setIsAdmin(false);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 font-bold text-xl">
            <Image 
              src="/logo.png" 
              alt="WeEarn Logo" 
              width={40} 
              height={40} 
              className="rounded-lg shadow-sm"
            />
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              WeEarn
            </span>
          </Link>
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href="/plans" 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
            >
              Plans
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
            </Link>
            {user && (
              <>
                <Link 
                  href="/dashboard" 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
                >
                  Dashboard
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link 
                  href="/wallet" 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
                >
                  Wallet
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
                </Link>
                <Link 
                  href="/referrals" 
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors relative group"
                >
                  Referrals
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-blue-600 to-purple-600 group-hover:w-full transition-all duration-300"></span>
                </Link>
                {isAdmin && (
                  <Link 
                    href="/admin" 
                    className="text-sm font-medium text-orange-600 hover:text-orange-500 transition-colors relative group"
                  >
                    Admin
                    <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-orange-600 group-hover:w-full transition-all duration-300"></span>
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-4">
          {!loading && (
            <nav className="hidden sm:flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-full">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-xs font-medium text-muted-foreground">
                      {user.email?.split('@')[0]}
                    </span>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSignOut}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    Sign out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Link 
                    href="/login" 
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Log in
                  </Link>
                  <Button asChild size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0">
                    <Link href="/signup">Get Started</Link>
                  </Button>
                </div>
              )}
            </nav>
          )}
          
          {/* Mobile Navigation */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="sm" className="p-2">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[320px] sm:w-[400px]">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-3 mb-8">
                  <Image 
                    src="/logo.png" 
                    alt="WeEarn Logo" 
                    width={32} 
                    height={32} 
                    className="rounded-lg shadow-sm"
                  />
                  <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    WeEarn
                  </span>
                </div>
                
                <nav className="flex flex-col gap-2 flex-1">
                  <Link 
                    href="/plans" 
                    className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                    Plans
                  </Link>
                  {user && (
                    <>
                      <Link 
                        href="/dashboard" 
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="w-2 h-2 bg-green-600 rounded-full"></span>
                        Dashboard
                      </Link>
                      <Link 
                        href="/wallet" 
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                        Wallet
                      </Link>
                      <Link 
                        href="/referrals" 
                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
                        Referrals
                      </Link>
                      {isAdmin && (
                        <Link 
                          href="/admin" 
                          className="flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg hover:bg-orange-50 dark:hover:bg-orange-950 text-orange-600 transition-colors"
                        >
                          <span className="w-2 h-2 bg-orange-600 rounded-full"></span>
                          Admin
                        </Link>
                      )}
                    </>
                  )}
                </nav>
                
                <div className="border-t pt-6 mt-6">
                  {user ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 rounded-lg">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm font-medium text-muted-foreground">
                          {user.email?.split('@')[0]}
                        </span>
                      </div>
                      <Button variant="outline" onClick={handleSignOut} className="w-full">
                        Sign out
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/login">Log in</Link>
                      </Button>
                      <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0">
                        <Link href="/signup">Get Started</Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
          
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
