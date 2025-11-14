import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * Delete a single message
 * Users can only delete their own messages
 * Admin can delete any message
 */
export async function DELETE(
  request: NextRequest,
  context: { params: { roomId: string; messageId: string } }
) {
  try {
    const { roomId, messageId } = context.params;
    const { isAdmin } = await request.json();

    // Get the message to check ownership
    const messageResult = await sql`
      SELECT id, sent_by_admin as "sentByAdmin"
      FROM messages
      WHERE id = ${messageId} AND room_id = ${roomId}
    `;

    if (messageResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Message non trouvé' },
        { status: 404 }
      );
    }

    const message = messageResult.rows[0];

    // Check permissions: admin can delete any message, users can only delete their own
    const canDelete = isAdmin || message.sentByAdmin === isAdmin;

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Non autorisé à supprimer ce message' },
        { status: 403 }
      );
    }

    // Delete the message
    await sql`
      DELETE FROM messages
      WHERE id = ${messageId} AND room_id = ${roomId}
    `;

    return NextResponse.json({
      success: true,
      messageId: messageId
    });
  } catch (error) {
    console.error('[API DELETE /api/chat/[roomId]/messages/[messageId]] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la suppression du message' },
      { status: 500 }
    );
  }
}
