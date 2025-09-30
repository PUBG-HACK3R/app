import { NextRequest } from "next/server";

interface RateLimitConfig {
  interval: number; // Time window in milliseconds
  uniqueTokenPerInterval: number; // Max requests per interval
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map();

  constructor(private config: RateLimitConfig) {}

  check(identifier: string): { success: boolean; remaining: number; resetTime: number } {
    const now = Date.now();
    const windowStart = now - this.config.interval;
    
    // Get existing requests for this identifier
    const requests = this.requests.get(identifier) || [];
    
    // Filter out requests outside the current window
    const validRequests = requests.filter(time => time > windowStart);
    
    // Check if limit exceeded
    if (validRequests.length >= this.config.uniqueTokenPerInterval) {
      const oldestRequest = Math.min(...validRequests);
      const resetTime = oldestRequest + this.config.interval;
      
      return {
        success: false,
        remaining: 0,
        resetTime
      };
    }
    
    // Add current request
    validRequests.push(now);
    this.requests.set(identifier, validRequests);
    
    // Clean up old entries periodically
    if (Math.random() < 0.01) {
      this.cleanup();
    }
    
    return {
      success: true,
      remaining: this.config.uniqueTokenPerInterval - validRequests.length,
      resetTime: now + this.config.interval
    };
  }
  
  private cleanup() {
    const now = Date.now();
    for (const [key, requests] of this.requests.entries()) {
      const validRequests = requests.filter(time => time > now - this.config.interval);
      if (validRequests.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, validRequests);
      }
    }
  }
}

// Rate limiters for different endpoints
export const authLimiter = new RateLimiter({
  interval: 15 * 60 * 1000, // 15 minutes
  uniqueTokenPerInterval: 5, // 5 attempts per 15 minutes
});

export const apiLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 30, // 30 requests per minute
});

export const strictLimiter = new RateLimiter({
  interval: 60 * 1000, // 1 minute
  uniqueTokenPerInterval: 5, // 5 requests per minute
});

export function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  
  if (realIP) {
    return realIP;
  }
  
  return "unknown";
}

export function createRateLimitResponse(resetTime: number) {
  const resetDate = new Date(resetTime);
  
  return new Response(
    JSON.stringify({
      error: "Too many requests",
      message: "Rate limit exceeded. Please try again later.",
      resetTime: resetDate.toISOString()
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": Math.ceil((resetTime - Date.now()) / 1000).toString(),
        "X-RateLimit-Reset": resetDate.toISOString(),
      },
    }
  );
}
