import { NextResponse } from 'next/server';

// Stockage en mémoire des messages (pour le dev - en prod utiliser une vraie DB)
const messagesStore = new Map();

// Stockage en mémoire des mots de passe d'accès par conversation (global pour partage)
const passwordsStore = global.chatPasswordsStore || (global.chatPasswordsStore = new Map());

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
    const includePassword = url.searchParams.get('includePassword'); // Pour récupérer aussi le mot de passe

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

    const response = {
      messages: roomMessages,
      count: roomMessages.length
    };

    // Ajouter le mot de passe si demandé
    if (includePassword === 'true') {
      response.accessPassword = passwordsStore.get(roomId) || '';
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Erreur lors de la récupération des messages:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request, { params }) {
  try {
    const roomId = params.roomId;
    const { id, content, timestamp, sentByAdmin } = await request.json();

    if (!roomId || !content) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // Utiliser l'ID fourni par le client, ou en créer un si absent
    const messageId = id || `${roomId}_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const messageTimestamp = timestamp || new Date().toISOString();

    const message = {
      id: messageId,
      roomId,
      content,
      timestamp: messageTimestamp,
      sentByAdmin: sentByAdmin || false,
    };

    // Récupérer les messages existants pour cette room
    const roomMessages = messagesStore.get(roomId) || [];

    // Vérifier si le message existe déjà (éviter les doublons)
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

export async function PUT(request, { params }) {
  try {
    const roomId = params.roomId;
    const { accessPassword } = await request.json();

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID manquant' }, { status: 400 });
    }

    // Sauvegarder le mot de passe (ou le supprimer si vide)
    if (accessPassword && accessPassword.trim()) {
      passwordsStore.set(roomId, accessPassword.trim());
    } else {
      passwordsStore.delete(roomId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du mot de passe:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
