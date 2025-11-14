import { NextRequest, NextResponse } from 'next/server';

/**
 * Typing indicator endpoint
 * Tracks who is currently typing in a conversation
 */

// Store typing status per room: roomId -> Set of user identifiers
const typingUsers = new Map<string, Map<string, NodeJS.Timeout>>();

export async function POST(
  request: NextRequest,
  context: { params: { roomId: string } }
) {
  try {
    const { roomId } = context.params;
    const { userId, isTyping, isAdmin } = await request.json();

    const userKey = userId || (isAdmin ? 'admin' : 'user');

    if (!typingUsers.has(roomId)) {
      typingUsers.set(roomId, new Map());
    }

    const roomTyping = typingUsers.get(roomId)!;

    if (isTyping) {
      // Clear existing timeout for this user
      const existingTimeout = roomTyping.get(userKey);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      // Set new timeout (auto-remove after 3 seconds of inactivity)
      const timeout = setTimeout(() => {
        roomTyping.delete(userKey);
        if (roomTyping.size === 0) {
          typingUsers.delete(roomId);
        }
      }, 3000);

      roomTyping.set(userKey, timeout);
    } else {
      // User stopped typing
      const timeout = roomTyping.get(userKey);
      if (timeout) {
        clearTimeout(timeout);
        roomTyping.delete(userKey);
      }

      if (roomTyping.size === 0) {
        typingUsers.delete(roomId);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API POST /api/chat/[roomId]/typing] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la mise à jour du statut de frappe' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  context: { params: { roomId: string } }
) {
  try {
    const { roomId } = context.params;
    const url = new URL(request.url);
    const currentUser = url.searchParams.get('userId') || 'user';

    const roomTyping = typingUsers.get(roomId);
    if (!roomTyping || roomTyping.size === 0) {
      return NextResponse.json({ isTyping: false, users: [] });
    }

    // Get list of users typing (excluding current user)
    const typingList = Array.from(roomTyping.keys()).filter(key => key !== currentUser);

    return NextResponse.json({
      isTyping: typingList.length > 0,
      users: typingList
    });
  } catch (error) {
    console.error('[API GET /api/chat/[roomId]/typing] Error:', error);
    return NextResponse.json(
      { isTyping: false, users: [] },
      { status: 500 }
    );
  }
}
