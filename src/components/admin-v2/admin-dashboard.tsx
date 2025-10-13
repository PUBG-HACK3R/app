"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DollarSign, 
  Users, 
  TrendingUp, 
  AlertTriangle,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Eye,
  CheckCircle,
  Clock,
  XCircle
} from "lucide-react";

interface DashboardStats {
  totalUsers: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalEarnings: number;
  pendingWithdrawals: number;
  activePlans: number;
  totalInvestments: number;
  platformBalance: number;
}

interface RecentActivity {
  id: string;
  type: 'deposit' | 'withdrawal' | 'investment' | 'earning';
  amount: number;
  user_email: string;
  created_at: string;
  status: string;
}

export function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalEarnings: 0,
    pendingWithdrawals: 0,
    activePlans: 0,
    totalInvestments: 0,
    platformBalance: 0
  });
  
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch dashboard stats
      const statsResponse = await fetch('/api/admin-v2/dashboard/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        // Map the API response to the expected format
        setStats({
          totalUsers: statsData.totalUsers || 0,
          totalDeposits: statsData.totalDeposits || 0,
          totalWithdrawals: statsData.totalWithdrawals || 0,
          totalEarnings: statsData.totalEarnings || 0,
          pendingWithdrawals: statsData.pendingWithdrawals || 0,
          activePlans: statsData.activePlans || 0,
          totalInvestments: statsData.totalInvestments || 0,
          platformBalance: statsData.platformBalance || 0
        });
      } else {
        console.error('Stats API failed:', statsResponse.status, await statsResponse.text());
      }

      // Fetch recent activity (create a simple activity endpoint or use existing data)
      // For now, we'll skip this since the main issue is the stats
      setRecentActivity([]);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
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

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'deposit': return <ArrowUpRight className="h-4 w-4 text-green-500" />;
      case 'withdrawal': return <ArrowDownRight className="h-4 w-4 text-red-500" />;
      case 'investment': return <CreditCard className="h-4 w-4 text-blue-500" />;
      case 'earning': return <TrendingUp className="h-4 w-4 text-purple-500" />;
      default: return <Eye className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
      case 'active':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Active</Badge>;
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">{status}</Badge>;
    }
  };

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white">Dashboard Overview</h2>
          <p className="text-gray-400 mt-1">Real-time platform metrics and activity</p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" className="border-slate-600 text-white hover:bg-slate-700 w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Users</CardTitle>
            <Users className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-gray-400 mt-1">Registered users</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Deposits</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalDeposits)}</div>
            <p className="text-xs text-gray-400 mt-1">All-time deposits</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Total Investments</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{formatCurrency(stats.totalInvestments)}</div>
            <p className="text-xs text-gray-400 mt-1">Active investments</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-300">Pending Withdrawals</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.pendingWithdrawals}</div>
            <p className="text-xs text-gray-400 mt-1">Requires attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-500" />
              Total Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">{formatCurrency(stats.totalEarnings)}</div>
            <p className="text-sm text-gray-400 mt-2">Generated by platform</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center">
              <ArrowDownRight className="h-5 w-5 mr-2 text-red-500" />
              Total Withdrawals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">{formatCurrency(stats.totalWithdrawals)}</div>
            <p className="text-sm text-gray-400 mt-2">Paid to users</p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <CardTitle className="text-lg text-white flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-blue-500" />
              Platform Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">{formatCurrency(stats.platformBalance)}</div>
            <p className="text-sm text-gray-400 mt-2">Available liquidity</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-xl text-white">Recent Activity</CardTitle>
          <p className="text-gray-400">Latest platform transactions and events</p>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.slice(0, 10).map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex items-center space-x-3">
                    {getActivityIcon(activity.type)}
                    <div>
                      <p className="text-white font-medium capitalize">{activity.type}</p>
                      <p className="text-sm text-gray-400">{activity.user_email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">{formatCurrency(activity.amount)}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      {getStatusBadge(activity.status)}
                      <span className="text-xs text-gray-400">
                        {new Date(activity.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
