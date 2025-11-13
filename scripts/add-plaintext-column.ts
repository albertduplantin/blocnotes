/**
 * Add password_plaintext column to conversation_passwords table
 * Run with: npx tsx scripts/add-plaintext-column.ts
 */

import 'dotenv/config';
import { sql } from '@vercel/postgres';

async function addPlaintextColumn() {
  console.log('🔧 Adding password_plaintext column...');

  try {
    // Add column if it doesn't exist
    await sql`
      ALTER TABLE conversation_passwords
      ADD COLUMN IF NOT EXISTS password_plaintext TEXT
    `;

    console.log('✅ Column added successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

addPlaintextColumn();
