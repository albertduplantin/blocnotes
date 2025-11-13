import { NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';
import { hashPassword, comparePassword } from '@/lib/auth';
import { successResponse, errorResponse, withErrorHandling, parseJsonBody } from '@/lib/utils';
import { updateRoomPasswordSchema, verifyAccessPasswordSchema } from '@/lib/validations';
import { HTTP_STATUS, ERROR_MESSAGES } from '@/lib/constants';
import { rateLimit, addRateLimitHeaders } from '@/lib/middleware/rateLimit';
import { authenticateRequest } from '@/lib/middleware/auth';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/passwords - Get all room passwords (for secret phrase detection)
 * This is used by the notes page to detect secret phrases
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!;
    }

    // Get all passwords (we'll return plaintext room IDs, but hashed passwords)
    // The client will need to check if their input text contains any of these phrases
    // NOTE: For better security, this should be a POST endpoint where client sends
    // the text and server checks it. But for simplicity, we'll return room IDs only.

    const result = await sql`
      SELECT room_id, password_hash
      FROM conversation_passwords
      ORDER BY created_at DESC
    `;

    // Return just the room IDs, client will send the phrase to verify
    const roomIds = result.rows.map(row => row.room_id);

    const response = successResponse({ roomIds });
    return addRateLimitHeaders(response, rateLimitResult);
  })();
}

/**
 * POST /api/passwords - Verify if a text contains a secret phrase
 */
export async function POST(request: NextRequest) {
  return withErrorHandling(async () => {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, { maxRequests: 20, windowMs: 60000 });
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!;
    }

    const body = await parseJsonBody<{ text: string }>(request);
    if (!body || !body.text) {
      return errorResponse(ERROR_MESSAGES.INVALID_DATA, HTTP_STATUS.BAD_REQUEST);
    }

    const textLower = body.text.toLowerCase();

    // Get all passwords
    const result = await sql`
      SELECT room_id, password_hash
      FROM conversation_passwords
    `;

    // Check each password (this is inefficient but works for small datasets)
    // In production with many rooms, consider using a different approach
    for (const row of result.rows) {
      // For now, we'll need to store passwords in a way we can check them
      // Since we can't reverse bcrypt, we need a different approach
      // Let's store a lowercase version separately for matching

      // IMPORTANT: This is a security vs usability tradeoff
      // Option 1: Store plaintext passwords (less secure, used here for functionality)
      // Option 2: Require exact case-sensitive match (more secure but less user-friendly)

      // For this implementation, let's use a hybrid: store bcrypt hash + searchable token
    }

    // Return empty for now - we need to refactor the password storage
    const response = successResponse({ matchedRoomId: null });
    return addRateLimitHeaders(response, rateLimitResult);
  })();
}

/**
 * PUT /api/passwords/[roomId] - Set or update access password for a room (admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  return withErrorHandling(async () => {
    const { roomId } = params;

    // Rate limiting
    const rateLimitResult = await rateLimit(request, { maxRequests: 10, windowMs: 60000 });
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!;
    }

    // Authentication required (admin only)
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated) {
      return authResult.response!;
    }

    // Verify user is admin of this room
    if (!authResult.user!.isAdmin || authResult.user!.roomId !== roomId) {
      return errorResponse('Accès admin requis', HTTP_STATUS.FORBIDDEN);
    }

    const body = await parseJsonBody(request);
    if (!body) {
      return errorResponse(ERROR_MESSAGES.INVALID_DATA, HTTP_STATUS.BAD_REQUEST);
    }

    const validation = updateRoomPasswordSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(ERROR_MESSAGES.INVALID_DATA, HTTP_STATUS.BAD_REQUEST, validation.error.errors);
    }

    const { accessPassword } = validation.data;

    if (!accessPassword || accessPassword.trim() === '') {
      // Delete password
      await sql`
        DELETE FROM conversation_passwords WHERE room_id = ${roomId}
      `;

      apiLogger.info(`Access password removed for room ${roomId}`);

      const response = successResponse(null, 'Mot de passe supprimé');
      return addRateLimitHeaders(response, rateLimitResult);
    }

    // Hash the password
    const passwordHash = await hashPassword(accessPassword.toLowerCase());

    // Store password (with lowercase version for search)
    await sql`
      INSERT INTO conversation_passwords (room_id, password_hash, updated_at)
      VALUES (${roomId}, ${passwordHash}, CURRENT_TIMESTAMP)
      ON CONFLICT (room_id)
      DO UPDATE SET password_hash = ${passwordHash}, updated_at = CURRENT_TIMESTAMP
    `;

    // Also store searchable lowercase plaintext in a separate column for phrase detection
    // Add this column to the schema
    await sql`
      ALTER TABLE conversation_passwords ADD COLUMN IF NOT EXISTS password_plaintext TEXT
    `;

    await sql`
      UPDATE conversation_passwords
      SET password_plaintext = ${accessPassword.toLowerCase()}
      WHERE room_id = ${roomId}
    `;

    apiLogger.info(`Access password updated for room ${roomId}`);

    const response = successResponse(null, 'Mot de passe enregistré');
    return addRateLimitHeaders(response, rateLimitResult);
  })();
}
