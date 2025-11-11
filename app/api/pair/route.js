import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../db/index.js';
import { users, ecdhKeys } from '../../../db/schema.js';
import { eq } from 'drizzle-orm';

export async function POST(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { publicKey, deviceInfo } = await request.json();

    if (!publicKey) {
      return NextResponse.json({ error: 'Clé publique manquante' }, { status: 400 });
    }

    // Vérifier si l'utilisateur existe, sinon le créer
    let user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      await db.insert(users).values({
        id: userId,
        publicKey: publicKey,
      });
    } else {
      // Mettre à jour la clé publique
      await db.update(users).set({ publicKey }).where(eq(users.id, userId));
    }

    // Sauvegarder les informations de l'appareil (clé privée chiffrée sera gérée côté client)
    await db.insert(ecdhKeys).values({
      userId: userId,
      encryptedPrivateKey: '', // Sera mis à jour côté client
      deviceInfo: deviceInfo || navigator.userAgent,
    }).onConflictDoUpdate({
      target: ecdhKeys.userId,
      set: { deviceInfo: deviceInfo || navigator.userAgent },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de l\'appairage:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer la clé publique de l'utilisateur
    const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user.length === 0) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 });
    }

    return NextResponse.json({
      publicKey: user[0].publicKey,
      userId: userId,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des données d\'appairage:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}