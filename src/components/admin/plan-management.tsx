"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, DollarSign, TrendingUp, Calendar, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  price_usdt: number;
  roi_daily_percent: number;
  duration_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PlanFormData {
  name: string;
  price_usdt: string;
  roi_daily_percent: string;
  duration_days: string;
  is_active: boolean;
}

const initialFormData: PlanFormData = {
  name: "",
  price_usdt: "",
  roi_daily_percent: "",
  duration_days: "",
  is_active: true,
};

export function PlanManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState<PlanFormData>(initialFormData);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchPlans = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/plans");
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch plans");
      }

      setPlans(data.plans || []);
    } catch (error) {
      console.error("Error fetching plans:", error);
      toast.error("Failed to fetch plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : "/api/admin/plans";
      const method = editingPlan ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save plan");
      }

      toast.success(editingPlan ? "Plan updated successfully" : "Plan created successfully");
      setIsDialogOpen(false);
      setFormData(initialFormData);
      setEditingPlan(null);
      fetchPlans();
    } catch (error) {
      console.error("Error saving plan:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save plan");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      price_usdt: plan.price_usdt.toString(),
      roi_daily_percent: plan.roi_daily_percent.toString(),
      duration_days: plan.duration_days.toString(),
      is_active: plan.is_active,
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (planId: string) => {
    try {
      const response = await fetch(`/api/admin/plans/${planId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete plan");
      }

      toast.success("Plan deleted successfully");
      fetchPlans();
    } catch (error) {
      console.error("Error deleting plan:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete plan");
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setFormData(initialFormData);
    setEditingPlan(null);
  };

  const calculateTotalReturn = (price: number, roi: number, duration: number) => {
    return (price * (roi / 100) * duration + price).toFixed(2);
  };

  const calculateProfit = (price: number, roi: number, duration: number) => {
    return (price * (roi / 100) * duration).toFixed(2);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Plan Management</CardTitle>
          <CardDescription>Loading plans...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Plan Management</CardTitle>
            <CardDescription>Create and manage investment plans</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button onClick={fetchPlans} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingPlan(null)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Plan
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingPlan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
                  <DialogDescription>
                    {editingPlan ? "Update the plan details below." : "Fill in the details to create a new investment plan."}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                  <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Plan Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="e.g., Starter Portfolio"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="price">Price (USDT)</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={formData.price_usdt}
                          onChange={(e) => setFormData({ ...formData, price_usdt: e.target.value })}
                          placeholder="50.00"
                          required
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="roi">Daily ROI (%)</Label>
                        <Input
                          id="roi"
                          type="number"
                          step="0.01"
                          min="0.01"
                          max="100"
                          value={formData.roi_daily_percent}
                          onChange={(e) => setFormData({ ...formData, roi_daily_percent: e.target.value })}
                          placeholder="1.0"
                          required
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="duration">Duration (Days)</Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        value={formData.duration_days}
                        onChange={(e) => setFormData({ ...formData, duration_days: e.target.value })}
                        placeholder="30"
                        required
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="active"
                        checked={formData.is_active}
                        onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                      />
                      <Label htmlFor="active">Active Plan</Label>
                    </div>
                    {formData.price_usdt && formData.roi_daily_percent && formData.duration_days && (
                      <div className="p-4 bg-muted rounded-lg">
                        <h4 className="font-semibold mb-2">Plan Preview</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>Total Return: ${calculateTotalReturn(
                            parseFloat(formData.price_usdt) || 0,
                            parseFloat(formData.roi_daily_percent) || 0,
                            parseInt(formData.duration_days) || 0
                          )}</div>
                          <div>Total Profit: ${calculateProfit(
                            parseFloat(formData.price_usdt) || 0,
                            parseFloat(formData.roi_daily_percent) || 0,
                            parseInt(formData.duration_days) || 0
                          )}</div>
                        </div>
                      </div>
                    )}
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting}>
                      {submitting ? "Saving..." : editingPlan ? "Update Plan" : "Create Plan"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {plans.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No plans found. Create your first plan to get started.</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <Card key={plan.id} className="relative">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <Badge variant={plan.is_active ? "default" : "secondary"}>
                      {plan.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1 text-green-500" />
                      <span className="font-semibold">${plan.price_usdt}</span>
                    </div>
                    <div className="flex items-center">
                      <TrendingUp className="h-4 w-4 mr-1 text-blue-500" />
                      <span className="font-semibold">{plan.roi_daily_percent}%/day</span>
                    </div>
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1 text-purple-500" />
                      <span className="font-semibold">{plan.duration_days} days</span>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Total Return</div>
                      <div className="font-semibold text-green-600">
                        ${calculateTotalReturn(plan.price_usdt, plan.roi_daily_percent, plan.duration_days)}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(plan)}
                      className="flex-1"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Edit
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Plan</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{plan.name}"? This action cannot be undone.
                            Plans with active subscriptions cannot be deleted.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(plan.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
