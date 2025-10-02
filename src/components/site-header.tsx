"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Menu, 
  X,
  LayoutDashboard, 
  Wallet, 
  Users, 
  Settings, 
  LogOut,
  User as UserIcon,
  ChevronDown,
  Bell,
  Search,
  TrendingUp,
  Shield,
  CreditCard,
  BarChart3,
  Gift
} from "lucide-react";
import { User } from "@supabase/supabase-js";

export function SiteHeader() {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

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
    setIsOpen(false);
  };

  // Navigation items
  const publicNavItems = [
    { href: "/plans", label: "Investment Plans", icon: TrendingUp, description: "Explore our investment opportunities" }
  ];

  const userNavItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, description: "Your investment overview" },
    { href: "/active-plans", label: "Active Plans", icon: BarChart3, description: "Monitor your investments" },
    { href: "/wallet", label: "Wallet", icon: Wallet, description: "Manage your funds" },
    { href: "/referrals", label: "Referrals", icon: Gift, description: "Earn through referrals" },
  ];

  const adminNavItems = [
    { href: "/admin", label: "Admin Panel", icon: Shield, description: "System administration" }
  ];

  // Check if current path is active
  const isActive = (path: string) => pathname === path;

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 shadow-lg">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo Section */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center font-bold text-xl group">
            <div className="relative">
              <Image 
                src="/logo.png" 
                alt="WeEarn Logo" 
                width={60} 
                height={60} 
                className="rounded-lg shadow-sm group-hover:shadow-md transition-shadow"
              />
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-blue-600/20 to-purple-600/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {/* Public Navigation */}
            {publicNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative group ${
                    isActive(item.href) 
                      ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/50' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {isActive(item.href) && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
                  )}
                </Link>
              );
            })}

            {/* User Navigation */}
            {user && userNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative group ${
                    isActive(item.href) 
                      ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/50' 
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  {isActive(item.href) && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full"></div>
                  )}
                </Link>
              );
            })}

            {/* Admin Navigation */}
            {isAdmin && adminNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 relative group ${
                    isActive(item.href) 
                      ? 'text-orange-600 bg-orange-50 dark:bg-orange-950/50' 
                      : 'text-orange-600 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                  <Badge variant="secondary" className="ml-1 text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                    Admin
                  </Badge>
                  {isActive(item.href) && (
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-orange-600 rounded-full"></div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-3">
          {/* Desktop User Section */}
          {!loading && (
            <div className="hidden md:flex items-center gap-3">
              {user ? (
                <div className="flex items-center gap-3">
                  {/* User Profile */}
                  <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                        <UserIcon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-medium text-green-700 dark:text-green-300">
                          {user.email?.split('@')[0]}
                        </span>
                        <div className="flex items-center gap-1">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                          <span className="text-xs text-green-600 dark:text-green-400">Online</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Sign Out Button */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSignOut}
                    className="text-muted-foreground hover:text-foreground hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                    <Link href="/login">
                      <UserIcon className="h-4 w-4 mr-2" />
                      Log in
                    </Link>
                  </Button>
                  <Button asChild size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg hover:shadow-xl transition-all">
                    <Link href="/signup">
                      <TrendingUp className="h-4 w-4 mr-2" />
                      Get Started
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Mobile Navigation */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="sm" className="p-2 hover:bg-muted/50">
                {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                <span className="sr-only">Toggle menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[350px] sm:w-[400px] p-0">
              <div className="flex flex-col h-full">
                {/* Mobile Header */}
                <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950">
                  <div className="flex items-center">
                    <Image 
                      src="/logo.png" 
                      alt="WeEarn Logo" 
                      width={48} 
                      height={48} 
                      className="rounded-lg shadow-sm"
                    />
                  </div>
                  {user && (
                    <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></div>
                      Online
                    </Badge>
                  )}
                </div>
                
                {/* Mobile Navigation */}
                <nav className="flex flex-col gap-1 p-4 flex-1">
                  {/* Public Navigation */}
                  <div className="space-y-1">
                    {publicNavItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link 
                          key={item.href}
                          href={item.href} 
                          onClick={() => setIsOpen(false)}
                          className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                            isActive(item.href) 
                              ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 border border-blue-200 dark:border-blue-800' 
                              : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                          }`}
                        >
                          <div className={`p-2 rounded-lg ${
                            isActive(item.href) 
                              ? 'bg-blue-100 dark:bg-blue-900' 
                              : 'bg-muted/50 group-hover:bg-muted'
                          }`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.label}</span>
                            <span className="text-xs text-muted-foreground">{item.description}</span>
                          </div>
                        </Link>
                      );
                    })}
                  </div>

                  {/* User Navigation */}
                  {user && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-1">
                        <div className="px-4 py-2">
                          <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Your Account</h4>
                        </div>
                        {userNavItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link 
                              key={item.href}
                              href={item.href} 
                              onClick={() => setIsOpen(false)}
                              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                                isActive(item.href) 
                                  ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 border border-blue-200 dark:border-blue-800' 
                                  : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                              }`}
                            >
                              <div className={`p-2 rounded-lg ${
                                isActive(item.href) 
                                  ? 'bg-blue-100 dark:bg-blue-900' 
                                  : 'bg-muted/50 group-hover:bg-muted'
                              }`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col">
                                <span className="font-medium">{item.label}</span>
                                <span className="text-xs text-muted-foreground">{item.description}</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  )}

                  {/* Admin Navigation */}
                  {isAdmin && (
                    <>
                      <Separator className="my-4" />
                      <div className="space-y-1">
                        <div className="px-4 py-2">
                          <h4 className="text-xs font-semibold text-orange-600 uppercase tracking-wider">Administration</h4>
                        </div>
                        {adminNavItems.map((item) => {
                          const Icon = item.icon;
                          return (
                            <Link 
                              key={item.href}
                              href={item.href} 
                              onClick={() => setIsOpen(false)}
                              className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group ${
                                isActive(item.href) 
                                  ? 'bg-orange-50 dark:bg-orange-950/50 text-orange-600 border border-orange-200 dark:border-orange-800' 
                                  : 'hover:bg-orange-50 dark:hover:bg-orange-950/30 text-orange-600 hover:text-orange-500'
                              }`}
                            >
                              <div className={`p-2 rounded-lg ${
                                isActive(item.href) 
                                  ? 'bg-orange-100 dark:bg-orange-900' 
                                  : 'bg-orange-100 dark:bg-orange-900 group-hover:bg-orange-200 dark:group-hover:bg-orange-800'
                              }`}>
                                <Icon className="h-4 w-4" />
                              </div>
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{item.label}</span>
                                  <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">
                                    Admin
                                  </Badge>
                                </div>
                                <span className="text-xs text-muted-foreground">{item.description}</span>
                              </div>
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  )}
                </nav>
                
                {/* Mobile Footer */}
                <div className="border-t p-4 bg-muted/20">
                  {user ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 rounded-xl border border-green-200 dark:border-green-800">
                        <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-white" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-green-700 dark:text-green-300">
                            {user.email?.split('@')[0]}
                          </span>
                          <span className="text-xs text-green-600 dark:text-green-400">
                            {user.email}
                          </span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={handleSignOut} 
                        className="w-full hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 dark:hover:border-red-800 hover:text-red-600"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <Button asChild variant="outline" className="w-full">
                        <Link href="/login" onClick={() => setIsOpen(false)}>
                          <UserIcon className="h-4 w-4 mr-2" />
                          Log in
                        </Link>
                      </Button>
                      <Button asChild className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0 shadow-lg">
                        <Link href="/signup" onClick={() => setIsOpen(false)}>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Get Started
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
