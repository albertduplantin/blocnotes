import { NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * Server-Sent Events (SSE) endpoint for real-time message updates
 * Replaces polling for better performance and battery life
 */

// Keep track of active connections per room
const connections = new Map<string, Set<ReadableStreamDefaultController>>();

export async function GET(
  request: NextRequest,
  context: { params: { roomId: string } }
) {
  const { roomId } = context.params;

  // Create SSE stream
  const encoder = new TextEncoder();
  let controller: ReadableStreamDefaultController;

  const stream = new ReadableStream({
    start(ctrl) {
      controller = ctrl;

      // Add this connection to the room's connection set
      if (!connections.has(roomId)) {
        connections.set(roomId, new Set());
      }
      connections.get(roomId)!.add(controller);

      // Send initial connection message
      const message = `data: ${JSON.stringify({ type: 'connected', roomId })}\n\n`;
      controller.enqueue(encoder.encode(message));

      // Set up polling for new messages (fallback)
      const interval = setInterval(async () => {
        try {
          const url = new URL(request.url);
          const since = url.searchParams.get('since') || new Date(Date.now() - 5000).toISOString();

          const result = await sql`
            SELECT id, room_id as "roomId", content, image_url as "imageUrl",
                   sent_by_admin as "sentByAdmin", timestamp
            FROM messages
            WHERE room_id = ${roomId} AND timestamp > ${since}
            ORDER BY timestamp ASC
          `;

          if (result.rows.length > 0) {
            const data = `data: ${JSON.stringify({ type: 'messages', messages: result.rows })}\n\n`;
            controller.enqueue(encoder.encode(data));
          }

          // Send heartbeat every 30 seconds
          if (Math.random() < 0.1) { // ~10% of checks
            const heartbeat = `data: ${JSON.stringify({ type: 'heartbeat' })}\n\n`;
            controller.enqueue(encoder.encode(heartbeat));
          }
        } catch (error) {
          console.error('[SSE] Error fetching messages:', error);
        }
      }, 3000); // Check every 3 seconds

      // Clean up on close
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        connections.get(roomId)?.delete(controller);
        if (connections.get(roomId)?.size === 0) {
          connections.delete(roomId);
        }
      });
    },

    cancel() {
      connections.get(roomId)?.delete(controller);
      if (connections.get(roomId)?.size === 0) {
        connections.delete(roomId);
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

