import { NextResponse } from 'next/server';

// Importer le store de mots de passe depuis le module parent
// Note: En production, utiliser une vraie base de données
const passwordsStore = global.chatPasswordsStore || (global.chatPasswordsStore = new Map());

export async function GET() {
  try {
    // Retourner tous les mots de passe sous forme d'objet
    const passwords = {};
    for (const [roomId, password] of passwordsStore.entries()) {
      passwords[roomId] = password;
    }

    return NextResponse.json({ passwords });
  } catch (error) {
    console.error('Erreur lors de la récupération des mots de passe:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
