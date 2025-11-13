import { pgTable, text, timestamp, boolean, serial, varchar, index } from 'drizzle-orm/pg-core';

// Table des utilisateurs (sessions)
export const users = pgTable('users', {
  id: text('id').primaryKey(), // UUID or session ID
  username: text('username').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Table des rooms/conversations
export const rooms = pgTable('rooms', {
  id: text('id').primaryKey(), // 8-character room code
  name: text('name').notNull(),
  passwordHash: text('password_hash'), // Bcrypt hash of access password
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Table des messages
export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  roomId: text('room_id').notNull().references(() => rooms.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  sentByAdmin: boolean('sent_by_admin').default(false).notNull(),
  userId: text('user_id'), // Optional: link to user who sent it
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  roomIdIdx: index('messages_room_id_idx').on(table.roomId),
  timestampIdx: index('messages_timestamp_idx').on(table.timestamp),
}));

// Table pour les mots de passe d'accès aux conversations
// Note: This is separate from rooms.passwordHash which is the admin password
// This is for user access via secret phrases in notes
export const conversationPasswords = pgTable('conversation_passwords', {
  roomId: varchar('room_id', { length: 255 }).primaryKey().references(() => rooms.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash').notNull(), // Bcrypt hash
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Table pour le rate limiting
export const rateLimits = pgTable('rate_limits', {
  id: serial('id').primaryKey(),
  identifier: text('identifier').notNull(), // IP or user ID
  endpoint: text('endpoint').notNull(),
  count: serial('count').notNull(),
  resetTime: timestamp('reset_time').notNull(),
}, (table) => ({
  identifierIdx: index('rate_limits_identifier_idx').on(table.identifier),
}));
