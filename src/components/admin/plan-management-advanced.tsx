"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Bitcoin, 
  Activity,
  ToggleLeft,
  ToggleRight,
  Save,
  X
} from "lucide-react";
import { toast } from "sonner";

interface Plan {
  id: string;
  name: string;
  description: string;
  min_amount: number;
  daily_roi_percentage: number;
  duration_days: number;
  mining_type: string;
  hash_rate: string;
  power_consumption: string;
  risk_level: string;
  is_active: boolean;
  features: string[];
}

interface PlanCategory {
  id: string;
  name: string;
  description: string;
}

export function AdvancedPlanManagement() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [categories, setCategories] = useState<PlanCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Form state for new/edit plan
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    min_amount: "",
    daily_roi_percentage: "",
    duration_days: "",
    mining_type: "ASIC Mining",
    hash_rate: "0 TH/s",
    power_consumption: "0W",
    risk_level: "Medium",
    category_id: "",
    features: "",
    is_active: true
  });

  useEffect(() => {
    fetchPlans();
    fetchCategories();
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch('/api/admin/plans');
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
      toast.error('Failed to fetch plans');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/admin/plan-categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const planData = {
        ...formData,
        min_amount: parseFloat(formData.min_amount),
        daily_roi_percentage: parseFloat(formData.daily_roi_percentage),
        duration_days: parseInt(formData.duration_days),
        features: formData.features.split(',').map(f => f.trim()).filter(f => f)
      };

      console.log('Submitting plan data:', planData);

      const url = editingPlan ? `/api/admin/plans/${editingPlan.id}` : '/api/admin/plans';
      const method = editingPlan ? 'PUT' : 'POST';

      console.log('API URL:', url, 'Method:', method);

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(planData)
      });

      if (response.ok) {
        toast.success(editingPlan ? 'Plan updated successfully' : 'Plan created successfully');
        setIsDialogOpen(false);
        resetForm();
        fetchPlans();
      } else {
        const errorData = await response.json();
        console.error('API Error:', errorData);
        throw new Error(errorData.error || 'Failed to save plan');
      }
    } catch (error) {
      console.error('Error saving plan:', error);
      toast.error('Failed to save plan');
    }
  };

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      min_amount: plan.min_amount.toString(),
      daily_roi_percentage: plan.daily_roi_percentage.toString(),
      duration_days: plan.duration_days.toString(),
      mining_type: plan.mining_type,
      hash_rate: plan.hash_rate,
      power_consumption: plan.power_consumption,
      risk_level: plan.risk_level,
      category_id: "",
      features: plan.features ? plan.features.join(', ') : '',
      is_active: plan.is_active
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (planId: string) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;

    try {
      const response = await fetch(`/api/admin/plans/${planId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Plan deleted successfully');
        fetchPlans();
      } else {
        throw new Error('Failed to delete plan');
      }
    } catch (error) {
      console.error('Error deleting plan:', error);
      toast.error('Failed to delete plan');
    }
  };

  const togglePlanStatus = async (planId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/plans/${planId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentStatus })
      });

      if (response.ok) {
        toast.success('Plan status updated');
        fetchPlans();
      } else {
        throw new Error('Failed to update plan status');
      }
    } catch (error) {
      console.error('Error updating plan status:', error);
      toast.error('Failed to update plan status');
    }
  };

  const resetForm = () => {
    setEditingPlan(null);
    setFormData({
      name: "",
      description: "",
      min_amount: "",
      daily_roi_percentage: "",
      duration_days: "",
      mining_type: "ASIC Mining",
      hash_rate: "0 TH/s",
      power_consumption: "0W",
      risk_level: "Medium",
      category_id: "",
      features: "",
      is_active: true
    });
  };

  if (loading) {
    return (
      <Card className="bg-gray-800/50 border-gray-700/50">
        <CardContent className="p-6">
          <div className="text-center text-gray-400">Loading plans...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-800/50 border-gray-700/50">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Bitcoin className="h-5 w-5 text-orange-400" />
              Mining Plans Management
            </CardTitle>
            <CardDescription className="text-gray-400">
              Create, edit, and manage Bitcoin mining investment plans
            </CardDescription>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={resetForm}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-gray-800 border-gray-700 max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">
                  {editingPlan ? 'Edit Mining Plan' : 'Create New Mining Plan'}
                </DialogTitle>
                <DialogDescription className="text-gray-400">
                  Configure the mining plan details and specifications
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name" className="text-white">Plan Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="mining_type" className="text-white">Mining Type</Label>
                    <Select value={formData.mining_type} onValueChange={(value: string) => setFormData({...formData, mining_type: value})}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="ASIC Mining">ASIC Mining</SelectItem>
                        <SelectItem value="GPU Mining">GPU Mining</SelectItem>
                        <SelectItem value="Cloud Mining">Cloud Mining</SelectItem>
                        <SelectItem value="Shared ASIC">Shared ASIC</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="description" className="text-white">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="min_amount" className="text-white">Minimum Amount ($)</Label>
                  <Input
                    id="min_amount"
                    type="number"
                    step="0.01"
                    value={formData.min_amount}
                    onChange={(e) => setFormData({...formData, min_amount: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="daily_roi_percentage" className="text-white">Daily ROI (%)</Label>
                    <Input
                      id="daily_roi_percentage"
                      type="number"
                      step="0.01"
                      value={formData.daily_roi_percentage}
                      onChange={(e) => setFormData({...formData, daily_roi_percentage: e.target.value}))
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="duration_days" className="text-white">Duration (Days)</Label>
                    <Input
                      id="duration_days"
                      type="number"
                      value={formData.duration_days}
                      onChange={(e) => setFormData({...formData, duration_days: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="hash_rate" className="text-white">Hash Rate</Label>
                    <Input
                      id="hash_rate"
                      value={formData.hash_rate}
                      onChange={(e) => setFormData({...formData, hash_rate: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="95 TH/s"
                    />
                  </div>
                  <div>
                    <Label htmlFor="power_consumption" className="text-white">Power Usage</Label>
                    <Input
                      id="power_consumption"
                      value={formData.power_consumption}
                      onChange={(e) => setFormData({...formData, power_consumption: e.target.value})}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="3250W"
                    />
                  </div>
                  <div>
                    <Label htmlFor="risk_level" className="text-white">Risk Level</Label>
                    <Select value={formData.risk_level} onValueChange={(value: string) => setFormData({...formData, risk_level: value})}>
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600">
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="features" className="text-white">Features (comma separated)</Label>
                  <Input
                    id="features"
                    value={formData.features}
                    onChange={(e) => setFormData({...formData, features: e.target.value})}
                    className="bg-gray-700 border-gray-600 text-white"
                    placeholder="ASIC S19 Miners, 24/7 Monitoring, Daily Payouts"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="is_active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                  />
                  <Label htmlFor="is_active" className="text-white">Active Plan</Label>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-orange-600 hover:bg-orange-700 text-white"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingPlan ? 'Update Plan' : 'Create Plan'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>

      <CardContent>
        <div className="rounded-lg border border-gray-700">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-700">
                <TableHead className="text-gray-300">Plan Name</TableHead>
                <TableHead className="text-gray-300">Min Amount</TableHead>
                <TableHead className="text-gray-300">Daily ROI</TableHead>
                <TableHead className="text-gray-300">Duration</TableHead>
                <TableHead className="text-gray-300">Mining Type</TableHead>
                <TableHead className="text-gray-300">Status</TableHead>
                <TableHead className="text-gray-300">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {plans.map((plan) => (
                <TableRow key={plan.id} className="border-gray-700">
                  <TableCell className="text-white font-medium">
                    <div>
                      <div>{plan.name}</div>
                      <div className="text-sm text-gray-400">{plan.hash_rate}</div>
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-300">
                    ${plan.min_amount}
                  </TableCell>
                  <TableCell className="text-green-400 font-semibold">
                    {plan.daily_roi_percentage}%
                  </TableCell>
                  <TableCell className="text-gray-300">
                    {plan.duration_days} days
                  </TableCell>
                  <TableCell className="text-gray-300">
                    <Badge variant="outline" className="border-orange-500 text-orange-400">
                      {plan.mining_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePlanStatus(plan.id, plan.is_active)}
                      className="p-0 h-auto"
                    >
                      {plan.is_active ? (
                        <ToggleRight className="h-5 w-5 text-green-400" />
                      ) : (
                        <ToggleLeft className="h-5 w-5 text-gray-500" />
                      )}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(plan)}
                        className="text-blue-400 hover:text-blue-300 hover:bg-blue-900/20"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(plan.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
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

        {plans.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No mining plans found. Create your first plan to get started.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
