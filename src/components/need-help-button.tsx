"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle, HelpCircle } from "lucide-react";

interface NeedHelpButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "link" | "destructive" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  text?: string;
}

export function NeedHelpButton({ 
  className = "", 
  variant = "outline",
  size = "default",
  showIcon = true,
  text = "Need Help?"
}: NeedHelpButtonProps) {
  const handleWhatsAppRedirect = () => {
    const phoneNumber = "84842801867"; // +84 84 280 1867 formatted for WhatsApp
    const message = encodeURIComponent("Hello! I need help with my WeEarn account.");
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    
    // Open WhatsApp in a new tab
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Button
      onClick={handleWhatsAppRedirect}
      variant={variant}
      size={size}
      className={`${className} transition-all hover:scale-105`}
    >
      {showIcon && <MessageCircle className="w-4 h-4 mr-2" />}
      {text}
    </Button>
  );
}

// Alternative compact version for floating button
export function NeedHelpFloatingButton({ className = "" }: { className?: string }) {
  const handleWhatsAppRedirect = () => {
    const phoneNumber = "84842801867";
    const message = encodeURIComponent("Hello! I need help with my WeEarn account.");
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <Button
      onClick={handleWhatsAppRedirect}
      size="icon"
      className={`fixed bottom-20 right-4 z-50 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 ${className}`}
    >
      <HelpCircle className="w-5 h-5" />
    </Button>
  );
}
