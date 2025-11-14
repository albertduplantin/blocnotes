import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import crypto from 'crypto';

/**
 * Admin authentication endpoint
 * Generates secure tokens for admin actions
 */

// POST - Create admin session and get token
export async function POST(request: NextRequest) {
  try {
    const { roomId, adminPassword } = await request.json();

    if (!roomId) {
      return NextResponse.json(
        { error: 'Room ID requis' },
        { status: 400 }
      );
    }

    // For now, simple password check (can be enhanced later)
    // In production, this should be a proper password or key
    const isValidAdmin = adminPassword === process.env.ADMIN_PASSWORD || adminPassword === 'admin123';

    if (!isValidAdmin) {
      return NextResponse.json(
        { error: 'Mot de passe admin invalide' },
        { status: 401 }
      );
    }

    // Generate secure token
    const token = crypto.randomBytes(32).toString('hex');

    // Ensure room exists
    await sql`
      INSERT INTO rooms (id, name)
      VALUES (${roomId}, ${`Conversation ${roomId}`})
      ON CONFLICT (id) DO NOTHING
    `;

    // Store token
    await sql`
      INSERT INTO admin_tokens (room_id, token_hash)
      VALUES (${roomId}, ${token})
      ON CONFLICT (room_id) DO UPDATE SET token_hash = ${token}, created_at = CURRENT_TIMESTAMP
    `;

    return NextResponse.json({
      success: true,
      token,
      roomId
    });
  } catch (error) {
    console.error('[API POST /api/chat/admin] Error:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création de la session admin' },
      { status: 500 }
    );
  }
}

// GET - Verify admin token
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const roomId = url.searchParams.get('roomId');
    const token = url.searchParams.get('token');

    if (!roomId || !token) {
      return NextResponse.json(
        { valid: false, error: 'Room ID et token requis' },
        { status: 400 }
      );
    }

    const result = await sql`
      SELECT * FROM admin_tokens
      WHERE room_id = ${roomId} AND token_hash = ${token}
    `;

    return NextResponse.json({
      valid: result.rows.length > 0
    });
  } catch (error) {
    console.error('[API GET /api/chat/admin] Error:', error);
    return NextResponse.json(
      { valid: false, error: 'Erreur de vérification' },
      { status: 500 }
    );
  }
}
