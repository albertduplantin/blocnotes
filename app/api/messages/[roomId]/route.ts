import { NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';
import { authenticateRequest } from '@/lib/middleware/auth';
import { rateLimit, addRateLimitHeaders } from '@/lib/middleware/rateLimit';
import { successResponse, errorResponse, withErrorHandling, parseJsonBody, generatePaginationMeta } from '@/lib/utils';
import { createMessageSchema, getMessagesSchema } from '@/lib/validations';
import { HTTP_STATUS, ERROR_MESSAGES, APP_CONFIG } from '@/lib/constants';
import { Message } from '@/lib/types';
import { apiLogger } from '@/lib/logger';
import { nanoid } from 'nanoid';

/**
 * GET /api/messages/[roomId] - Get messages for a room
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  return withErrorHandling(async () => {
    const { roomId } = params;

    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!;
    }

    // Authentication is optional for reading messages (public rooms)
    // But we'll check if user has access to this room
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated) {
      return authResult.response!;
    }

    // Verify user has access to this room
    if (authResult.user!.roomId !== roomId) {
      return errorResponse('Accès refusé à cette conversation', HTTP_STATUS.FORBIDDEN);
    }

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const queryValidation = getMessagesSchema.safeParse({
      since: searchParams.get('since'),
      page: searchParams.get('page'),
      pageSize: searchParams.get('pageSize'),
    });

    if (!queryValidation.success) {
      return errorResponse(ERROR_MESSAGES.INVALID_DATA, HTTP_STATUS.BAD_REQUEST, queryValidation.error.errors);
    }

    const { since, page, pageSize } = queryValidation.data;

    // Build query
    let query;
    let countQuery;

    if (since) {
      // Get messages since timestamp
      const sinceDate = new Date(since);
      query = sql`
        SELECT id, room_id as "roomId", content, image_url as "imageUrl",
               sent_by_admin as "sentByAdmin", user_id as "userId", timestamp
        FROM messages
        WHERE room_id = ${roomId} AND timestamp > ${sinceDate.toISOString()}
        ORDER BY timestamp ASC
      `;
    } else {
      // Paginated query
      const offset = (page - 1) * pageSize;

      query = sql`
        SELECT id, room_id as "roomId", content, image_url as "imageUrl",
               sent_by_admin as "sentByAdmin", user_id as "userId", timestamp
        FROM messages
        WHERE room_id = ${roomId}
        ORDER BY timestamp DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      countQuery = sql`
        SELECT COUNT(*) as count FROM messages WHERE room_id = ${roomId}
      `;
    }

    const result = await query;
    const messages = result.rows as Message[];

    // If paginated, get total count
    if (!since && countQuery) {
      const countResult = await countQuery;
      const totalCount = parseInt(countResult.rows[0].count);

      const paginationMeta = generatePaginationMeta(page, pageSize, totalCount);

      const response = successResponse({
        messages: messages.reverse(), // Reverse to show oldest first
        pagination: paginationMeta,
      });

      return addRateLimitHeaders(response, rateLimitResult);
    }

    const response = successResponse({
      messages,
      count: messages.length,
    });

    return addRateLimitHeaders(response, rateLimitResult);
  })();
}

/**
 * POST /api/messages/[roomId] - Send a message
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  return withErrorHandling(async () => {
    const { roomId } = params;

    // Rate limiting (stricter for writes)
    const rateLimitResult = await rateLimit(request, { maxRequests: 30, windowMs: 60000 });
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!;
    }

    // Authentication required
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated) {
      return authResult.response!;
    }

    // Verify user has access to this room
    if (authResult.user!.roomId !== roomId) {
      return errorResponse('Accès refusé à cette conversation', HTTP_STATUS.FORBIDDEN);
    }

    const body = await parseJsonBody(request);
    if (!body) {
      return errorResponse(ERROR_MESSAGES.INVALID_DATA, HTTP_STATUS.BAD_REQUEST);
    }

    const validation = createMessageSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(ERROR_MESSAGES.INVALID_DATA, HTTP_STATUS.BAD_REQUEST, validation.error.errors);
    }

    const { content, imageUrl, sentByAdmin } = validation.data;

    // Generate message ID
    const messageId = `msg_${nanoid()}`;
    const timestamp = new Date();

    // Verify sentByAdmin matches user's admin status
    const isActuallyAdmin = authResult.user!.isAdmin;
    if (sentByAdmin && !isActuallyAdmin) {
      return errorResponse('Non autorisé à envoyer en tant qu\'admin', HTTP_STATUS.FORBIDDEN);
    }

    // Insert message
    await sql`
      INSERT INTO messages (id, room_id, content, image_url, sent_by_admin, user_id, timestamp)
      VALUES (
        ${messageId},
        ${roomId},
        ${content},
        ${imageUrl || null},
        ${isActuallyAdmin},
        ${authResult.user!.userId},
        ${timestamp.toISOString()}
      )
    `;

    const message: Message = {
      id: messageId,
      roomId,
      content,
      imageUrl: imageUrl || null,
      sentByAdmin: isActuallyAdmin,
      userId: authResult.user!.userId,
      timestamp,
    };

    apiLogger.info(`Message sent: ${messageId} in room ${roomId}`);

    const response = successResponse(message, 'Message envoyé', HTTP_STATUS.CREATED);
    return addRateLimitHeaders(response, rateLimitResult);
  })();
}

/**
 * DELETE /api/messages/[roomId] - Delete all messages in a room (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { roomId: string } }
) {
  return withErrorHandling(async () => {
    const { roomId } = params;

    // Rate limiting
    const rateLimitResult = await rateLimit(request, { maxRequests: 5, windowMs: 60000 });
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

    // Delete all messages
    const result = await sql`
      DELETE FROM messages WHERE room_id = ${roomId}
    `;

    apiLogger.info(`All messages deleted from room ${roomId} by user ${authResult.user!.userId}`);

    const response = successResponse(
      { deletedCount: result.rowCount },
      'Messages supprimés'
    );

    return addRateLimitHeaders(response, rateLimitResult);
  })();
}
