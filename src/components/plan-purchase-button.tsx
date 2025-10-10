"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowRight, Wallet, CreditCard } from "lucide-react";
import { toast } from "sonner";

interface PlanPurchaseButtonProps {
  planId: string;
  planName: string;
  planPrice: number;
  gradient: string;
  className?: string;
  onPurchaseSuccess?: () => void;
}

export function PlanPurchaseButton({ 
  planId, 
  planName, 
  planPrice, 
  gradient, 
  className = "",
  onPurchaseSuccess
}: PlanPurchaseButtonProps) {
  const [loading, setLoading] = useState(false);
  const [userBalance, setUserBalance] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    checkUserStatus();
  }, []);

  const checkUserStatus = async () => {
    try {
      // Check if user is authenticated and get balance
      const response = await fetch('/api/user/balance');
      
      if (response.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        setIsAuthenticated(true);
        setUserBalance(data.balance?.available || 0);
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Error checking user status:', error);
      setIsAuthenticated(false);
    }
  };

  const handlePurchase = async () => {
    if (isAuthenticated === false) {
      router.push('/login?next=/plans');
      return;
    }

    if (userBalance === null) {
      await checkUserStatus();
      return;
    }

    // If insufficient balance, redirect to deposit
    if (userBalance < planPrice) {
      router.push(`/wallet/deposit?plan=${planId}&amount=${planPrice}`);
      return;
    }

    // Purchase with existing balance
    setLoading(true);
    try {
      const response = await fetch('/api/plans/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`Successfully purchased ${planName}!`);
        // Call the success callback if provided
        if (onPurchaseSuccess) {
          onPurchaseSuccess();
        } else {
          // Fallback to page refresh for server-side pages
          router.refresh();
          setTimeout(() => window.location.reload(), 1000);
        }
      } else {
        if (data.error === 'Insufficient balance') {
          router.push(`/wallet/deposit?plan=${planId}&amount=${planPrice}`);
        } else {
          toast.error(data.error || 'Failed to purchase plan');
        }
      }
    } catch (error) {
      console.error('Purchase error:', error);
      toast.error('Failed to purchase plan');
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (loading) return "Processing...";
    if (isAuthenticated === false) return "Login to Invest";
    if (userBalance === null) return "Start Investing";
    if (userBalance >= planPrice) return "Purchase Now";
    return "Deposit & Purchase";
  };

  const getButtonIcon = () => {
    if (loading) return null;
    if (isAuthenticated === false) return <ArrowRight className="ml-2 h-4 w-4" />;
    if (userBalance === null) return <ArrowRight className="ml-2 h-4 w-4" />;
    if (userBalance >= planPrice) return <Wallet className="ml-2 h-4 w-4" />;
    return <CreditCard className="ml-2 h-4 w-4" />;
  };

  return (
    <Button 
      size="lg" 
      className={`w-full bg-gradient-to-r ${gradient} hover:opacity-90 text-white font-semibold ${className}`}
      onClick={handlePurchase}
      disabled={loading}
    >
      {getButtonText()}
      {getButtonIcon()}
    </Button>
  );
}
