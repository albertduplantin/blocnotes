import { sql } from '@vercel/postgres';
import { drizzle } from 'drizzle-orm/vercel-postgres';
import * as schema from './schema';

// Initialize Drizzle with Vercel Postgres
export const db = drizzle(sql, { schema });

// Database initialization function
export async function initDatabase() {
  try {
    // Create rooms table
    await sql`
      CREATE TABLE IF NOT EXISTS rooms (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        password_hash TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;

    // Create messages table
    await sql`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        image_url TEXT,
        sent_by_admin BOOLEAN DEFAULT FALSE NOT NULL,
        user_id TEXT,
        timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;

    // Create indexes for messages
    await sql`
      CREATE INDEX IF NOT EXISTS messages_room_id_idx ON messages(room_id)
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS messages_timestamp_idx ON messages(timestamp)
    `;

    // Create conversation_passwords table
    await sql`
      CREATE TABLE IF NOT EXISTS conversation_passwords (
        room_id VARCHAR(255) PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
      )
    `;

    // Create rate_limits table
    await sql`
      CREATE TABLE IF NOT EXISTS rate_limits (
        id SERIAL PRIMARY KEY,
        identifier TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        reset_time TIMESTAMP NOT NULL
      )
    `;
    await sql`
      CREATE INDEX IF NOT EXISTS rate_limits_identifier_idx ON rate_limits(identifier)
    `;

    console.log('[DB] Database initialized successfully');
    return true;
  } catch (error) {
    console.error('[DB] Error initializing database:', error);
    return false;
  }
}

// Helper to clean up old messages (called periodically)
export async function cleanupOldMessages(hoursOld: number = 24) {
  try {
    const cutoffDate = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
    const result = await sql`
      DELETE FROM messages
      WHERE timestamp < ${cutoffDate.toISOString()}
    `;
    console.log(`[DB] Cleaned up old messages: ${result.rowCount} deleted`);
    return result.rowCount;
  } catch (error) {
    console.error('[DB] Error cleaning up old messages:', error);
    return 0;
  }
}

// Helper to clean up old rate limit entries
export async function cleanupRateLimits() {
  try {
    const now = new Date();
    const result = await sql`
      DELETE FROM rate_limits
      WHERE reset_time < ${now.toISOString()}
    `;
    return result.rowCount;
  } catch (error) {
    console.error('[DB] Error cleaning up rate limits:', error);
    return 0;
  }
}

export * from './schema';
