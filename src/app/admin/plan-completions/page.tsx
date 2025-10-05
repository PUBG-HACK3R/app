"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  RefreshCw, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  ArrowLeft,
  DollarSign
} from "lucide-react";
import Link from "next/link";

interface ProcessResult {
  subscription_id: string;
  user_id?: string;
  plan_name?: string;
  returned_amount?: number;
  success: boolean;
  error?: string;
}

interface ProcessResponse {
  success: boolean;
  message: string;
  processed: number;
  total_found: number;
  results: ProcessResult[];
}

export default function PlanCompletionsPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ProcessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const processCompletions = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/plans/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process completions");
      }

      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900/20 to-gray-900 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/admin" className="flex items-center space-x-2 text-gray-300 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
              <span>Back to Admin</span>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Plan Completions</h1>
              <p className="text-gray-400">Process completed mining plans and return investments</p>
            </div>
          </div>
        </div>

        {/* Process Button */}
        <Card className="bg-gray-800/50 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Process Completed Plans
            </CardTitle>
            <CardDescription className="text-gray-400">
              Check for mining plans that have completed their cycle and return the original investment to users' wallets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={processCompletions}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Process Completions
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="bg-red-950/20 border-red-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-red-400" />
                <span className="text-red-200 font-medium">{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results Display */}
        {result && (
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardHeader>
              <CardTitle className="text-white">Processing Results</CardTitle>
              <CardDescription className="text-gray-400">
                {result.message}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-900/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{result.total_found}</div>
                  <div className="text-sm text-blue-200">Plans Found</div>
                </div>
                <div className="bg-green-900/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{result.processed}</div>
                  <div className="text-sm text-green-200">Successfully Processed</div>
                </div>
                <div className="bg-red-900/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-white">{result.total_found - result.processed}</div>
                  <div className="text-sm text-red-200">Failed/Skipped</div>
                </div>
              </div>

              {/* Detailed Results */}
              {result.results.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-lg font-medium text-white">Detailed Results</h3>
                  {result.results.map((item, index) => (
                    <div key={index} className="bg-gray-700/50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {item.success ? (
                            <CheckCircle className="h-5 w-5 text-green-400" />
                          ) : (
                            <AlertCircle className="h-5 w-5 text-red-400" />
                          )}
                          <div>
                            <div className="text-white font-medium">
                              {item.plan_name || "Unknown Plan"}
                            </div>
                            <div className="text-sm text-gray-400">
                              Subscription: {item.subscription_id.slice(0, 8)}...
                            </div>
                            {item.error && (
                              <div className="text-sm text-red-400 mt-1">
                                Error: {item.error}
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {item.success && item.returned_amount && (
                          <div className="flex items-center space-x-2">
                            <DollarSign className="h-4 w-4 text-green-400" />
                            <span className="text-green-400 font-bold">
                              ${Number(item.returned_amount).toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-gray-800/50 border-gray-700/50">
          <CardHeader>
            <CardTitle className="text-white">How It Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-gray-300">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">1</div>
              <div>
                <div className="font-medium">Find Completed Plans</div>
                <div className="text-sm text-gray-400">Searches for mining plans that have reached their end date</div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">2</div>
              <div>
                <div className="font-medium">Return Investment</div>
                <div className="text-sm text-gray-400">Creates an "investment_return" transaction to return the original investment amount</div>
              </div>
            </div>
            
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold mt-0.5">3</div>
              <div>
                <div className="font-medium">Deactivate Plan</div>
                <div className="text-sm text-gray-400">Marks the subscription as inactive so it won't generate more daily earnings</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
