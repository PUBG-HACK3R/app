"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, 
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle
} from "lucide-react";

export function AdminTools() {
  const [bulkTopupData, setBulkTopupData] = useState({
    userEmails: "",
    amount: "",
    reason: ""
  });
  const [systemStats, setSystemStats] = useState({
    totalUsers: 0,
    totalBalance: 0,
    totalInvestments: 0,
    pendingWithdrawals: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const fetchSystemStats = async () => {
    try {
      const response = await fetch('/api/admin-v2/dashboard/stats');
      if (response.ok) {
        const data = await response.json();
        setSystemStats({
          totalUsers: data.totalUsers || 0,
          totalBalance: data.platformBalance || 0,
          totalInvestments: data.totalInvestments || 0,
          pendingWithdrawals: data.pendingWithdrawals || 0
        });
      }
    } catch (error) {
      console.error('Error fetching system stats:', error);
    }
  };

  const handleBulkTopup = async () => {
    if (!bulkTopupData.userEmails || !bulkTopupData.amount) return;

    setLoading(true);
    try {
      const emails = bulkTopupData.userEmails.split('\n').map(email => email.trim()).filter(email => email);
      
      const response = await fetch('/api/admin-v2/tools/bulk-topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails,
          amount: parseFloat(bulkTopupData.amount),
          reason: bulkTopupData.reason || 'Bulk admin topup'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setBulkTopupData({ userEmails: "", amount: "", reason: "" });
        alert(`Bulk topup completed!\nSuccessful: ${result.stats?.successCount || 0}\nFailed: ${result.stats?.errorCount || 0}\nTotal Amount: $${result.stats?.totalAmount || 0}`);
      } else {
        const error = await response.json();
        alert(`Bulk topup failed: ${error.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error processing bulk topup:', error);
      alert('Error processing bulk topup');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Admin Tools</h2>
          <p className="text-gray-400 mt-1">Advanced administrative functions and utilities</p>
        </div>
        <Button onClick={fetchSystemStats} variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh Stats
        </Button>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-white">{systemStats.totalUsers}</p>
                <p className="text-sm text-gray-400">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-white">{formatCurrency(systemStats.totalBalance)}</p>
                <p className="text-sm text-gray-400">Total Balance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-white">{formatCurrency(systemStats.totalInvestments)}</p>
                <p className="text-sm text-gray-400">Total Investments</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-white">{systemStats.pendingWithdrawals}</p>
                <p className="text-sm text-gray-400">Pending Withdrawals</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Bulk Topup Tool */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Bulk User Topup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="emails" className="text-white">User Emails (one per line)</Label>
              <Textarea
                id="emails"
                value={bulkTopupData.userEmails}
                onChange={(e) => setBulkTopupData({ ...bulkTopupData, userEmails: e.target.value })}
                className="bg-slate-700 border-slate-600 text-white"
                rows={4}
                placeholder="user1@example.com&#10;user2@example.com&#10;user3@example.com"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount" className="text-white">Amount per User ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={bulkTopupData.amount}
                  onChange={(e) => setBulkTopupData({ ...bulkTopupData, amount: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <div>
                <Label htmlFor="reason" className="text-white">Reason</Label>
                <Input
                  id="reason"
                  value={bulkTopupData.reason}
                  onChange={(e) => setBulkTopupData({ ...bulkTopupData, reason: e.target.value })}
                  className="bg-slate-700 border-slate-600 text-white"
                  placeholder="Bulk bonus"
                />
              </div>
            </div>
            <Button 
              onClick={handleBulkTopup} 
              disabled={loading || !bulkTopupData.userEmails || !bulkTopupData.amount}
              className="w-full"
            >
              {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <DollarSign className="h-4 w-4 mr-2" />}
              Process Bulk Topup
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
