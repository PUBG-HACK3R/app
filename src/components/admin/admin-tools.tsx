"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  DollarSign, 
  AlertCircle,
  CheckCircle,
  CreditCard
} from "lucide-react";

export function AdminTools() {
  const [topupLoading, setTopupLoading] = React.useState(false);
  const [message, setMessage] = React.useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Top-up Form
  const [topupUserId, setTopupUserId] = React.useState("");
  const [topupAmount, setTopupAmount] = React.useState("");
  const [topupReason, setTopupReason] = React.useState("");

  const handleTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setTopupLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: topupUserId,
          amount: parseFloat(topupAmount),
          reason: topupReason,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage({ type: 'success', text: data.message });
        setTopupUserId("");
        setTopupAmount("");
        setTopupReason("");
      } else {
        const errorMessage = data.details 
          ? `${data.error}: ${data.details} (Code: ${data.code || 'N/A'})`
          : data.error || "Failed to top up user";
        setMessage({ type: 'error', text: errorMessage });
        console.error("Top-up error details:", data);
      }
    } catch (err) {
      setMessage({ type: 'error', text: "Network error occurred" });
    } finally {
      setTopupLoading(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-1">
      {/* User Top-up - Only Component */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-green-600" />
            <CardTitle>Miner Balance Top-up</CardTitle>
          </div>
          <CardDescription>
            Add USDT funds to a miner's wallet balance for mining operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleTopup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topupUserId">Miner User ID</Label>
              <Input
                id="topupUserId"
                type="text"
                placeholder="Enter miner UUID from user management"
                value={topupUserId}
                onChange={(e) => setTopupUserId(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Copy the UUID from the User Management section above
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topupAmount">Amount (USDT)</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="topupAmount"
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-10"
                  value={topupAmount}
                  onChange={(e) => setTopupAmount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topupReason">Reason (Optional)</Label>
              <Textarea
                id="topupReason"
                placeholder="e.g., Mining bonus, Compensation, Referral reward, etc."
                value={topupReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTopupReason(e.target.value)}
                rows={2}
              />
            </div>

            <Button type="submit" disabled={topupLoading} className="w-full bg-green-600 hover:bg-green-700">
              {topupLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing Top-up...
                </>
              ) : (
                <>
                  <DollarSign className="mr-2 h-4 w-4" />
                  Top-up Miner Balance
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Status Message */}
      {message && (
        <Card className={`border-0 shadow-lg ${
          message.type === 'success' 
            ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800' 
            : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800'
        }`}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              <span className={`font-medium ${
                message.type === 'success' 
                  ? 'text-green-900 dark:text-green-100' 
                  : 'text-red-900 dark:text-red-100'
              }`}>
                {message.text}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card className="border-0 shadow-lg bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">How to Top-up Miners</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm text-blue-700 dark:text-blue-300">
            <p className="font-medium mb-2">🔹 Step-by-step process:</p>
            <ol className="list-decimal list-inside space-y-1 ml-2">
              <li>Find the miner in the User Management section above</li>
              <li>Click "Copy UUID for Top-up" to copy their user ID</li>
              <li>Paste the UUID in the "Miner User ID" field</li>
              <li>Enter the USDT amount to add to their balance</li>
              <li>Optionally add a reason for the top-up</li>
              <li>Click "Top-up Miner Balance" to process</li>
            </ol>
            <p className="mt-3 text-xs bg-blue-100 dark:bg-blue-900 p-2 rounded">
              💡 The funds will be added as a deposit transaction and immediately available for mining investments.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
