import { NextResponse } from 'next/server';
import { getAllPasswords } from '../../../../lib/stores';

export async function GET() {
  try {
    // Retourner tous les mots de passe depuis le store unifié
    const passwords = getAllPasswords();

    return NextResponse.json({ passwords });
  } catch (error) {
    console.error('Erreur lors de la récupération des mots de passe:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
