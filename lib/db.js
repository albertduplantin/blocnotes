import { sql } from '@vercel/postgres';

// Créer la table des mots de passe si elle n'existe pas
export async function initDatabase() {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS conversation_passwords (
        room_id VARCHAR(255) PRIMARY KEY,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;
    console.log('Database initialized successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Récupérer le mot de passe d'une conversation
export async function getPassword(roomId) {
  try {
    const result = await sql`
      SELECT password FROM conversation_passwords
      WHERE room_id = ${roomId}
    `;
    return result.rows[0]?.password || '';
  } catch (error) {
    console.error('Error getting password:', error);
    return '';
  }
}

// Définir le mot de passe d'une conversation
export async function setPassword(roomId, password) {
  try {
    if (!password || password.trim() === '') {
      // Supprimer le mot de passe si vide
      await sql`
        DELETE FROM conversation_passwords
        WHERE room_id = ${roomId}
      `;
    } else {
      // Insérer ou mettre à jour
      await sql`
        INSERT INTO conversation_passwords (room_id, password, updated_at)
        VALUES (${roomId}, ${password}, CURRENT_TIMESTAMP)
        ON CONFLICT (room_id)
        DO UPDATE SET password = ${password}, updated_at = CURRENT_TIMESTAMP
      `;
    }
    return true;
  } catch (error) {
    console.error('Error setting password:', error);
    return false;
  }
}

// Récupérer tous les mots de passe
export async function getAllPasswords() {
  try {
    const result = await sql`
      SELECT room_id, password FROM conversation_passwords
    `;
    const passwords = {};
    result.rows.forEach(row => {
      passwords[row.room_id] = row.password;
    });
    return passwords;
  } catch (error) {
    console.error('Error getting all passwords:', error);
    return {};
  }
}
