"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Search, 
  Copy, 
  CheckCircle,
  AlertCircle,
  DollarSign,
  Calendar,
  Mail,
  Phone,
  Shield,
  User,
  CreditCard,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from "lucide-react";

interface UserData {
  id: string;
  email: string;
  phone?: string;
  created_at: string;
  last_sign_in_at?: string;
  email_confirmed_at?: string;
  role: string;
  balance: number;
  total_deposits: number;
  total_earnings: number;
  total_withdrawals: number;
  transaction_count: number;
  has_active_subscription: boolean;
  subscription_plan?: string;
  profile_created_at?: string;
}

interface UsersResponse {
  users: UserData[];
  total_count: number;
  admin_count: number;
  user_count: number;
}

export function UserManagement() {
  const [users, setUsers] = React.useState<UserData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [stats, setStats] = React.useState({ total_count: 0, admin_count: 0, user_count: 0 });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data: UsersResponse = await res.json();
        setUsers(data.users);
        setStats({
          total_count: data.total_count,
          admin_count: data.admin_count,
          user_count: data.user_count,
        });
      } else {
        console.error("Failed to fetch users");
      }
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchUsers();
  }, []);

  const copyToClipboard = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Never";
    return new Date(dateString).toLocaleDateString() + " " + new Date(dateString).toLocaleTimeString();
  };

  const formatCurrency = (amount: number) => {
    return `$${amount.toFixed(2)}`;
  };

  return (
    <div className="space-y-6">

      {/* Search and Controls */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>Miner Management</span>
              </CardTitle>
              <CardDescription>
                View all miners, copy UUIDs for balance top-ups, and manage mining accounts
              </CardDescription>
            </div>
            <Button onClick={fetchUsers} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-6">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search miners by email, UUID, or role..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-muted-foreground">Loading miners...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredUsers.map((user) => (
                <Card key={user.id} className="border border-border">
                  <CardContent className="p-6">
                    <div className="grid gap-4 lg:grid-cols-3">
                      {/* User Info */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{user.email}</span>
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                            {user.role}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Copy className="h-4 w-4 text-muted-foreground" />
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {user.id.slice(0, 8)}...{user.id.slice(-8)}
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyToClipboard(user.id, user.id)}
                            className="h-6 w-6 p-0"
                          >
                            {copiedId === user.id ? (
                              <CheckCircle className="h-3 w-3 text-green-600" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>

                        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          <span>Joined: {formatDate(user.created_at).split(' ')[0]}</span>
                        </div>

                        {user.last_sign_in_at && (
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <User className="h-4 w-4" />
                            <span>Last login: {formatDate(user.last_sign_in_at).split(' ')[0]}</span>
                          </div>
                        )}
                      </div>

                      {/* Financial Info */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-medium">Balance: {formatCurrency(user.balance)}</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center space-x-1">
                            <ArrowUpRight className="h-3 w-3 text-green-600" />
                            <span>Deposits: {formatCurrency(user.total_deposits)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <TrendingUp className="h-3 w-3 text-blue-600" />
                            <span>Earnings: {formatCurrency(user.total_earnings)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <ArrowDownRight className="h-3 w-3 text-red-600" />
                            <span>Withdrawals: {formatCurrency(user.total_withdrawals)}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <CreditCard className="h-3 w-3 text-muted-foreground" />
                            <span>Transactions: {user.transaction_count}</span>
                          </div>
                        </div>

                        {user.has_active_subscription && (
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900 dark:text-green-200 dark:border-green-700">
                              Active Plan: {user.subscription_plan || "Unknown"}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="space-y-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(user.id, `copy-${user.id}`)}
                          className="w-full"
                        >
                          {copiedId === `copy-${user.id}` ? (
                            <>
                              <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                              Copied UUID!
                            </>
                          ) : (
                            <>
                              <Copy className="h-4 w-4 mr-2" />
                              Copy UUID for Top-up
                            </>
                          )}
                        </Button>

                        <div className="text-xs text-muted-foreground space-y-1">
                          <div>Email verified: {user.email_confirmed_at ? "✅" : "❌"}</div>
                          {user.phone && <div>Phone: {user.phone}</div>}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {filteredUsers.length === 0 && !loading && (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm ? "No users found matching your search." : "No users found."}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
