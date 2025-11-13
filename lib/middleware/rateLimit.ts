import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { APP_CONFIG, HTTP_STATUS, ERROR_MESSAGES } from '../constants';
import { cleanupRateLimits } from '../db';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  response?: NextResponse;
}

/**
 * Rate limiting middleware
 * Uses PostgreSQL for distributed rate limiting
 */
export async function rateLimit(
  request: NextRequest,
  options: {
    maxRequests?: number;
    windowMs?: number;
    identifier?: string; // Optional custom identifier
  } = {}
): Promise<RateLimitResult> {
  const maxRequests = options.maxRequests || APP_CONFIG.RATE_LIMIT_MAX_REQUESTS;
  const windowMs = options.windowMs || APP_CONFIG.RATE_LIMIT_WINDOW_MS;

  // Get identifier (IP or custom)
  const identifier =
    options.identifier ||
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';

  const endpoint = request.nextUrl.pathname;
  const now = new Date();
  const resetTime = new Date(now.getTime() + windowMs);

  try {
    // Clean up old entries periodically (1% chance on each request)
    if (Math.random() < 0.01) {
      cleanupRateLimits().catch(console.error);
    }

    // Check current count
    const result = await sql`
      SELECT count, reset_time
      FROM rate_limits
      WHERE identifier = ${identifier}
        AND endpoint = ${endpoint}
        AND reset_time > ${now.toISOString()}
      LIMIT 1
    `;

    if (result.rows.length === 0) {
      // No existing record, create new one
      await sql`
        INSERT INTO rate_limits (identifier, endpoint, count, reset_time)
        VALUES (${identifier}, ${endpoint}, 1, ${resetTime.toISOString()})
      `;

      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime,
      };
    }

    const currentCount = result.rows[0].count;
    const currentResetTime = new Date(result.rows[0].reset_time);

    if (currentCount >= maxRequests) {
      // Rate limit exceeded
      return {
        allowed: false,
        remaining: 0,
        resetTime: currentResetTime,
        response: NextResponse.json(
          {
            error: ERROR_MESSAGES.RATE_LIMIT_EXCEEDED,
            retryAfter: Math.ceil((currentResetTime.getTime() - now.getTime()) / 1000),
          },
          {
            status: HTTP_STATUS.TOO_MANY_REQUESTS,
            headers: {
              'X-RateLimit-Limit': maxRequests.toString(),
              'X-RateLimit-Remaining': '0',
              'X-RateLimit-Reset': currentResetTime.toISOString(),
              'Retry-After': Math.ceil((currentResetTime.getTime() - now.getTime()) / 1000).toString(),
            },
          }
        ),
      };
    }

    // Increment count
    await sql`
      UPDATE rate_limits
      SET count = count + 1
      WHERE identifier = ${identifier}
        AND endpoint = ${endpoint}
        AND reset_time > ${now.toISOString()}
    `;

    return {
      allowed: true,
      remaining: maxRequests - currentCount - 1,
      resetTime: currentResetTime,
    };
  } catch (error) {
    console.error('[RateLimit] Error:', error);
    // On error, allow the request (fail open)
    return {
      allowed: true,
      remaining: maxRequests,
      resetTime,
    };
  }
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  result: RateLimitResult,
  maxRequests: number = APP_CONFIG.RATE_LIMIT_MAX_REQUESTS
): NextResponse {
  response.headers.set('X-RateLimit-Limit', maxRequests.toString());
  response.headers.set('X-RateLimit-Remaining', result.remaining.toString());
  response.headers.set('X-RateLimit-Reset', result.resetTime.toISOString());

  return response;
}
