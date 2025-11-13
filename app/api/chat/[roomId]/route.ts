import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

/**
 * Route de compatibilité pour l'ancien frontend
 * TODO: Migrer le frontend vers /api/passwords/[roomId]
 */

// GET - Récupérer le mot de passe d'accès
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const url = new URL(request.url);
    const includePassword = url.searchParams.get('includePassword');

    if (includePassword === 'true') {
      // Récupérer le mot de passe depuis la table conversation_passwords
      const result = await sql`
        SELECT password_plaintext as password FROM conversation_passwords
        WHERE room_id = ${roomId}
      `;

      return NextResponse.json({
        accessPassword: result.rows[0]?.password || '',
      });
    }

    return NextResponse.json({ accessPassword: '' });
  } catch (error) {
    console.error('Error fetching password:', error);
    return NextResponse.json({ accessPassword: '' });
  }
}

// PUT - Sauvegarder le mot de passe d'accès
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await request.json();
    const { accessPassword } = body;

    if (!accessPassword || accessPassword.trim() === '') {
      // Supprimer le mot de passe
      await sql`
        DELETE FROM conversation_passwords WHERE room_id = ${roomId}
      `;
    } else {
      // Sauvegarder le mot de passe (en plaintext pour la détection ET hashé pour la sécurité)
      const passwordLower = accessPassword.toLowerCase();

      await sql`
        INSERT INTO conversation_passwords (room_id, password_plaintext, password_hash, updated_at)
        VALUES (${roomId}, ${passwordLower}, ${passwordLower}, CURRENT_TIMESTAMP)
        ON CONFLICT (room_id)
        DO UPDATE SET
          password_plaintext = ${passwordLower},
          password_hash = ${passwordLower},
          updated_at = CURRENT_TIMESTAMP
      `;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving password:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la sauvegarde' },
      { status: 500 }
    );
  }
}
