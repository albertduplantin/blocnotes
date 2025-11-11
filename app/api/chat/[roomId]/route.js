import { NextResponse } from 'next/server';

// Stockage en mémoire des messages (pour le dev - en prod utiliser une vraie DB)
const messagesStore = new Map();

// Nettoyer les vieux messages (plus de 24h)
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

// Nettoyer toutes les 10 minutes
setInterval(cleanOldMessages, 10 * 60 * 1000);

export async function GET(request, { params }) {
  try {
    const roomId = params.roomId;
    const url = new URL(request.url);
    const since = url.searchParams.get('since'); // Timestamp pour récupérer seulement les nouveaux messages

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID manquant' }, { status: 400 });
    }

    let roomMessages = messagesStore.get(roomId) || [];

    // Filtrer par timestamp si 'since' est fourni
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
    console.error('Erreur lors de la récupération des messages:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const roomId = params.roomId;
    const { content, isSent } = await request.json();

    if (!roomId || !content) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    const message = {
      id: `${roomId}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      roomId,
      content,
      timestamp: new Date().toISOString(),
      isSent: isSent || false,
    };

    // Récupérer les messages existants pour cette room
    const roomMessages = messagesStore.get(roomId) || [];
    roomMessages.push(message);
    messagesStore.set(roomId, roomMessages);

    return NextResponse.json({
      success: true,
      message
    });
  } catch (error) {
    console.error('Erreur lors de l\'envoi du message:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const roomId = params.roomId;

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID manquant' }, { status: 400 });
    }

    // Supprimer tous les messages de cette room
    messagesStore.delete(roomId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la suppression des messages:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
