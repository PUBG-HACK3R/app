"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DollarSign, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface SimplePlanButtonProps {
  planId: string;
  planName: string;
  minAmount: number;
  maxAmount: number;
  displayROI: number;
  duration: number;
  gradient: string;
  className?: string;
}

export function SimplePlanButton({ 
  planId, 
  planName, 
  minAmount,
  maxAmount,
  displayROI,
  duration,
  gradient, 
  className = ""
}: SimplePlanButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClick = () => {
    // For now, just redirect to plans page where they can use the full modal
    router.push('/plans');
  };

  return (
    <Button 
      onClick={handleClick}
      disabled={loading}
      className={`w-full bg-gradient-to-r ${gradient} hover:opacity-90 text-white font-semibold ${className}`}
    >
      <DollarSign className="mr-2 h-4 w-4" />
      Invest Now
      <ArrowRight className="ml-2 h-4 w-4" />
    </Button>
  );
}
