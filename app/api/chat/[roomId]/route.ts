import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * Persistent message storage using PostgreSQL
 * Replaces in-memory storage for reliability
 */

// GET - Get messages for a room
export async function GET(
  request: NextRequest,
  context: { params: { roomId: string } }
) {
  try {
    const { roomId } = context.params;
    const url = new URL(request.url);
    const since = url.searchParams.get('since');

    // Ensure room exists (create if not)
    await sql`
      INSERT INTO rooms (id, name)
      VALUES (${roomId}, ${`Conversation ${roomId}`})
      ON CONFLICT (id) DO NOTHING
    `;

    let query;
    if (since) {
      // Get messages since timestamp
      const sinceTimestamp = parseInt(since);
      const sinceDate = new Date(sinceTimestamp);

      query = sql`
        SELECT id, room_id as "roomId", content, image_url as "imageUrl",
               sent_by_admin as "sentByAdmin", timestamp
        FROM messages
        WHERE room_id = ${roomId} AND timestamp > ${sinceDate.toISOString()}
        ORDER BY timestamp ASC
      `;
    } else {
      // Get all messages for the room
      query = sql`
        SELECT id, room_id as "roomId", content, image_url as "imageUrl",
               sent_by_admin as "sentByAdmin", timestamp
        FROM messages
        WHERE room_id = ${roomId}
        ORDER BY timestamp ASC
      `;
    }

    const result = await query;
    const messages = result.rows;

    // Debug: log first message to check sentByAdmin field
    if (messages.length > 0) {
      console.log('[API GET] First message:', {
        id: messages[0].id,
        sentByAdmin: messages[0].sentByAdmin,
        sentByAdminType: typeof messages[0].sentByAdmin
      });
    }

    return NextResponse.json({
      messages,
      count: messages.length
    });
  } catch (error) {
    console.error('[API GET /api/chat/[roomId]] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la récupération des messages', messages: [], count: 0 },
      { status: 500 }
    );
  }
}

// POST - Send a message
export async function POST(
  request: NextRequest,
  context: { params: { roomId: string } }
) {
  try {
    const { roomId } = context.params;
    const body = await request.json();
    const { id, content, imageUrl, timestamp, sentByAdmin } = body;

    if (!content && !imageUrl) {
      return NextResponse.json(
        { error: 'Le message doit contenir du texte ou une image' },
        { status: 400 }
      );
    }

    // Use client-provided ID or generate one
    const messageId = id || `${roomId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const messageTimestamp = timestamp || new Date().toISOString();

    // Ensure room exists
    await sql`
      INSERT INTO rooms (id, name, updated_at)
      VALUES (${roomId}, ${`Conversation ${roomId}`}, CURRENT_TIMESTAMP)
      ON CONFLICT (id) DO UPDATE SET updated_at = CURRENT_TIMESTAMP
    `;

    // Insert message (avoid duplicates with ON CONFLICT)
    await sql`
      INSERT INTO messages (id, room_id, content, image_url, sent_by_admin, timestamp)
      VALUES (
        ${messageId},
        ${roomId},
        ${content || ''},
        ${imageUrl || null},
        ${sentByAdmin || false},
        ${messageTimestamp}
      )
      ON CONFLICT (id) DO NOTHING
    `;

    const message = {
      id: messageId,
      roomId,
      content: content || '',
      imageUrl: imageUrl || null,
      timestamp: messageTimestamp,
      sentByAdmin: sentByAdmin || false,
    };

    return NextResponse.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('[API POST /api/chat/[roomId]] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de l\'envoi du message' },
      { status: 500 }
    );
  }
}

// DELETE - Delete all messages in a room (admin only)
export async function DELETE(
  request: NextRequest,
  context: { params: { roomId: string } }
) {
  try {
    const { roomId } = context.params;

    // Verify admin token from request headers
    const authHeader = request.headers.get('authorization');
    const adminToken = request.headers.get('x-admin-token') || authHeader?.replace('Bearer ', '');

    if (!adminToken) {
      return NextResponse.json(
        { error: 'Token admin requis' },
        { status: 401 }
      );
    }

    // Verify token against database
    const tokenResult = await sql`
      SELECT * FROM admin_tokens
      WHERE room_id = ${roomId} AND token_hash = ${adminToken}
    `;

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Token admin invalide' },
        { status: 403 }
      );
    }

    // Delete all messages
    await sql`DELETE FROM messages WHERE room_id = ${roomId}`;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API DELETE /api/chat/[roomId]] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression des messages' },
      { status: 500 }
    );
  }
}
