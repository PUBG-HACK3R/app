"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Clock, 
  CheckCircle,
  XCircle,
  RefreshCw,
  PiggyBank
} from "lucide-react";

interface Transaction {
  id: string;
  type: string;
  amount_usdt: number;
  status: string;
  description: string;
  created_at: string;
  processed_at?: string;
  reference_id?: string;
  balance_before?: number;
  balance_after?: number;
}

interface TransactionListProps {
  limit?: number;
  showTitle?: boolean;
}

export function TransactionList({ limit = 10, showTitle = true }: TransactionListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/transactions');
      const data = await response.json();
      
      if (data.success) {
        setTransactions(data.transactions.slice(0, limit));
      } else {
        setError(data.error || 'Failed to fetch transactions');
      }
    } catch (err) {
      setError('Network error');
      console.error('Transaction fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTransactionIcon = (type: string, status: string) => {
    if (status === 'pending') return Clock;
    
    switch (type) {
      case 'deposit':
        return ArrowDownRight;
      case 'withdrawal':
        return ArrowUpRight;
      case 'earning':
        return TrendingUp;
      case 'investment':
      case 'plan_purchase':
        return PiggyBank;
      case 'investment_return':
        return ArrowDownRight;
      case 'referral_commission':
        return TrendingUp;
      case 'refund':
        return RefreshCw;
      default:
        return ArrowUpRight;
    }
  };

  const getTransactionColor = (type: string, status: string) => {
    if (status === 'pending') return 'text-yellow-400 bg-yellow-500/20';
    if (status === 'rejected' || status === 'failed') return 'text-red-400 bg-red-500/20';
    if (status === 'expired') return 'text-orange-400 bg-orange-500/20';
    
    switch (type) {
      case 'deposit':
      case 'earning':
      case 'investment_return':
      case 'referral_commission':
      case 'refund':
        return 'text-green-400 bg-green-500/20';
      case 'withdrawal':
      case 'investment':
      case 'plan_purchase':
        return 'text-red-400 bg-red-500/20';
      default:
        return 'text-blue-400 bg-blue-500/20';
    }
  };

  const getTransactionLabel = (type: string, status: string) => {
    const labels = {
      deposit: 'Deposit',
      withdrawal: 'Withdrawal',
      earning: 'Earning',
      investment: 'Plan Purchase',
      plan_purchase: 'Plan Purchase',
      investment_return: 'Principal Unlocked',
      referral_commission: 'Referral Commission',
      refund: 'Refund'
    };
    
    const label = labels[type as keyof typeof labels] || type;
    
    if (status && status !== 'completed') {
      return `${label} (${status})`;
    }
    
    return label;
  };

  const isPositiveTransaction = (type: string) => {
    return ['deposit', 'earning', 'investment_return', 'referral_commission', 'refund'].includes(type);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 p-4 animate-pulse">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-700 rounded-xl"></div>
                <div>
                  <div className="w-24 h-4 bg-gray-700 rounded mb-2"></div>
                  <div className="w-16 h-3 bg-gray-700 rounded"></div>
                </div>
              </div>
              <div className="w-16 h-4 bg-gray-700 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient-to-r from-red-900/20 to-red-800/20 rounded-2xl border border-red-700/50 p-4 text-center">
        <XCircle className="w-8 h-8 text-red-400 mx-auto mb-2" />
        <div className="text-red-400 font-medium">Failed to load transactions</div>
        <div className="text-red-300 text-sm mt-1">{error}</div>
        <button 
          onClick={fetchTransactions}
          className="mt-3 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 p-8 text-center">
        <TrendingUp className="w-12 h-12 text-gray-500 mx-auto mb-3" />
        <div className="text-gray-400">No transactions yet</div>
        <div className="text-sm text-gray-500 mt-1">Start by making your first deposit or investment</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Recent Transactions</h2>
          <button 
            onClick={fetchTransactions}
            className="text-blue-400 hover:text-blue-300 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      )}
      
      {transactions.map((tx) => {
        const Icon = getTransactionIcon(tx.type, tx.status);
        const colorClass = getTransactionColor(tx.type, tx.status);
        const isPositive = isPositiveTransaction(tx.type);
        
        return (
          <div key={`${tx.type}_${tx.id}`} className="bg-gradient-to-r from-gray-800/50 to-gray-900/50 rounded-2xl border border-gray-700/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-medium text-white">
                    {getTransactionLabel(tx.type, tx.status)}
                  </div>
                  <div className="text-sm text-gray-400">
                    {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString()}
                  </div>
                  {tx.description && (
                    <div className="text-xs text-gray-500 mt-1 max-w-48 truncate">
                      {tx.description}
                    </div>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className={`font-bold ${
                  tx.status === 'pending' ? 'text-yellow-400' :
                  tx.status === 'rejected' || tx.status === 'failed' ? 'text-red-400' :
                  isPositive ? 'text-green-400' : 'text-red-400'
                }`}>
                  {isPositive ? '+' : '-'}${Number(tx.amount_usdt).toFixed(2)}
                </div>
                {tx.status && tx.status !== 'completed' && (
                  <Badge 
                    variant="outline" 
                    className={`text-xs mt-1 ${
                      tx.status === 'pending' ? 'border-yellow-500 text-yellow-400' :
                      tx.status === 'approved' ? 'border-green-500 text-green-400' :
                      tx.status === 'rejected' ? 'border-red-500 text-red-400' :
                      tx.status === 'refunded' ? 'border-purple-500 text-purple-400' :
                      'border-gray-500 text-gray-400'
                    }`}
                  >
                    {tx.status}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
