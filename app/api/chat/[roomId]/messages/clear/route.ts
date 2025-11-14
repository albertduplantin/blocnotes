import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * Delete all messages in a room
 * Admin only
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { roomId: string } }
) {
  try {
    const { roomId } = context.params;
    const { isAdmin } = await request.json();

    // Only admin can clear all messages
    if (!isAdmin) {
      return NextResponse.json(
        { error: 'Seul l\'admin peut supprimer tous les messages' },
        { status: 403 }
      );
    }

    // Delete all messages in the room
    const result = await sql`
      DELETE FROM messages
      WHERE room_id = ${roomId}
    `;

    return NextResponse.json({
      success: true,
      deletedCount: result.rowCount || 0
    });
  } catch (error) {
    console.error('[API DELETE /api/chat/[roomId]/messages/clear] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression des messages' },
      { status: 500 }
    );
  }
}
