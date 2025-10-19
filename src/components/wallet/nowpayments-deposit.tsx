'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  CreditCard, 
  AlertCircle, 
  Wallet, 
  RefreshCw,
  Zap,
  Shield,
  CheckCircle,
  Clock,
  DollarSign
} from "lucide-react";
import { toast } from 'sonner';

interface NowPaymentsDepositProps {
  amount?: number;
  planId?: string;
  onSuccess?: (data: any) => void;
  onError?: (error: string) => void;
}

interface CurrencyOption {
  code: string;
  name: string;
  network?: string;
  minAmount?: number;
  icon?: string;
}

const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'usdtbsc', name: 'USDT BEP20', network: 'BSC', minAmount: 20, icon: '₮' },
  { code: 'usdttrc20', name: 'USDT TRC20', network: 'TRON', minAmount: 20, icon: '₮' },
];

export default function NowPaymentsDeposit({ 
  amount: initialAmount, 
  planId, 
  onSuccess, 
  onError 
}: NowPaymentsDepositProps) {
  const [amount, setAmount] = useState<string>(initialAmount?.toString() || '20');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('usdtbsc');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeposit, setPendingDeposit] = useState<any>(null);
  const [minAmount, setMinAmount] = useState<number>(10);
  const [availableCurrencies, setAvailableCurrencies] = useState<string[]>([]);
  const [loadingMinAmount, setLoadingMinAmount] = useState(true);

  // Get selected currency info
  const currentCurrency = SUPPORTED_CURRENCIES.find(c => c.code === selectedCurrency) || SUPPORTED_CURRENCIES[0];

  // Fetch dynamic minimum amount from NowPayments API
  const fetchMinAmount = async (currency: string = selectedCurrency) => {
    try {
      setLoadingMinAmount(true);
      const response = await fetch(`/api/nowpayments/min-amount?currency_from=usd&currency_to=${currency}`);
      const data = await response.json();
      
      if (response.ok && data.min_amount) {
        const fetchedMinAmount = Math.ceil(parseFloat(data.min_amount));
        setMinAmount(Math.max(fetchedMinAmount, 5)); // Ensure minimum is at least $5
        console.log(`Updated minimum amount for ${currency}:`, fetchedMinAmount);
      } else {
        // Fallback to currency default or $10
        setMinAmount(currentCurrency.minAmount || 10);
      }
    } catch (error) {
      console.warn('Failed to fetch minimum amount, using fallback:', error);
      setMinAmount(currentCurrency.minAmount || 10);
    } finally {
      setLoadingMinAmount(false);
    }
  };

  // Update minimum amount when currency changes
  useEffect(() => {
    fetchMinAmount(selectedCurrency);
    setError(null);
  }, [selectedCurrency]);

  // Check for pending deposits on mount
  useEffect(() => {
    const checkPendingDeposits = async () => {
      try {
        const response = await fetch('/api/user/pending-deposits');
        if (response.ok) {
          const data = await response.json();
          if (data.pendingDeposits && data.pendingDeposits.length > 0) {
            setPendingDeposit(data.pendingDeposits[0]); // Show the most recent pending deposit
          }
        }
      } catch (error) {
        console.error('Error checking pending deposits:', error);
      }
    };

    checkPendingDeposits();
  }, []);

  // Fetch available currencies from NowPayments
  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const response = await fetch('/api/nowpayments/debug');
        if (response.ok) {
          const data = await response.json();
          if (data.currencies) {
            setAvailableCurrencies(data.currencies);
          }
        }
      } catch (error) {
        console.warn('Could not fetch available currencies:', error);
      }
    };

    fetchCurrencies();
  }, []);

  const createInvoice = async () => {
    const amountNum = parseFloat(amount);
    
    if (!amount || amountNum <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (amountNum < minAmount) {
      setError(`Minimum amount is $${minAmount} for ${currentCurrency.name}`);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/nowpayments/create-invoice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountNum,
          priceCurrency: 'usd',
          payCurrency: selectedCurrency,
          planId: planId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create payment invoice');
      }

      if (data.invoice_url) {
        // Better Safari compatibility - try window.open first, fallback to location.href
        const newWindow = window.open(data.invoice_url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
        
        // Check if popup was blocked (common in Safari)
        if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
          // Fallback: redirect current window
          toast.success('Redirecting to payment page...');
          window.location.href = data.invoice_url;
        } else {
          toast.success('Payment invoice created! Complete payment in the new window.');
        }
        
        onSuccess?.(data);
      } else {
        throw new Error('No payment URL received');
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create payment invoice';
      setError(errorMessage);
      onError?.(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getNetworkBadgeColor = (network?: string) => {
    switch (network) {
      case 'TRON': return 'bg-red-600 text-white';
      case 'BSC': return 'bg-yellow-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border-blue-700/50 backdrop-blur-sm max-w-md mx-auto">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg font-bold text-white flex items-center space-x-2">
          <CreditCard className="h-5 w-5 text-blue-400" />
          <span>Crypto Deposit</span>
          <Badge className="bg-green-600 text-white text-xs">Instant</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {pendingDeposit && (
          <div className="p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg">
            <div className="flex items-center space-x-2 mb-2">
              <Clock className="h-4 w-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-300">Pending Deposit</span>
            </div>
            <div className="text-sm text-yellow-200">
              <p>Amount: ${pendingDeposit.amount} USDT</p>
              <p>Status: {pendingDeposit.status}</p>
              <p className="text-xs text-yellow-400 mt-1">
                Waiting for payment confirmation. This will auto-cancel in 2 hours if not paid.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-400" />
              <span className="text-sm text-red-300">{error}</span>
            </div>
          </div>
        )}

        {/* Amount Input */}
        <div className="space-y-3">
          <Label htmlFor="amount" className="text-sm font-medium text-gray-300">
            Deposit Amount (USD)
          </Label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              min={minAmount}
              step="0.01"
              className="pl-10 bg-gray-800/50 border-gray-600 text-white placeholder-gray-400"
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[50, 100, 250, 500].map((preset) => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                onClick={() => setAmount(preset.toString())}
                className="border-gray-600 text-gray-300 hover:bg-gray-700 text-xs"
              >
                ${preset}
              </Button>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Minimum: ${minAmount} • You'll pay in {currentCurrency.name}
          </p>
        </div>

        {/* Currency Selection */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-300">Payment Method</Label>
          <div className="grid grid-cols-2 gap-3">
            {SUPPORTED_CURRENCIES.map((currency) => (
              <div
                key={currency.code}
                onClick={() => setSelectedCurrency(currency.code)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedCurrency === currency.code
                    ? 'border-blue-500 bg-blue-900/20'
                    : 'border-gray-600 bg-gray-800/30 hover:border-gray-500'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    selectedCurrency === currency.code
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-400'
                  }`}>
                    {selectedCurrency === currency.code && (
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-white text-sm">{currency.name}</p>
                    <p className="text-xs text-gray-400">{currency.network}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Separator className="bg-gray-700" />

        {/* Simple Summary */}
        <div className="p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">You'll pay:</span>
            <span className="text-xl font-bold text-white">${amount || '0'} USDT</span>
          </div>
          {planId && (
            <div className="text-xs text-blue-400 mt-1">For plan: {planId}</div>
          )}
        </div>

        {/* Create Payment Button */}
        <Button
          onClick={createInvoice}
          disabled={isLoading || !amount || parseFloat(amount) < minAmount}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Creating Payment...
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4 mr-2" />
              Pay with {currentCurrency.name}
            </>
          )}
        </Button>

        {/* Features */}
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-yellow-400" />
            <span className="text-xs text-gray-300">Instant</span>
          </div>
          <div className="flex items-center space-x-2">
            <Shield className="h-4 w-4 text-green-400" />
            <span className="text-xs text-gray-300">Secure</span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-blue-400" />
            <span className="text-xs text-gray-300">Auto-Credit</span>
          </div>
        </div>

        {/* Simple Info */}
        <div className="text-center text-sm text-gray-400">
          Click "Pay with USDT" → Complete payment → Funds credited automatically
        </div>
      </CardContent>
    </Card>
  );
}
