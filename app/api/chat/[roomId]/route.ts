import { NextRequest, NextResponse } from 'next/server';

/**
 * Simple in-memory message storage for conversations
 * No database, no authentication - just simple message exchange
 */

// In-memory storage for messages
const messagesStore = new Map<string, any[]>();

// Clean old messages (older than 24 hours)
function cleanOldMessages() {
  const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
  for (const [roomId, messages] of messagesStore.entries()) {
    const filteredMessages = messages.filter(msg =>
      new Date(msg.timestamp).getTime() > oneDayAgo
    );
    if (filteredMessages.length === 0) {
      messagesStore.delete(roomId);
    } else {
      messagesStore.set(roomId, filteredMessages);
    }
  }
}

// Clean every 10 minutes
setInterval(cleanOldMessages, 10 * 60 * 1000);

// GET - Get messages for a room
export async function GET(
  request: NextRequest,
  context: { params: { roomId: string } }
) {
  try {
    const { roomId } = context.params;
    const url = new URL(request.url);
    const since = url.searchParams.get('since');

    let roomMessages = messagesStore.get(roomId) || [];

    // Filter by timestamp if 'since' is provided
    if (since) {
      const sinceTimestamp = parseInt(since);
      roomMessages = roomMessages.filter(msg =>
        new Date(msg.timestamp).getTime() > sinceTimestamp
      );
    }

    return NextResponse.json({
      messages: roomMessages,
      count: roomMessages.length
    });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// POST - Send a message
export async function POST(
  request: NextRequest,
  context: { params: { roomId: string } }
) {
  try {
    const { roomId } = context.params;
    const { id, content, imageUrl, timestamp, sentByAdmin } = await request.json();

    if (!content && !imageUrl) {
      return NextResponse.json({ error: 'Content or image required' }, { status: 400 });
    }

    // Use client-provided ID or generate one
    const messageId = id || `${roomId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const messageTimestamp = timestamp || new Date().toISOString();

    const message = {
      id: messageId,
      roomId,
      content: content || '',
      imageUrl: imageUrl || null,
      timestamp: messageTimestamp,
      sentByAdmin: sentByAdmin || false,
    };

    // Get existing messages for this room
    const roomMessages = messagesStore.get(roomId) || [];

    // Check if message already exists (avoid duplicates)
    const exists = roomMessages.some(msg => msg.id === messageId);
    if (!exists) {
      roomMessages.push(message);
      messagesStore.set(roomId, roomMessages);
    }

    return NextResponse.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Error sending message:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

// DELETE - Delete all messages in a room
export async function DELETE(
  request: NextRequest,
  context: { params: { roomId: string } }
) {
  try {
    const { roomId } = context.params;

    messagesStore.delete(roomId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting messages:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
