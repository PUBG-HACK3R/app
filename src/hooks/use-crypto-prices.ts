"use client";

import { useState, useEffect } from 'react';

export interface CryptoPrice {
  name: string;
  symbol: string;
  price: number;
  change: number;
  formatted_price: string;
  formatted_change: string;
}

export interface CryptoPrices {
  bitcoin: CryptoPrice;
  ethereum: CryptoPrice;
  tether: CryptoPrice;
  binancecoin: CryptoPrice;
}

export function useCryptoPrices() {
  const [prices, setPrices] = useState<CryptoPrices | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPrices = async () => {
    try {
      setError(null);
      const response = await fetch('/api/crypto/prices');
      
      if (!response.ok) {
        throw new Error('Failed to fetch crypto prices');
      }
      
      const data = await response.json();
      setPrices(data);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching crypto prices:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch prices immediately
    fetchPrices();

    // Set up interval to fetch prices every 30 seconds
    const interval = setInterval(fetchPrices, 30000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);

  // Convert to array format for easier rendering
  const pricesArray = prices ? [
    prices.bitcoin,
    prices.ethereum,
    prices.tether,
    prices.binancecoin
  ] : [];

  return {
    prices,
    pricesArray,
    loading,
    error,
    refetch: fetchPrices
  };
}
