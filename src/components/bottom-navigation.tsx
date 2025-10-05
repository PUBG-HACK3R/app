"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Home, 
  TrendingUp, 
  Wallet, 
  User,
  BarChart3
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  {
    name: "Home",
    href: "/dashboard",
    icon: Home,
  },
  {
    name: "Active Plans",
    href: "/active-plans",
    icon: TrendingUp,
  },
  {
    name: "Wallet",
    href: "/wallet",
    icon: Wallet,
  },
  {
    name: "Profile",
    href: "/settings",
    icon: User,
  },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-900/95 backdrop-blur-md border-t border-gray-700/50">
      <div className="grid grid-cols-4 h-16">
        {navigation.map((item) => {
          const isActive = pathname === item.href || 
            (item.href === "/dashboard" && pathname === "/dashboard");
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors duration-200",
                isActive 
                  ? "text-blue-400" 
                  : "text-gray-500 hover:text-gray-300"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-xs font-medium">{item.name}</span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-400 rounded-full" />
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
