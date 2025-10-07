"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/logout-button";
import { 
  Bell, 
  Settings,
  User,
  Menu
} from "lucide-react";

export function ModernHeader() {
  const pathname = usePathname();
  
  // Page title function removed - no longer showing titles

  return (
    <div className="bg-gradient-to-r from-gray-900/95 to-gray-800/95 backdrop-blur-md border-b border-gray-700/50 sticky top-0 z-40">
      <div className="px-4 py-1">
        <div className="flex items-center justify-between">
          {/* Logo and Title */}
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="flex items-center gap-3">
              <Image 
                src="/logoC.png" 
                alt="WeEarn Logo" 
                width={80} 
                height={80} 
                className="object-contain"
              />
            </Link>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-gray-400 hover:text-white hover:bg-gray-800/50"
              asChild
            >
              <Link href="/settings">
                <Bell className="w-4 h-4" />
              </Link>
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-gray-400 hover:text-white hover:bg-gray-800/50"
              asChild
            >
              <Link href="/settings">
                <User className="w-4 h-4" />
              </Link>
            </Button>
            <LogoutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
