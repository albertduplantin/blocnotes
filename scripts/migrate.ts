/**
 * Database migration script
 * Run with: npx tsx scripts/migrate.ts
 */

import 'dotenv/config';
import { initDatabase } from '../lib/db';

async function migrate() {
  console.log('🚀 Starting database migration...');

  try {
    const success = await initDatabase();

    if (success) {
      console.log('✅ Database migration completed successfully!');
      console.log('\nNext steps:');
      console.log('1. Restart your development server');
      console.log('2. Old data in memory store will be lost (expected behavior)');
      console.log('3. New conversations will be persisted in PostgreSQL');
    } else {
      console.error('❌ Database migration failed');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

migrate();
