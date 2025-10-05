"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

export function ProfileLogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogout = async () => {
    setIsLoading(true);
    
    try {
      // Try API logout first
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        toast.success('Logged out successfully');
      } else {
        // If API fails, try direct Supabase logout
        const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        toast.success('Logged out successfully');
      }
      
      // Force redirect and refresh
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // Fallback: try direct Supabase logout
      try {
        const { getSupabaseBrowserClient } = await import('@/lib/supabase/client');
        const supabase = getSupabaseBrowserClient();
        await supabase.auth.signOut();
        window.location.href = '/login';
      } catch (fallbackError) {
        console.error('Fallback logout error:', fallbackError);
        toast.error('Failed to logout');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      disabled={isLoading}
      className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-4 rounded-2xl font-semibold"
    >
      <LogOut className="w-5 h-5 mr-2" />
      {isLoading ? 'Signing out...' : 'Sign Out'}
    </Button>
  );
}
