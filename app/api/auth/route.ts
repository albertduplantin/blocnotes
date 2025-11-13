import { NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';
import { generateToken, generateUserId, generateRoomId, hashPassword, comparePassword } from '@/lib/auth';
import { successResponse, errorResponse, withErrorHandling, parseJsonBody } from '@/lib/utils';
import { loginSchema, createRoomSchema } from '@/lib/validations';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';
import { rateLimit, addRateLimitHeaders } from '@/lib/middleware/rateLimit';
import { authLogger } from '@/lib/logger';

/**
 * POST /api/auth - Login or create session
 */
export const POST = withErrorHandling(async (request: NextRequest) => {
  // Rate limiting
  const rateLimitResult = await rateLimit(request, { maxRequests: 10, windowMs: 60000 });
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!;
  }

  const body = await parseJsonBody(request);
  if (!body) {
    return errorResponse(ERROR_MESSAGES.INVALID_DATA, HTTP_STATUS.BAD_REQUEST);
  }

  const validation = loginSchema.safeParse(body);
  if (!validation.success) {
    return errorResponse(ERROR_MESSAGES.INVALID_DATA, HTTP_STATUS.BAD_REQUEST, validation.error.errors);
  }

  const { roomId, password, isAdmin } = validation.data;

  // Check if room exists
  const roomResult = await sql`
    SELECT id, name, password_hash FROM rooms WHERE id = ${roomId}
  `;

  if (roomResult.rows.length === 0) {
    return errorResponse('Conversation non trouvée', HTTP_STATUS.NOT_FOUND);
  }

  const room = roomResult.rows[0];

  // If admin login, verify password
  if (isAdmin && room.password_hash) {
    if (!password) {
      return errorResponse('Mot de passe requis pour l\'accès admin', HTTP_STATUS.UNAUTHORIZED);
    }

    const isValid = await comparePassword(password, room.password_hash);
    if (!isValid) {
      authLogger.warn(`Failed admin login attempt for room ${roomId}`);
      return errorResponse('Mot de passe incorrect', HTTP_STATUS.UNAUTHORIZED);
    }
  }

  // Generate user session
  const userId = generateUserId();

  // Create JWT token
  const token = generateToken({
    userId,
    isAdmin: isAdmin || false,
    roomId,
  });

  authLogger.info(`User ${userId} logged in to room ${roomId} (admin: ${isAdmin})`);

  const response = successResponse(
    {
      token,
      userId,
      roomId,
      roomName: room.name,
      isAdmin: isAdmin || false,
    },
    'Connexion réussie'
  );

  // Set cookie
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return addRateLimitHeaders(response, rateLimitResult);
});

/**
 * PUT /api/auth - Create a new room
 */
export const PUT = withErrorHandling(async (request: NextRequest) => {
  // Rate limiting
  const rateLimitResult = await rateLimit(request, { maxRequests: 5, windowMs: 60000 });
  if (!rateLimitResult.allowed) {
    return rateLimitResult.response!;
  }

  const body = await parseJsonBody(request);
  if (!body) {
    return errorResponse(ERROR_MESSAGES.INVALID_DATA, HTTP_STATUS.BAD_REQUEST);
  }

  const validation = createRoomSchema.safeParse(body);
  if (!validation.success) {
    return errorResponse(ERROR_MESSAGES.INVALID_DATA, HTTP_STATUS.BAD_REQUEST, validation.error.errors);
  }

  const { name, password } = validation.data;

  // Generate unique room ID
  let roomId = generateRoomId();
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const existing = await sql`SELECT id FROM rooms WHERE id = ${roomId}`;
    if (existing.rows.length === 0) break;

    roomId = generateRoomId();
    attempts++;
  }

  if (attempts >= maxAttempts) {
    return errorResponse('Impossible de générer un code unique', HTTP_STATUS.INTERNAL_ERROR);
  }

  // Hash password if provided
  const passwordHash = password ? await hashPassword(password) : null;

  // Create room
  await sql`
    INSERT INTO rooms (id, name, password_hash, created_at, updated_at)
    VALUES (${roomId}, ${name}, ${passwordHash}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
  `;

  // Generate admin token
  const userId = generateUserId();
  const token = generateToken({
    userId,
    isAdmin: true,
    roomId,
  });

  authLogger.info(`New room created: ${roomId} by user ${userId}`);

  const response = successResponse(
    {
      token,
      userId,
      roomId,
      roomName: name,
      isAdmin: true,
    },
    'Conversation créée avec succès',
    HTTP_STATUS.CREATED
  );

  // Set cookie
  response.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return addRateLimitHeaders(response, rateLimitResult);
});
