"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle, 
  X, 
  AlertTriangle, 
  RefreshCw,
  DollarSign,
  Calendar,
  MapPin
} from "lucide-react";

interface Withdrawal {
  id: string;
  amount_usdt: number;
  fee_usdt: number;
  net_amount_usdt: number;
  address: string;
  network: string;
  status: string;
  created_at: string;
}

export default function WithdrawalsPage() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWithdrawals = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch("/api/user/withdrawals");
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch withdrawals");
      }
      
      setWithdrawals(data.withdrawals || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'approved':
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'rejected':
      case 'failed':
        return <X className="h-4 w-4 text-red-500" />;
      case 'processing':
        return <AlertTriangle className="h-4 w-4 text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'approved':
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'rejected':
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-orange-900/10 to-gray-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.history.back()}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-white">My Withdrawals</h1>
              <p className="text-gray-400">Track your mining payout requests</p>
            </div>
          </div>
          
          <Button 
            onClick={fetchWithdrawals}
            disabled={loading}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Error State */}
        {error && (
          <Card className="mb-6 bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-red-800 dark:text-red-200 font-medium">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {loading && !error && (
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardContent className="p-8 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-orange-400 mx-auto mb-4" />
              <p className="text-gray-400">Loading your withdrawal history...</p>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!loading && !error && withdrawals.length === 0 && (
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardContent className="p-8 text-center">
              <DollarSign className="h-12 w-12 text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">No Withdrawals Yet</h3>
              <p className="text-gray-400 mb-4">You haven't made any withdrawal requests yet.</p>
              <Button 
                onClick={() => window.location.href = '/wallet'}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Make a Withdrawal
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Withdrawals List */}
        {!loading && !error && withdrawals.length > 0 && (
          <div className="space-y-4">
            {withdrawals.map((withdrawal) => (
              <Card key={withdrawal.id} className="bg-gray-800/50 border-gray-700/50 hover:bg-gray-800/70 transition-colors">
                <CardContent className="p-6">
                  <div className="grid gap-4 lg:grid-cols-4">
                    {/* Status & Amount */}
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(withdrawal.status)}
                        <Badge className={getStatusColor(withdrawal.status)}>
                          {withdrawal.status.toUpperCase()}
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400">Withdrawal Amount</p>
                        <p className="text-lg font-bold text-white">
                          ${Number(withdrawal.amount_usdt).toFixed(2)} USDT
                        </p>
                      </div>
                    </div>

                    {/* Fee & Net Amount */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-400">Network Fee</p>
                        <p className="text-red-400 font-medium">
                          -${Number(withdrawal.fee_usdt || 0).toFixed(2)}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400">You'll Receive</p>
                        <p className="text-green-400 font-bold">
                          ${Number(withdrawal.net_amount_usdt).toFixed(2)}
                        </p>
                      </div>
                    </div>

                    {/* Address & Network */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-400 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          Destination Address
                        </p>
                        <p className="text-xs font-mono text-gray-300 break-all bg-gray-700/50 p-2 rounded">
                          {withdrawal.address}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400">Network</p>
                        <Badge variant="outline" className="border-gray-600 text-gray-300">
                          {withdrawal.network}
                        </Badge>
                      </div>
                    </div>

                    {/* Date & ID */}
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-400 flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Created
                        </p>
                        <p className="text-sm text-gray-300">
                          {new Date(withdrawal.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(withdrawal.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-sm text-gray-400">Request ID</p>
                        <p className="text-xs font-mono text-gray-500">
                          {withdrawal.id.slice(0, 8)}...{withdrawal.id.slice(-8)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-8 flex justify-center space-x-4">
          <Button 
            onClick={() => window.location.href = '/wallet'}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            Make New Withdrawal
          </Button>
          
          <Button 
            onClick={() => window.location.href = '/dashboard'}
            className="bg-orange-600 hover:bg-orange-700"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
