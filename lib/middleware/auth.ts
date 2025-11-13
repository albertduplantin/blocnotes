import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, extractTokenFromHeader, extractTokenFromCookie } from '../auth';
import { JWTPayload } from '../types';
import { HTTP_STATUS, ERROR_MESSAGES } from '../constants';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

/**
 * Middleware to authenticate requests using JWT
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<{ authenticated: boolean; user?: JWTPayload; response?: NextResponse }> {
  // Try to extract token from Authorization header
  const authHeader = request.headers.get('authorization');
  let token = extractTokenFromHeader(authHeader);

  // If not in header, try cookies
  if (!token) {
    const cookieHeader = request.headers.get('cookie');
    token = extractTokenFromCookie(cookieHeader);
  }

  if (!token) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      ),
    };
  }

  const user = verifyToken(token);

  if (!user) {
    return {
      authenticated: false,
      response: NextResponse.json(
        { error: ERROR_MESSAGES.UNAUTHORIZED },
        { status: HTTP_STATUS.UNAUTHORIZED }
      ),
    };
  }

  return {
    authenticated: true,
    user,
  };
}

/**
 * Middleware to check if user is admin
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ authorized: boolean; user?: JWTPayload; response?: NextResponse }> {
  const authResult = await authenticateRequest(request);

  if (!authResult.authenticated || !authResult.user) {
    return { authorized: false, response: authResult.response };
  }

  if (!authResult.user.isAdmin) {
    return {
      authorized: false,
      response: NextResponse.json(
        { error: ERROR_MESSAGES.FORBIDDEN },
        { status: HTTP_STATUS.FORBIDDEN }
      ),
    };
  }

  return {
    authorized: true,
    user: authResult.user,
  };
}

/**
 * Optional authentication - doesn't fail if no token, but validates if present
 */
export async function optionalAuth(
  request: NextRequest
): Promise<{ user?: JWTPayload }> {
  const authHeader = request.headers.get('authorization');
  let token = extractTokenFromHeader(authHeader);

  if (!token) {
    const cookieHeader = request.headers.get('cookie');
    token = extractTokenFromCookie(cookieHeader);
  }

  if (!token) {
    return { user: undefined };
  }

  const user = verifyToken(token);
  return { user: user || undefined };
}
