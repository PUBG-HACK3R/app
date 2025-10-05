"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  ExternalLink
} from "lucide-react";

interface WithdrawalSummary {
  total: number;
  pending: number;
  processing: number;
  recent_amount?: number;
}

export function WithdrawalStatusButton() {
  const [summary, setSummary] = useState<WithdrawalSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/user/withdrawals");
      const data = await response.json();
      
      if (data.success && data.withdrawals) {
        const withdrawals = data.withdrawals;
        const pending = withdrawals.filter((w: any) => w.status === 'pending').length;
        const processing = withdrawals.filter((w: any) => w.status === 'processing').length;
        const recent = withdrawals[0]; // Most recent withdrawal
        
        setSummary({
          total: withdrawals.length,
          pending,
          processing,
          recent_amount: recent ? Number(recent.amount_usdt) : undefined
        });
      }
    } catch (error) {
      console.error("Error fetching withdrawal summary:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleClick = () => {
    window.location.href = '/withdrawals';
  };

  if (!summary && !loading) return null;

  return (
    <Button
      onClick={handleClick}
      variant="outline"
      className="relative border-orange-600/50 text-orange-300 hover:bg-orange-600/10 hover:border-orange-500"
    >
      <DollarSign className="h-4 w-4 mr-2" />
      <span className="hidden sm:inline">My Withdrawals</span>
      <span className="sm:hidden">Withdrawals</span>
      
      {summary && (summary.pending > 0 || summary.processing > 0) && (
        <Badge 
          className="ml-2 bg-orange-600 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5"
        >
          {summary.pending + summary.processing}
        </Badge>
      )}
      
      <ExternalLink className="h-3 w-3 ml-2 opacity-60" />
    </Button>
  );
}

// Compact version for smaller spaces
export function WithdrawalStatusIcon() {
  const [summary, setSummary] = useState<WithdrawalSummary | null>(null);

  const fetchSummary = async () => {
    try {
      const response = await fetch("/api/user/withdrawals");
      const data = await response.json();
      
      if (data.success && data.withdrawals) {
        const withdrawals = data.withdrawals;
        const pending = withdrawals.filter((w: any) => w.status === 'pending').length;
        const processing = withdrawals.filter((w: any) => w.status === 'processing').length;
        
        setSummary({
          total: withdrawals.length,
          pending,
          processing
        });
      }
    } catch (error) {
      console.error("Error fetching withdrawal summary:", error);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const handleClick = () => {
    window.location.href = '/withdrawals';
  };

  const getStatusIcon = () => {
    if (!summary) return <DollarSign className="h-5 w-5 text-gray-400" />;
    
    if (summary.processing > 0) {
      return <AlertTriangle className="h-5 w-5 text-blue-400" />;
    }
    
    if (summary.pending > 0) {
      return <Clock className="h-5 w-5 text-yellow-400" />;
    }
    
    if (summary.total > 0) {
      return <CheckCircle className="h-5 w-5 text-green-400" />;
    }
    
    return <DollarSign className="h-5 w-5 text-gray-400" />;
  };

  return (
    <button
      onClick={handleClick}
      className="relative p-2 rounded-lg hover:bg-gray-700/50 transition-colors group"
      title="View Withdrawals"
    >
      {getStatusIcon()}
      
      {summary && (summary.pending > 0 || summary.processing > 0) && (
        <Badge 
          className="absolute -top-1 -right-1 bg-orange-600 text-white text-xs px-1.5 py-0.5 min-w-[18px] h-4 flex items-center justify-center"
        >
          {summary.pending + summary.processing}
        </Badge>
      )}
    </button>
  );
}
