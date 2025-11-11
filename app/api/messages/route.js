import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '../../../db/index.js';
import { messages } from '../../../db/schema.js';
import { eq, and, or, desc } from 'drizzle-orm';

export async function POST(request) {
  try {
    const { userId: senderId } = auth();
    if (!senderId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { encryptedContent, iv, receiverId } = await request.json();

    if (!encryptedContent || !iv || !receiverId) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Insérer le message dans la base de données
    const newMessage = await db.insert(messages).values({
      senderId,
      receiverId,
      encryptedContent,
      iv,
      timestamp: new Date(),
      isRead: false,
    }).returning();

    return NextResponse.json({ success: true, messageId: newMessage[0].id });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const url = new URL(request.url);
    const contactId = url.searchParams.get('contactId');

    if (!contactId) {
      return NextResponse.json({ error: 'ID du contact manquant' }, { status: 400 });
    }

    // Récupérer les messages entre l'utilisateur et le contact
    const userMessages = await db
      .select()
      .from(messages)
      .where(
        or(
          and(eq(messages.senderId, userId), eq(messages.receiverId, contactId)),
          and(eq(messages.senderId, contactId), eq(messages.receiverId, userId))
        )
      )
      .orderBy(desc(messages.timestamp));

    return NextResponse.json({ messages: userMessages });
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { messageId } = await request.json();

    if (!messageId) {
      return NextResponse.json({ error: 'ID du message manquant' }, { status: 400 });
    }

    // Marquer le message comme lu
    await db
      .update(messages)
      .set({ isRead: true })
      .where(and(eq(messages.id, messageId), eq(messages.receiverId, userId)));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la mise à jour du message:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}