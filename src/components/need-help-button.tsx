"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle, HelpCircle, Send, X } from "lucide-react";
import { useState } from "react";

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
  const [showOptions, setShowOptions] = useState(false);

  const handleWhatsAppRedirect = () => {
    const phoneNumber = "12265512347"; // +1 (226) 551-2347 formatted for WhatsApp
    const message = encodeURIComponent("Hello! I need help with my WeEarn account.");
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    
    // Open WhatsApp in a new tab
    window.open(whatsappUrl, '_blank');
    setShowOptions(false);
  };

  const handleTelegramRedirect = () => {
    // Open Telegram chat
    window.open('https://t.me/weearn753', '_blank');
    setShowOptions(false);
  };

  if (showOptions) {
    return (
      <div className="flex gap-2">
        <Button
          onClick={handleWhatsAppRedirect}
          variant="outline"
          size={size}
          className="bg-green-600 hover:bg-green-700 text-white border-green-600"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          WhatsApp
        </Button>
        <Button
          onClick={handleTelegramRedirect}
          variant="outline"
          size={size}
          className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
        >
          <Send className="w-4 h-4 mr-2" />
          Telegram
        </Button>
        <Button
          onClick={() => setShowOptions(false)}
          variant="ghost"
          size={size}
          className="text-gray-500"
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => setShowOptions(true)}
      variant={variant}
      size={size}
      className={`${className} transition-all hover:scale-105`}
    >
      {showIcon && <HelpCircle className="w-4 h-4 mr-2" />}
      {text}
    </Button>
  );
}

// Alternative compact version for floating button
export function NeedHelpFloatingButton({ className = "" }: { className?: string }) {
  const [showOptions, setShowOptions] = useState(false);

  const handleWhatsAppRedirect = () => {
    const phoneNumber = "12265512347"; // +1 (226) 551-2347 formatted for WhatsApp
    const message = encodeURIComponent("Hello! I need help with my WeEarn account.");
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${message}`;
    window.open(whatsappUrl, '_blank');
    setShowOptions(false);
  };

  const handleTelegramRedirect = () => {
    window.open('https://t.me/weearn753', '_blank');
    setShowOptions(false);
  };

  if (showOptions) {
    return (
      <div className="fixed bottom-20 right-4 z-50 flex flex-col gap-2">
        <Button
          onClick={handleWhatsAppRedirect}
          size="icon"
          className="rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110"
        >
          <MessageCircle className="w-5 h-5" />
        </Button>
        <Button
          onClick={handleTelegramRedirect}
          size="icon"
          className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110"
        >
          <Send className="w-5 h-5" />
        </Button>
        <Button
          onClick={() => setShowOptions(false)}
          size="icon"
          variant="ghost"
          className="rounded-full bg-gray-600 hover:bg-gray-700 text-white shadow-lg"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => setShowOptions(true)}
      size="icon"
      className={`fixed bottom-20 right-4 z-50 rounded-full bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transition-all hover:scale-110 ${className}`}
    >
      <HelpCircle className="w-5 h-5" />
    </Button>
  );
}
