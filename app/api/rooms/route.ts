export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';
import { authenticateRequest } from '@/lib/middleware/auth';
import { rateLimit, addRateLimitHeaders } from '@/lib/middleware/rateLimit';
import { successResponse, errorResponse, withErrorHandling } from '@/lib/utils';
import { HTTP_STATUS } from '@/lib/constants';
import { apiLogger } from '@/lib/logger';

/**
 * GET /api/rooms - Get all rooms (admin only)
 */
export async function GET(request: NextRequest) {
  return withErrorHandling(async () => {
    // Rate limiting
    const rateLimitResult = await rateLimit(request);
    if (!rateLimitResult.allowed) {
      return rateLimitResult.response!;
    }

    // Authentication required (admin only)
    const authResult = await authenticateRequest(request);
    if (!authResult.authenticated || !authResult.user?.isAdmin) {
      return errorResponse('Accès admin requis', HTTP_STATUS.FORBIDDEN);
    }

    // Query for all distinct room IDs
    const result = await sql`
      SELECT DISTINCT room_id as "roomId"
      FROM messages
      ORDER BY "roomId" ASC
    `;

    const rooms = result.rows.map(row => ({
      id: row.roomId,
      name: `Conversation ${row.roomId}`, // Or fetch a name if it exists elsewhere
      // You might want to add more details like last message timestamp
    }));

    apiLogger.info(`Admin user ${authResult.user.userId} fetched all rooms.`);

    const response = successResponse({ rooms });
    return addRateLimitHeaders(response, rateLimitResult);
  })();
}
