/**
 * Check database schema for password_plaintext column
 * Run with: npx tsx scripts/check-db-schema.ts
 */

import 'dotenv/config';
import { sql } from '@vercel/postgres';

async function checkSchema() {
  console.log('🔍 Checking database schema...\n');

  try {
    // Check conversation_passwords table structure
    const tableInfo = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'conversation_passwords'
      ORDER BY ordinal_position
    `;

    console.log('📋 conversation_passwords table columns:');
    for (const col of tableInfo.rows) {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}`);
    }

    // Check if there are any passwords
    const passwordCount = await sql`
      SELECT COUNT(*) as count FROM conversation_passwords
    `;
    console.log(`\n📊 Total passwords in database: ${passwordCount.rows[0].count}`);

    // Show sample data if any
    if (parseInt(passwordCount.rows[0].count) > 0) {
      const samples = await sql`
        SELECT room_id, password_plaintext, LENGTH(password_hash) as hash_length, created_at
        FROM conversation_passwords
        LIMIT 5
      `;
      console.log('\n📝 Sample entries:');
      for (const row of samples.rows) {
        console.log(`  Room: ${row.room_id}`);
        console.log(`    Plaintext: ${row.password_plaintext || 'NULL'}`);
        console.log(`    Hash length: ${row.hash_length}`);
        console.log(`    Created: ${row.created_at}`);
      }
    }

    console.log('\n✅ Schema check complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkSchema();
