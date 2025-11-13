import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * Route de compatibilité pour l'ancien frontend
 * GET /api/chat/passwords - Récupérer tous les mots de passe
 */
export async function GET(request: NextRequest) {
  try {
    // Récupérer tous les mots de passe
    const result = await sql`
      SELECT room_id, password_plaintext as password
      FROM conversation_passwords
      WHERE password_plaintext IS NOT NULL AND password_plaintext != ''
      ORDER BY created_at DESC
    `;

    // Formater en objet { roomId: password, ... }
    const passwords: Record<string, string> = {};
    for (const row of result.rows) {
      passwords[row.room_id] = row.password;
    }

    return NextResponse.json({ passwords });
  } catch (error) {
    console.error('[API] Error fetching passwords:', error);
    return NextResponse.json({ passwords: {} });
  }
}
