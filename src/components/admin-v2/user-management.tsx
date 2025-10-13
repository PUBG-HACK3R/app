"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Search, 
  UserCheck, 
  UserX, 
  DollarSign,
  TrendingUp,
  Calendar,
  Mail,
  Shield,
  Plus,
  RefreshCw,
  Eye,
  Edit,
  Ban
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface User {
  id: string;
  user_id: string;
  email: string;
  full_name?: string;
  role: 'user' | 'admin';
  referral_code: string;
  referred_by?: string;
  created_at: string;
  balance: {
    available_balance: number;
    locked_balance: number;
    total_deposited: number;
    total_withdrawn: number;
    total_earned: number;
  };
  investments: {
    active: number;
    completed: number;
    total_invested: number;
  };
  last_activity?: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [topupAmount, setTopupAmount] = useState("");
  const [topupReason, setTopupReason] = useState("");

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin-v2/users');
      if (response.ok) {
        const data = await response.json();
        if (data.error) {
          console.error('Users API failed:', data.error);
        } else {
          setUsers(data.users || []);
        }
      } else {
        console.error('Users API failed:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTopup = async () => {
    if (!selectedUser || !topupAmount) return;
    
    try {
      const response = await fetch('/api/admin-v2/users/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.user_id,
          amount: parseFloat(topupAmount),
          reason: topupReason || 'Admin topup'
        })
      });

      if (response.ok) {
        await fetchUsers(); // Refresh users
        setTopupAmount("");
        setTopupReason("");
        setSelectedUser(null);
      }
    } catch (error) {
      console.error('Error processing topup:', error);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      const response = await fetch('/api/admin-v2/users/role', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole })
      });

      if (response.ok) {
        await fetchUsers(); // Refresh users
      }
    } catch (error) {
      console.error('Error changing role:', error);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.referral_code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getRoleBadge = (role: string) => {
    return role === 'admin' ? (
      <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
        <Shield className="h-3 w-3 mr-1" />
        Admin
      </Badge>
    ) : (
      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
        <UserCheck className="h-3 w-3 mr-1" />
        User
      </Badge>
    );
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">User Management</h2>
          <p className="text-gray-400 mt-1">Manage users, balances, and permissions</p>
        </div>
        <Button onClick={fetchUsers} variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-white">{users.length}</p>
                <p className="text-sm text-gray-400">Total Users</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Shield className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {users.filter(u => u.role === 'admin').length}
                </p>
                <p className="text-sm text-gray-400">Admins</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(users.reduce((sum, u) => sum + (u.balance?.total_deposited || 0), 0))}
                </p>
                <p className="text-sm text-gray-400">Total Deposits</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {users.reduce((sum, u) => sum + (u.investments?.active || 0), 0)}
                </p>
                <p className="text-sm text-gray-400">Active Investments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by email, name, or referral code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-700 border-slate-600 text-white placeholder-gray-400"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-gray-300">User</TableHead>
                  <TableHead className="text-gray-300">Role</TableHead>
                  <TableHead className="text-gray-300">Balance</TableHead>
                  <TableHead className="text-gray-300">Investments</TableHead>
                  <TableHead className="text-gray-300">Referral</TableHead>
                  <TableHead className="text-gray-300">Joined</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-slate-700">
                    <TableCell>
                      <div>
                        <p className="text-white font-medium">{user.email}</p>
                        {user.full_name && (
                          <p className="text-sm text-gray-400">{user.full_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getRoleBadge(user.role)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-white font-medium">
                          {formatCurrency(user.balance?.available_balance || 0)}
                        </p>
                        <p className="text-sm text-gray-400">
                          Total: {formatCurrency(user.balance?.total_deposited || 0)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-white">{user.investments?.active || 0} active</p>
                        <p className="text-sm text-gray-400">
                          {formatCurrency(user.investments?.total_invested || 0)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-slate-700 px-2 py-1 rounded text-blue-400">
                        {user.referral_code}
                      </code>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-400">
                        {new Date(user.created_at).toLocaleDateString()}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-slate-600 text-white hover:bg-slate-700"
                              onClick={() => setSelectedUser(user)}
                            >
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="bg-slate-800 border-slate-700">
                            <DialogHeader>
                              <DialogTitle className="text-white">Topup User Balance</DialogTitle>
                              <DialogDescription className="text-gray-400">
                                Add funds to {selectedUser?.email}'s account
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm text-gray-300">Amount (USD)</label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={topupAmount}
                                  onChange={(e) => setTopupAmount(e.target.value)}
                                  className="bg-slate-700 border-slate-600 text-white"
                                  placeholder="0.00"
                                />
                              </div>
                              <div>
                                <label className="text-sm text-gray-300">Reason (Optional)</label>
                                <Input
                                  value={topupReason}
                                  onChange={(e) => setTopupReason(e.target.value)}
                                  className="bg-slate-700 border-slate-600 text-white"
                                  placeholder="Admin adjustment"
                                />
                              </div>
                              <Button onClick={handleTopup} className="w-full">
                                Process Topup
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Button
                          size="sm"
                          variant="outline"
                          className="border-slate-600 text-white hover:bg-slate-700"
                          onClick={() => handleRoleChange(
                            user.user_id, 
                            user.role === 'admin' ? 'user' : 'admin'
                          )}
                        >
                          {user.role === 'admin' ? <UserX className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
                        </Button>
                      </div>
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
