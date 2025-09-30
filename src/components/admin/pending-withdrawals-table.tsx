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

  async function startProcessing(id: string) {
    setBusy(id);
    setError(null);
    try {
      const res = await fetch("/api/admin/withdrawals/start-processing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ withdrawalId: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to start processing");
      // Update the item status locally
      setItems((prev) => prev.map(w => w.id === id ? {...w, status: "processing", processing_started_at: new Date().toISOString()} : w));
      toast.success("Withdrawal processing started");
    } catch (e: any) {
      setError(e.message || "Unexpected error");
      toast.error(e.message || "Failed to start processing");
    } finally {
      setBusy(null);
    }
  }

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
    <div className="space-y-2">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">No pending withdrawals.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Amount</th>
                <th className="px-3 py-2">Fee</th>
                <th className="px-3 py-2">Net Amount</th>
                <th className="px-3 py-2">Address</th>
                <th className="px-3 py-2">Time Remaining</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((w) => {
                const timeRemaining = w.expires_at ? getTimeRemaining(w.expires_at) : null;
                const urgent = w.expires_at ? isUrgent(w.expires_at) : false;
                const expired = w.expires_at ? isExpired(w.expires_at) : false;
                
                return (
                  <tr key={w.id} className={`border-t ${urgent ? 'bg-red-50 dark:bg-red-950/20' : expired ? 'bg-gray-100 dark:bg-gray-800' : ''}`}>
                    <td className="px-3 py-2">
                      {expired ? (
                        <div className="flex items-center space-x-1 text-red-600">
                          <X className="h-3 w-3" />
                          <span className="text-xs">Expired</span>
                        </div>
                      ) : urgent ? (
                        <div className="flex items-center space-x-1 text-red-600 animate-pulse">
                          <AlertTriangle className="h-3 w-3" />
                          <span className="text-xs font-bold">URGENT</span>
                        </div>
                      ) : w.processing_started_at ? (
                        <div className="flex items-center space-x-1 text-blue-600">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">Processing</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1 text-yellow-600">
                          <Clock className="h-3 w-3" />
                          <span className="text-xs">Pending</span>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{w.user_id.slice(0, 8)}…</td>
                    <td className="px-3 py-2 font-medium">${Number(w.amount_usdt).toFixed(2)}</td>
                    <td className="px-3 py-2 text-red-600 font-medium">
                      {w.fee_usdt ? `-$${Number(w.fee_usdt).toFixed(2)}` : 'N/A'}
                    </td>
                    <td className="px-3 py-2 text-green-600 font-bold">
                      {w.net_amount_usdt ? `$${Number(w.net_amount_usdt).toFixed(2)}` : 'N/A'}
                    </td>
                    <td className="px-3 py-2 break-all text-xs">{w.address.slice(0, 12)}...{w.address.slice(-8)}</td>
                    <td className="px-3 py-2">
                      {timeRemaining !== null ? (
                        <div className={`text-sm font-mono ${urgent ? 'text-red-600 font-bold' : expired ? 'text-gray-500' : 'text-blue-600'}`}>
                          {expired ? 'EXPIRED' : formatTimeRemaining(timeRemaining)}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">No limit</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1 flex-wrap">
                        {!expired && !w.processing_started_at && (
                          <Button 
                            size="sm" 
                            onClick={() => startProcessing(w.id)} 
                            disabled={busy === w.id}
                            className="bg-blue-600 hover:bg-blue-700 text-xs"
                          >
                            <Clock className="h-3 w-3 mr-1" />
                            {busy === w.id ? "Starting..." : "Start"}
                          </Button>
                        )}
                        {w.processing_started_at && (
                          <Button 
                            size="sm" 
                            onClick={() => approve(w.id)} 
                            disabled={busy === w.id}
                            className="bg-green-600 hover:bg-green-700 text-xs"
                          >
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {busy === w.id ? "Approving…" : "Complete"}
                          </Button>
                        )}
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => openRejectDialog(w.id)} 
                          disabled={busy === w.id}
                          className="text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Reject Withdrawal</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this withdrawal request. The user will see this reason.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Rejection Reason</Label>
              <Textarea
                id="reason"
                placeholder="Enter the reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleReject}
              disabled={!rejectionReason.trim() || busy === rejectingId}
            >
              {busy === rejectingId ? "Rejecting..." : "Reject Withdrawal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
