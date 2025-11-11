import { pgTable, text, timestamp, boolean, serial } from 'drizzle-orm/pg-core';

// Table des utilisateurs
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk userId
  publicKey: text('public_key'), // Clé publique ECDH
});

// Table des messages chiffrés
export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: text('sender_id').references(() => users.id),
  receiverId: text('receiver_id').references(() => users.id),
  encryptedContent: text('encrypted_content'), // Contenu chiffré AES-GCM
  iv: text('iv'), // Vecteur d'initialisation
  timestamp: timestamp('timestamp').defaultNow(),
  isRead: boolean('is_read').default(false),
});

// Table des clés ECDH chiffrées
export const ecdhKeys = pgTable('ecdh_keys', {
  userId: text('user_id').primaryKey().references(() => users.id),
  encryptedPrivateKey: text('encrypted_private_key'), // Clé privée chiffrée
  deviceInfo: text('device_info'), // Info appareil
});