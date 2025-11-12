import { NextResponse } from 'next/server';
import { passwordsStore } from '../../../../lib/stores';

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
