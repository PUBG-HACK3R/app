"use client";

import { Button } from "@/components/ui/button";
import { openTawkToChat } from "@/components/tawk-to-chat";
import { MessageCircle, HelpCircle } from "lucide-react";

interface SupportButtonProps {
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  children?: React.ReactNode;
  showIcon?: boolean;
}

export function SupportButton({ 
  variant = "default", 
  size = "default", 
  className = "",
  children,
  showIcon = true 
}: SupportButtonProps) {
  const handleClick = () => {
    openTawkToChat();
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
    >
      {showIcon && <MessageCircle className="mr-2 h-4 w-4" />}
      {children || "Contact Support"}
    </Button>
  );
}

export function HelpButton({ 
  variant = "ghost", 
  size = "sm", 
  className = "",
  children,
  showIcon = true 
}: SupportButtonProps) {
  const handleClick = () => {
    openTawkToChat();
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
    >
      {showIcon && <HelpCircle className="mr-2 h-4 w-4" />}
      {children || "Need Help?"}
    </Button>
  );
}
