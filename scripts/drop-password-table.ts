/**
 * Drop conversation_passwords table
 * Run with: npx tsx scripts/drop-password-table.ts
 */

import 'dotenv/config';
import { sql } from '@vercel/postgres';

async function dropTable() {
  console.log('🗑️  Dropping conversation_passwords table...\n');

  try {
    await sql`DROP TABLE IF EXISTS conversation_passwords CASCADE`;
    console.log('✅ Table dropped successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

dropTable();
