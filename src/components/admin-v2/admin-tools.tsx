"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Database, 
  RefreshCw, 
  DollarSign,
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Play,
  Pause,
  BarChart3
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

  const handleProcessDailyReturns = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin-v2/tools/process-daily-returns', {
        method: 'POST'
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Daily returns processed: ${data.processed} investments updated`);
      }
    } catch (error) {
      console.error('Error processing daily returns:', error);
      alert('Error processing daily returns');
    } finally {
      setLoading(false);
    }
  };

  const handleBackupDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin-v2/tools/backup-database', {
        method: 'POST'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `weearn-backup-${new Date().toISOString().split('T')[0]}.sql`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error creating backup:', error);
      alert('Error creating database backup');
    } finally {
      setLoading(false);
    }
  };

  const fetchSystemStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin-v2/tools/system-stats');
      if (response.ok) {
        const data = await response.json();
        setSystemStats(data);
      }
    } catch (error) {
      console.error('Error fetching system stats:', error);
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

        {/* System Operations */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Settings className="h-5 w-5 mr-2" />
              System Operations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button 
                onClick={handleProcessDailyReturns} 
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
                Process Daily Returns
              </Button>
              
              <Button 
                onClick={handleBackupDatabase} 
                disabled={loading}
                variant="outline"
                className="w-full border-slate-600 text-white hover:bg-slate-700"
              >
                {loading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Database className="h-4 w-4 mr-2" />}
                Backup Database
              </Button>
              
              <Button 
                onClick={() => window.open('/api/admin-v2/tools/export-users', '_blank')} 
                variant="outline"
                className="w-full border-slate-600 text-white hover:bg-slate-700"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Export User Data
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Database Health */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Database className="h-5 w-5 mr-2" />
              Database Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-white">Connection Status</span>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Connected
                </Badge>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-white">Last Backup</span>
                <span className="text-gray-400 text-sm">2 hours ago</span>
              </div>
              
              <div className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                <span className="text-white">Storage Used</span>
                <span className="text-gray-400 text-sm">2.4 GB</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <RefreshCw className="h-5 w-5 mr-2" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline"
                className="border-slate-600 text-white hover:bg-slate-700"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              
              <Button 
                variant="outline"
                className="border-slate-600 text-white hover:bg-slate-700"
                onClick={() => window.open('/api/debug/check-balance-tables', '_blank')}
              >
                <Database className="h-4 w-4 mr-2" />
                Debug DB
              </Button>
              
              <Button 
                variant="outline"
                className="border-slate-600 text-white hover:bg-slate-700"
                onClick={() => window.open('/logs', '_blank')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                View Logs
              </Button>
              
              <Button 
                variant="outline"
                className="border-slate-600 text-white hover:bg-slate-700"
                onClick={() => window.open('/api/admin-v2/tools/system-info', '_blank')}
              >
                <Settings className="h-4 w-4 mr-2" />
                System Info
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
