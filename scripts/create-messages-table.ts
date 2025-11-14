/**
 * Create messages table for persistent chat storage
 * Run with: npx tsx scripts/create-messages-table.ts
 */

import 'dotenv/config';
import { sql } from '@vercel/postgres';

async function createMessagesTable() {
  console.log('📋 Creating messages table...\n');

  try {
    // Create rooms table (lightweight, just to track conversations)
    await sql`
      CREATE TABLE IF NOT EXISTS rooms (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('✅ Rooms table created');

    // Create messages table
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id VARCHAR(255) PRIMARY KEY,
        room_id VARCHAR(255) NOT NULL,
        content TEXT,
        image_url TEXT,
        sent_by_admin BOOLEAN DEFAULT FALSE,
        timestamp TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
      )
    `;
    console.log('✅ Messages table created');

    // Create indexes for better performance
    await sql`
      CREATE INDEX IF NOT EXISTS idx_messages_room_id ON messages(room_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC)
    `;
    console.log('✅ Indexes created');

    // Create admin_tokens table for secure admin authentication
    await sql`
      CREATE TABLE IF NOT EXISTS admin_tokens (
        id SERIAL PRIMARY KEY,
        room_id VARCHAR(255) NOT NULL UNIQUE,
        token_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE
      )
    `;
    console.log('✅ Admin tokens table created');

    console.log('\n✅ All tables created successfully!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createMessagesTable();
