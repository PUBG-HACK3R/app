"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowDownRight, 
  CheckCircle, 
  XCircle, 
  Clock,
  RefreshCw,
  DollarSign,
  AlertTriangle
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Withdrawal {
  id: string;
  user_id: string;
  user_email: string;
  amount_usdt: number;
  wallet_address: string;
  status: 'pending' | 'approved' | 'rejected' | 'completed' | 'expired' | 'refunded' | 'failed';
  created_at: string;
  processed_at?: string;
  admin_notes?: string;
  expires_at?: string;
}

export function WithdrawalManagement() {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    fetchWithdrawals();
  }, []);

  const fetchWithdrawals = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin-v2/withdrawals');
      if (response.ok) {
        const data = await response.json();
        if (data.error) {
          console.error('Withdrawals API failed:', data.error);
        } else {
          setWithdrawals(data.withdrawals || []);
        }
      } else {
        console.error('Withdrawals API failed:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error fetching withdrawals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (withdrawalId: string) => {
    setProcessing(withdrawalId);
    try {
      const response = await fetch('/api/admin-v2/withdrawals/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId })
      });

      if (response.ok) {
        await fetchWithdrawals();
      }
    } catch (error) {
      console.error('Error approving withdrawal:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (withdrawalId: string) => {
    const reason = prompt('Reason for rejection (optional):');
    
    setProcessing(withdrawalId);
    try {
      const response = await fetch('/api/admin-v2/withdrawals/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ withdrawalId, reason })
      });

      if (response.ok) {
        await fetchWithdrawals();
      }
    } catch (error) {
      console.error('Error rejecting withdrawal:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleRefundExpired = async () => {
    if (!confirm('Are you sure you want to refund all expired withdrawals? This will return the funds to users\' balances.')) {
      return;
    }

    setRefunding(true);
    try {
      const response = await fetch('/api/admin/refund-expired', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully refunded ${data.results.refunded_withdrawals} expired withdrawals totaling $${data.results.total_amount_refunded}`);
        await fetchWithdrawals();
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Error refunding expired withdrawals:', error);
      alert('Failed to refund expired withdrawals');
    } finally {
      setRefunding(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'completed':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="h-3 w-3 mr-1" />
            Completed
          </Badge>
        );
      case 'rejected':
      case 'failed':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="h-3 w-3 mr-1" />
            {status === 'failed' ? 'Failed' : 'Rejected'}
          </Badge>
        );
      case 'expired':
        return (
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Expired
          </Badge>
        );
      case 'refunded':
        return (
          <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
            <RefreshCw className="h-3 w-3 mr-1" />
            Refunded
          </Badge>
        );
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{status}</Badge>;
    }
  };

  // Calculate stats
  const pendingWithdrawals = withdrawals.filter(w => w.status === 'pending');
  const completedWithdrawals = withdrawals.filter(w => w.status === 'completed');
  const expiredWithdrawals = withdrawals.filter(w => w.status === 'expired');
  const refundedWithdrawals = withdrawals.filter(w => w.status === 'refunded');
  
  const totalPendingAmount = pendingWithdrawals.reduce((sum, w) => sum + w.amount_usdt, 0);
  const totalExpiredAmount = expiredWithdrawals.reduce((sum, w) => sum + w.amount_usdt, 0);
  
  // Only show refund button if there are actually expired withdrawals that need refunding
  const hasExpiredNeedingRefund = expiredWithdrawals.length > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Withdrawal Management</h2>
          <p className="text-gray-400 mt-1">Review and process user withdrawal requests</p>
        </div>
        <div className="flex items-center gap-2">
          {expiredWithdrawals.length > 0 && (
            <Button 
              onClick={handleRefundExpired} 
              disabled={refunding}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {refunding ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Refund Expired ({expiredWithdrawals.length})
            </Button>
          )}
          <Button onClick={fetchWithdrawals} variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-white">{pendingWithdrawals.length}</p>
                <p className="text-sm text-gray-400">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {withdrawals.filter(w => w.status === 'completed').length}
                </p>
                <p className="text-sm text-gray-400">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {withdrawals.filter(w => w.status === 'expired').length}
                </p>
                <p className="text-sm text-gray-400">Expired</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <RefreshCw className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {withdrawals.filter(w => w.status === 'refunded').length}
                </p>
                <p className="text-sm text-gray-400">Refunded</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ArrowDownRight className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-white">{withdrawals.length}</p>
                <p className="text-sm text-gray-400">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Withdrawals Alert */}
      {pendingWithdrawals.length > 0 && (
        <Card className="bg-yellow-500/10 border-yellow-500/30">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-yellow-400 font-medium">
                  {pendingWithdrawals.length} withdrawal request{pendingWithdrawals.length > 1 ? 's' : ''} pending approval
                </p>
                <p className="text-yellow-300 text-sm">
                  Total amount: {formatCurrency(totalPendingAmount)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expired Withdrawals Alert */}
      {expiredWithdrawals.length > 0 && (
        <Card className="bg-orange-500/10 border-orange-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-orange-400 font-medium">
                    {expiredWithdrawals.length} expired withdrawal{expiredWithdrawals.length > 1 ? 's' : ''} need{expiredWithdrawals.length === 1 ? 's' : ''} refunding
                  </p>
                  <p className="text-orange-300 text-sm">
                    Total amount to refund: {formatCurrency(totalExpiredAmount)}
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleRefundExpired} 
                disabled={refunding}
                size="sm"
                className="bg-purple-600 hover:bg-purple-700 text-white"
              >
                {refunding ? (
                  <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-1" />
                )}
                Refund All
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Withdrawals Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Withdrawal Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Amount</TableHead>
                  <TableHead className="text-gray-300">Wallet Address</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Requested</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {withdrawals.map((withdrawal) => (
                  <TableRow key={withdrawal.id} className="border-slate-700">
                    <TableCell>
                      <div>
                        <p className="text-white font-medium">{withdrawal.user_email}</p>
                        <p className="text-xs text-gray-400">ID: {withdrawal.user_id.slice(0, 8)}...</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-white font-semibold">
                        {formatCurrency(withdrawal.amount_usdt)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-slate-700 px-2 py-1 rounded text-blue-400">
                        {withdrawal.wallet_address.slice(0, 20)}...
                      </code>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(withdrawal.status)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-400">
                        {new Date(withdrawal.created_at).toLocaleDateString()}
                        <br />
                        {new Date(withdrawal.created_at).toLocaleTimeString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      {withdrawal.status === 'pending' && (
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(withdrawal.id)}
                            disabled={processing === withdrawal.id}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            {processing === withdrawal.id ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(withdrawal.id)}
                            disabled={processing === withdrawal.id}
                            className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                      {withdrawal.status !== 'pending' && (
                        <div className="text-sm text-gray-400">
                          {withdrawal.processed_at && (
                            <div>
                              Processed: {new Date(withdrawal.processed_at).toLocaleDateString()}
                            </div>
                          )}
                          {withdrawal.admin_notes && (
                            <div className="mt-1 text-xs">
                              Note: {withdrawal.admin_notes}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
