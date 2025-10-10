"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  CreditCard, 
  Plus, 
  Edit, 
  Trash2, 
  DollarSign,
  TrendingUp,
  Calendar,
  RefreshCw,
  Eye,
  ToggleLeft,
  ToggleRight
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

interface Plan {
  id: string;
  name: string;
  description?: string;
  min_amount: number;
  max_amount: number;
  daily_roi_percentage: number;
  duration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  stats?: {
    total_investments: number;
    active_investments: number;
    total_invested: number;
  };
}

interface PlanFormData {
  name: string;
  description: string;
  min_amount: string;
  max_amount: string;
  daily_roi_percentage: string;
  duration_days: string;
  is_active: boolean;
}

const initialFormData: PlanFormData = {
  name: "",
  description: "",
  min_amount: "",
  max_amount: "",
  daily_roi_percentage: "",
  duration_days: "",
  is_active: true
};

export function PlanManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<PlanFormData>(initialFormData);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin-v2/plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const planData = {
        ...formData,
        min_amount: parseFloat(formData.min_amount),
        max_amount: parseFloat(formData.max_amount),
        daily_roi_percentage: parseFloat(formData.daily_roi_percentage),
        duration_days: parseInt(formData.duration_days)
      };

      const url = editingPlan ? `/api/admin-v2/plans/${editingPlan.id}` : '/api/admin-v2/plans';
      const method = editingPlan ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData)
      });

      if (response.ok) {
        await fetchPlans();
        handleDialogClose();
      }
    } catch (error) {
      console.error('Error saving plan:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description || "",
      min_amount: plan.min_amount.toString(),
      max_amount: plan.max_amount.toString(),
      daily_roi_percentage: plan.daily_roi_percentage.toString(),
      duration_days: plan.duration_days.toString(),
      is_active: plan.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      const response = await fetch(`/api/admin-v2/plans/${planId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchPlans();
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
    }
  };

  const handleToggleStatus = async (planId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin-v2/plans/${planId}/toggle`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        await fetchPlans();
      }
    } catch (error) {
      console.error('Error toggling plan status:', error);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingPlan(null);
    setFormData(initialFormData);
  };

  const calculateTotalReturn = (minAmount: number, dailyRoi: number, duration: number) => {
    const isEndPayoutPlan = duration >= 30;
    
    if (isEndPayoutPlan) {
      // Monthly plans: dailyRoi is actually total percentage (e.g., 120%)
      return (minAmount * (dailyRoi / 100)).toFixed(2);
    } else {
      // Daily plans: traditional calculation
      return (minAmount * (dailyRoi / 100) * duration + minAmount).toFixed(2);
    }
  };

  const calculateProfit = (minAmount: number, dailyRoi: number, duration: number) => {
    const isEndPayoutPlan = duration >= 30;
    
    if (isEndPayoutPlan) {
      // Monthly plans: profit is total return minus investment
      const totalReturn = minAmount * (dailyRoi / 100);
      return (totalReturn - minAmount).toFixed(2);
    } else {
      // Daily plans: traditional calculation
      return (minAmount * (dailyRoi / 100) * duration).toFixed(2);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Active</Badge>
    ) : (
      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Inactive</Badge>
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
          <h2 className="text-3xl font-bold text-white">Plan Management</h2>
          <p className="text-gray-400 mt-1">Create and manage investment plans</p>
        </div>
        <div className="flex items-center space-x-4">
          <Button onClick={fetchPlans} variant="outline" className="border-slate-600 text-white hover:bg-slate-700">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700">
                <Plus className="h-4 w-4 mr-2" />
                Create Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-slate-800 border-slate-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingPlan ? 'Edit Plan' : 'Create New Plan'}
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  {editingPlan ? 'Update plan details' : 'Create a new investment plan for users'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-white">Plan Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration" className="text-white">Duration (Days)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={formData.duration_days}
                      onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min_amount" className="text-white">Min Amount ($)</Label>
                    <Input
                      id="min_amount"
                      type="number"
                      step="0.01"
                      value={formData.min_amount}
                      onChange={(e) => setFormData({ ...formData, min_amount: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_amount" className="text-white">Max Amount ($)</Label>
                    <Input
                      id="max_amount"
                      type="number"
                      step="0.01"
                      value={formData.max_amount}
                      onChange={(e) => setFormData({ ...formData, max_amount: e.target.value })}
                      className="bg-slate-700 border-slate-600 text-white"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="roi" className="text-white">
                    ROI (%) - {parseInt(formData.duration_days) >= 30 ? 'Total Return' : 'Daily Return'}
                  </Label>
                  <Input
                    id="roi"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={parseInt(formData.duration_days) >= 30 ? "200" : "100"}
                    value={formData.daily_roi_percentage}
                    onChange={(e) => setFormData({ ...formData, daily_roi_percentage: e.target.value })}
                    className="bg-slate-700 border-slate-600 text-white"
                    required
                    placeholder={parseInt(formData.duration_days) >= 30 ? 'e.g., 120 for 120% total' : 'e.g., 2 for 2% daily'}
                  />
                  {parseInt(formData.duration_days) >= 30 && (
                    <p className="text-xs text-amber-400 mt-1">
                      💡 For monthly plans: Enter total return percentage (e.g., 120 for 120% total return)
                    </p>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="active" className="text-white">Active Plan</Label>
                </div>

                {formData.min_amount && formData.daily_roi_percentage && formData.duration_days && (
                  <div className="p-4 bg-slate-700/50 rounded-lg border border-slate-600">
                    <h4 className="font-semibold mb-2 text-white">Plan Preview</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Total Return: </span>
                        <span className="text-green-400 font-semibold">
                          ${calculateTotalReturn(
                            parseFloat(formData.min_amount) || 0,
                            parseFloat(formData.daily_roi_percentage) || 0,
                            parseInt(formData.duration_days) || 0
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-400">Total Profit: </span>
                        <span className="text-blue-400 font-semibold">
                          ${calculateProfit(
                            parseFloat(formData.min_amount) || 0,
                            parseFloat(formData.daily_roi_percentage) || 0,
                            parseInt(formData.duration_days) || 0
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={handleDialogClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Saving...' : (editingPlan ? 'Update Plan' : 'Create Plan')}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold text-white">{plans.length}</p>
                <p className="text-sm text-gray-400">Total Plans</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <ToggleRight className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {plans.filter(p => p.is_active).length}
                </p>
                <p className="text-sm text-gray-400">Active Plans</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(plans.reduce((sum, p) => sum + (p.stats?.total_invested || 0), 0))}
                </p>
                <p className="text-sm text-gray-400">Total Invested</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 border-slate-700">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold text-white">
                  {plans.reduce((sum, p) => sum + (p.stats?.active_investments || 0), 0)}
                </p>
                <p className="text-sm text-gray-400">Active Investments</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Plans Table */}
      <Card className="bg-slate-800/50 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white">Investment Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700">
                  <TableHead className="text-gray-300">Plan</TableHead>
                  <TableHead className="text-gray-300">Amount Range</TableHead>
                  <TableHead className="text-gray-300">Daily ROI</TableHead>
                  <TableHead className="text-gray-300">Duration</TableHead>
                  <TableHead className="text-gray-300">Status</TableHead>
                  <TableHead className="text-gray-300">Investments</TableHead>
                  <TableHead className="text-gray-300">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id} className="border-slate-700">
                    <TableCell>
                      <div>
                        <p className="text-white font-medium">{plan.name}</p>
                        {plan.description && (
                          <p className="text-sm text-gray-400 truncate max-w-xs">
                            {plan.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-white">
                        {formatCurrency(plan.min_amount)} - {formatCurrency(plan.max_amount)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-green-400 font-semibold">
                        {plan.daily_roi_percentage}%
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-white">
                        {plan.duration_days} days
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(plan.is_active)}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-white">{plan.stats?.active_investments || 0} active</p>
                        <p className="text-sm text-gray-400">
                          {formatCurrency(plan.stats?.total_invested || 0)} total
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEdit(plan)}
                          className="border-slate-600 text-white hover:bg-slate-700"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleStatus(plan.id, plan.is_active)}
                          className="border-slate-600 text-white hover:bg-slate-700"
                        >
                          {plan.is_active ? <ToggleLeft className="h-4 w-4" /> : <ToggleRight className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(plan.id)}
                          className="border-red-600 text-red-400 hover:bg-red-600 hover:text-white"
                        >
                          <Trash2 className="h-4 w-4" />
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
