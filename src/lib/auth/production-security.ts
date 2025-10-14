import { NextRequest, NextResponse } from 'next/server';

/**
 * Production security middleware to disable debug endpoints
 * and add authentication checks for sensitive operations
 */

export function isProductionEnvironment(): boolean {
  return process.env.NODE_ENV === 'production';
}

export function isDebugEndpoint(pathname: string): boolean {
  const debugPaths = [
    '/api/debug/',
    '/debug'
  ];
  
  return debugPaths.some(path => pathname.startsWith(path));
}

export function createProductionSecurityResponse(): NextResponse {
  return NextResponse.json({
    success: false,
    error: 'Debug endpoints are disabled in production',
    message: 'This endpoint is only available in development mode for security reasons.',
    production: true
  }, { status: 403 });
}

export async function validateAdminAccess(request: NextRequest): Promise<{
  isValid: boolean;
  error?: string;
  adminId?: string;
}> {
  try {
    // Check for admin authentication header or session
    const authHeader = request.headers.get('Authorization');
    const adminSession = request.headers.get('X-Admin-Session');
    
    if (!authHeader && !adminSession) {
      return {
        isValid: false,
        error: 'Admin authentication required'
      };
    }

    // In production, implement proper admin session validation
    // For now, we'll use a simple check
    const adminToken = process.env.ADMIN_ACCESS_TOKEN;
    
    if (authHeader === `Bearer ${adminToken}` || adminSession === adminToken) {
      return {
        isValid: true,
        adminId: 'admin'
      };
    }

    return {
      isValid: false,
      error: 'Invalid admin credentials'
    };

  } catch (error) {
    return {
      isValid: false,
      error: 'Authentication validation failed'
    };
  }
}

export function createUnauthorizedResponse(): NextResponse {
  return NextResponse.json({
    success: false,
    error: 'Unauthorized access',
    message: 'Admin authentication required for this operation.',
    requiresAuth: true
  }, { status: 401 });
}

/**
 * Middleware wrapper for debug endpoints
 */
export function withProductionSecurity(handler: Function) {
  return async (request: NextRequest, ...args: any[]) => {
    // Block debug endpoints in production
    if (isProductionEnvironment() && isDebugEndpoint(request.nextUrl.pathname)) {
      console.warn(`🚫 Blocked debug endpoint access in production: ${request.nextUrl.pathname}`);
      return createProductionSecurityResponse();
    }

    // For sensitive admin operations, validate access
    if (request.nextUrl.pathname.includes('/admin/') && 
        !request.nextUrl.pathname.includes('/admin/login')) {
      
      const authResult = await validateAdminAccess(request);
      if (!authResult.isValid) {
        console.warn(`🚫 Unauthorized admin access attempt: ${request.nextUrl.pathname}`);
        return createUnauthorizedResponse();
      }
    }

    // Continue with original handler
    return handler(request, ...args);
  };
}

/**
 * Rate limiting for production
 */
const rateLimitMap = new Map();

export function checkRateLimit(identifier: string, maxRequests: number = 100, windowMs: number = 60000): boolean {
  const now = Date.now();
  const windowStart = now - windowMs;
  
  if (!rateLimitMap.has(identifier)) {
    rateLimitMap.set(identifier, []);
  }
  
  const requests = rateLimitMap.get(identifier);
  
  // Remove old requests outside the window
  const validRequests = requests.filter((timestamp: number) => timestamp > windowStart);
  
  if (validRequests.length >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  validRequests.push(now);
  rateLimitMap.set(identifier, validRequests);
  
  return true; // Request allowed
}

export function createRateLimitResponse(): NextResponse {
  return NextResponse.json({
    success: false,
    error: 'Rate limit exceeded',
    message: 'Too many requests. Please try again later.',
    retryAfter: 60
  }, { status: 429 });
}

/**
 * Security headers for production
 */
export function addSecurityHeaders(response: NextResponse): NextResponse {
  if (isProductionEnvironment()) {
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  }
  
  return response;
}
