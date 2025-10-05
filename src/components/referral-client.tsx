"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Share2 } from "lucide-react";
import { toast } from "sonner";

interface ReferralClientProps {
  referralLink: string;
}

export function ReferralClient({ referralLink }: ReferralClientProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Referral link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error("Failed to copy link");
    }
  };

  const shareOnTwitter = () => {
    const text = "Join WeEarn Mining and start earning with Bitcoin mining! 🚀";
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(referralLink)}`;
    window.open(url, '_blank');
  };

  const shareOnWhatsApp = () => {
    const text = `Join WeEarn Mining and start earning with Bitcoin mining! 🚀 ${referralLink}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareOnTelegram = () => {
    const text = "Join WeEarn Mining and start earning with Bitcoin mining! 🚀";
    const url = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Referral Link Input */}
      <div className="flex gap-2">
        <Input 
          value={referralLink}
          readOnly
          className="bg-gray-900/50 border-gray-600 text-white"
        />
        <Button 
          onClick={copyToClipboard}
          className={`${copied ? 'bg-green-600 hover:bg-green-700' : 'bg-purple-600 hover:bg-purple-700'} transition-colors`}
        >
          {copied ? (
            <>✓ Copied</>
          ) : (
            <Copy className="w-4 h-4" />
          )}
        </Button>
      </div>
      
      {/* Social Share Buttons */}
      <div className="flex gap-2">
        <Button 
          onClick={shareOnTwitter}
          className="bg-blue-600 hover:bg-blue-700 flex-1"
        >
          Share on Twitter
        </Button>
        <Button 
          onClick={shareOnWhatsApp}
          className="bg-green-600 hover:bg-green-700 flex-1"
        >
          Share on WhatsApp
        </Button>
        <Button 
          onClick={shareOnTelegram}
          className="bg-indigo-600 hover:bg-indigo-700 flex-1"
        >
          Share on Telegram
        </Button>
      </div>
    </div>
  );
}
