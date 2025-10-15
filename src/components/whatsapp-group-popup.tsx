"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCircle, Users, X, TrendingUp } from "lucide-react";

export function WhatsAppGroupPopup() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has already seen this popup
    const hasSeenPopup = localStorage.getItem('whatsapp-group-popup-seen');
    
    if (!hasSeenPopup) {
      // Show popup after 3 seconds delay
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, []);

  const handleJoinGroup = () => {
    // Mark as seen
    localStorage.setItem('whatsapp-group-popup-seen', 'true');
    
    // Open WhatsApp group link
    window.open('https://chat.whatsapp.com/HrMv0nvAMAc4uChdtcT9qp?mode=wwt', '_blank');
    
    // Close popup
    setIsOpen(false);
  };

  const handleClose = () => {
    // Mark as seen so it doesn't show again
    localStorage.setItem('whatsapp-group-popup-seen', 'true');
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-gradient-to-br from-green-900/90 to-green-800/90 border-green-700/50 backdrop-blur-sm">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white flex items-center gap-2">
              <MessageCircle className="h-6 w-6 text-green-400" />
              Join Our WhatsApp Community
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="text-gray-400 hover:text-white hover:bg-white/10"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription className="text-gray-300">
            Connect with other investors and get exclusive updates, tips, and support from our community!
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Benefits */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm text-gray-200">
              <Users className="h-4 w-4 text-green-400 flex-shrink-0" />
              <span>Connect with fellow investors</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-200">
              <MessageCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
              <span>Get instant support and updates</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-200">
              <TrendingUp className="h-4 w-4 text-green-400 flex-shrink-0" />
              <span>Exclusive investment tips and insights</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={handleJoinGroup}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white"
            >
              <MessageCircle className="w-4 h-4 mr-2" />
              Join WhatsApp Group
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

