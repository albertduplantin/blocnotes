import { NextResponse } from 'next/server';
import { getAllPasswords, initDatabase } from '../../../../lib/db';

export async function GET() {
  try {
    // Initialiser la base de données si nécessaire
    await initDatabase();

    // Retourner tous les mots de passe depuis PostgreSQL
    const passwords = await getAllPasswords();

    return NextResponse.json({ passwords });
  } catch (error) {
    console.error('Erreur lors de la récupération des mots de passe:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
