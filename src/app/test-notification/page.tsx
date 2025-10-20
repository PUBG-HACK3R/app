"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { playNotificationSound } from "@/utils/notificationSound";
import { Bell, Volume2 } from "lucide-react";

export default function TestNotificationPage() {
  const [isPlaying, setIsPlaying] = useState(false);

  const testSound = async () => {
    setIsPlaying(true);
    try {
      await playNotificationSound();
    } catch (error) {
      console.error("Sound error:", error);
    }
    setTimeout(() => setIsPlaying(false), 600);
  };

  const testBrowserNotification = async () => {
    // Request permission first
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        new Notification('🚨 Test Withdrawal Alert!', {
          body: 'This is how admin notifications will look',
          icon: '/favicon.ico',
          badge: '/favicon.ico'
        });
      } else {
        alert('Please allow notifications to test this feature');
      }
    }
  };

  const testBoth = async () => {
    await testSound();
    setTimeout(testBrowserNotification, 200);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-6 w-6" />
              Test Admin Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-300">
              Test how the admin panel notifications will sound and look when new withdrawals arrive.
            </p>

            <div className="grid gap-4">
              <Button 
                onClick={testSound}
                disabled={isPlaying}
                className="w-full"
                variant="outline"
              >
                <Volume2 className="h-4 w-4 mr-2" />
                {isPlaying ? "Playing..." : "Test Sound Only"}
              </Button>

              <Button 
                onClick={testBrowserNotification}
                className="w-full"
                variant="outline"
              >
                <Bell className="h-4 w-4 mr-2" />
                Test Browser Popup Only
              </Button>

              <Button 
                onClick={testBoth}
                disabled={isPlaying}
                className="w-full bg-red-600 hover:bg-red-700"
              >
                <Bell className="h-4 w-4 mr-2" />
                {isPlaying ? "Testing..." : "🚨 Test Full Notification (Sound + Popup)"}
              </Button>
            </div>

            <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 mt-6">
              <h3 className="font-semibold text-blue-300 mb-2">How it works:</h3>
              <ul className="text-sm text-blue-200 space-y-1">
                <li>• Sound plays immediately when new withdrawal detected</li>
                <li>• Browser popup appears even if you're on another tab</li>
                <li>• Visual indicators update in the admin panel</li>
                <li>• Works across all browser tabs</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
