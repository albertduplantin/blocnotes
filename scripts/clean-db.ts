/**
 * Clean database script - Drop all tables
 * Run with: npx tsx scripts/clean-db.ts
 */

import 'dotenv/config';
import { sql } from '@vercel/postgres';

async function cleanDatabase() {
  console.log('🧹 Cleaning database...');

  try {
    // Drop all tables
    console.log('Dropping existing tables...');

    await sql`DROP TABLE IF EXISTS rate_limits CASCADE`;
    console.log('  ✓ Dropped rate_limits');

    await sql`DROP TABLE IF EXISTS conversation_passwords CASCADE`;
    console.log('  ✓ Dropped conversation_passwords');

    await sql`DROP TABLE IF EXISTS messages CASCADE`;
    console.log('  ✓ Dropped messages');

    await sql`DROP TABLE IF EXISTS rooms CASCADE`;
    console.log('  ✓ Dropped rooms');

    await sql`DROP TABLE IF EXISTS users CASCADE`;
    console.log('  ✓ Dropped users');

    console.log('✅ Database cleaned successfully!');
    console.log('\nNow run: npm run db:migrate');
  } catch (error) {
    console.error('❌ Error cleaning database:', error);
    process.exit(1);
  }
}

cleanDatabase();
