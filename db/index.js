import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema.js';

// Connexion à la base de données Neon
const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

// Fonction pour exécuter les migrations (si nécessaire)
export async function migrate() {
  // Utiliser drizzle-kit pour les migrations
  // Cette fonction peut être appelée lors du déploiement
  console.log('Migrations exécutées via drizzle-kit');
}