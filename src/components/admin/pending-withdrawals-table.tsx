"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { CheckCircle, X, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

// Persistent Timer Component that survives refresh
function CountdownTimer({ createdAt }: { createdAt: string }) {
  const [timeRemaining, setTimeRemaining] = React.useState(900); // Start with 15 minutes

  React.useEffect(() => {
    // Try to get stored time for this withdrawal, or start fresh
    const storageKey = `withdrawal_timer_${createdAt}`;
    const storedTime = localStorage.getItem(storageKey);
    
    if (storedTime) {
      const remaining = parseInt(storedTime);
      if (remaining > 0) {
        setTimeRemaining(remaining);
      }
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        const newTime = prev <= 0 ? 0 : prev - 1;
        // Store the current time
        localStorage.setItem(storageKey, newTime.toString());
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [createdAt]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return "EXPIRED";
    
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const isExpired = timeRemaining === 0;

  return (
    <div className={`flex items-center gap-1 text-xs ${
      isExpired ? 'text-red-600' : 'text-orange-600'
    }`}>
      <Clock className="h-3 w-3" />
      <span>{formatTime(timeRemaining)}</span>
    </div>
  );
}

export type PendingWithdrawal = {
  id: string;
  user_id: string;
  amount_usdt: number;
  fee_usdt?: number;
  net_amount_usdt?: number;
  address: string;
  status: string;
  created_at: string;
  expires_at?: string;
  processing_started_at?: string;
};

export function PendingWithdrawalsTable({ initial }: { initial: PendingWithdrawal[] }) {
  const [items, setItems] = React.useState<PendingWithdrawal[]>(initial);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [rejectingId, setRejectingId] = React.useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = React.useState("");


  async function approve(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/withdrawals/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve");
      setItems((prev) => prev.filter((w) => w.id !== id));
      toast.success("Withdrawal approved successfully");
    } catch (e: any) {
      setError(e.message || "Unexpected error");
      toast.error(e.message || "Failed to approve withdrawal");
    } finally {
      setBusy(null);
    }
  }

  function openRejectDialog(id: string) {
    setRejectingId(id);
    setRejectionReason("");
    setRejectDialogOpen(true);
  }

  async function handleReject() {
    if (!rejectingId || !rejectionReason.trim()) return;

    setBusy(rejectingId);
    setError(null);
    try {
      const res = await fetch("/api/admin/withdrawals/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: rejectingId, reason: rejectionReason.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject");
      setItems((prev) => prev.filter((w) => w.id !== rejectingId));
      setRejectDialogOpen(false);
      setRejectingId(null);
      setRejectionReason("");
      toast.success("Withdrawal rejected successfully");
    } catch (e: any) {
      setError(e.message || "Unexpected error");
      toast.error(e.message || "Failed to reject withdrawal");
    } finally {
      setBusy(null);
    }
  }

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date().getTime();
    const expires = new Date(expiresAt).getTime();
    return Math.max(0, expires - now);
  };

  const formatTimeRemaining = (ms: number) => {
    const minutes = Math.floor(ms / (1000 * 60));
    const seconds = Math.floor((ms % (1000 * 60)) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isUrgent = (expiresAt: string) => {
    const timeRemaining = getTimeRemaining(expiresAt);
    return timeRemaining <= 5 * 60 * 1000; // 5 minutes or less
  };

  const isExpired = (expiresAt: string) => {
    return getTimeRemaining(expiresAt) === 0;
  };

  // Sort items to show urgent ones first
  const sortedItems = [...items].sort((a, b) => {
    if (a.expires_at && b.expires_at) {
      const aUrgent = isUrgent(a.expires_at);
      const bUrgent = isUrgent(b.expires_at);
      if (aUrgent && !bUrgent) return -1;
      if (!aUrgent && bUrgent) return 1;
      return getTimeRemaining(a.expires_at) - getTimeRemaining(b.expires_at);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <p className="text-sm text-red-800 dark:text-red-200 font-medium">{error}</p>
          </div>
        </div>
      )}
      
      {items.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-900/50 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-700">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 dark:text-gray-100">All Clear!</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">No pending mining payouts to process.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sortedItems.map((w) => {
            const timeRemaining = w.expires_at ? getTimeRemaining(w.expires_at) : null;
            const urgent = w.expires_at ? isUrgent(w.expires_at) : false;
            const expired = w.expires_at ? isExpired(w.expires_at) : false;
            
            return (
              <div key={w.id} className={`p-6 rounded-lg border-2 transition-all ${
                urgent ? 'border-red-500 bg-red-50 dark:bg-red-950/20 shadow-lg' : 
                expired ? 'border-gray-300 bg-gray-100 dark:bg-gray-800 opacity-75' : 
                'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-md'
              }`}>
                <div className="grid gap-4 lg:grid-cols-4">
                  {/* Status & Priority */}
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {expired ? (
                        <div className="flex items-center space-x-2 text-red-600">
                          <X className="h-4 w-4" />
                          <span className="text-sm font-bold">EXPIRED</span>
                        </div>
                      ) : urgent ? (
                        <div className="flex items-center space-x-2 text-red-600 animate-pulse">
                          <AlertTriangle className="h-4 w-4" />
                          <span className="text-sm font-bold">URGENT</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2 text-yellow-600">
                          <Clock className="h-4 w-4" />
                          <span className="text-sm font-medium">PENDING</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <p>Miner ID:</p>
                      <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs">
                        {w.user_id.slice(0, 8)}...{w.user_id.slice(-8)}
                      </code>
                    </div>
                    
                    <div className="text-xs">
                      <p className="text-gray-500 dark:text-gray-400 mb-1">Time Remaining:</p>
                      <CountdownTimer createdAt={w.created_at} />
                    </div>
                  </div>

                  {/* Amount Details */}
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Withdrawal Amount</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        ${Number(w.amount_usdt).toFixed(2)} USDT
                      </p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Fee</p>
                        <p className="text-red-600 font-medium">
                          {w.fee_usdt ? `-$${Number(w.fee_usdt).toFixed(2)}` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400">Net Payout</p>
                        <p className="text-green-600 font-bold">
                          {w.net_amount_usdt ? `$${Number(w.net_amount_usdt).toFixed(2)}` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Address Info */}
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Payout Address</p>
                      <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded text-xs font-mono break-all">
                        {w.address}
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      <p>Created: {new Date(w.created_at).toLocaleDateString()}</p>
                      <p>Time: {new Date(w.created_at).toLocaleTimeString()}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col space-y-2">
                    {!expired && (
                      <Button 
                        onClick={() => approve(w.id)} 
                        disabled={busy === w.id}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        size="sm"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        {busy === w.id ? "Approving..." : "Approve Payout"}
                      </Button>
                    )}
                    
                    <Button 
                      variant="destructive"
                      onClick={() => openRejectDialog(w.id)} 
                      disabled={busy === w.id}
                      size="sm"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </Button>
                    
                    {urgent && !expired && (
                      <div className="text-xs text-red-600 font-medium text-center mt-2">
                        ⚠️ Expires in {formatTimeRemaining(timeRemaining!)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* Summary Stats */}
      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{items.length}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Pending</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">
              {sortedItems.filter(w => w.expires_at && isUrgent(w.expires_at)).length}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Urgent (&lt; 5 min)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              ${sortedItems.reduce((sum, w) => sum + Number(w.net_amount_usdt || w.amount_usdt), 0).toFixed(2)}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Total Payout Value</p>
          </div>
        </div>
      )}
      
      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white">Reject Mining Payout</DialogTitle>
            <DialogDescription className="text-gray-400">
              Please provide a reason for rejecting this mining payout request. The miner will see this reason.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason" className="text-white">Rejection Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for rejection (e.g., Invalid address, Insufficient verification, etc.)..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="bg-gray-700 border-gray-600 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="border-gray-600 text-gray-300 hover:bg-gray-700">
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim() || busy === rejectingId}
            >
              {busy === rejectingId ? "Rejecting..." : "Reject Payout"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
