import { NextResponse } from 'next/server';
import { db } from '../../../db/index.js';
import { messages } from '../../../db/schema.js';
import { lt } from 'drizzle-orm';

export async function POST(request) {
  try {
    // Vérifier le token d'autorisation pour la sécurité (optionnel pour cron)
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CLEANUP_TOKEN || 'securenotes-cleanup-2024';

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Calculer la date il y a 24 heures
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Supprimer les messages plus anciens que 24 heures
    const deletedMessages = await db
      .delete(messages)
      .where(lt(messages.timestamp, twentyFourHoursAgo))
      .returning();

    console.log(`${deletedMessages.length} messages supprimés lors du nettoyage`);

    return NextResponse.json({
      success: true,
      deletedCount: deletedMessages.length
    });
  } catch (error) {
    console.error('Erreur lors du nettoyage:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// Pour les tests manuels, permettre GET
export async function GET() {
  try {
    // Calculer la date il y a 24 heures
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Compter les messages qui seraient supprimés
    const oldMessages = await db
      .select()
      .from(messages)
      .where(lt(messages.timestamp, twentyFourHoursAgo));

    return NextResponse.json({
      wouldDelete: oldMessages.length,
      message: 'Utilisez POST pour effectuer le nettoyage'
    });
  } catch (error) {
    console.error('Erreur lors de la vérification du nettoyage:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}