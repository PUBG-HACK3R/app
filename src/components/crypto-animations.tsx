"use client";

import React from 'react';
import { Bitcoin, Coins, TrendingUp, Zap, Shield, DollarSign } from 'lucide-react';

// Floating crypto icons animation
export function FloatingCryptoIcons() {
  const icons = [
    { Icon: Bitcoin, delay: 0, duration: 6 },
    { Icon: Coins, delay: 1, duration: 8 },
    { Icon: TrendingUp, delay: 2, duration: 7 },
    { Icon: Zap, delay: 3, duration: 9 },
    { Icon: Shield, delay: 4, duration: 6.5 },
    { Icon: DollarSign, delay: 5, duration: 7.5 },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {icons.map(({ Icon, delay, duration }, index) => (
        <div
          key={index}
          className="absolute animate-float opacity-10"
          style={{
            left: `${10 + (index * 15)}%`,
            top: `${20 + (index * 10)}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
          }}
        >
          <Icon className="h-8 w-8 text-blue-400" />
        </div>
      ))}
    </div>
  );
}

// Pulsing glow effect for important elements
export function PulsingGlow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-lg blur-xl animate-pulse"></div>
      <div className="relative">{children}</div>
    </div>
  );
}

// Animated counter for numbers
export function AnimatedCounter({ 
  value, 
  prefix = "", 
  suffix = "", 
  className = "" 
}: { 
  value: number; 
  prefix?: string; 
  suffix?: string; 
  className?: string; 
}) {
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  return (
    <span className={className}>
      {prefix}{(count || 0).toLocaleString()}{suffix}
    </span>
  );
}

// Crypto ticker animation
export function CryptoTicker({ prices }: { prices: Array<{ symbol: string; price: string; change: string }> }) {
  return (
    <div className="overflow-hidden bg-gradient-to-r from-slate-800/50 to-slate-900/50 backdrop-blur-sm border-y border-slate-700/50">
      <div className="animate-scroll flex space-x-8 py-2">
        {[...prices, ...prices].map((crypto, index) => (
          <div key={index} className="flex items-center space-x-2 whitespace-nowrap">
            <span className="text-sm font-medium text-white">{crypto.symbol}</span>
            <span className="text-sm text-gray-300">${crypto.price}</span>
            <span className={`text-xs ${crypto.change.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>
              {crypto.change}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Glowing border effect
export function GlowingBorder({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative group ${className}`}>
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
      <div className="relative">{children}</div>
    </div>
  );
}

// Particle effect background
export function ParticleBackground() {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    duration: Math.random() * 10 + 10,
    delay: Math.random() * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute bg-blue-400/20 rounded-full animate-float"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDuration: `${particle.duration}s`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
