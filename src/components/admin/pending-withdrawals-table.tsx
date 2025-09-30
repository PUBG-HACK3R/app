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
import { CheckCircle, X } from "lucide-react";
import { toast } from "sonner";

export type PendingWithdrawal = {
  id: string;
  user_id: string;
  amount_usdt: number;
  address: string;
  status: string;
  created_at: string;
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
                <th className="px-3 py-2">User</th>
                <th className="px-3 py-2">Amount (USDT)</th>
                <th className="px-3 py-2">Address</th>
                <th className="px-3 py-2">Requested</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((w) => (
                <tr key={w.id} className="border-t">
                  <td className="px-3 py-2 font-mono text-xs">{w.user_id.slice(0, 8)}…</td>
                  <td className="px-3 py-2 font-medium">{Number(w.amount_usdt).toFixed(2)}</td>
                  <td className="px-3 py-2 break-all">{w.address}</td>
                  <td className="px-3 py-2 text-muted-foreground">
                    {new Date(w.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => approve(w.id)} 
                        disabled={busy === w.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {busy === w.id ? "Approving…" : "Approve"}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        onClick={() => openRejectDialog(w.id)} 
                        disabled={busy === w.id}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
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
