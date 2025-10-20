"use client";

import { Bell, BellRing } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface NotificationBadgeProps {
  count: number;
  hasNew: boolean;
}

export function NotificationBadge({ count, hasNew }: NotificationBadgeProps) {
  if (count === 0) {
    return (
      <div className="relative">
        <Bell className="h-6 w-6 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="relative">
      <BellRing className={`h-6 w-6 ${hasNew ? 'text-red-500 animate-pulse' : 'text-yellow-500'}`} />
      <Badge 
        className={`absolute -top-2 -right-2 min-w-[20px] h-5 flex items-center justify-center text-xs font-bold ${
          hasNew 
            ? 'bg-red-500 text-white border-red-600 animate-bounce' 
            : 'bg-yellow-500 text-black border-yellow-600'
        }`}
      >
        {count > 99 ? '99+' : count}
      </Badge>
    </div>
  );
}
