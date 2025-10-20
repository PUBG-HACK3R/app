"use client";

import { useState, useEffect, useRef } from "react";
import { playNotificationSound } from "@/utils/notificationSound";

interface NotificationData {
  id: string;
  type: 'withdrawal' | 'deposit';
  amount: number;
  userEmail: string;
  timestamp: string;
}

export function useAdminNotifications() {
  const [lastWithdrawalCount, setLastWithdrawalCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const showBrowserNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico'
      });
    }
  };

  const checkForNewWithdrawals = async () => {
    try {
      const response = await fetch('/api/admin-v2/withdrawals');
      if (response.ok) {
        const data = await response.json();
        const pendingWithdrawals = data.withdrawals?.filter((w: any) => w.status === 'pending') || [];
        
        if (lastWithdrawalCount > 0 && pendingWithdrawals.length > lastWithdrawalCount) {
          const newCount = pendingWithdrawals.length - lastWithdrawalCount;
          playNotificationSound();
          showBrowserNotification(
            '🚨 New Withdrawal Request!',
            `${newCount} new withdrawal${newCount > 1 ? 's' : ''} pending approval`
          );
        }
        
        setLastWithdrawalCount(pendingWithdrawals.length);
      }
    } catch (error) {
      console.error('Error checking withdrawals:', error);
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const startPolling = () => {
    if (intervalRef.current) return;
    
    intervalRef.current = setInterval(checkForNewWithdrawals, 5000); // Check every 5 seconds
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  useEffect(() => {
    requestNotificationPermission();
    checkForNewWithdrawals(); // Initial check
    startPolling();

    return () => stopPolling();
  }, []);

  return {
    notifications,
    startPolling,
    stopPolling,
    requestNotificationPermission
  };
}
